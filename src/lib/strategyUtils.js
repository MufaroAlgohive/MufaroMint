export const normalizeSymbol = (symbol) => {
  if (typeof symbol !== "string") return symbol;
  const trimmed = symbol.trim();
  if (!trimmed) return symbol;
  return trimmed.split(".")[0].toUpperCase();
};

export const getHoldingsArray = (strategy) => {
  const holdings = strategy?.holdings;
  if (Array.isArray(holdings)) return holdings;
  if (typeof holdings === "string") {
    try {
      const parsed = JSON.parse(holdings);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }
  return [];
};

export const getHoldingSymbol = (holding) => {
  const rawSymbol = holding?.ticker || holding?.symbol || holding;
  return normalizeSymbol(rawSymbol);
};

export const buildHoldingsBySymbol = (holdingsSecurities) => {
  const map = new Map();
  holdingsSecurities.forEach((security) => {
    if (!security?.symbol) return;
    map.set(security.symbol, security);
    const normalized = normalizeSymbol(security.symbol);
    if (normalized && normalized !== security.symbol) {
      map.set(normalized, security);
    }
  });
  return map;
};

const MIN_ASSET_VALUE = 1000;

const getMinFromPrice = (price) => {
  if (!price || price <= 0 || !isFinite(price)) return null;
  if (price < MIN_ASSET_VALUE) {
    const shares = Math.ceil(MIN_ASSET_VALUE / price);
    return Math.max(Math.round(shares * price), MIN_ASSET_VALUE);
  }
  return Math.max(Math.round(price), MIN_ASSET_VALUE);
};

/**
 * Calculate live YTD return for a strategy using the formula:
 * YTD = Σ(price_today × qty) / Σ(price_jan1 × qty) - 1
 *
 * Jan 1 price is derived from the security's ytd_performance field:
 *   price_jan1 = last_price / (1 + ytd_performance / 100)
 *
 * Falls back to ytd_start_price (manual), then to strategy.r_ytd from strategy_metrics.
 */
export const calculateYtdReturn = (strategy, holdingsBySymbol) => {
  const holdings = getHoldingsArray(strategy);
  if (holdings.length > 0) {
    let todayValue = 0;
    let jan1Value = 0;
    let matched = 0;
    for (const holding of holdings) {
      const rawSymbol = holding.ticker || holding.symbol || holding;
      const normalizedSym = normalizeSymbol(rawSymbol);
      const security = holdingsBySymbol.get(rawSymbol) || holdingsBySymbol.get(normalizedSym);
      const lastPrice = Number(security?.last_price ?? 0);
      if (lastPrice <= 0) continue;
      const shares = Number(holding.shares || holding.quantity || 1);

      // Preferred: derive jan1 price from ytd_performance (already live on the security)
      const ytdPerf = Number(security?.ytd_performance ?? NaN);
      if (!isNaN(ytdPerf) && isFinite(ytdPerf)) {
        // Skip instruments with extreme negative YTD (>90% loss) — these are
        // typically expired BEE schemes or data anomalies. Their near-zero price
        // creates an astronomical Jan 1 implied value that wrecks the whole calc.
        if (ytdPerf < -90) continue;
        const jan1Price = lastPrice / (1 + ytdPerf / 100);
        if (jan1Price > 0) {
          todayValue += lastPrice * shares;
          jan1Value += jan1Price * shares;
          matched++;
          continue;
        }
      }

      // Fallback: use manually stored ytd_start_price
      const startPrice = Number(security?.ytd_start_price ?? 0);
      if (startPrice > 0) {
        todayValue += lastPrice * shares;
        jan1Value += startPrice * shares;
        matched++;
      }
    }
    if (matched > 0 && jan1Value > 0) {
      return (todayValue / jan1Value) - 1;
    }
  }
  // Final fallback: stored r_ytd from strategy_metrics
  const raw = strategy?.r_ytd ?? null;
  if (raw !== null && typeof raw === 'number' && isFinite(raw) && raw > -1 && raw < 5) return raw;
  return null;
};

export const calculateMinInvestment = (strategy, holdingsBySymbol) => {
  const holdings = getHoldingsArray(strategy);
  if (!holdings.length) {
    const strategyPrice = Number(strategy?.last_close || strategy?.nav || 0);
    if (!strategyPrice || strategyPrice <= 0 || !isFinite(strategyPrice)) return null;
    return Math.round(strategyPrice);
  }
  let total = 0;
  let matched = 0;
  for (const holding of holdings) {
    const rawSymbol = holding.ticker || holding.symbol || holding;
    const normalizedSym = normalizeSymbol(rawSymbol);
    const security = holdingsBySymbol.get(rawSymbol) || holdingsBySymbol.get(normalizedSym);
    if (security?.last_price != null) {
      const pricePerShare = Number(security.last_price) / 100;
      if (!pricePerShare || pricePerShare <= 0 || !isFinite(pricePerShare)) continue;
      const shares = Number(holding.shares || holding.quantity || 1);
      total += shares * pricePerShare;
      matched++;
    }
  }
  if (matched === 0) {
    const strategyPrice = Number(strategy?.last_close || strategy?.nav || 0);
    if (!strategyPrice || strategyPrice <= 0 || !isFinite(strategyPrice)) return null;
    return Math.round(strategyPrice);
  }
  return Math.round(total);
};

export const getAdjustedShares = (holding, holdingsBySymbol) => {
  const rawSymbol = holding.ticker || holding.symbol || holding;
  const normalizedSym = normalizeSymbol(rawSymbol);
  const security = holdingsBySymbol.get(rawSymbol) || holdingsBySymbol.get(normalizedSym);
  let shares = Number(holding.shares || holding.quantity || 1);
  if (security?.last_price != null) {
    const pricePerShare = Number(security.last_price) / 100;
    const holdingValue = shares * pricePerShare;
    if (holdingValue < MIN_ASSET_VALUE && pricePerShare > 0) {
      shares = Math.ceil(MIN_ASSET_VALUE / pricePerShare);
    }
  }
  return shares;
};

export const getStrategyHoldingsSnapshot = (strategy, holdingsBySymbol) => {
  const holdings = getHoldingsArray(strategy);
  if (!holdings.length) return [];
  const sorted = [...holdings].sort((a, b) => {
    const weightA = Number(a.weight || a.shares || a.quantity || 0);
    const weightB = Number(b.weight || b.shares || b.quantity || 0);
    return weightB - weightA;
  });
  return sorted.map((holding) => {
    const rawSymbol = holding.ticker || holding.symbol || holding;
    const normalizedSym = normalizeSymbol(rawSymbol);
    const security = holdingsBySymbol.get(rawSymbol) || holdingsBySymbol.get(normalizedSym);
    return {
      id: security?.id || null,
      symbol: rawSymbol,
      name: security?.name || rawSymbol,
      logo_url: security?.logo_url || null,
    };
  });
};

export const getStrategyCurrentValue = (investedAmount, metrics) => {
  if (!investedAmount || investedAmount <= 0) return 0;
  if (!metrics) return investedAmount;
  const raw = metrics.r_ytd ?? metrics.r_1y ?? metrics.r_3m ?? metrics.r_1m ?? 0;
  // Sanity check: returns must be a decimal fraction (e.g. 0.10 = 10%).
  // If the value is stored as a whole-number percentage (e.g. 10 instead of 0.10),
  // or is otherwise corrupted, cap to a safe range to prevent absurd portfolio values.
  const bestReturn = (typeof raw === "number" && isFinite(raw) && raw > -1 && raw < 5)
    ? raw
    : 0;
  return Number((investedAmount * (1 + bestReturn)).toFixed(2));
};

export const getStrategyReturnPct = (metrics) => {
  if (!metrics) return 0;
  const raw = metrics.r_ytd ?? metrics.r_1y ?? metrics.r_3m ?? metrics.r_1m ?? 0;
  const bestReturn = (typeof raw === "number" && isFinite(raw) && raw > -1 && raw < 5)
    ? raw
    : 0;
  return bestReturn * 100;
};

export const computeExtendedSummary = (analytics) => {
  const curves = analytics?.curves || {};
  const allPoints = Object.values(curves).flat().map(p => p?.v).filter(v => v != null);

  if (allPoints.length < 2) {
    return { volatility: null, sharpe_ratio: null, max_drawdown: null, pct_positive_months: null };
  }

  // Daily returns from index values
  const returns = [];
  for (let i = 1; i < allPoints.length; i++) {
    returns.push((allPoints[i] - allPoints[i - 1]) / allPoints[i - 1]);
  }

  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length;
  const volatility = Math.sqrt(variance * 252); // annualised

  const sharpe_ratio = volatility > 0 ? (mean * 252) / volatility : null;

  // Max drawdown
  let peak = allPoints[0];
  let max_drawdown = 0;
  for (const v of allPoints) {
    if (v > peak) peak = v;
    const dd = (v - peak) / peak;
    if (dd < max_drawdown) max_drawdown = dd;
  }

  // % positive months from calendar_returns
  const calReturns = analytics?.calendar_returns || [];
  const positiveMonths = calReturns.filter(r => r?.return > 0).length;
  const pct_positive_months = calReturns.length > 0 ? positiveMonths / calReturns.length : null;

  return { volatility, sharpe_ratio, max_drawdown, pct_positive_months };
};