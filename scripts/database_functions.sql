-- ============================================================================
-- FUNCTION: backfill_strategy_metrics
-- Purpose: Create daily portfolio value snapshots for all strategies
-- ============================================================================

CREATE OR REPLACE FUNCTION public.backfill_strategy_metrics()
RETURNS TABLE(strategy_id uuid, records_inserted integer) AS $$
DECLARE
  v_strategy_id UUID;
  v_strategy_name TEXT;
  v_holdings JSONB;
  v_current_date DATE;
  v_earliest_date DATE;
  v_portfolio_value NUMERIC;
  v_holdings_snapshot JSONB;
  v_insert_count INTEGER;
  v_today DATE := CURRENT_DATE;
BEGIN
  -- Loop through all active strategies
  FOR v_strategy_id, v_strategy_name, v_holdings IN
    SELECT s.id, s.name, s.holdings
    FROM strategies s
    WHERE s.status = 'active'
  LOOP
    v_insert_count := 0;

    -- Find earliest date with price data for this strategy's holdings
    SELECT MIN(sp.ts) INTO v_earliest_date
    FROM security_prices sp
    WHERE sp.security_id IN (
      SELECT DISTINCT sec.id
      FROM securities sec
      WHERE UPPER(sec.symbol) IN (
        SELECT UPPER(COALESCE(h->>'ticker', h->>'symbol'))
        FROM jsonb_array_elements(v_holdings) h
      )
    );

    -- If no price data found, skip this strategy
    IF v_earliest_date IS NULL THEN
      CONTINUE;
    END IF;

    -- Backfill from earliest date to today
    v_current_date := v_earliest_date;
    WHILE v_current_date <= v_today LOOP

      -- Calculate portfolio value for this date
      WITH holdings_with_prices AS (
        SELECT
          COALESCE(h->>'ticker', h->>'symbol') AS symbol,
          (COALESCE(h->>'shares', h->>'quantity', '1'))::NUMERIC AS shares,
          sp.close_price,
          ((COALESCE(h->>'shares', h->>'quantity', '1'))::NUMERIC * (sp.close_price / 100)) AS value
        FROM jsonb_array_elements(v_holdings) h
        JOIN securities s ON UPPER(s.symbol) = UPPER(COALESCE(h->>'ticker', h->>'symbol'))
        JOIN security_prices sp ON sp.security_id = s.id AND sp.ts = v_current_date
      )
      SELECT
        COALESCE(SUM(value), 0)::NUMERIC,
        jsonb_object_agg(
          symbol,
          jsonb_build_object(
            'symbol', symbol,
            'shares', shares,
            'price', close_price,
            'value', value
          )
        )
      INTO v_portfolio_value, v_holdings_snapshot
      FROM holdings_with_prices;

      -- Only insert if we have values
      IF v_portfolio_value > 0 THEN
        INSERT INTO strategy_metrics (strategy_id, as_of_date, portfolio_value, holdings_live)
        VALUES (v_strategy_id, v_current_date, v_portfolio_value, v_holdings_snapshot)
        ON CONFLICT (strategy_id, as_of_date)
        DO UPDATE SET
          portfolio_value = EXCLUDED.portfolio_value,
          holdings_live = EXCLUDED.holdings_live,
          updated_at = NOW();

        v_insert_count := v_insert_count + 1;
      END IF;

      v_current_date := v_current_date + INTERVAL '1 day';
    END LOOP;

    RETURN QUERY SELECT v_strategy_id, v_insert_count;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: calculate_strategy_returns
-- Purpose: Calculate period returns (1w, 1m, 3m, ytd, 1y, 3y, all-time)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_strategy_returns()
RETURNS TABLE(strategy_id uuid, ytd NUMERIC, one_week NUMERIC, one_month NUMERIC,
              three_month NUMERIC, one_year NUMERIC, three_year NUMERIC, all_time NUMERIC) AS $$
DECLARE
  v_strategy_id UUID;
  v_today DATE := CURRENT_DATE;
  v_today_value NUMERIC;
  v_earliest_date DATE;
  v_earliest_value NUMERIC;
  v_jan1_date DATE;
  v_past_value NUMERIC;
  v_r_1w NUMERIC;
  v_r_1m NUMERIC;
  v_r_3m NUMERIC;
  v_r_6m NUMERIC;
  v_r_1y NUMERIC;
  v_r_3y NUMERIC;
  v_r_ytd NUMERIC;
  v_r_all_time NUMERIC;
