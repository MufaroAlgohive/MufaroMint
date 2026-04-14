-- ============================================================================
-- Enable pg_cron extension and schedule daily metrics calculation
-- ============================================================================

-- 1. Enable the pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Schedule the daily metrics calculation
-- Runs every day at 23:00 UTC+2 (21:00 UTC)
-- Cron format: minute hour day month day-of-week
SELECT cron.schedule(
  'calculate-daily-strategy-metrics',  -- job name
  '0 21 * * *',                        -- cron schedule (21:00 UTC = 23:00 UTC+2)
  'SELECT calculate_daily_strategy_metrics(CURRENT_DATE - INTERVAL ''1 day'')'
);

-- 3. View scheduled jobs
SELECT * FROM cron.job;

-- 4. View job logs
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
