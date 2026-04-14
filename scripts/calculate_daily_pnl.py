#!/usr/bin/env python3
"""
Script to calculate and populate daily strategy metrics (PnL and returns)
"""

import os
import json
from datetime import datetime, timedelta
from decimal import Decimal
import psycopg2
from psycopg2.extras import RealDictCursor
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class StrategyMetricsCalculator:
    def __init__(self, db_host, db_port, db_name, db_user, db_password):
        """Initialize database connection"""
        self.conn_params = {
            'host': db_host,
            'port': db_port,
            'database': db_name,
            'user': db_user,
            'password': db_password,
        }
        self.conn = None
        self.connect()

    def connect(self):
        """Connect to PostgreSQL database"""
        try:
            self.conn = psycopg2.connect(**self.conn_params)
            logger.info("Connected to database")
        except psycopg2.Error as e:
            logger.error(f"Failed to connect to database: {e}")
            raise

    def close(self):
        """Close database connection"""
        if self.conn:
            self.conn.close()
            logger.info("Closed database connection")

    def get_price_for_security(self, security_id, date):
        """Get closing price for a security on a specific date"""
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT close_price
                FROM security_prices
                WHERE security_id = %s AND ts = %s
            """, (security_id, date))
            result = cur.fetchone()
            return Decimal(result['close_price']) if result else None

    def get_security_id_from_symbol(self, symbol):
        """Get security ID from symbol"""
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT id
                FROM securities
                WHERE UPPER(symbol) = UPPER(%s)
            """, (symbol,))
            result = cur.fetchone()
            return result['id'] if result else None

    def calculate_daily_pnl(self, strategy_id, holdings, current_date):
        """
        Calculate daily PnL for a strategy

        PnL = (today's close - yesterday's close) * shares
        """
        yesterday = current_date - timedelta(days=1)
        total_pnl = Decimal('0')
        total_portfolio_value = Decimal('0')

        logger.info(f"Calculating PnL for strategy {strategy_id} on {current_date}")

        # Parse holdings JSONB
        if isinstance(holdings, str):
            holdings_list = json.loads(holdings)
        else:
            holdings_list = holdings

        if not isinstance(holdings_list, list):
            holdings_list = [holdings_list]

        for holding in holdings_list:
            symbol = holding.get('symbol') or holding.get('ticker')
            shares = Decimal(str(holding.get('shares', holding.get('quantity', 1))))

            if not symbol:
                logger.warning(f"Holding missing symbol: {holding}")
                continue

            # Get security ID
            security_id = self.get_security_id_from_symbol(symbol)
            if not security_id:
                logger.warning(f"Security not found for symbol: {symbol}")
                continue

            # Get prices
            today_price = self.get_price_for_security(security_id, current_date)
            yesterday_price = self.get_price_for_security(security_id, yesterday)

            if not today_price or not yesterday_price:
                logger.warning(
                    f"Price data missing for {symbol} on {current_date} or {yesterday}"
                )
                continue

            # Calculate daily PnL for this holding
            daily_change = today_price - yesterday_price
            holding_pnl = daily_change * shares
            total_pnl += holding_pnl

            # Current value for return percentage calculation
            current_value = today_price * shares
            total_portfolio_value += current_value

            logger.debug(
                f"  {symbol}: {shares} shares, "
                f"yesterday: {yesterday_price}, today: {today_price}, "
                f"change: {daily_change}, pnl: {holding_pnl}"
            )

        # Calculate 1-day return percentage
        r_1d_pct = None
        if total_portfolio_value > 0:
            r_1d_pct = (total_pnl / total_portfolio_value) * 100

        return {
            'r_1d_pnl': total_pnl,
            'r_1d_pct': r_1d_pct,
        }

    def get_active_strategies(self):
        """Get all active strategies with their holdings"""
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT id, name, holdings
                FROM strategies
                WHERE status = 'active'
            """)
            return cur.fetchall()

    def get_earliest_price_date(self, strategy_id, holdings):
        """Get earliest date with price data for strategy holdings"""
        if isinstance(holdings, str):
            holdings_list = json.loads(holdings)
        else:
            holdings_list = holdings

        if not isinstance(holdings_list, list):
            holdings_list = [holdings_list]

        symbols = []
        for holding in holdings_list:
            symbol = holding.get('symbol') or holding.get('ticker')
            if symbol:
                symbols.append(symbol)

        if not symbols:
            return None

        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Create SQL with proper parameter handling
            placeholders = ','.join(['%s'] * len(symbols))
            query = f"""
                SELECT MIN(sp.ts) as earliest_date
                FROM security_prices sp
                JOIN securities s ON sp.security_id = s.id
                WHERE UPPER(s.symbol) IN ({placeholders})
            """
            cur.execute(query, symbols)
            result = cur.fetchone()
            return result['earliest_date'] if result and result['earliest_date'] else None

    def update_strategy_metrics(self, strategy_id, current_date, metrics, holdings_snapshot):
        """Update strategy_metrics table with calculated metrics"""
        with self.conn.cursor() as cur:
            cur.execute("""
                INSERT INTO strategy_metrics (
                    strategy_id, as_of_date, r_1d_pnl, r_1d_pct, holdings_live
                )
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (strategy_id, as_of_date)
                DO UPDATE SET
                    r_1d_pnl = EXCLUDED.r_1d_pnl,
                    r_1d_pct = EXCLUDED.r_1d_pct,
                    holdings_live = EXCLUDED.holdings_live,
                    updated_at = NOW()
            """, (
                strategy_id,
                current_date,
                metrics['r_1d_pnl'],
                metrics['r_1d_pct'],
                json.dumps(holdings_snapshot, default=str),
            ))
        self.conn.commit()

    def backfill_daily_pnl(self, start_date=None, end_date=None):
        """
        Backfill strategy metrics from start_date to end_date

        If dates not provided, backfill from earliest price data to today
        """
        if end_date is None:
            end_date = datetime.now().date()

        strategies = self.get_active_strategies()
        logger.info(f"Found {len(strategies)} active strategies")

        for strategy in strategies:
            strategy_id = strategy['id']
            holdings = strategy['holdings']

            logger.info(f"Processing strategy: {strategy['name']} ({strategy_id})")

            # Determine start date
            if start_date is None:
                earliest_date = self.get_earliest_price_date(strategy_id, holdings)
                if not earliest_date:
                    logger.warning(f"No price data found for strategy {strategy_id}")
                    continue
                calc_start_date = earliest_date + timedelta(days=1)  # Need at least 2 days
            else:
                calc_start_date = start_date

            # Process each day
            current_date = calc_start_date
            while current_date <= end_date:
                try:
                    metrics = self.calculate_daily_pnl(
                        strategy_id, holdings, current_date
                    )

                    if metrics['r_1d_pnl'] is not None:
                        self.update_strategy_metrics(
                            strategy_id, current_date, metrics, holdings
                        )
                        logger.info(
                            f"  {current_date}: "
                            f"PnL={metrics['r_1d_pnl']}, "
                            f"Return={metrics['r_1d_pct']:.4f}%" if metrics['r_1d_pct'] else "No return"
                        )
                    else:
                        logger.debug(f"  {current_date}: Insufficient data")

                except Exception as e:
                    logger.error(f"Error processing {current_date}: {e}")

                current_date += timedelta(days=1)

        logger.info("Backfill complete")


def main():
    """Main entry point"""
    # Get database credentials from environment
    db_host = os.getenv('DB_HOST', 'localhost')
    db_port = int(os.getenv('DB_PORT', 5432))
    db_name = os.getenv('DB_NAME', 'mint')
    db_user = os.getenv('DB_USER', 'postgres')
    db_password = os.getenv('DB_PASSWORD', '')

    calculator = StrategyMetricsCalculator(
        db_host, db_port, db_name, db_user, db_password
    )

    try:
        # Backfill from earliest date to today
        calculator.backfill_daily_pnl()
    finally:
        calculator.close()


if __name__ == '__main__':
    main()
