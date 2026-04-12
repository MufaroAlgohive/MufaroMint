import { useState, useEffect } from "react";

export const useStrategyPerformance = (strategyId = null) => {
  const [performance, setPerformance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPerformance = async () => {
      try {
        setLoading(true);
        const url = strategyId
          ? `/api/strategy-performance.js?strategyId=${strategyId}`
          : `/api/strategy-performance.js`;

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`Failed to fetch performance data: ${response.status}`);
        }

        const result = await response.json();

        if (result.success) {
          setPerformance(result.data);
          setError(null);
        } else {
          setError(result.error || "Failed to fetch performance");
        }
      } catch (err) {
        console.error("[useStrategyPerformance] Error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPerformance();
  }, [strategyId]);

  return { performance, loading, error };
};
