import { supabase } from "./supabase";
import { getSecurityPrices } from "./marketData";

// Simple in-memory cache with timestamps
const cache = {
  strategies: { data: null, timestamp: 0, ttl: 60000 }, // 60 seconds
  publicStrategies: { data: null, timestamp: 0, ttl: 60000 }, // 60 seconds for public strategies
  priceHistory: new Map(), // key: `${strategy_id}_${timeframe}`, value: { data, timestamp, ttl }
};

/**
 * Get all strategies with their latest metrics from Supabase
 * @returns {Promise<Array>} Array of strategies with metrics
 */
export const getStrategiesWithMetrics = async () => {
  const now = Date.now();
  
  // Check cache
  if (cache.strategies.data && (now - cache.strategies.timestamp) < cache.strategies.ttl) {
    console.log("📦 Using cached strategies data");
    return cache.strategies.data;
  }

  if (!supabase) {
    console.error("❌ Supabase client not initialized");
    return [];
  }

  try {
    console.log("🔍 Fetching strategies with metrics from Supabase...");
    
    // Fetch strategies with nested strategy_metrics
    const { data: strategies, error: strategiesError } = await supabase
      .from("strategies")
      .select(`
        *,
        strategy_metrics!strategy_metrics_strategy_id_fkey(
          as_of_date,
          last_close,
          prev_close,
          change_abs,
          change_pct,
          r_1w,
          r_1m,
          r_3m,
          r_6m,
          r_ytd,
          r_1y
        )
      `)
      .eq("status", "active")
      .order("name", { ascending: true });

    if (strategiesError) {
      console.error("❌ Error fetching strategies:", strategiesError);
      return [];
    }

    if (!strategies || strategies.length === 0) {
      console.warn("⚠️ No active strategies found");
      return [];
    }

    // Process strategies to get latest metrics
    const processedStrategies = strategies.map((strategy) => {
      // Get the most recent metric (they should be sorted by as_of_date desc in the query)
      const latestMetric = Array.isArray(strategy.strategy_metrics) && strategy.strategy_metrics.length > 0
        ? strategy.strategy_metrics[0]
        : null;

      return {
        ...strategy,
        // Keep the raw metrics array for reference
        metrics: strategy.strategy_metrics || [],
        // Flatten the latest metric to top level for easy access
        latest_metric: latestMetric,
        // Helper fields for display
        last_close: latestMetric?.last_close || null,
        prev_close: latestMetric?.prev_close || null,
        change_abs: latestMetric?.change_abs || null,
        change_pct: latestMetric?.change_pct || null,
        as_of_date: latestMetric?.as_of_date || null,
        r_1w: latestMetric?.r_1w || null,
        r_1m: latestMetric?.r_1m || null,
        r_3m: latestMetric?.r_3m || null,
        r_6m: latestMetric?.r_6m || null,
        r_ytd: latestMetric?.r_ytd || null,
        r_1y: latestMetric?.r_1y || null,
      };
    });

    // Update cache
    cache.strategies.data = processedStrategies;
    cache.strategies.timestamp = now;

    console.log(`✅ Fetched ${processedStrategies.length} strategies with metrics`);
    return processedStrategies;

  } catch (error) {
    console.error("❌ Unexpected error in getStrategiesWithMetrics:", error);
    return [];
  }
};

/**
 * Get public strategies for OpenStrategies view
 * Only returns active, public strategies ordered by featured status then name
 * @returns {Promise<Array>} Array of public strategies
 */
export const getPublicStrategies = async () => {
  const now = Date.now();
  
  // Check cache
  if (cache.publicStrategies.data && (now - cache.publicStrategies.timestamp) < cache.publicStrategies.ttl) {
    console.log("📦 Using cached public strategies data");
    return cache.publicStrategies.data;
  }

  if (!supabase) {
    console.error("❌ Supabase client not initialized");
    return [];
  }

  try {
    console.log("🔍 Fetching public strategies from Supabase...");
    
    // Fetch only active and public strategies
    const { data: strategies, error } = await supabase
      .from("strategies")
      .select("id, slug, name, short_name, description, risk_level, objective, sector, tags, base_currency, min_investment, provider_name, benchmark_symbol, benchmark_name, fee_type, management_fee_bps, performance_fee_pct, high_water_mark, status, is_public, is_featured, icon_url, image_url, holdings, created_at, updated_at")
      .eq("status", "active")
      .eq("is_public", true)
      .order("is_featured", { ascending: false })
      .order("name", { ascending: true });

    if (error) {
      console.error("❌ Error fetching public strategies:", error);
      return [];
    }

    if (!strategies || strategies.length === 0) {
      console.warn("⚠️ No public strategies found");
      return [];
    }

    // Update cache
    cache.publicStrategies.data = strategies;
    cache.publicStrategies.timestamp = now;

    console.log(`✅ Fetched ${strategies.length} public strategies`);
    return strategies;

  } catch (error) {
    console.error("❌ Unexpected error in getPublicStrategies:", error);
    return [];
  }
};

