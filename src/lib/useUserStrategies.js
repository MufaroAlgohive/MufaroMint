import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";
import { getStrategyPriceHistory } from "./strategyData";

export const useUserStrategies = () => {
  const [data, setData] = useState({
    strategies: [],
    selectedStrategy: null,
    loading: true,
    error: null,
  });

  const fetchUserStrategies = useCallback(async () => {
    if (!supabase) {
      setData((prev) => ({ ...prev, loading: false, error: "Database not connected" }));
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setData({ strategies: [], selectedStrategy: null, loading: false, error: null });
        return;
      }

      const token = session.access_token;
      const res = await fetch("/api/user/strategies", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        console.error("[useUserStrategies] API error:", res.status, errJson);
        setData((prev) => ({ ...prev, loading: false, error: errJson.error || "Failed to fetch strategies" }));
        return;
      }

      const json = await res.json();
      const serverStrategies = json.strategies || [];

      if (serverStrategies.length === 0) {
        console.log("[useUserStrategies] No strategies found from API");
        setData({ strategies: [], selectedStrategy: null, loading: false, error: null });
        return;
      }

      const formattedStrategies = await Promise.all(serverStrategies.map(async (strategy) => {
        const latestMetric = strategy.metrics;
        const invested = strategy.investedAmount || 0;
        const purchaseDate = strategy.firstInvestedDate;

        let currentVal = invested;
        let changePct = 0;

        if (invested > 0) {
          try {
            const priceHistory = await getStrategyPriceHistory(strategy.id, "1Y");
            if (priceHistory && priceHistory.length >= 1) {
              const purchaseDateStr = purchaseDate ? purchaseDate.slice(0, 10) : null;
              let baselineNav = null;
              let latestNav = null;

              if (purchaseDateStr) {
                const afterPurchase = priceHistory.filter(p => p.ts.split("T")[0] >= purchaseDateStr);
                const beforePurchase = priceHistory.filter(p => p.ts.split("T")[0] < purchaseDateStr);
                const onPurchaseDate = priceHistory.filter(p => p.ts.split("T")[0] === purchaseDateStr);

                if (afterPurchase.length >= 2) {
                  baselineNav = onPurchaseDate.length > 0
                    ? onPurchaseDate[0].nav
                    : (beforePurchase.length > 0 ? beforePurchase[beforePurchase.length - 1].nav : afterPurchase[0].nav);
                  latestNav = afterPurchase[afterPurchase.length - 1].nav;
                } else {
                  baselineNav = null;
                  latestNav = null;
                }
              } else {
                baselineNav = priceHistory[0].nav;
                latestNav = priceHistory[priceHistory.length - 1].nav;
              }

              if (baselineNav && latestNav && baselineNav > 0) {
                const navReturn = (latestNav - baselineNav) / baselineNav;
                currentVal = Number((invested * (1 + navReturn)).toFixed(2));
                changePct = navReturn * 100;
              }
            }
          } catch (e) {
            // fallback: currentVal stays as invested
          }
        }

        return {
          id: strategy.id,
          strategyId: strategy.id,
          name: strategy.name || "Unknown Strategy",
          shortName: strategy.shortName || strategy.name || "Strategy",
          description: strategy.description || "",
          riskLevel: strategy.riskLevel || "Moderate",
          sector: strategy.sector || "",
          iconUrl: strategy.iconUrl,
          imageUrl: strategy.imageUrl,
          holdings: strategy.holdings || [],
          investedAmount: invested,
          currentValue: currentVal,
          unitsHeld: 0,
          entryDate: null,
          lastUpdated: latestMetric?.as_of_date,
          previousMonthChange: parseFloat(changePct.toFixed(1)),
          metrics: latestMetric,
          firstInvestedDate: purchaseDate || null,
        };
      }));

      setData({
        strategies: formattedStrategies,
        selectedStrategy: formattedStrategies[0] || null,
        loading: false,
        error: null,
      });

    } catch (err) {
      console.error("Error fetching strategies:", err);
      setData((prev) => ({
        ...prev,
        loading: false,
        error: err.message,
      }));
    }
  }, []);

  const selectStrategy = useCallback((strategy) => {
    setData((prev) => ({ ...prev, selectedStrategy: strategy }));
  }, []);

  useEffect(() => {
    fetchUserStrategies();
  }, [fetchUserStrategies]);

  return { ...data, selectStrategy, refetch: fetchUserStrategies };
};

export const useStrategyChartData = (strategyId, timeFilter = "W", purchaseDate = null) => {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChartData = async () => {
      if (!strategyId) {
        setLoading(false);
        return;
      }

      setLoading(true);

      const timeframeMap = {
        "D": "1D",
        "W": "1W",
        "M": "1M",
        "ALL": "1Y",
      };

      const timeframe = timeframeMap[timeFilter] || "1W";

      try {
        const priceHistory = await getStrategyPriceHistory(strategyId, timeframe);

        if (!priceHistory || priceHistory.length === 0) {
          setChartData([]);
          setLoading(false);
          return;
        }

        let filteredHistory = priceHistory;
        if (purchaseDate) {
          const purchaseDateStr = purchaseDate.slice(0, 10);
          const afterPurchase = priceHistory.filter(p => p.ts.split("T")[0] >= purchaseDateStr);
          filteredHistory = afterPurchase.length >= 1 ? afterPurchase : [];
        }

        const formattedData = formatChartData(filteredHistory, timeFilter);
        setChartData(formattedData);

      } catch (err) {
        console.error("Error fetching chart data:", err);
        setChartData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
  }, [strategyId, timeFilter, purchaseDate]);

  return { chartData, loading };
};

function parseDateParts(ts) {
  const dateStr = ts.split("T")[0];
  const [y, m, d] = dateStr.split("-").map(Number);
  const dayOfWeek = new Date(y, m - 1, d).getDay();
  return { year: y, month: m, day: d, dayOfWeek };
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatChartData(priceHistory, timeFilter) {
  if (!priceHistory || priceHistory.length === 0) return [];

  switch (timeFilter) {
    case "D":
    case "W": {
      return priceHistory.map((p) => {
        const { day, month, dayOfWeek } = parseDateParts(p.ts);
        return {
          day: DAY_NAMES[dayOfWeek] + ' ' + day,
          value: p.nav,
          fullDate: `${DAY_NAMES[dayOfWeek]}, ${day} ${MONTH_NAMES_SHORT[month - 1]}`,
        };
      });
    }
    case "M": {
      return priceHistory.map((p) => {
        const { year, day, month } = parseDateParts(p.ts);
        return {
          day: day + ' ' + MONTH_NAMES_SHORT[month - 1],
          value: p.nav,
          fullDate: `${day} ${MONTH_NAMES_SHORT[month - 1]} ${year}`,
        };
      });
    }
    case "ALL": {
      const grouped = {};
      priceHistory.forEach((p) => {
        const { year, month } = parseDateParts(p.ts);
        const key = `${MONTH_NAMES_SHORT[month - 1]} '${String(year).slice(-2)}`;
        grouped[key] = p.nav;
      });
      const entries = Object.entries(grouped);
      return entries.map(([day, value]) => ({
        day,
        value,
        fullDate: day,
      }));
    }
    default:
      return priceHistory.map((p) => {
        const { year, month, day, dayOfWeek } = parseDateParts(p.ts);
        return {
          day: `${day} ${MONTH_NAMES_SHORT[month - 1]}`,
          value: p.nav,
          fullDate: `${DAY_NAMES[dayOfWeek]}, ${day} ${MONTH_NAMES_SHORT[month - 1]} ${year}`,
        };
      });
  }
}
