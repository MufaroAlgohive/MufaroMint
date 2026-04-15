-- ============================================================================
-- FUNCTION: calculate_pnl_from_holdings
-- Purpose: Calculate PnL by comparing today's and yesterday's prices
--          using the holdings stored in the strategy_metrics table
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_pnl_from_holdings(
  p_strategy_id UUID,
  p_as_of_date DATE
)
RETURNS TABLE(
  holding_symbol TEXT,
  holding_quantity NUMERIC,
  yesterday_price NUMERIC,
  today_price NUMERIC,
  daily_change NUMERIC,
  holding_pnl NUMERIC
) AS $$
DECLARE
  v_holdings JSONB;
  v_holding JSONB;
  v_symbol TEXT;
  v_quantity NUMERIC;
  v_security_id UUID;
  v_yesterday_price NUMERIC;
  v_today_price NUMERIC;
  v_daily_change NUMERIC;
  v_holding_pnl NUMERIC;
  v_yesterday_date DATE;
BEGIN
  v_yesterday_date := p_as_of_date - INTERVAL '1 day';

  -- Get holdings from strategy_metrics for this date
  SELECT holdings_live INTO v_holdings
  FROM strategy_metrics
  WHERE strategy_id = p_strategy_id AND as_of_date = p_as_of_date;

  IF v_holdings IS NULL THEN
    RAISE EXCEPTION 'No strategy_metrics record found for strategy_id % on date %', p_strategy_id, p_as_of_date;
  END IF;

  -- Process each holding
  FOR v_holding IN SELECT * FROM jsonb_array_elements(v_holdings)
  LOOP
    v_symbol := COALESCE(v_holding->>'symbol', v_holding->>'ticker');
    v_quantity := (COALESCE(v_holding->>'shares', v_holding->>'quantity', '1'))::NUMERIC;

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

    -- Get yesterday's closing price
    SELECT close_price INTO v_yesterday_price
    FROM security_prices
    WHERE security_id = v_security_id AND ts = v_yesterday_date
    LIMIT 1;

    -- Get today's closing price
    SELECT close_price INTO v_today_price
    FROM security_prices
    WHERE security_id = v_security_id AND ts = p_as_of_date
    LIMIT 1;

    -- Skip if prices missing
    IF v_yesterday_price IS NULL OR v_today_price IS NULL THEN
      CONTINUE;
    END IF;

    -- Calculate change and PnL
    v_daily_change := v_today_price - v_yesterday_price;
    v_holding_pnl := v_daily_change * v_quantity;

    -- Return the result
    RETURN QUERY SELECT
      v_symbol::TEXT,
      v_quantity,
      v_yesterday_price,
      v_today_price,
      v_daily_change,
      v_holding_pnl;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: update_pnl_from_holdings
-- Purpose: Calculate PnL from holdings and update strategy_metrics table
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_pnl_from_holdings(
  p_strategy_id UUID,
  p_as_of_date DATE
)
RETURNS TABLE(
  total_pnl NUMERIC,
  total_portfolio_value NUMERIC,
  return_pct NUMERIC,
  records_updated INTEGER
) AS $$
DECLARE
  v_total_pnl NUMERIC := 0;
  v_total_portfolio_value NUMERIC := 0;
  v_return_pct NUMERIC;
  v_holdings JSONB;
  v_holding JSONB;
  v_symbol TEXT;
  v_quantity NUMERIC;
  v_security_id UUID;
  v_yesterday_price NUMERIC;
  v_today_price NUMERIC;
  v_holding_value NUMERIC;
BEGIN
  -- Get holdings from strategy_metrics for this date
  SELECT holdings_live INTO v_holdings
  FROM strategy_metrics
  WHERE strategy_id = p_strategy_id AND as_of_date = p_as_of_date;

  IF v_holdings IS NULL THEN
    RAISE EXCEPTION 'No strategy_metrics record found for strategy_id % on date %', p_strategy_id, p_as_of_date;
  END IF;

  -- Process each holding
  FOR v_holding IN SELECT * FROM jsonb_array_elements(v_holdings)
  LOOP
    v_symbol := COALESCE(v_holding->>'symbol', v_holding->>'ticker');
    v_quantity := (COALESCE(v_holding->>'shares', v_holding->>'quantity', '1'))::NUMERIC;

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

    -- Get yesterday's closing price
    SELECT close_price INTO v_yesterday_price
    FROM security_prices
    WHERE security_id = v_security_id AND ts = (p_as_of_date - INTERVAL '1 day')
    LIMIT 1;

    -- Get today's closing price
    SELECT close_price INTO v_today_price
    FROM security_prices
    WHERE security_id = v_security_id AND ts = p_as_of_date
    LIMIT 1;

    -- Skip if prices missing
    IF v_yesterday_price IS NULL OR v_today_price IS NULL THEN
      CONTINUE;
    END IF;

    -- Add to totals
    v_total_pnl := v_total_pnl + ((v_today_price - v_yesterday_price) * v_quantity);
    v_holding_value := v_today_price * v_quantity;
    v_total_portfolio_value := v_total_portfolio_value + v_holding_value;
  END LOOP;

  -- Calculate return percentage
  IF v_total_portfolio_value > 0 THEN
    v_return_pct := (v_total_pnl / v_total_portfolio_value) * 100;
  ELSE
    v_return_pct := NULL;
  END IF;

  -- Update the strategy_metrics table
  UPDATE strategy_metrics
  SET
    r_1d_pnl = v_total_pnl,
    r_1d_pct = v_return_pct,
    portfolio_value = v_total_portfolio_value,
    updated_at = NOW()
  WHERE strategy_id = p_strategy_id AND as_of_date = p_as_of_date;

  RETURN QUERY SELECT
    v_total_pnl,
    v_total_portfolio_value,
    v_return_pct,
    1::INTEGER;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Example usage:
-- ============================================================================

-- 1. View PnL breakdown for a specific strategy on a specific date
-- SELECT * FROM calculate_pnl_from_holdings(
--   'your-strategy-uuid'::UUID,
--   '2024-04-15'::DATE
-- );

-- 2. Update PnL for a specific strategy on a specific date
-- SELECT * FROM update_pnl_from_holdings(
--   'your-strategy-uuid'::UUID,
--   '2024-04-15'::DATE
-- );

-- 3. Update PnL for all strategies for a specific date
-- WITH updates AS (
--   SELECT DISTINCT strategy_id FROM strategy_metrics WHERE as_of_date = '2024-04-15'
-- )
-- SELECT strategy_id, (update_pnl_from_holdings(strategy_id, '2024-04-15'::DATE)).*
-- FROM updates;
