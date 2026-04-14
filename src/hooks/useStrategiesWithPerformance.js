import { useState, useEffect } from "react";

/**
 * Fetches strategies and their latest performance metrics
 * Merges performance data (r_ytd, r_1m, r_1y, etc.) into strategy objects
 */
export const useStrategiesWithPerformance = (strategies = []) => {
  const [strategiesWithMetrics, setStrategiesWithMetrics] = useState(strategies);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!strategies || strategies.length === 0) {
      setStrategiesWithMetrics([]);
      return;
    }

    const fetchPerformanceMetrics = async () => {
      try {
        setLoading(true);
        const strategyIds = strategies.map(s => s.id).filter(Boolean);

        if (strategyIds.length === 0) {
          setStrategiesWithMetrics(strategies);
          return;
        }

        // Fetch performance for all strategies
        const url = `/api/strategy-performance.js`;
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("supabase_token") || ""}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch performance metrics: ${response.status}`);
        }

        const result = await response.json();

        if (result.success && result.data) {
          // Create a map of performance data by strategy_id
          const performanceMap = {};
          result.data.forEach(perf => {
            performanceMap[perf.strategy_id] = {
              r_1w: perf.returns.one_week ? perf.returns.one_week / 100 : null,
              r_1m: perf.returns.one_month ? perf.returns.one_month / 100 : null,
              r_3m: perf.returns.three_month ? perf.returns.three_month / 100 : null,
              r_6m: perf.returns.six_month ? perf.returns.six_month / 100 : null,
              r_ytd: perf.returns.ytd ? perf.returns.ytd / 100 : null,
              r_1y: perf.returns.one_year ? perf.returns.one_year / 100 : null,
              r_3y: perf.returns.three_year ? perf.returns.three_year / 100 : null,
              r_all_time: perf.returns.all_time ? perf.returns.all_time / 100 : null,
              portfolio_value: perf.portfolio_value,
              performance_date: perf.as_of_date,
            };
          });

          // Merge performance data into strategies
          const merged = strategies.map(strategy => ({
            ...strategy,
            ...performanceMap[strategy.id],
          }));

          setStrategiesWithMetrics(merged);
          setError(null);
        } else {
          throw new Error(result.error || "Failed to fetch performance metrics");
        }
      } catch (err) {
        console.error("[useStrategiesWithPerformance] Error:", err);
        setError(err.message);
        // Fallback to original strategies without performance data
        setStrategiesWithMetrics(strategies);
      } finally {
        setLoading(false);
      }
    };

    fetchPerformanceMetrics();
  }, [strategies]);

  return { strategiesWithMetrics, loading, error };
};
