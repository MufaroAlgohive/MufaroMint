-- ============================================================
-- security_metrics
-- ============================================================
-- Daily snapshot of each security's price and computed period
-- returns.  Think of this as a richer version of security_prices:
-- it stores the full OHLCV bar PLUS pre-computed returns so the
-- frontend never has to derive them from raw price history.
--
-- Benchmark prices (the "what is this stock measured against")
-- are stored here as well — the benchmark_close column holds the
-- closing price of the security's benchmark index on the same day.
--
-- Returns are stored as decimals (e.g. 0.0512 = +5.12%).
-- Prices are stored in ZAR cents (consistent with security_prices
-- and stock_holdings.avg_fill).
-- ============================================================

CREATE TABLE IF NOT EXISTS security_metrics (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  security_id         uuid          NOT NULL REFERENCES securities(id) ON DELETE CASCADE,

  -- ── OHLCV ────────────────────────────────────────────────
  as_of_date          date          NOT NULL,
  open_price          numeric(18,4),        -- ZAR cents
  high_price          numeric(18,4),        -- ZAR cents
  low_price           numeric(18,4),        -- ZAR cents
  close_price         numeric(18,4) NOT NULL, -- ZAR cents (authoritative daily close)
  volume              bigint,

  -- ── 1-day change ─────────────────────────────────────────
  prev_close          numeric(18,4),        -- previous trading day close (ZAR cents)
  change_abs          numeric(18,4),        -- close_price - prev_close (ZAR cents)
  change_pct          numeric(10,6),        -- (change_abs / prev_close) as decimal

  -- ── Period returns (all decimals, e.g. 0.05 = +5%) ──────
  -- Each return is calculated against the matching reference_dates row
  r_1d                numeric(10,6),        -- 1-day return
  r_wtd               numeric(10,6),        -- week-to-date (Monday open / last Friday close)
  r_1w                numeric(10,6),        -- rolling 5 trading days
  r_1m                numeric(10,6),        -- rolling 1 calendar month
  r_3m                numeric(10,6),        -- rolling 3 calendar months
  r_6m                numeric(10,6),        -- rolling 6 calendar months
  r_ytd               numeric(10,6),        -- year-to-date from Dec 31 prev year
  r_1y                numeric(10,6),        -- rolling 12 calendar months

  -- ── Benchmark comparison ──────────────────────────────────
  -- Benchmark is the index this security is measured against
  -- (e.g. JSE All Share for SA equities, S&P 500 for US equities).
  -- Stored as the benchmark's CLOSING VALUE on as_of_date so the
  -- returns engine can compute relative/excess return without a
  -- separate join.
  benchmark_symbol    text,                 -- e.g. 'J203', 'SPY', 'STX40'
  benchmark_close     numeric(18,4),        -- benchmark closing value (index points or cents)
  benchmark_r_ytd     numeric(10,6),        -- benchmark's own YTD return (decimal)
  active_return_ytd   numeric(10,6),        -- r_ytd - benchmark_r_ytd (excess return, decimal)

  -- ── Metadata ─────────────────────────────────────────────
  source              text,                 -- e.g. 'JSE', 'yahoo', 'manual'
  is_estimated        boolean NOT NULL DEFAULT false, -- true if price was estimated/interpolated
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  -- one row per (security × date)
  UNIQUE (security_id, as_of_date)
);

-- ── Indexes ───────────────────────────────────────────────────

-- Primary lookup: latest metrics for all securities
CREATE INDEX IF NOT EXISTS idx_security_metrics_date
  ON security_metrics (as_of_date DESC);

-- Lookup for a single security's history
CREATE INDEX IF NOT EXISTS idx_security_metrics_security_date
  ON security_metrics (security_id, as_of_date DESC);

-- ── updated_at trigger ────────────────────────────────────────
-- Reuses set_updated_at() created in create-reference-dates.sql
-- Run that migration first, or create the function here if needed:

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_security_metrics_updated_at ON security_metrics;
CREATE TRIGGER trg_security_metrics_updated_at
  BEFORE UPDATE ON security_metrics
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── RLS ───────────────────────────────────────────────────────
ALTER TABLE security_metrics ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read (public market data)
CREATE POLICY "security_metrics_read" ON security_metrics
  FOR SELECT TO authenticated
  USING (true);

