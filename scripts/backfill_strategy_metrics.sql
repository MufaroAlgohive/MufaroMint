-- ============================================================================
-- FUNCTION: backfill_strategy_metrics
-- Purpose: Backfill historical strategy metrics from earliest price data to today
-- ============================================================================

CREATE OR REPLACE FUNCTION public.backfill_strategy_metrics(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(strategy_id UUID, records_processed INTEGER, records_inserted INTEGER) AS $$
DECLARE
  v_strategy_id UUID;
  v_strategy_name TEXT;
  v_holdings JSONB;
  v_current_date DATE;
  v_earliest_date DATE;
  v_total_processed INTEGER := 0;
  v_total_inserted INTEGER := 0;
  v_total_strat_processed INTEGER;
  v_total_strat_inserted INTEGER;
BEGIN
  -- Loop through all active strategies
  FOR v_strategy_id, v_strategy_name, v_holdings IN
    SELECT s.id, s.name, s.holdings
    FROM strategies s
    WHERE s.status = 'active'
  LOOP
    v_total_strat_processed := 0;
    v_total_strat_inserted := 0;

    -- Find earliest date with price data for this strategy's holdings
    SELECT MIN(sp.ts) INTO v_earliest_date
    FROM security_prices sp
    JOIN securities s ON sp.security_id = s.id
    WHERE UPPER(s.symbol) IN (
      SELECT UPPER(COALESCE(h->>'symbol', h->>'ticker'))
      FROM jsonb_array_elements(v_holdings) h
      WHERE h->>'symbol' IS NOT NULL OR h->>'ticker' IS NOT NULL
    );

    -- If no price data found, skip this strategy
    IF v_earliest_date IS NULL THEN
      RAISE NOTICE 'No price data found for strategy: %', v_strategy_name;
      CONTINUE;
    END IF;

    -- Determine actual start date (use provided or earliest date + 1 day)
    v_current_date := COALESCE(p_start_date, v_earliest_date + INTERVAL '1 day');

    -- Backfill from start date to end date
    WHILE v_current_date <= p_end_date LOOP
      v_total_strat_processed := v_total_strat_processed + 1;

      -- Call the daily calculation function
      IF (SELECT calculate_daily_strategy_metrics(v_current_date)) IS NOT NULL THEN
        v_total_strat_inserted := v_total_strat_inserted + 1;
      END IF;

      v_current_date := v_current_date + INTERVAL '1 day';
    END LOOP;

    v_total_processed := v_total_processed + v_total_strat_processed;
    v_total_inserted := v_total_inserted + v_total_strat_inserted;

    RETURN QUERY SELECT v_strategy_id, v_total_strat_processed, v_total_strat_inserted;

    RAISE NOTICE 'Strategy %: Processed % days, Inserted % records',
      v_strategy_name, v_total_strat_processed, v_total_strat_inserted;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Example usage:
-- ============================================================================

-- Backfill all data from earliest date to today
-- SELECT * FROM backfill_strategy_metrics();

-- Backfill from specific date to today
-- SELECT * FROM backfill_strategy_metrics('2024-01-01'::DATE);

-- Backfill a specific date range
-- SELECT * FROM backfill_strategy_metrics('2024-01-01'::DATE, '2024-03-31'::DATE);
