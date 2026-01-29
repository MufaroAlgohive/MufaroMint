import { supabase } from "./supabase";

// Simple in-memory cache with timestamps
const cache = {
  markets: { data: null, timestamp: 0, ttl: 60000 }, // 60 seconds
  priceHistory: new Map(), // key: `${security_id}_${timeframe}`, value: { data, timestamp, ttl }
};

/**
 * Get all securities with their latest metrics from Supabase
 * @returns {Promise<Array>} Array of securities with metrics
 */
export const getMarketsSecuritiesWithMetrics = async () => {
  const now = Date.now();
  
  // Check cache
  if (cache.markets.data && (now - cache.markets.timestamp) < cache.markets.ttl) {
    console.log("📦 Using cached markets data");
    return cache.markets.data;
  }

  if (!supabase) {
    console.error("❌ Supabase client not initialized");
    return [];
  }

  try {
    console.log("🔍 Fetching securities with metrics from Supabase...");
    
    // Fetch securities with nested security_metrics using explicit join
    const { data: securities, error: securitiesError } = await supabase
      .from("securities")
      .select(`
        *,
        security_metrics!security_metrics_security_id_fkey(
          as_of_date,
          last_close,
          prev_close,
          change_abs,
          change_pct,
          r_1d,
          r_1w,
          r_1m,
          r_3m,
          r_6m,
          r_ytd,
          r_1y
        )
      `)
      .eq("is_active", true)
      .order("market_cap", { ascending: false, nullsFirst: false });

    if (securitiesError) {
      console.error("❌ Error fetching securities:", securitiesError);
      throw securitiesError;
    }

    // Process securities to flatten metrics
    const processedSecurities = (securities || []).map(security => {
      const metrics = security.security_metrics?.[0] || null;
      
      return {
        ...security,
        // Flatten metrics for easier access
        currentPrice: metrics?.last_close ? Number(metrics.last_close) : null,
        prevClose: metrics?.prev_close ? Number(metrics.prev_close) : null,
        changeAbs: metrics?.change_abs ? Number(metrics.change_abs) : null,
        changePct: metrics?.change_pct ? Number(metrics.change_pct) : null,
        asOfDate: metrics?.as_of_date || null,
        returns: {
          r_1d: metrics?.r_1d ? Number(metrics.r_1d) : null,
          r_1w: metrics?.r_1w ? Number(metrics.r_1w) : null,
          r_1m: metrics?.r_1m ? Number(metrics.r_1m) : null,
          r_3m: metrics?.r_3m ? Number(metrics.r_3m) : null,
          r_6m: metrics?.r_6m ? Number(metrics.r_6m) : null,
          r_ytd: metrics?.r_ytd ? Number(metrics.r_ytd) : null,
          r_1y: metrics?.r_1y ? Number(metrics.r_1y) : null,
        },
        // Remove the nested security_metrics array
        security_metrics: undefined,
      };
    });

    console.log(`✅ Fetched ${processedSecurities.length} securities with metrics`);
    
    // Update cache
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
    console.log(`🔍 Fetching security ${symbol} with metrics...`);
    
    const { data, error } = await supabase
      .from("securities")
      .select(`
        *,
        security_metrics!security_metrics_security_id_fkey(
          as_of_date,
          last_close,
          prev_close,
          change_abs,
          change_pct,
          r_1d,
          r_1w,
          r_1m,
          r_3m,
          r_6m,
          r_ytd,
          r_1y
        )
      `)
      .eq("symbol", symbol)
      .eq("is_active", true)
      .single();

    if (error) {
      console.error(`❌ Error fetching security ${symbol}:`, error);
      return null;
    }

    if (!data) {
      console.warn(`⚠️ No security found for symbol ${symbol}`);
      return null;
    }

    // Flatten metrics
    const metrics = data.security_metrics?.[0] || null;
    
    console.log(`🔍 Raw security_metrics for ${symbol}:`, data.security_metrics);
    console.log(`🔍 Flattened metrics:`, metrics);
    
    const processedSecurity = {
      ...data,
      currentPrice: metrics?.last_close ? Number(metrics.last_close) : null,
      prevClose: metrics?.prev_close ? Number(metrics.prev_close) : null,
      changeAbs: metrics?.change_abs ? Number(metrics.change_abs) : null,
      changePct: metrics?.change_pct ? Number(metrics.change_pct) : null,
      asOfDate: metrics?.as_of_date || null,
      returns: {
        r_1d: metrics?.r_1d ? Number(metrics.r_1d) : null,
        r_1w: metrics?.r_1w ? Number(metrics.r_1w) : null,
        r_1m: metrics?.r_1m ? Number(metrics.r_1m) : null,
        r_3m: metrics?.r_3m ? Number(metrics.r_3m) : null,
        r_6m: metrics?.r_6m ? Number(metrics.r_6m) : null,
        r_ytd: metrics?.r_ytd ? Number(metrics.r_ytd) : null,
        r_1y: metrics?.r_1y ? Number(metrics.r_1y) : null,
      },
      security_metrics: undefined,
    };

    console.log(`✅ Fetched security ${symbol} successfully`);
    return processedSecurity;
  } catch (error) {
    console.error(`💥 Exception while fetching security ${symbol}:`, error);
    return null;
  }
};