/**
 * Get a single strategy by ID with its latest metrics
 * @param {string} strategyId - Strategy UUID
 * @returns {Promise<Object|null>} Strategy with metrics or null
 */
export const getStrategyById = async (strategyId) => {
  if (!supabase || !strategyId) {
    console.error("❌ Invalid parameters for getStrategyById");
    return null;
  }

  try {
    const { data: strategy, error } = await supabase
      .from("strategies")
      .select(`
        *,
        strategy_metrics!strategy_metrics_strategy_id_fkey(
          as_of_date,
          last_close,
          prev_close,
          change_abs,
          change_pct,
          r_1w,
          r_1m,
          r_3m,
          r_6m,
          r_ytd,
          r_1y
        )
      `)
      .eq("id", strategyId)
      .single();

    if (error) {
      console.error("❌ Error fetching strategy:", error);
      return null;
    }

    // Get the most recent metric
    const latestMetric = Array.isArray(strategy.strategy_metrics) && strategy.strategy_metrics.length > 0
      ? strategy.strategy_metrics[0]
      : null;

    return {
      ...strategy,
      metrics: strategy.strategy_metrics || [],
      latest_metric: latestMetric,
      last_close: latestMetric?.last_close || null,
      prev_close: latestMetric?.prev_close || null,
      change_abs: latestMetric?.change_abs || null,
      change_pct: latestMetric?.change_pct || null,
      as_of_date: latestMetric?.as_of_date || null,
      r_1w: latestMetric?.r_1w || null,
      r_1m: latestMetric?.r_1m || null,
      r_3m: latestMetric?.r_3m || null,
      r_6m: latestMetric?.r_6m || null,
      r_ytd: latestMetric?.r_ytd || null,
      r_1y: latestMetric?.r_1y || null,
    };

  } catch (error) {
    console.error("❌ Unexpected error in getStrategyById:", error);
    return null;
  }
};

/**
 * Generate synthetic price history from strategy metrics
 * Uses known return rates to back-calculate historical NAV values
 */
function generateSyntheticHistory(metrics, timeframe, startDate, endDate) {
  const { last_close, r_1w, r_1m, r_3m, r_6m, r_ytd, r_1y } = metrics;

  let totalReturn;
  switch (timeframe) {
    case "1D": totalReturn = (r_1w || 0.005) / 5; break;
    case "1W": totalReturn = r_1w || 0.005; break;
    case "1M": totalReturn = r_1m || 0.01; break;
    case "3M": totalReturn = r_3m ?? (r_1y ? r_1y * 0.25 : 0.03); break;
    case "6M": totalReturn = r_6m ?? (r_1y ? r_1y * 0.5 : 0.05); break;
    case "YTD": totalReturn = r_ytd ?? r_1m ?? 0.01; break;
    case "1Y": totalReturn = r_1y || 0.06; break;
    default: totalReturn = r_1m || 0.01;
  }

  const startNav = last_close / (1 + totalReturn);
  const tradingDays = [];
  const d = new Date(startDate);
  while (d <= endDate) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) {
      tradingDays.push(new Date(d));
    }
    d.setDate(d.getDate() + 1);
  }

  if (tradingDays.length === 0) return [];

  const n = tradingDays.length;
  const dailyReturn = Math.pow(1 + totalReturn, 1 / n) - 1;

  const seed = Array.from(String(Math.round(last_close * 1000))).reduce((a, c) => a + c.charCodeAt(0), 0);
  const seededRandom = (i) => {
    const x = Math.sin(seed + i * 127.1) * 43758.5453;
    return x - Math.floor(x);
  };

  const result = [];
  let currentNav = startNav;

  for (let i = 0; i < n; i++) {
    const noise = (seededRandom(i) - 0.5) * 2 * Math.abs(dailyReturn) * 3;
    const dayReturn = dailyReturn + noise;
    currentNav = currentNav * (1 + dayReturn);

    if (i === n - 1) {
      currentNav = last_close;
    }

    result.push({
      ts: tradingDays[i].toISOString().split("T")[0],
      nav: Number(currentNav.toFixed(2)),
    });
  }

  return result;
}

