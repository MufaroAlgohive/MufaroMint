import { useState, useEffect, useCallback, useMemo } from 'react';
import { getMarketsSecuritiesWithMetrics, getSecurityPrices } from './marketData';

export function useStockQuotes(enabled = true) {
  const [securities, setSecurities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSecurities = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const allSecurities = await getMarketsSecuritiesWithMetrics();
      setSecurities(allSecurities);
      setError(null);
    } catch (err) {
      console.error('Error fetching securities:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    fetchSecurities();
  }, [fetchSecurities]);

  const quotes = useMemo(() => {
    const map = {};
    securities.forEach(sec => {
      map[sec.symbol] = {
        symbol: sec.symbol,
        name: sec.name,
        price: sec.currentPrice,
        previousClose: sec.prevClose,
        change: sec.changeAbs,
        changePercent: sec.changePct,
        logo: sec.logo_url,
        id: sec.id,
        returns: sec.returns,
      };
    });
    return map;
  }, [securities]);

  return { quotes, securities, loading, error, refetch: fetchSecurities };
}

export function useStockChart(securityId, timeFilter, purchaseDate = null) {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getTimeframe = (filter) => {
    switch (filter) {
      case 'D': return '1D';
      case 'W': return '1W';
      case 'M': return '1M';
      case 'ALL': return '1Y';
      default: return '1M';
    }
  };

  useEffect(() => {
    if (!securityId) {
      setChartData([]);
      setLoading(false);
      return;
    }

    const fetchChart = async () => {
      try {
        setLoading(true);
        const timeframe = getTimeframe(timeFilter);
        let prices = await getSecurityPrices(securityId, timeframe);

        if (purchaseDate && prices && prices.length > 0) {
          const purchaseDateStr = purchaseDate.slice(0, 10);
          const afterPurchase = prices.filter(p => p.ts.split("T")[0] >= purchaseDateStr);
          prices = afterPurchase.length >= 1 ? afterPurchase : [];
        }

        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        const formatted = (prices || []).map(p => {
          const dateStr = p.ts.split("T")[0];
          const [yr, mo, dy] = dateStr.split("-").map(Number);
          const localDate = new Date(yr, mo - 1, dy);
          const dow = localDate.getDay();
          let label;

          if (timeFilter === 'D') {
            const timePart = p.ts.includes("T")
              ? new Date(p.ts).toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
              : `${dy}`;
            label = dayNames[dow] + '|' + timePart;
          } else if (timeFilter === 'W') {
            label = dayNames[dow] + ' ' + dy;
          } else if (timeFilter === 'M') {
            label = dy + ' ' + monthNames[mo - 1];
          } else {
            label = monthNames[mo - 1] + " '" + String(yr).slice(-2);
          }

          return {
            day: label,
            value: Number(p.close.toFixed(2)),
            timestamp: localDate.getTime(),
          };
        });

        setChartData(formatted);
        setError(null);
      } catch (err) {
        console.error('Error fetching stock chart:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchChart();
  }, [securityId, timeFilter, purchaseDate]);

  return { chartData, loading, error };
}