/**
 * Get price history for a security based on timeframe
 * @param {string} securityId - The security ID
 * @param {string} timeframe - One of: "1D", "1W", "1M", "3M", "6M", "YTD", "1Y", "5Y"
 * @returns {Promise<Array>} Array of {ts, close} objects
 */
export const getSecurityPrices = async (securityId, timeframe = "1M") => {
  if (!supabase || !securityId) {
    console.error("❌ Supabase client not initialized or securityId missing");
    return [];
  }

  // Check cache
  const cacheKey = `${securityId}_${timeframe}`;
  const cached = cache.priceHistory.get(cacheKey);
  const now = Date.now();
  
  if (cached && (now - cached.timestamp) < 60000) { // 60 second TTL
    console.log(`📦 Using cached price history for ${cacheKey}`);
    return cached.data;
  }

  try {
    console.log(`🔍 Fetching price history for security ${securityId}, timeframe ${timeframe}...`);
    
    // Calculate how many days to fetch based on timeframe
    let daysToFetch = 30;
    let dateFilter = null;
    
    switch (timeframe) {
      case "1D":
        // Since we don't have intraday data yet, fetch last 30 days and display as "1M" style
        daysToFetch = 30;
        break;
      case "1W":
        daysToFetch = 10; // ~2 weeks of trading days to get 7-10 days
        break;
      case "1M":
        daysToFetch = 45; // ~30 trading days
        break;
      case "3M":
        daysToFetch = 110; // ~90 trading days
        break;
      case "6M":
        daysToFetch = 220; // ~180 trading days
        break;
      case "YTD":
        // Get from Jan 1 of current year
        const currentYear = new Date().getFullYear();
        dateFilter = new Date(currentYear, 0, 1).toISOString();
        break;
      case "1Y":
        daysToFetch = 420; // ~365 trading days
        break;
      case "5Y":
        daysToFetch = 1825; // ~5 years
        break;
      default:
        daysToFetch = 45;
    }

    let query = supabase
      .from("security_prices")
      .select("ts, close")
      .eq("security_id", securityId)
      .order("ts", { ascending: true });

    if (dateFilter) {
      // YTD filter
      query = query.gte("ts", dateFilter);
    } else {
      // Fetch last N days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToFetch);
      query = query.gte("ts", cutoffDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error(`❌ Error fetching price history:`, error);
      throw error;
    }

    const prices = (data || []).map(row => ({
      ts: row.ts,
      close: Number(row.close),
    }));

    console.log(`✅ Fetched ${prices.length} price points for ${timeframe}`);
    
    // Cache the result
    cache.priceHistory.set(cacheKey, {
      data: prices,
      timestamp: now,
    });
    
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