/**
 * Get strategy price history for charting
 * @param {string} strategyId - Strategy UUID
 * @param {string} timeframe - Timeframe (1W, 1M, 3M, 6M, YTD, 1Y)
 * @returns {Promise<Array>} Array of {ts, nav} objects
 */
export const getStrategyPriceHistory = async (strategyId, timeframe = "6M") => {
  if (!supabase || !strategyId) {
    console.error("❌ Invalid parameters for getStrategyPriceHistory");
    return [];
  }

  const cacheKey = `${strategyId}_${timeframe}`;
  const cacheTtl = 60000;
  const cacheNow = Date.now();

  const cached = cache.priceHistory.get(cacheKey);
  if (cached && (cacheNow - cached.timestamp) < cacheTtl) {
    console.log(`📦 Using cached price history for ${cacheKey}`);
    return cached.data;
  }

  try {
    const currentDate = new Date();
    let startDate;

    switch (timeframe) {
      case "1D":
        startDate = new Date(currentDate.getTime() - 3 * 24 * 60 * 60 * 1000);
        break;
      case "1W":
        startDate = new Date(currentDate.getTime() - 10 * 24 * 60 * 60 * 1000);
        break;
      case "1M":
        startDate = new Date(currentDate.getTime() - 45 * 24 * 60 * 60 * 1000);
        break;
      case "3M":
        startDate = new Date(currentDate.getTime() - 110 * 24 * 60 * 60 * 1000);
        break;
      case "6M":
        startDate = new Date(currentDate.getTime() - 220 * 24 * 60 * 60 * 1000);
        break;
      case "YTD":
        startDate = new Date(currentDate.getFullYear(), 0, 1);
        break;
      case "1Y":
        startDate = new Date(currentDate.getTime() - 420 * 24 * 60 * 60 * 1000);
        break;
      case "ALL":
        startDate = new Date(currentDate.getTime() - 730 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(currentDate.getTime() - 220 * 24 * 60 * 60 * 1000);
    }

    console.log(`🔍 Computing price history from holdings for strategy ${strategyId} (${timeframe})...`);

    const { data: strategy, error: stratError } = await supabase
      .from("strategies")
      .select("holdings")
      .eq("id", strategyId)
      .single();

    if (stratError || !strategy) {
      console.error("❌ Error fetching strategy holdings:", stratError);
      return [];
    }

    const holdings = strategy.holdings;
    if (!Array.isArray(holdings) || holdings.length === 0) {
      console.warn(`⚠️ Strategy ${strategyId} has no holdings, generating from metrics...`);
      const { data: metrics } = await supabase
        .from("strategy_metrics")
        .select("last_close, r_1w, r_1m, r_3m, r_6m, r_ytd, r_1y")
        .eq("strategy_id", strategyId)
        .single();

      if (metrics && metrics.last_close) {
        const result = generateSyntheticHistory(metrics, timeframe, startDate, currentDate);
        cache.priceHistory.set(cacheKey, { data: result, timestamp: Date.now() });
        console.log(`✅ Generated ${result.length} synthetic NAV points for strategy ${strategyId} (${timeframe})`);
        return result;
      }
      return [];
    }

    const symbols = holdings.map((h) => h.symbol);
    const { data: securities, error: secError } = await supabase
      .from("securities")
      .select("id, symbol")
      .in("symbol", symbols);

    if (secError || !securities || securities.length === 0) {
      console.error("❌ Error fetching securities for holdings:", secError);
      return [];
    }

    const symbolToId = {};
    securities.forEach((s) => { symbolToId[s.symbol] = s.id; });

    const totalWeight = holdings.reduce((sum, h) => {
      if (symbolToId[h.symbol]) return sum + (h.weight || 0);
      return sum;
    }, 0);

    if (totalWeight === 0) {
      console.warn("⚠️ No matching securities found for holdings");
      return [];
    }

    const timeframeForPrices = timeframe === "1D" ? "1W" : timeframe;
    const pricePromises = holdings
      .filter((h) => symbolToId[h.symbol])
      .map(async (h) => {
        const secId = symbolToId[h.symbol];
        const priceSeries = await getSecurityPrices(secId, timeframeForPrices);
        return { symbol: h.symbol, weight: h.weight / totalWeight, prices: priceSeries };
      });

    const allPrices = await Promise.all(pricePromises);
    const validPrices = allPrices.filter((p) => p.prices && p.prices.length > 0);

    if (validPrices.length === 0) {
      console.warn("⚠️ No price data for any holdings");
      return [];
    }

    const dateMap = new Map();
    validPrices.forEach(({ prices }) => {
      prices.forEach((p) => {
        const dateKey = p.ts.split("T")[0];
        if (!dateMap.has(dateKey)) dateMap.set(dateKey, p.ts);
      });
    });

    const sortedDates = Array.from(dateMap.keys()).sort();

    const basePrices = {};
    validPrices.forEach(({ symbol, prices }) => {
      if (prices.length > 0) basePrices[symbol] = prices[0].close;
    });

    const priceByDateSymbol = {};
    validPrices.forEach(({ symbol, prices }) => {
      priceByDateSymbol[symbol] = {};
      prices.forEach((p) => {
        const dateKey = p.ts.split("T")[0];
        priceByDateSymbol[symbol][dateKey] = p.close;
      });
    });

    const result = [];
    const BASE_NAV = 100;

    sortedDates.forEach((dateKey) => {
      let weightedIndex = 0;
      let usedWeight = 0;

      validPrices.forEach(({ symbol, weight }) => {
        const currentPrice = priceByDateSymbol[symbol]?.[dateKey];
        const basePrice = basePrices[symbol];
        if (currentPrice && basePrice && basePrice !== 0) {
          const normalized = (currentPrice / basePrice) * 100;
          weightedIndex += normalized * weight;
          usedWeight += weight;
        }
      });

      if (usedWeight > 0) {
        const nav = (weightedIndex / usedWeight) * (BASE_NAV / 100);
        result.push({ ts: dateMap.get(dateKey), nav: Number(nav.toFixed(2)) });
      }
    });

    if (timeframe === "1D") {
      const uniqueDates = [...new Set(result.map(r => r.ts.split("T")[0]))];
      const recentDates = uniqueDates.slice(-3);
      const trimmed = result.filter(r => recentDates.includes(r.ts.split("T")[0]));
      cache.priceHistory.set(cacheKey, { data: trimmed, timestamp: Date.now() });
      console.log(`✅ Computed ${trimmed.length} NAV points from holdings for strategy ${strategyId} (${timeframe})`);
      return trimmed;
    }

    cache.priceHistory.set(cacheKey, { data: result, timestamp: Date.now() });
    console.log(`✅ Computed ${result.length} NAV points from holdings for strategy ${strategyId} (${timeframe})`);
    return result;

  } catch (error) {
    console.error("❌ Unexpected error in getStrategyPriceHistory:", error);
    return [];
  }
};

/**
 * Format change percentage for display
 * @param {number} changePct - Change as decimal (0.05 = 5%)
 * @returns {string} Formatted string with + or - sign
 */
export const formatChangePct = (changePct) => {
  if (changePct === null || changePct === undefined) return "—";
  const pct = (changePct * 100).toFixed(2);
  return changePct >= 0 ? `+${pct}%` : `${pct}%`;
};

/**
 * Format change absolute for display
 * @param {number} changeAbs - Absolute change value
 * @returns {string} Formatted string with + or - sign
 */
export const formatChangeAbs = (changeAbs) => {
  if (changeAbs === null || changeAbs === undefined) return "—";
  const formatted = Math.abs(changeAbs).toFixed(2);
  return changeAbs >= 0 ? `+${formatted}` : `-${formatted}`;
};

/**
 * Get color class for change (positive = green, negative = red)
 * @param {number} change - Change value (can be abs or pct)
 * @returns {string} Tailwind color class
 */
export const getChangeColor = (change) => {
  if (change === null || change === undefined || change === 0) return "text-slate-500";
  return change > 0 ? "text-emerald-500" : "text-red-500";
};

export const getMonthlyReturns = async (strategyId, startDate = null, actualPnlPct = null) => {
  if (!supabase || !strategyId) return {};

  const cacheKey = `monthly_returns_${strategyId}_${startDate || 'all'}`;
  const cached = cache.priceHistory.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < 300000) {
    const cachedResult = { ...cached.data };
    // Inject actual P&L for start month if price series didn't cover post-purchase period
    if (typeof actualPnlPct === 'number' && startDate) {
      const startYMKey = startDate.slice(0, 7);
      const [sy, sm] = startYMKey.split("-");
      if (!cachedResult[sy]?.[sm]) {
        if (!cachedResult[sy]) cachedResult[sy] = {};
        cachedResult[sy][sm] = actualPnlPct;
      }
    }
    return cachedResult;
  }

  try {
    const { data: strategy, error: stratError } = await supabase
      .from("strategies")
      .select("holdings")
      .eq("id", strategyId)
      .single();

    if (stratError || !strategy || !Array.isArray(strategy.holdings) || strategy.holdings.length === 0) {
      console.warn("No holdings for monthly returns computation");
      return {};
    }

    const holdings = strategy.holdings;
    const symbols = holdings.map(h => h.symbol);

    const { data: securities, error: secError } = await supabase
      .from("securities")
      .select("id, symbol")
      .in("symbol", symbols);

    if (secError || !securities || securities.length === 0) return {};

    const symbolToId = {};
    securities.forEach(s => { symbolToId[s.symbol] = s.id; });

    const totalWeight = holdings.reduce((sum, h) => {
      if (symbolToId[h.symbol]) return sum + (h.weight || 0);
      return sum;
    }, 0);

    if (totalWeight === 0) return {};

    const pricePromises = holdings
      .filter(h => symbolToId[h.symbol])
      .map(async (h) => {
        const secId = symbolToId[h.symbol];
        const priceSeries = await getSecurityPrices(secId, "1Y");
        return { symbol: h.symbol, weight: h.weight / totalWeight, prices: priceSeries };
      });

    const allPrices = await Promise.all(pricePromises);
    const validPrices = allPrices.filter(p => p.prices && p.prices.length > 0);

    if (validPrices.length === 0) return {};

    const basePrices = {};
    validPrices.forEach(({ symbol, prices }) => {
      if (prices.length > 0) basePrices[symbol] = prices[0].close;
    });

    const priceByDateSymbol = {};
    const allDates = new Set();
    validPrices.forEach(({ symbol, prices }) => {
      priceByDateSymbol[symbol] = {};
      prices.forEach(p => {
        const dateKey = p.ts.split("T")[0];
        priceByDateSymbol[symbol][dateKey] = p.close;
        allDates.add(dateKey);
      });
    });

    const sortedDates = Array.from(allDates).sort();

    const navByDate = {};
    sortedDates.forEach(dateKey => {
      let weightedIndex = 0;
      let usedWeight = 0;

      validPrices.forEach(({ symbol, weight }) => {
        const currentPrice = priceByDateSymbol[symbol]?.[dateKey];
        const basePrice = basePrices[symbol];
        if (currentPrice && basePrice && basePrice !== 0) {
          const normalized = (currentPrice / basePrice) * 100;
          weightedIndex += normalized * weight;
          usedWeight += weight;
        }
      });

      if (usedWeight > 0) {
        navByDate[dateKey] = (weightedIndex / usedWeight);
      }
    });

    const filterStart = startDate ? startDate.slice(0, 10) : null;
    const startYM = filterStart ? filterStart.slice(0, 7) : null;

    const monthlyLastNav = {};
    const monthlyFirstNavAfterPurchase = {};
    Object.entries(navByDate).forEach(([dateKey, nav]) => {
      const [year, month] = dateKey.split("-");
      const key = `${year}-${month}`;
      monthlyLastNav[key] = nav;
      if (filterStart && key === startYM && dateKey >= filterStart) {
        if (!monthlyFirstNavAfterPurchase[key]) {
          monthlyFirstNavAfterPurchase[key] = nav;
        }
      }
    });

    const sortedMonths = Object.keys(monthlyLastNav).sort();
    const result = {};

    for (let i = 1; i < sortedMonths.length; i++) {
      const currKey = sortedMonths[i];
      const currNav = monthlyLastNav[currKey];
      let baseNav;

      if (startYM && currKey === startYM) {
        if (monthlyFirstNavAfterPurchase[currKey]) {
          baseNav = monthlyFirstNavAfterPurchase[currKey];
        } else {
          continue;
        }
      } else {
        baseNav = monthlyLastNav[sortedMonths[i - 1]];
      }

      if (baseNav && baseNav > 0) {
        const [year, month] = currKey.split("-");
        if (!result[year]) result[year] = {};
        result[year][month] = (currNav - baseNav) / baseNav;
      }
    }

    if (startYM && sortedMonths[0] === startYM && monthlyFirstNavAfterPurchase[startYM]) {
      const baseNav = monthlyFirstNavAfterPurchase[startYM];
      const currNav = monthlyLastNav[startYM];
      if (baseNav && currNav && baseNav > 0) {
        const [year, month] = startYM.split("-");
        if (!result[year]) result[year] = {};
        result[year][month] = (currNav - baseNav) / baseNav;
      }
    }

    if (startYM) {
      const [startYear, startMonth] = startYM.split("-");
      for (const year of Object.keys(result)) {
        if (year < startYear) {
          delete result[year];
        } else if (year === startYear) {
          for (const month of Object.keys(result[year])) {
            if (month < startMonth) {
              delete result[year][month];
            }
          }
          if (Object.keys(result[year]).length === 0) delete result[year];
        }
      }
    }

    // Cache the price-series result before injecting actual P&L
    cache.priceHistory.set(cacheKey, { data: result, timestamp: Date.now() });

    // Inject actual P&L for start month if price series didn't cover post-purchase period
    if (typeof actualPnlPct === 'number' && startYM) {
      const [sy, sm] = startYM.split("-");
      if (!result[sy]?.[sm]) {
        if (!result[sy]) result[sy] = {};
        result[sy][sm] = actualPnlPct;
      }
    }

    return result;
  } catch (err) {
    console.error("Error computing monthly returns:", err);
    return {};
  }
};