BEGIN
  -- Get all unique strategies
  FOR v_strategy_id IN
    SELECT DISTINCT strategy_id FROM strategy_metrics
  LOOP

    -- Reset return values
    v_r_1w := NULL;
    v_r_1m := NULL;
    v_r_3m := NULL;
    v_r_6m := NULL;
    v_r_1y := NULL;
    v_r_3y := NULL;
    v_r_ytd := NULL;
    v_r_all_time := NULL;

    -- Get today's portfolio value
    SELECT portfolio_value INTO v_today_value
    FROM strategy_metrics
    WHERE strategy_id = v_strategy_id
    AND as_of_date = v_today;

    IF v_today_value IS NULL OR v_today_value <= 0 THEN
      CONTINUE;
    END IF;

    -- Get earliest date
    SELECT MIN(as_of_date) INTO v_earliest_date
    FROM strategy_metrics
    WHERE strategy_id = v_strategy_id;

    -- Calculate all-time return
    SELECT portfolio_value INTO v_earliest_value
    FROM strategy_metrics
    WHERE strategy_id = v_strategy_id
    AND as_of_date = v_earliest_date;

    IF v_earliest_value IS NOT NULL AND v_earliest_value > 0 THEN
      v_r_all_time := (v_today_value / v_earliest_value) - 1;
    END IF;

    -- Calculate 1-week return
    SELECT portfolio_value INTO v_past_value
    FROM strategy_metrics
    WHERE strategy_id = v_strategy_id
    AND as_of_date = v_today - INTERVAL '7 days'
    LIMIT 1;

    IF v_past_value IS NOT NULL AND v_past_value > 0 THEN
      v_r_1w := (v_today_value / v_past_value) - 1;
    END IF;

    -- Calculate 1-month return
    SELECT portfolio_value INTO v_past_value
    FROM strategy_metrics
    WHERE strategy_id = v_strategy_id
    AND as_of_date = v_today - INTERVAL '30 days'
    LIMIT 1;

    IF v_past_value IS NOT NULL AND v_past_value > 0 THEN
      v_r_1m := (v_today_value / v_past_value) - 1;
    END IF;

    -- Calculate 3-month return
    SELECT portfolio_value INTO v_past_value
    FROM strategy_metrics
    WHERE strategy_id = v_strategy_id
    AND as_of_date = v_today - INTERVAL '90 days'
    LIMIT 1;

    IF v_past_value IS NOT NULL AND v_past_value > 0 THEN
      v_r_3m := (v_today_value / v_past_value) - 1;
    END IF;

    -- Calculate 6-month return
    SELECT portfolio_value INTO v_past_value
    FROM strategy_metrics
    WHERE strategy_id = v_strategy_id
    AND as_of_date = v_today - INTERVAL '180 days'
    LIMIT 1;

    IF v_past_value IS NOT NULL AND v_past_value > 0 THEN
      v_r_6m := (v_today_value / v_past_value) - 1;
    END IF;

    -- Calculate 1-year return
    SELECT portfolio_value INTO v_past_value
    FROM strategy_metrics
    WHERE strategy_id = v_strategy_id
    AND as_of_date = v_today - INTERVAL '365 days'
    LIMIT 1;

    IF v_past_value IS NOT NULL AND v_past_value > 0 THEN
      v_r_1y := (v_today_value / v_past_value) - 1;
    END IF;

    -- Calculate 3-year return
    SELECT portfolio_value INTO v_past_value
    FROM strategy_metrics
    WHERE strategy_id = v_strategy_id
    AND as_of_date = v_today - INTERVAL '1095 days'
    LIMIT 1;

    IF v_past_value IS NOT NULL AND v_past_value > 0 THEN
      v_r_3y := (v_today_value / v_past_value) - 1;
    END IF;

    -- Calculate YTD return (from Jan 1 of current year)
    v_jan1_date := MAKE_DATE(EXTRACT(YEAR FROM v_today)::INTEGER, 1, 1);

    SELECT portfolio_value INTO v_past_value
    FROM strategy_metrics
    WHERE strategy_id = v_strategy_id
    AND as_of_date >= v_jan1_date
    ORDER BY as_of_date ASC
    LIMIT 1;

    IF v_past_value IS NOT NULL AND v_past_value > 0 THEN
      v_r_ytd := (v_today_value / v_past_value) - 1;
    END IF;

    -- Update strategy_metrics with calculated returns
    UPDATE strategy_metrics
    SET
      r_1w = v_r_1w,
      r_1m = v_r_1m,
      r_3m = v_r_3m,
      r_6m = v_r_6m,
      r_1y = v_r_1y,
      r_3y = v_r_3y,
      r_ytd = v_r_ytd,
      r_all_time = v_r_all_time,
      computed_at = NOW()
    WHERE strategy_id = v_strategy_id
    AND as_of_date = v_today;

    RETURN QUERY SELECT
      v_strategy_id,
      v_r_ytd,
      v_r_1w,
      v_r_1m,
      v_r_3m,
      v_r_1y,
      v_r_3y,
      v_r_all_time;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Usage:
-- ============================================================================
-- -- Run backfill (one-time or as needed)
-- SELECT * FROM public.backfill_strategy_metrics();
--
-- -- Calculate/update returns (daily)
-- SELECT * FROM public.calculate_strategy_returns();
--
-- -- Schedule with pg_cron (if available)
-- SELECT cron.schedule('backfill-strategy-metrics', '0 1 * * *', 'SELECT public.backfill_strategy_metrics()');
-- SELECT cron.schedule('calculate-strategy-returns', '0 2 * * *', 'SELECT public.calculate_strategy_returns()');
