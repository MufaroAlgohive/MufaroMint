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
    return getMinFromPrice(strategyPrice);
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
      let shares = Number(holding.shares || holding.quantity || 1);
      const holdingValue = shares * pricePerShare;
      if (holdingValue < MIN_ASSET_VALUE) {
        shares = Math.ceil(MIN_ASSET_VALUE / pricePerShare);
      }
      total += shares * pricePerShare;
      matched++;
    }
  }
  if (matched === 0) {
    const strategyPrice = Number(strategy?.last_close || strategy?.nav || 0);
    return getMinFromPrice(strategyPrice);
  }
  return Math.max(Math.round(total), MIN_ASSET_VALUE);
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