export const getStockMonthlyReturns = async (securityId, startDate = null, actualPnlPct = null) => {
  if (!supabase || !securityId) return {};

  const cacheKey = `monthly_returns_stock_${securityId}_${startDate || 'all'}`;
  const cached = cache.priceHistory.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < 300000) {
    const cachedResult = { ...cached.data };
    if (typeof actualPnlPct === 'number' && startDate) {
      const startYMKey = startDate.slice(0, 7);
      const [sy, sm] = startYMKey.split("-");
      if (!cachedResult[sy]?.[sm]) {
        if (!cachedResult[sy]) cachedResult[sy] = {};
        cachedResult[sy][sm] = actualPnlPct;
      }
    }
    return cachedResult;
  }

  try {
    const priceSeries = await getSecurityPrices(securityId, "1Y");
    if (!priceSeries || priceSeries.length < 2) return {};

    const filterStart = startDate ? startDate.slice(0, 10) : null;
    const startYM = filterStart ? filterStart.slice(0, 7) : null;

    const monthlyLastNav = {};
    const monthlyFirstNavAfterPurchase = {};
    priceSeries.forEach(p => {
      const dateKey = p.ts.split("T")[0];
      const [year, month] = dateKey.split("-");
      const key = `${year}-${month}`;
      monthlyLastNav[key] = p.close;
      if (filterStart && key === startYM && dateKey >= filterStart) {
        if (!monthlyFirstNavAfterPurchase[key]) {
          monthlyFirstNavAfterPurchase[key] = p.close;
        }
      }
    });

    const sortedMonths = Object.keys(monthlyLastNav).sort();
    const result = {};

    for (let i = 1; i < sortedMonths.length; i++) {
      const currKey = sortedMonths[i];
      const currNav = monthlyLastNav[currKey];
      let baseNav;

      if (startYM && currKey === startYM) {
        if (monthlyFirstNavAfterPurchase[currKey]) {
          baseNav = monthlyFirstNavAfterPurchase[currKey];
        } else {
          continue;
        }
      } else {
        baseNav = monthlyLastNav[sortedMonths[i - 1]];
      }

      if (baseNav && baseNav > 0) {
        const [year, month] = currKey.split("-");
        if (!result[year]) result[year] = {};
        result[year][month] = (currNav - baseNav) / baseNav;
      }
    }

    if (startYM && sortedMonths[0] === startYM && monthlyFirstNavAfterPurchase[startYM]) {
      const baseNav = monthlyFirstNavAfterPurchase[startYM];
      const currNav = monthlyLastNav[startYM];
      if (baseNav && currNav && baseNav > 0) {
        const [year, month] = startYM.split("-");
        if (!result[year]) result[year] = {};
        result[year][month] = (currNav - baseNav) / baseNav;
      }
    }

    if (startYM) {
      const [startYear, startMonth] = startYM.split("-");
      for (const year of Object.keys(result)) {
        if (year < startYear) {
          delete result[year];
        } else if (year === startYear) {
          for (const month of Object.keys(result[year])) {
            if (month < startMonth) {
              delete result[year][month];
            }
          }
          if (Object.keys(result[year]).length === 0) delete result[year];
        }
      }
    }

    // Cache price-series result before injecting actual P&L
    cache.priceHistory.set(cacheKey, { data: result, timestamp: Date.now() });

    // Inject actual P&L for start month if price series didn't cover post-purchase period
    if (typeof actualPnlPct === 'number' && startYM) {
      const [sy, sm] = startYM.split("-");
      if (!result[sy]?.[sm]) {
        if (!result[sy]) result[sy] = {};
        result[sy][sm] = actualPnlPct;
      }
    }

    return result;
  } catch (err) {
    console.error("Error computing stock monthly returns:", err);
    return {};
  }
};

