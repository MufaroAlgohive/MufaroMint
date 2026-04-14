# Supabase Setup for Daily Strategy Metrics

This guide explains how to automatically calculate daily strategy metrics on Supabase.

## Step 1: Deploy SQL Function to Supabase

### Via Supabase Dashboard

1. Go to **Supabase Dashboard** → Your Project → **SQL Editor**
2. Click **New Query**
3. Copy the contents of `scripts/calculate_daily_metrics.sql`
4. Paste and click **Run**

### Via Migrations (if using Supabase CLI)

```bash
supabase migration new create_daily_metrics_function
```

Copy `scripts/calculate_daily_metrics.sql` into the migration file, then:

```bash
supabase db push
```

## Step 2: Get Your Supabase Database URL

1. Go to **Supabase Dashboard** → Your Project → **Settings** → **Database**
2. Copy the **Connection string** (PostgreSQL)
3. It looks like: `postgresql://postgres.[PROJECT_ID]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`

## Step 3: Add GitHub Secret

1. Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Name: `SUPABASE_DB_URL`
4. Value: Paste the connection string from Step 2
5. Click **Add secret**

## Step 4: Customize the Cron Schedule

Edit `.github/workflows/daily-metrics.yml` and change the cron time:

```yaml
on:
  schedule:
    # Cron format: minute hour day month day-of-week
    - cron: '0 16 * * *'  # 4:00 PM UTC daily
```

Common times:
- `0 16 * * *` - 4:00 PM UTC (16:00)
- `0 9 * * *` - 9:00 AM UTC
- `0 21 * * 1-5` - 9:00 PM UTC, Monday-Friday only

**Need to convert to UTC?**
- 4:00 PM EST = `0 21 * * *` (9:00 PM UTC)
- 9:00 AM EST = `0 14 * * *` (2:00 PM UTC)

## Step 5: Test It

### Manual Trigger

1. Go to your GitHub repo → **Actions**
2. Click **Daily Strategy Metrics**
3. Click **Run workflow** → **Run workflow**
4. Wait for it to complete (should take ~30 seconds)

### Check Results

1. Go back to **Supabase Dashboard** → **SQL Editor**
2. Run this query to see today's metrics:

```sql
SELECT strategy_id, as_of_date, r_1d_pnl, r_1d_pct, portfolio_value
FROM strategy_metrics
ORDER BY as_of_date DESC
LIMIT 10;
```

## Step 6: Monitor Runs

- **Supabase Dashboard** → Your Project → **Logs** to see database activity
- **GitHub** → Actions → Daily Strategy Metrics to see workflow runs
- GitHub will email you if the workflow fails

## Troubleshooting

### Secret not found error
- Verify the secret name is exactly `SUPABASE_DB_URL`
- Wait a few minutes after adding the secret before running

### Connection refused
- Make sure your Supabase project is **not paused** (free tier pauses after 7 days of inactivity)
- Check that the connection string includes the correct password

### Function not found
- Make sure the SQL function was successfully applied (no errors in SQL Editor)
- Verify you're calling the correct function name

### Logs not showing up
- GitHub Actions logs are in the **Actions** tab
- Supabase logs are in **Settings** → **Logs** (may have a delay)

## Optional: Get Notifications

### Slack Notifications

Add to your workflow (requires Slack App):

```yaml
      - name: Notify Slack
        if: failure()
        uses: slackapi/slack-github-action@v1.24.0
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK }}
          payload: |
            {
              "text": "❌ Daily metrics calculation failed"
            }
```

### Email Notifications

GitHub will automatically email you if the workflow fails.

## Alternative: External Cron Service

If you prefer not to use GitHub Actions:

1. Go to **cron-job.org** or **easycron.com**
2. Create a new cron job with URL: (requires a webhook endpoint - not recommended for this use case)

**GitHub Actions is simpler for this.**

## Costs

- **GitHub Actions**: Free (includes 2,000 free minutes/month)
- **Supabase**: Uses compute during function execution (minimal cost)
- **Total**: Should cost $0

## Next Steps

Once this is working:
1. Add other return period calculations (1W, 1M, 3M, YTD, 1Y, 3Y)
2. Add portfolio value tracking
3. Add cash flow adjustments for deposits/withdrawals
