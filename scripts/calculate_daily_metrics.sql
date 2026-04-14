-- ============================================================================
-- FUNCTION: calculate_daily_strategy_metrics
-- Purpose: Calculate daily PnL and returns for all strategies
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_daily_strategy_metrics(p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(strategy_id UUID, metrics_inserted INTEGER) AS $$
DECLARE
  v_strategy_id UUID;
  v_holdings JSONB;
  v_yesterday DATE;
  v_total_pnl NUMERIC;
  v_total_portfolio_value NUMERIC;
  v_r_1d_pct NUMERIC;
  v_insert_count INTEGER := 0;
  v_holding JSONB;
  v_symbol TEXT;
  v_shares NUMERIC;
  v_security_id UUID;
  v_today_price NUMERIC;
  v_yesterday_price NUMERIC;
  v_holding_pnl NUMERIC;
BEGIN
  v_yesterday := p_date - INTERVAL '1 day';

  -- Loop through all active strategies
  FOR v_strategy_id, v_holdings IN
    SELECT s.id, s.holdings
    FROM strategies s
    WHERE s.status = 'active'
  LOOP
    v_total_pnl := 0;
    v_total_portfolio_value := 0;

    -- Process each holding
    FOR v_holding IN SELECT * FROM jsonb_array_elements(v_holdings)
    LOOP
      -- Extract symbol and shares
      v_symbol := COALESCE(v_holding->>'symbol', v_holding->>'ticker');
      v_shares := (COALESCE(v_holding->>'shares', v_holding->>'quantity', '1'))::NUMERIC;

      IF v_symbol IS NULL THEN
        CONTINUE;
      END IF;

      -- Get security ID
      SELECT id INTO v_security_id
      FROM securities
      WHERE UPPER(symbol) = UPPER(v_symbol)
      LIMIT 1;

      IF v_security_id IS NULL THEN
        CONTINUE;
      END IF;

      -- Get today's price
      SELECT close_price INTO v_today_price
      FROM security_prices
      WHERE security_id = v_security_id AND ts = p_date
      LIMIT 1;

      -- Get yesterday's price
      SELECT close_price INTO v_yesterday_price
      FROM security_prices
      WHERE security_id = v_security_id AND ts = v_yesterday
      LIMIT 1;

      -- Skip if prices are missing
      IF v_today_price IS NULL OR v_yesterday_price IS NULL THEN
        CONTINUE;
      END IF;

      -- Calculate PnL for this holding
      v_holding_pnl := (v_today_price - v_yesterday_price) * v_shares;
      v_total_pnl := v_total_pnl + v_holding_pnl;

      -- Add to portfolio value
      v_total_portfolio_value := v_total_portfolio_value + (v_today_price * v_shares);
    END LOOP;

    -- Calculate return percentage
    IF v_total_portfolio_value > 0 THEN
      v_r_1d_pct := (v_total_pnl / v_total_portfolio_value) * 100;
    ELSE
      v_r_1d_pct := NULL;
    END IF;

    -- Insert or update metrics
    IF v_total_pnl != 0 OR v_total_portfolio_value > 0 THEN
      INSERT INTO strategy_metrics (
        strategy_id, as_of_date, r_1d_pnl, r_1d_pct, portfolio_value
      )
      VALUES (
        v_strategy_id, p_date, v_total_pnl, v_r_1d_pct, v_total_portfolio_value
      )
      ON CONFLICT (strategy_id, as_of_date)
      DO UPDATE SET
        r_1d_pnl = EXCLUDED.r_1d_pnl,
        r_1d_pct = EXCLUDED.r_1d_pct,
        portfolio_value = EXCLUDED.portfolio_value,
        updated_at = NOW();

      v_insert_count := v_insert_count + 1;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_strategy_id, v_insert_count;
END;
$$ LANGUAGE plpgsql;