-- Only the service role may write
CREATE POLICY "security_metrics_service_write" ON security_metrics
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ── Helpful views ─────────────────────────────────────────────

-- Latest metrics per security (most recent trading day).
-- Aliases actual column names (last_close, 1W_Return, etc.) to the
-- code-expected conventions (close_price, r_1w, etc.) so the frontend
-- never has to know about the populate-script naming choices.
CREATE OR REPLACE VIEW v_latest_security_metrics AS
SELECT DISTINCT ON (sm.security_id)
  sm.security_id,
  sm.security_id      AS id,           -- used by getSecurityPrices FK lookup
  s.symbol,
  s.name,
  s.logo_url,
  s.sector,
  s.exchange,
  s.market_cap,
  s.dividend_yield,
  s.pe,
  sm.as_of_date,
  -- Price columns: populate script uses last_close (Rands), code expects close_price
  sm.last_close                         AS close_price,
  sm.prev_close,
  sm.change_abs,
  sm.change_pct,
  -- Return aliases: populate script uses 1W_Return etc, code expects r_1w etc
  sm.change_pct                         AS r_1d,
  sm."WTD_Return"                       AS r_wtd,
  sm."1W_Return"                        AS r_1w,
  sm."1M_Return"                        AS r_1m,
  sm."3M_Return"                        AS r_3m,
  sm.r_6m,
  sm.r_ytd,
  sm.r_1y,
  sm.avg_volume_30d,
  sm.volatility_30d,
  -- Reference anchor prices embedded in the row — used to build 2-point
  -- charts while daily history is still accumulating in security_metrics
  sm."1W_Date"                          AS ref_1w_date,
  sm."1W_Price"                         AS ref_1w_price,
  sm."WTD_Date"                         AS ref_wtd_date,
  sm."WTD_Price"                        AS ref_wtd_price,
  sm."1M_Date"                          AS ref_1m_date,
  sm."1M_Price"                         AS ref_1m_price,
  sm."3M_Date"                          AS ref_3m_date,
  sm."3M_Price"                         AS ref_3m_price,
  sm."YTD_Date"                         AS ref_ytd_date,
  sm."YTD_Price"                        AS ref_ytd_price
FROM security_metrics sm
LEFT JOIN securities s ON s.id = sm.security_id
WHERE sm.last_close IS NOT NULL
  AND CAST(sm.last_close AS numeric) > 0
ORDER BY sm.security_id, sm.as_of_date DESC;

-- All returns for a given date (used by the returns engine batch job)
CREATE OR REPLACE VIEW v_security_returns AS
SELECT
  sm.security_id,
  s.symbol,
  sm.as_of_date,
  sm.close_price,
  sm.change_pct    AS r_1d,
  sm.r_wtd,
  sm.r_1w,
  sm.r_1m,
  sm.r_3m,
  sm.r_6m,
  sm.r_ytd,
  sm.r_1y,
  sm.benchmark_symbol,
  sm.active_return_ytd
FROM security_metrics sm
JOIN securities s ON s.id = sm.security_id;

-- ── Comments ──────────────────────────────────────────────────
COMMENT ON TABLE security_metrics IS
  'Daily OHLCV bar + pre-computed period returns for every security. '
  'Benchmark close prices are co-stored here so excess returns can be '
  'computed without a secondary join. All prices in ZAR cents, all '
  'returns as decimals (0.05 = +5%). Updated nightly after market close.';

COMMENT ON COLUMN security_metrics.close_price IS
  'Authoritative daily closing price in ZAR cents. '
  'Source of truth — use this, not securities.last_price, for historical calcs.';

COMMENT ON COLUMN security_metrics.r_ytd IS
  'Year-to-date return as a decimal (e.g. 0.0512 = +5.12%). '
  'Denominator is the close_price from the reference_dates row where '
  'security_id matches and period = ''ytd'' and as_of_date = this row''s as_of_date.';

COMMENT ON COLUMN security_metrics.benchmark_close IS
  'Closing value of the benchmark index on as_of_date. '
  'Stored in index points or ZAR cents depending on the benchmark. '
  'See benchmark_symbol for context.';

COMMENT ON COLUMN security_metrics.active_return_ytd IS
  'Excess (active) return = r_ytd - benchmark_r_ytd. '
  'Positive means the security outperformed its benchmark YTD.';
