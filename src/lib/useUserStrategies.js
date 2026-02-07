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

      const userId = session.user.id;

      const { data: userStrategyLinks } = await supabase
        .from("user_strategies")
        .select("strategy_id")
        .eq("user_id", userId);

      const subscribedIds = (userStrategyLinks || []).map(us => us.strategy_id).filter(Boolean);

      if (subscribedIds.length === 0) {
        setData({ strategies: [], selectedStrategy: null, loading: false, error: null });
        return;
      }

      const { data: strategies, error } = await supabase
        .from("strategies")
        .select(`
          id,
          name,
          short_name,
          description,
          risk_level,
          sector,
          icon_url,
          image_url,
          holdings,
          strategy_metrics (
            as_of_date,
            last_close,
            change_pct,
            r_1w,
            r_1m,
            r_3m,
            r_ytd,
            r_1y
          )
        `)
        .in("id", subscribedIds)
        .eq("status", "active")
        .limit(5);

      if (error) {
        console.error("Error fetching strategies:", error);
        setData((prev) => ({ ...prev, loading: false, error: error.message }));
        return;
      }

      const formattedStrategies = (strategies || []).map((strategy) => {
        const metrics = strategy?.strategy_metrics;
        const latestMetric = Array.isArray(metrics) ? metrics[0] : metrics;
        const changePercent = latestMetric?.r_1m ? (latestMetric.r_1m * 100).toFixed(1) : 0;

        return {
          id: strategy.id,
          strategyId: strategy.id,
          name: strategy.name || "Unknown Strategy",
          shortName: strategy.short_name || strategy.name || "Strategy",
          description: strategy.description || "",
          riskLevel: strategy.risk_level || "Moderate",
          sector: strategy.sector || "",
          iconUrl: strategy.icon_url,
          imageUrl: strategy.image_url,
          holdings: strategy?.holdings || [],
          investedAmount: 0,
          currentValue: latestMetric?.last_close || 0,
          unitsHeld: 0,
          entryDate: null,
          lastUpdated: latestMetric?.as_of_date,
          previousMonthChange: parseFloat(changePercent),
          metrics: latestMetric,
        };
      });

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

export const useStrategyChartData = (strategyId, timeFilter = "W") => {
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

        const formattedData = formatChartData(priceHistory, timeFilter);
        setChartData(formattedData);

      } catch (err) {
        console.error("Error fetching chart data:", err);
        setChartData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
  }, [strategyId, timeFilter]);

  return { chartData, loading };
};

function formatChartData(priceHistory, timeFilter) {
  if (!priceHistory || priceHistory.length === 0) return [];

  switch (timeFilter) {
    case "D": {
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      return priceHistory.map((p, idx) => {
        const date = new Date(p.ts);
        return {
          day: dayNames[date.getDay()],
          value: p.nav,
          fullDate: date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' }),
        };
      });
    }
    case "W": {
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      return priceHistory.map((p, idx) => {
        const date = new Date(p.ts);
        return {
          day: dayNames[date.getDay()] + ' ' + date.getDate(),
          value: p.nav,
          fullDate: date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' }),
        };
      });
    }
    case "M": {
      const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      return priceHistory.map((p, idx) => {
        const date = new Date(p.ts);
        return {
          day: date.getDate() + ' ' + monthNames[date.getMonth()],
          value: p.nav,
          fullDate: date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }),
        };
      });
    }
    case "ALL": {
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const grouped = {};
      priceHistory.forEach((p) => {
        const date = new Date(p.ts);
        const key = `${monthNames[date.getMonth()]} '${date.getFullYear().toString().slice(-2)}`;
        grouped[key] = p.nav;
      });
      const entries = Object.entries(grouped);
      return entries.map(([day, value], idx) => ({
        day,
        value,
        fullDate: day,
      }));
    }
    default:
      return priceHistory.map((p) => ({
        day: new Date(p.ts).toLocaleDateString(),
        value: p.nav,
        fullDate: new Date(p.ts).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }),
      }));
  }
}
