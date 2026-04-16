import { supabase } from "./supabase";

// Simple in-memory cache with timestamps
const cache = {
  markets: { data: null, timestamp: 0, ttl: 60000 },
  priceHistory: new Map(),
};

// Map UI timeframe strings to the reference price columns in v_latest_security_metrics
const TIMEFRAME_REF_COLS = {
  "1D":  { date: "ref_1w_date",  price: "ref_1w_price"  },
  "1W":  { date: "ref_1w_date",  price: "ref_1w_price"  },
  "WTD": { date: "ref_wtd_date", price: "ref_wtd_price" },
  "1M":  { date: "ref_1m_date",  price: "ref_1m_price"  },
  "3M":  { date: "ref_3m_date",  price: "ref_3m_price"  },
  "6M":  { date: "ref_ytd_date", price: "ref_ytd_price" },
  "YTD": { date: "ref_ytd_date", price: "ref_ytd_price" },
  "1Y":  { date: "ref_ytd_date", price: "ref_ytd_price" },
};

/**
 * Normalise a raw security_metrics row into the shape the UI expects.
 * Prices are in Rands (no /100 needed). Returns are decimals (×100 for %).
 */
const processSecurity = (security) => ({
  ...security,
  // Ensure id always points to the securities PK so getSecurityPrices FK works
  id: security.security_id,
  // close_price alias already set by the view (last_close → close_price)
  currentPrice: security.close_price != null ? Number(security.close_price) : null,
  changePct: security.change_pct != null ? Number(security.change_pct) * 100 : null,
  // Prefer DB value; fall back to close_price - prev_close if null
  changeAbs: security.change_abs != null
    ? Number(security.change_abs)
    : (security.close_price != null && security.prev_close != null
        ? Number(security.close_price) - Number(security.prev_close)
        : null),
  returns: {
    d1:  security.r_1d  != null ? Number(security.r_1d)  * 100 : null,
    wtd: security.r_wtd != null ? Number(security.r_wtd) * 100 : null,
    w1:  security.r_1w  != null ? Number(security.r_1w)  * 100 : null,
    m1:  security.r_1m  != null ? Number(security.r_1m)  * 100 : null,
    m3:  security.r_3m  != null ? Number(security.r_3m)  * 100 : null,
    m6:  security.r_6m  != null ? Number(security.r_6m)  * 100 : null,
    ytd: security.r_ytd != null ? Number(security.r_ytd) * 100 : null,
    y1:  security.r_1y  != null ? Number(security.r_1y)  * 100 : null,
  },
  volatility: security.volatility_30d != null ? Number(security.volatility_30d) : null,
  avgVolume:  security.avg_volume_30d  != null ? Number(security.avg_volume_30d)  : null,
  // Legacy fields for backward compatibility
  last_price:        security.close_price,
  ytd_performance:   security.r_ytd != null ? Number(security.r_ytd) * 100 : null,
  change_percentage: security.change_pct != null ? Number(security.change_pct) * 100 : null,
});

/**
 * Get all securities with their latest metrics from Supabase
 * @returns {Promise<Array>} Array of securities with metrics
 */
export const getMarketsSecuritiesWithMetrics = async () => {
  const now = Date.now();

  if (cache.markets.data && (now - cache.markets.timestamp) < cache.markets.ttl) {
    console.log("📦 Using cached markets data");
    return cache.markets.data;
  }

  if (!supabase) {
    console.error("❌ Supabase client not initialized");
    return [];
  }

  try {
    console.log("🔍 Fetching rich market data from v_latest_security_metrics...");

    const { data: securities, error: securitiesError } = await supabase
      .from("v_latest_security_metrics")
      .select("*")
      .order("market_cap", { ascending: false, nullsFirst: false });

    if (securitiesError) {
      console.error("❌ Error fetching securities from view:", securitiesError);

      // Fallback to basic securities table if view fails
      console.log("⚠️ Falling back to basic securities table...");
      const { data: fallbackSecurities, error: fallbackError } = await supabase
        .from("securities_c")
        .select("*")
        .eq("is_active", true)
        .order("market_cap", { ascending: false, nullsFirst: false });

      if (fallbackError) throw fallbackError;
      return (fallbackSecurities || []).map(s => ({
        ...s,
        currentPrice: s.last_price ? Number(s.last_price) : null,
        changePct: Number(s.change_percentage || s.change_percent || 0),
      }));
    }

    const processedSecurities = (securities || []).map(processSecurity);

    console.log(`✅ Fetched ${processedSecurities.length} securities with rich metrics`);

    cache.markets.data = processedSecurities;
    cache.markets.timestamp = now;

    return processedSecurities;
  } catch (error) {
    console.error("💥 Exception while fetching securities with metrics:", error);
    return [];
  }
};

/**
 * Get a single security by symbol with its metrics
 * @param {string} symbol - The stock symbol
 * @returns {Promise<Object|null>} Security object with metrics or null
 */
