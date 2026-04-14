# Daily Strategy Metrics Cron Job Setup

This guide explains how to set up the daily strategy metrics calculation as a cron job.

## Prerequisites

1. PostgreSQL must be installed and accessible from your cron environment
2. Database credentials must be available as environment variables
3. The `calculate_daily_metrics.sql` function must be applied to your database

## Step 1: Apply the SQL Function

Run the SQL function once to create it in your database:

```bash
psql -h localhost -U postgres -d mint -f scripts/calculate_daily_metrics.sql
```

Or if you have a .pgpass file configured:

```bash
PGPASSWORD="your_password" psql -h localhost -U postgres -d mint -f scripts/calculate_daily_metrics.sql
```

## Step 2: Test the Script

Test the shell script manually:

```bash
# Run for yesterday (default)
./scripts/run_daily_metrics.sh

# Run for a specific date
./scripts/run_daily_metrics.sh 2024-04-14
```

Check the log file generated in the current directory.

## Step 3: Set Up Cron Job

Edit your crontab:

```bash
crontab -e
```

Add one of the following entries:

### Option A: Run daily at 4:00 PM (after market close)
```cron
0 16 * * * cd /path/to/mint && DB_HOST=localhost DB_PORT=5432 DB_NAME=mint DB_USER=postgres DB_PASSWORD=your_password ./scripts/run_daily_metrics.sh >> /var/log/strategy_metrics.log 2>&1
```

### Option B: Run daily at 9:00 AM (for previous day's data)
```cron
0 9 * * * cd /path/to/mint && DB_HOST=localhost DB_PORT=5432 DB_NAME=mint DB_USER=postgres DB_PASSWORD=your_password ./scripts/run_daily_metrics.sh >> /var/log/strategy_metrics.log 2>&1
```

### Option C: Run every hour
```cron
0 * * * * cd /path/to/mint && DB_HOST=localhost DB_PORT=5432 DB_NAME=mint DB_USER=postgres DB_PASSWORD=your_password ./scripts/run_daily_metrics.sh >> /var/log/strategy_metrics.log 2>&1
```

## Step 4: Secure Your Credentials

**Important:** Don't put passwords in crontab directly. Instead:

### Option 1: Use .pgpass file (Recommended)

Create `~/.pgpass` with:

```
localhost:5432:mint:postgres:your_password
```

Set permissions:

```bash
chmod 600 ~/.pgpass
```

Then your cron entry becomes:

```cron
0 16 * * * cd /path/to/mint && DB_HOST=localhost DB_PORT=5432 DB_NAME=mint DB_USER=postgres ./scripts/run_daily_metrics.sh >> /var/log/strategy_metrics.log 2>&1
```

### Option 2: Use environment file

Create a file like `~/.db_env`:

```bash
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=mint
export DB_USER=postgres
export DB_PASSWORD=your_password
```

Set permissions:

```bash
chmod 600 ~/.db_env
```

Then your cron entry:

```cron
0 16 * * * source ~/.db_env && cd /path/to/mint && ./scripts/run_daily_metrics.sh >> /var/log/strategy_metrics.log 2>&1
```

## Verify Cron Job

List your cron jobs:

```bash
crontab -l
```

Check logs:

```bash
# System cron logs (Linux)
tail -f /var/log/syslog | grep CRON

# Custom log file
tail -f /var/log/strategy_metrics.log
```

## Troubleshooting

### "psql: command not found"
- Ensure PostgreSQL client tools are in your PATH
- Use full path: `/usr/bin/psql` instead of `psql`

### "password authentication failed"
- Check .pgpass file permissions (must be 600)
- Verify credentials are correct

### "Permission denied"
- Make sure the script is executable: `chmod +x scripts/run_daily_metrics.sh`

### Cron not running
- Check that the user running cron has proper permissions
- Verify the PATH in cron includes necessary directories
- Use full absolute paths in cron entries

## Log Rotation (Optional)

To prevent log files from growing too large, set up log rotation:

Create `/etc/logrotate.d/strategy_metrics`:

```
/var/log/strategy_metrics.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0644 root root
}
```
