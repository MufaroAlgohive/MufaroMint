-- ============================================================
-- reference_dates
-- ============================================================
-- Stores the locked anchor date + price for every return period
-- per security.  The returns engine reads this table instead of
-- back-deriving the denominator from a stale ytd_performance %.
--
-- period values (canonical):
--   'ytd'   → previous Dec 31 close  (YTD denominator)
--   'wtd'   → previous Friday close  (WTD denominator)
--   '1w'    → close exactly 5 trading days ago
--   '1m'    → close on the same calendar day 1 month ago
--   '3m'    → close on the same calendar day 3 months ago
--   '6m'    → close on the same calendar day 6 months ago
--   '1y'    → close on the same calendar day 12 months ago
-- ============================================================

CREATE TABLE IF NOT EXISTS reference_dates (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  security_id      uuid        NOT NULL REFERENCES securities(id) ON DELETE CASCADE,

  -- which period this row anchors
  period           text        NOT NULL
                   CHECK (period IN ('ytd','wtd','1w','1m','3m','6m','1y')),

  -- the actual calendar date the price was sourced from
  reference_date   date        NOT NULL,

  -- the closing price on reference_date (stored in ZAR cents, same
  -- convention as security_prices.close_price)
  reference_price  numeric(18,4) NOT NULL,

  -- the trading day this anchor was calculated/published for
  -- (i.e. "as of this date, the YTD start price is reference_price")
  as_of_date       date        NOT NULL,

  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),

  -- one row per (security × period × as_of_date)
  UNIQUE (security_id, period, as_of_date)
);

-- ── Indexes ──────────────────────────────────────────────────
-- Primary lookup: "give me the YTD anchor for all securities as of today"
CREATE INDEX IF NOT EXISTS idx_reference_dates_as_of
  ON reference_dates (as_of_date DESC, period);

-- Reverse lookup: history of a single security's anchors
CREATE INDEX IF NOT EXISTS idx_reference_dates_security
  ON reference_dates (security_id, period, as_of_date DESC);

-- ── updated_at trigger ────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reference_dates_updated_at ON reference_dates;
CREATE TRIGGER trg_reference_dates_updated_at
  BEFORE UPDATE ON reference_dates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── RLS ───────────────────────────────────────────────────────
ALTER TABLE reference_dates ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read reference dates (public market data)
CREATE POLICY "reference_dates_read" ON reference_dates
  FOR SELECT TO authenticated
  USING (true);

-- Only the service role (admin) may write
CREATE POLICY "reference_dates_service_write" ON reference_dates
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ── Helpful view: latest anchor per security × period ─────────
CREATE OR REPLACE VIEW v_latest_reference_dates AS
SELECT DISTINCT ON (security_id, period)
  id,
  security_id,
  period,
  reference_date,
  reference_price,
  as_of_date
FROM reference_dates
ORDER BY security_id, period, as_of_date DESC;

COMMENT ON TABLE reference_dates IS
  'Locked period-start prices for every security used as return denominators. '
  'Updated nightly by the returns engine after market close. '
  'Never back-derive denominators from ytd_performance — always read from here.';

COMMENT ON COLUMN reference_dates.reference_price IS
  'Closing price in ZAR cents on reference_date (same unit as security_prices.close_price).';

COMMENT ON COLUMN reference_dates.as_of_date IS
  'The trading day this anchor row is valid for (the "calculation date").';