export const getOverallPortfolioMonthlyReturns = async (strategyIds, stockSecurityIds, strategies, rawHoldings) => {
  const cacheKey = `monthly_returns_overall_${strategyIds.sort().join("_")}_${stockSecurityIds.sort().join("_")}`;
  const cached = cache.priceHistory.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < 300000) {
    return cached.data;
  }

  try {
    const allMonthlyData = [];

    for (const sid of strategyIds) {
      const strategy = strategies.find(s => s.strategyId === sid);
      const invested = strategy?.investedAmount || 0;
      const current = strategy?.currentValue || 0;
      const actualPnlPct = invested > 0 ? (current - invested) / invested : null;
      const returns = await getMonthlyReturns(sid, strategy?.firstInvestedDate || null, actualPnlPct);
      const value = invested || current || 0;
      if (Object.keys(returns).length > 0) {
        allMonthlyData.push({ returns, value });
      }
    }

    for (const secId of stockSecurityIds) {
      const holding = rawHoldings.find(h => h.security_id === secId);
      const investedVal = holding ? (holding.avg_fill * holding.quantity) / 100 : 0;
      const currentVal = holding ? (holding.market_value || 0) / 100 : 0;
      const actualPnlPct = investedVal > 0 ? (currentVal - investedVal) / investedVal : null;
      const returns = await getStockMonthlyReturns(secId, holding?.created_at || null, actualPnlPct);
      const value = currentVal || investedVal || 0;
      if (Object.keys(returns).length > 0) {
        allMonthlyData.push({ returns, value });
      }
    }

    if (allMonthlyData.length === 0) return {};

    const totalValue = allMonthlyData.reduce((sum, d) => sum + d.value, 0);
    if (totalValue === 0) return {};

    const allMonths = new Set();
    allMonthlyData.forEach(({ returns }) => {
      Object.entries(returns).forEach(([year, months]) => {
        Object.keys(months).forEach(month => allMonths.add(`${year}-${month}`));
      });
    });

    const result = {};
    Array.from(allMonths).sort().forEach(key => {
      const [year, month] = key.split("-");
      let weightedReturn = 0;
      let totalWeight = 0;

      allMonthlyData.forEach(({ returns, value }) => {
        const ret = returns[year]?.[month];
        if (ret != null) {
          const weight = value / totalValue;
          weightedReturn += ret * weight;
          totalWeight += weight;
        }
      });

      if (totalWeight > 0) {
        if (!result[year]) result[year] = {};
        result[year][month] = weightedReturn / totalWeight;
      }
    });

    cache.priceHistory.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (err) {
    console.error("Error computing overall portfolio monthly returns:", err);
    return {};
  }
};

/**
 * Clear strategy data cache
 */
export const clearStrategyDataCache = () => {
  cache.strategies.data = null;
  cache.strategies.timestamp = 0;
  cache.priceHistory.clear();
  console.log("🗑️ Strategy data cache cleared");
};
