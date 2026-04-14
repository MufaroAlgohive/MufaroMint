# Testing & Backfilling Strategy Metrics

This guide explains how to test the daily metrics calculation and backfill historical data.

## Step 1: Deploy the Backfill Function

1. Go to **Supabase Dashboard → SQL Editor**
2. Create a **New Query**
3. Copy and paste the contents of `scripts/backfill_strategy_metrics.sql`
4. Click **Run**

This creates the `backfill_strategy_metrics()` function.

## Step 2: Test with a Single Day

Before backfilling all history, test with today's data:

```sql
-- Calculate metrics for today
SELECT calculate_daily_strategy_metrics(CURRENT_DATE);

-- Check if data was inserted
SELECT strategy_id, as_of_date, r_1d_pnl, r_1d_pct
FROM strategy_metrics
WHERE as_of_date = CURRENT_DATE
ORDER BY updated_at DESC;
```

## Step 3: Backfill Historical Data

Once you confirm it works for one day, backfill all history:

```sql
-- Backfill from earliest date to today
SELECT * FROM backfill_strategy_metrics();
```

Monitor the output - it will show how many days were processed and inserted per strategy.

### Alternative: Backfill Specific Date Range

```sql
-- Backfill from January 1, 2024 to today
SELECT * FROM backfill_strategy_metrics('2024-01-01'::DATE);

-- Backfill a specific range
SELECT * FROM backfill_strategy_metrics('2024-01-01'::DATE, '2024-03-31'::DATE);

-- Backfill just last 30 days
SELECT * FROM backfill_strategy_metrics(
  CURRENT_DATE - INTERVAL '30 days'
);
```

## Step 4: Verify the Backfill

Check how much data was populated:

```sql
-- Count records per strategy
SELECT 
  strategy_id,
  COUNT(*) as total_records,
  MIN(as_of_date) as earliest_date,
  MAX(as_of_date) as latest_date
FROM strategy_metrics
GROUP BY strategy_id
ORDER BY strategy_id;

-- View sample data
SELECT 
  strategy_id,
  as_of_date,
  r_1d_pnl,
  r_1d_pct,
  portfolio_value
FROM strategy_metrics
ORDER BY as_of_date DESC
LIMIT 20;
```

## Step 5: Check for Issues

If some dates have no data, it's normal - they might be:
- Weekends (markets closed)
- Public holidays
- Dates before price data exists
- Days with incomplete price data

Check for any errors:

```sql
-- See if any dates failed
SELECT 
  strategy_id,
  as_of_date
FROM strategy_metrics
WHERE r_1d_pnl IS NULL AND r_1d_pct IS NULL
ORDER BY as_of_date DESC
LIMIT 20;
```

## Step 6: Monitor Ongoing Runs

Once the Supabase cron job is active, monitor it:

```sql
-- Check daily job runs
SELECT 
  jobid,
  jobname,
  start_time,
  end_time,
  status,
  return_message
FROM cron.job_run_details
WHERE jobname = 'calculate-daily-strategy-metrics'
ORDER BY start_time DESC
LIMIT 20;
```

## Troubleshooting

### No data inserted
- Check if `calculate_daily_strategy_metrics()` function exists
- Verify security_prices table has data for the dates
- Check for SQL errors in the return_message

### Slow backfill
- Backfilling many days can take time
- Run for shorter date ranges if needed
- Check database compute resources

### Some strategies missing
- Verify strategies have `status = 'active'`
- Check if holdings are properly formatted as JSONB
- Ensure security symbols match those in securities table

## Timeline Example

If your earliest price data is 2024-01-01:

1. **Test Day 1:** `SELECT calculate_daily_strategy_metrics(CURRENT_DATE);`
2. **If successful:** Run backfill
3. **Backfill time:** ~5-30 seconds for 1 year of daily data (depends on DB size)
4. **Verify:** Check counts and sample data
5. **Enable Cron:** Scheduled job will run daily from then on

## Next Steps

Once backfill is complete:
- ✅ Historical data is populated
- ✅ Daily cron job will maintain it going forward
- ✅ You can analyze trends with full historical context