export const getSecurityBySymbol = async (symbol) => {
  if (!supabase || !symbol) {
    console.error("❌ Supabase client not initialized or symbol missing");
    return null;
  }

  try {
    console.log(`🔍 Fetching security ${symbol}...`);

    const { data: security, error: securityError } = await supabase
      .from("v_latest_security_metrics")
      .select("*")
      .eq("symbol", symbol)
      .single();

    if (securityError) {
      console.error(`❌ Error fetching security ${symbol}:`, securityError);
      return null;
    }

    if (!security) {
      console.warn(`⚠️ No security found for symbol ${symbol}`);
      return null;
    }

    const processedSecurity = processSecurity(security);
    console.log(`✅ Processed ${symbol} — price: ${processedSecurity.currentPrice}, changePct: ${processedSecurity.changePct}`);
    return processedSecurity;
  } catch (error) {
    console.error(`💥 Exception while fetching security ${symbol}:`, error);
    return null;
  }
};

/**
 * Get price history for a security based on timeframe.
 *
 * Strategy:
 *   1. Query security_metrics for all daily rows within the date range.
 *      This grows naturally as the nightly script runs each day.
 *   2. If fewer than 2 rows exist (data still bootstrapping), fall back to a
 *      2-point chart using the reference anchor price already embedded in the
 *      latest security_metrics row (e.g. "1W_Price"/"1W_Date" → last_close/as_of_date).
 *
 * @param {string} securityId - The security UUID (securities.id)
 * @param {string} timeframe  - One of: "1D", "1W", "1M", "3M", "6M", "YTD", "1Y"
 * @returns {Promise<Array>} Array of {ts, close} objects (close in Rands)
 */
export const getSecurityPrices = async (securityId, timeframe = "1M") => {
  if (!supabase || !securityId) {
    console.error("❌ Supabase client not initialized or securityId missing");
    return [];
  }

  const cacheKey = `${securityId}_${timeframe}`;
  const cached = cache.priceHistory.get(cacheKey);
  const now = Date.now();

  if (cached && (now - cached.timestamp) < 60000) {
    console.log(`📦 Using cached price history for ${cacheKey}`);
    return cached.data;
  }

  try {
    console.log(`🔍 Fetching price history for ${securityId}, timeframe ${timeframe}...`);

    // ── Step 1: date range for historical query ──────────────────
    let cutoffDate;
    if (timeframe === "YTD") {
      cutoffDate = `${new Date().getFullYear()}-01-01`;
    } else {
      const daysMap = { "1D": 30, "1W": 10, "1M": 45, "3M": 110, "6M": 220, "1Y": 420 };
      const days = daysMap[timeframe] ?? 45;
      const d = new Date();
      d.setDate(d.getDate() - days);
      cutoffDate = d.toISOString().split("T")[0];
    }

    const { data: historicalRows, error } = await supabase
      .from("security_metrics_c")
      .select("as_of_date, last_close")
      .eq("security_id", securityId)
      .gte("as_of_date", cutoffDate)
      .order("as_of_date", { ascending: true });

    if (error) {
      console.error(`❌ Error fetching price history:`, error);
      throw error;
    }

    let prices = [];

    if (historicalRows && historicalRows.length >= 2) {
      // ── Enough daily history — use it directly ───────────────
      prices = historicalRows.map(row => ({
        ts: row.as_of_date,
        close: row.last_close != null ? Number(row.last_close) : null,
      }));
      console.log(`✅ Fetched ${prices.length} historical rows for ${timeframe}`);
    } else {
      // ── Fallback: 2-point chart from reference prices in the view ─
      console.log(`⚠️ Insufficient history (${historicalRows?.length ?? 0} rows) — building 2-point chart from reference prices`);

      const refCols = TIMEFRAME_REF_COLS[timeframe] ?? TIMEFRAME_REF_COLS["1M"];
      const selectCols = `as_of_date, close_price, ${refCols.date}, ${refCols.price}`;

      const { data: refRow, error: refError } = await supabase
        .from("v_latest_security_metrics")
        .select(selectCols)
        .eq("security_id", securityId)
        .limit(1)
        .single();

      if (!refError && refRow && refRow[refCols.date] && refRow[refCols.price]) {
        prices = [
          { ts: refRow[refCols.date],  close: Number(refRow[refCols.price]) },
          { ts: refRow.as_of_date,     close: Number(refRow.close_price)    },
        ];
        console.log(`✅ Built 2-point chart: ${prices[0].ts} → ${prices[1].ts}`);
      } else {
        console.warn(`⚠️ No reference price data available for ${securityId}`);
      }
    }

    cache.priceHistory.set(cacheKey, { data: prices, timestamp: now });
    return prices;
  } catch (error) {
    console.error(`💥 Exception while fetching price history:`, error);
    return [];
  }
};

/**
 * Convert price history to normalized series (starting at 100)
 * @param {Array} prices - Array of {ts, close} objects
 * @returns {Array} Array of {ts, close, normalized} objects
 */
export const normalizePriceSeries = (prices) => {
  if (!prices || prices.length === 0) return [];

  const firstClose = prices[0].close;
  if (!firstClose || firstClose === 0) return prices;

  return prices.map(point => ({
    ...point,
    normalized: (point.close / firstClose) * 100,
  }));
};

/**
 * Clear all caches (useful for forcing refresh)
 */
export const clearMarketDataCache = () => {
  cache.markets.data = null;
  cache.markets.timestamp = 0;
  cache.priceHistory.clear();
  console.log("🧹 Market data cache cleared");
};
