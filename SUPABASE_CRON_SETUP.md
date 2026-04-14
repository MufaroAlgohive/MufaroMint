# Supabase Cron Setup for Daily Strategy Metrics

Use Supabase's built-in `pg_cron` extension to schedule daily metrics calculation - no GitHub Actions needed!

## Step 1: Run the Cron Setup SQL

1. Go to **Supabase Dashboard → Your Project → SQL Editor**
2. Click **New Query**
3. Copy and paste the contents of `scripts/setup_supabase_cron.sql`
4. Click **Run**

This will:
- Enable the `pg_cron` extension
- Create a scheduled job to run daily at 21:00 UTC (23:00 UTC+2)
- Show you the scheduled jobs and their logs

## Step 2: Verify It's Working

In the same SQL Editor, run this query to see your scheduled jobs:

```sql
SELECT * FROM cron.job;
```

You should see a row with:
- `jobname`: `calculate-daily-strategy-metrics`
- `schedule`: `0 21 * * *`
- `command`: The SELECT query

## Step 3: Check Job Logs

See when the job ran and if there were any errors:

```sql
SELECT 
  jobid,
  jobname,
  start_time,
  end_time,
  status,
  return_message
FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 10;
```

## Adjusting the Schedule

To change the time, delete the old job and create a new one:

```sql
-- Delete the old job
SELECT cron.unschedule('calculate-daily-strategy-metrics');

-- Create a new one with different time (e.g., 9:00 AM UTC = 11:00 UTC+2)
SELECT cron.schedule(
  'calculate-daily-strategy-metrics',
  '0 9 * * *',  -- Change this to your desired time
  'SELECT calculate_daily_strategy_metrics(CURRENT_DATE - INTERVAL ''1 day'')'
);
```

## Cron Schedule Format

`minute hour day month day-of-week`

Examples:
- `0 21 * * *` - Every day at 21:00 UTC (23:00 UTC+2)
- `0 9 * * *` - Every day at 9:00 AM UTC
- `0 21 * * 1-5` - Monday-Friday at 21:00 UTC (business days only)
- `*/15 * * * *` - Every 15 minutes
- `0 */6 * * *` - Every 6 hours

## Disabling the Job

If you need to pause it temporarily:

```sql
SELECT cron.unschedule('calculate-daily-strategy-metrics');
```

## Re-enabling the Job

Simply run the schedule command again:

```sql
SELECT cron.schedule(
  'calculate-daily-strategy-metrics',
  '0 21 * * *',
  'SELECT calculate_daily_strategy_metrics(CURRENT_DATE - INTERVAL ''1 day'')'
);
```

## Troubleshooting

### Job not running
- Check `cron.job_run_details` table for error messages
- Verify the function `calculate_daily_strategy_metrics()` exists
- Make sure Supabase project is not paused (free tier)

### Function not found error
- Re-run `scripts/calculate_daily_metrics.sql` from the SQL Editor

### Permission denied
- The job runs as the `postgres` user
- Make sure the function doesn't require special permissions

## Advantages Over GitHub Actions

✅ No GitHub billing concerns  
✅ Native to Supabase (no external service)  
✅ Runs directly on your database  
✅ Easier logging and monitoring  
✅ Zero additional cost  
✅ More reliable (no GitHub runner dependency)

## Costs

- **Supabase cron**: Included (no extra cost)
- **Database compute**: Minimal (~1-2 seconds per run)
- **Total**: $0
