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
  const bestReturn = metrics.r_ytd ?? metrics.r_1y ?? metrics.r_3m ?? metrics.r_1m ?? 0;
  return investedAmount * (1 + bestReturn);
};

export const getStrategyReturnPct = (metrics) => {
  if (!metrics) return 0;
  const bestReturn = metrics.r_ytd ?? metrics.r_1y ?? metrics.r_3m ?? metrics.r_1m ?? 0;
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