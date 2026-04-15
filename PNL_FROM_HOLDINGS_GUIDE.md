# Calculate PnL from Stored Holdings

This script provides functions to calculate daily PnL directly from the holdings stored in `strategy_metrics.holdings_live`.

## What It Does

1. Fetches the `holdings_live` JSONB from a specific strategy_metrics record
2. For each holding, gets yesterday's and today's closing prices
3. Calculates: `(today_price - yesterday_price) × quantity`
4. Returns the breakdown or updates the table

## Functions

### 1. `calculate_pnl_from_holdings()` - View Breakdown

Returns a detailed breakdown of each holding's PnL.

**Setup:**

1. Supabase Dashboard → SQL Editor
2. Create **New Query**
3. Paste the entire contents of `scripts/calculate_pnl_from_stored_holdings.sql`
4. Click **Run**

**Usage:**

```sql
SELECT * FROM calculate_pnl_from_holdings(
  'your-strategy-id'::UUID,
  '2024-04-15'::DATE
);
```

Returns:
- `holding_symbol` - Stock symbol
- `holding_quantity` - Number of shares
- `yesterday_price` - Price at market close yesterday
- `today_price` - Price at market close today
- `daily_change` - Price difference
- `holding_pnl` - (daily_change × quantity)

**Example Output:**

```
holding_symbol | quantity | yesterday_price | today_price | daily_change | holding_pnl
MTN.JO         | 3        | 20100           | 20280       | 180          | 540
MTM.JO         | 10       | 3650            | 3671        | 21           | 210
DCP.JO         | 10       | 3685            | 3651        | -34          | -340
```

### 2. `update_pnl_from_holdings()` - Update Table

Calculates PnL from holdings and updates the `strategy_metrics` table.

**Usage:**

```sql
SELECT * FROM update_pnl_from_holdings(
  'your-strategy-id'::UUID,
  '2024-04-15'::DATE
);
```

Returns:
- `total_pnl` - Sum of all holdings' PnL
- `total_portfolio_value` - Sum of all holdings' values at today's prices
- `return_pct` - (total_pnl / total_portfolio_value) × 100
- `records_updated` - 1 if successful

**Example Output:**

```
total_pnl | total_portfolio_value | return_pct | records_updated
410       | 232082                | 0.1767     | 1
```

## Usage Examples

### Get Your Strategy ID

First, find your strategy ID:

```sql
SELECT id, name FROM strategies LIMIT 5;
```

Copy the UUID you want to use.

### Example 1: View PnL Breakdown for Today

```sql
SELECT * FROM calculate_pnl_from_holdings(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::UUID,
  CURRENT_DATE
);
```

### Example 2: View PnL Breakdown for Yesterday

```sql
SELECT * FROM calculate_pnl_from_holdings(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::UUID,
  CURRENT_DATE - INTERVAL '1 day'
);
```

### Example 3: Recalculate and Update PnL for a Specific Date

Use this if you want to recalculate PnL from the stored holdings:

```sql
SELECT * FROM update_pnl_from_holdings(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::UUID,
  '2024-04-15'::DATE
);
```

### Example 4: Update PnL for All Strategies on a Specific Date

If you want to recalculate for all strategies:

```sql
WITH strategies_on_date AS (
  SELECT DISTINCT strategy_id 
  FROM strategy_metrics 
  WHERE as_of_date = '2024-04-15'
)
SELECT 
  strategy_id,
  (update_pnl_from_holdings(strategy_id, '2024-04-15'::DATE)).*
FROM strategies_on_date;
```

### Example 5: Recalculate Last 7 Days for One Strategy

```sql
WITH date_range AS (
  SELECT CURRENT_DATE - INTERVAL '1 day' * s.num as calc_date
  FROM generate_series(0, 6) as s(num)
)
SELECT 
  calc_date,
  (update_pnl_from_holdings('your-strategy-id'::UUID, calc_date)).*
FROM date_range;
```

## Verifying Results

After updating, check the results in the strategy_metrics table:

```sql
SELECT 
  strategy_id,
  as_of_date,
  r_1d_pnl,
  r_1d_pct,
  portfolio_value
FROM strategy_metrics
WHERE strategy_id = 'your-strategy-id'::UUID
  AND as_of_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY as_of_date DESC;
```

## Troubleshooting

### "No strategy_metrics record found"
- The strategy might not have holdings_live data for that date
- Check if holdings_live is NULL:
  ```sql
  SELECT holdings_live FROM strategy_metrics 
  WHERE strategy_id = 'your-id' AND as_of_date = 'your-date';
  ```

### All holdings return NULL prices
- Prices might be missing for that date (weekend, holiday, etc.)
- Check if price data exists:
  ```sql
  SELECT ts, close_price FROM security_prices
  WHERE security_id = 'your-security-id'
  ORDER BY ts DESC LIMIT 5;
  ```

### PnL looks wrong
- Compare manually:
  ```sql
  SELECT * FROM calculate_pnl_from_holdings(
    'your-strategy-id'::UUID,
    'your-date'::DATE
  );
  ```
- Sum the `holding_pnl` column manually
- Verify prices are correct

## Performance

- Single date calculation: ~100-500ms
- 7 days of data: ~1-2 seconds
- Full month (21 business days): ~3-5 seconds

Recalculating is safe - it overwrites the existing PnL values.
