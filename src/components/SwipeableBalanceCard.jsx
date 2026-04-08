import React, { useState, useMemo, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { flushSync } from 'react-dom';
import {
  Eye,
  EyeOff,
  TrendingUp,
  LayoutGrid,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "../lib/supabase";
import { getStrategyPriceHistory } from "../lib/strategyData";
import { useRealtimePrices } from "../lib/useRealtimePrices";
import Skeleton from "./Skeleton";
import SettlementBadge from "./PendingBadge";
import {
  useSettlementConfig,
  getSettlementStatusForHolding,
} from "../lib/useSettlementStatus";

const VISIBILITY_STORAGE_KEY = "mintBalanceVisible";

const formatFull = (value) => {
  const num = Number(value);
  return `R${num.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatKMB = (value) => {
  const num = Number(value);
  const sign = num < 0 ? "-" : "";
  const absNum = Math.abs(num);
  let formatted = absNum;
  if (absNum >= 1e9) formatted = (absNum / 1e9).toFixed(1) + "b";
  else if (absNum >= 1e6) formatted = (absNum / 1e6).toFixed(1) + "m";
  else if (absNum >= 1e3) formatted = (absNum / 1e3).toFixed(1) + "k";
  else formatted = absNum.toFixed(2);
  return `${sign}R${formatted}`;
};

const TIMEFRAME_DAYS = { d: 5, w: 7, m: 30 };

function getWindowStart(activeTab, holdings) {
  const days = TIMEFRAME_DAYS[activeTab] || 30;
  const tabCutoff = new Date();
  tabCutoff.setHours(0, 0, 0, 0);
  tabCutoff.setDate(tabCutoff.getDate() - days);

  const allDates = holdings
    .map(h => h.firstInvestedDate || h.created_at)
    .filter(Boolean)
    .map(d => d.slice(0, 10))
    .sort();

  if (!allDates.length) return tabCutoff.getTime();
  const joinCutoff = new Date(allDates[0]);
  joinCutoff.setHours(0, 0, 0, 0);
  return Math.max(tabCutoff.getTime(), joinCutoff.getTime());
}

function timeKey(d) {
  return typeof d === "number" ? d : new Date(d).getTime();
}

function padChartSeriesPoints(points, windowStart, windowEnd) {
  if (!points?.length) return [];
  const sorted = [...points].sort((a, b) => timeKey(a.d) - timeKey(b.d));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const out = [];
  if (timeKey(first.d) > windowStart) out.push({ d: windowStart, v: first.v });
  out.push(...sorted);
  if (timeKey(last.d) < windowEnd) out.push({ d: windowEnd, v: last.v });
  return out;
}

function BalanceChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const raw = payload[0]?.payload?.d;
  const dateFormatted = new Date(raw).toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
  return (
    <div className="rounded-lg border border-slate-200 bg-white/95 px-2 py-1 shadow-md backdrop-blur-sm">
      <p className="text-[9px] text-slate-500">{dateFormatted}</p>
      <p className="text-[10px] font-semibold text-slate-800">R{Number(payload[0]?.value).toFixed(2)}</p>
    </div>
  );
}

const useChartData = (userId, holdings, activeTab, selectedAsset, lastUpdated, loading) => {
  const [chartData, setChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);
  const pendingFetchRef = useRef(false);

  // SMART FALLBACK DATA GENERATION
  const generateFallbackData = useCallback(() => {
    if (!holdings || holdings.length === 0) return [];
    const days = TIMEFRAME_DAYS[activeTab] || 30;
    const points = [];
    const now = Date.now();
    const startValue = 0;

    // Use selected asset or total portfolio for end value
    const targetSet = selectedAsset ? [selectedAsset] : holdings;
    const endValue = targetSet.reduce((acc, h) => {
      const marketValue = Number(h.market_value || 0) / 100;
      const invested = (Number(h.avg_fill || 0) * Number(h.quantity || 1)) / 100;
      return acc + (marketValue - invested);
    }, 0);

    for (let i = days; i >= 0; i--) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000);
      const progress = 1 - (i / days);
      // Create a slight curve rather than pure linear
      const value = startValue + (endValue - startValue) * (Math.pow(progress, 0.8));
      points.push({ d: date.getTime(), v: Number(value.toFixed(2)) });
    }

    console.log(`📊 [Chart] Initialized with fallback to endValue: R${endValue.toFixed(2)}`);
    return points;
  }, [activeTab, holdings, selectedAsset]);

  useEffect(() => {
    // Clear data if no user or no holdings
    if (!userId || holdings.length === 0) {
      if (!loading) setChartData([]);
      return;
    }

    // Don't fetch if parent is still loading
    if (loading) {
      return;
    }

    // Cancel any pending fetch
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      const [holdingsRes, strategiesRes] = token
        ? await Promise.all([
          fetch("/api/user/holdings", {
            headers: { Authorization: `Bearer ${token}` },
          }).then((r) => (r.ok ? r.json() : { holdings: [] })),
          fetch("/api/user/strategies", {
            headers: { Authorization: `Bearer ${token}` },
          }).then((r) => (r.ok ? r.json() : { strategies: [] })),
        ])
        : [{ holdings: [] }, { strategies: [] }];

      const stockHoldings = (holdingsRes.holdings || []).filter(h => !h.strategy_id);
      const strategyItems = await Promise.all((strategiesRes.strategies || []).map(async (s) => {
        const holdingsArr = s.holdings || [];
        const topLogos = holdingsArr
          .sort((a, b) => (b.weight || 0) - (a.weight || 0))
          .slice(0, 3)
          .map((h) => h.logo_url || null)
          .filter(Boolean);
        const investedRands = s.investedAmount || 0;
        const liveRands = s.currentMarketValue != null ? s.currentMarketValue : investedRands;
        const purchaseDate = s.firstInvestedDate;
        let changePct = investedRands > 0 ? ((liveRands - investedRands) / investedRands) * 100 : 0;

        const investedCents = Math.round(investedRands * 100);
        const currentCents = Math.round(liveRands * 100);
        return {
          symbol: s.shortName || s.name || "Strategy",
          name: s.name || "Strategy",
          market_value: currentCents,
          invested_amount: investedCents,
          avg_fill: investedCents,
          quantity: 1,
          logo_url: null,
          security_id: null,
          isStrategy: true,
          strategyId: s.id,
          topLogos: topLogos,
          changePct: changePct,
          holdings: holdingsArr,
          firstInvestedDate: purchaseDate,
        };
      }));
      const enrichedHoldings = [...stockHoldings, ...strategyItems];

      const mValue = enrichedHoldings.reduce(
        (acc, h) => acc + Number(h.market_value || 0) / 100,
        0,
      );
      const invested = enrichedHoldings.reduce(
        (acc, h) =>
          acc + (Number(h.avg_fill || 0) * Number(h.quantity || 0)) / 100,
        0,
      );
      const investedAmount = enrichedHoldings.reduce(
        (acc, h) => acc + Number(h.invested_amount || h.market_value || 0) / 100,
        0,
      );

      setDbData({
        holdings: enrichedHoldings,
        totalMarketValue: mValue,
        totalInvested: invested,
        totalInvestedAmount: investedAmount,
        holdingsCount: enrichedHoldings.length,
      });
      setLoading(false);
    };

    loadDataRef.current = loadData;
    loadData();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") loadDataRef.current?.();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [userId, lastUpdated]);

  useEffect(() => {
    const fetchChartPrices = async () => {
      if (!userId) return;

      // ── FIX 3: Don't wipe chart while holdings are still loading ──────────
      if (dbData.holdings.length === 0) {
        if (!loading) setChartData([]);
        return;
      }

      setChartLoading(true);

      const holdingsToChart = selectedAsset ? [selectedAsset] : dbData.holdings;
      const days = TIMEFRAME_DAYS[activeTab] || 30;
      const cutoff = new Date();
      cutoff.setHours(0, 0, 0, 0); // Start of today
      cutoff.setDate(cutoff.getDate() - days);
      const startTime = cutoff.getTime();
      const startDateStr = cutoff.toISOString().split("T")[0];

      if (selectedAsset?.isStrategy && selectedAsset?.strategyId) {
        const timeframeMap = { d: "1D", w: "1W", m: "1M" };
        const tf = timeframeMap[activeTab] || "1M";
        let priceHistory = await getStrategyPriceHistory(
          selectedAsset.strategyId,
          tf,
        );
        const purchaseDateStr = selectedAsset.firstInvestedDate ? selectedAsset.firstInvestedDate.slice(0, 10) : null;
        if (purchaseDateStr && priceHistory && priceHistory.length > 0) {
          const afterPurchase = priceHistory.filter(p => p.ts.split("T")[0] >= purchaseDateStr);
          if (afterPurchase.length >= 1) {
            priceHistory = afterPurchase;
          } else {
            const beforePurchase = priceHistory.filter(p => p.ts.split("T")[0] < purchaseDateStr);
            if (beforePurchase.length > 0) {
              const lastKnown = beforePurchase[beforePurchase.length - 1];
              priceHistory = [lastKnown, { ...lastKnown, ts: purchaseDateStr + "T00:00:00Z" }];
            }
          }
        }
        if (priceHistory && priceHistory.length > 0) {
          const latestNav = priceHistory[priceHistory.length - 1].nav;
          const currentMarketValue = Number(selectedAsset.market_value || 0) / 100;
          const costBasis = (Number(selectedAsset.avg_fill || 0) * Number(selectedAsset.quantity || 1)) / 100;
          if (latestNav > 0) {
            const points = [];
            const firstTs = priceHistory[0].ts.split("T")[0];
            const anchorDate = new Date(firstTs);
            anchorDate.setDate(anchorDate.getDate() - 1);
            points.push({ d: anchorDate.toISOString().split("T")[0], v: 0 });
            priceHistory.forEach((p) => {
              const valueAtDate = currentMarketValue * (p.nav / latestNav);
              const pnl = valueAtDate - costBasis;
                const pTime = new Date(p.ts).getTime();
                points.push({
                  d: pTime,
                  v: Number(pnl.toFixed(2)),
                });
            });
            setChartData(points);
          } else {
            setChartData([]);
          }
        } else {
          setChartData([]);
        }
        setChartLoading(false);
        return;
      }

      const stockHoldings = holdingsToChart.filter(
        (h) => h.security_id && !h.isStrategy,
      );
      const strategyHoldings = holdingsToChart.filter(
        (h) => h.isStrategy && h.strategyId,
      );

      const strategyPnlByDate = {};
      const timeframeMap = { d: "1D", w: "1W", m: "1M" };
      const tf = timeframeMap[activeTab] || "1M";
      for (const sh of strategyHoldings) {
        try {
          let priceHistory = await getStrategyPriceHistory(sh.strategyId, tf);
          const pDateStr = sh.firstInvestedDate ? sh.firstInvestedDate.slice(0, 10) : null;
          if (pDateStr && priceHistory && priceHistory.length > 0) {
            const afterP = priceHistory.filter(p => p.ts.split("T")[0] >= pDateStr);
            if (afterP.length >= 1) {
              priceHistory = afterP;
            } else {
              const beforeP = priceHistory.filter(p => p.ts.split("T")[0] < pDateStr);
              if (beforeP.length > 0) {
                const lastKnown = beforeP[beforeP.length - 1];
                priceHistory = [lastKnown, { ...lastKnown, ts: pDateStr + "T00:00:00Z" }];
              }
            }
          }
          if (priceHistory && priceHistory.length > 0) {
            const latestNav = priceHistory[priceHistory.length - 1].nav;
            const currentMV = Number(sh.market_value || 0) / 100;
            const cost = (Number(sh.avg_fill || 0) * Number(sh.quantity || 1)) / 100;
            if (latest > 0 && history.length > 0) {
              history.forEach(p => {
                const k = p.ts.split("T")[0];
                stratPnl[k] = (stratPnl[k] || 0) + (current * (p.nav / latest) - cost);
              });
            }
          }
        } catch (e) { }
      }

      const pricePromises = stockHoldings.map(async (h) => {
        let { data, error } = await supabase
          .from("security_prices")
          .select("ts, close_price")
          .eq("security_id", h.security_id)
          .gte("ts", startDateStr)
          .order("ts", { ascending: true });

        if (error || !data || data.length < 2) {
          const fallback = await supabase
            .from("security_prices")
            .select("ts, close_price")
            .eq("security_id", h.security_id)
            .order("ts", { ascending: false })
            .limit(30);
          if (!fallback.error && fallback.data && fallback.data.length >= 2) {
            data = fallback.data.reverse();
          } else if (!data || data.length === 0) {
            return null;
          }
        }

        const pDateStr = (h.created_at || h.as_of_date || "").split("T")[0];
        const avgFillPrice = Number(h.avg_fill || 0) / 100;
        const livePrice = Number(h.last_price || 0) / 100;
        const allMapped = data.map((p) => ({
          ts: p.ts.split("T")[0],
          close: Number(p.close_price) / 100,
        }));
        let filteredPrices = allMapped.filter((p) => p.ts >= pDateStr);
        if (filteredPrices.length === 0) {
          filteredPrices = [{ ts: pDateStr, close: avgFillPrice }];
        }
        const today = new Date().toISOString().split("T")[0];
        const lastDate = filteredPrices[filteredPrices.length - 1]?.ts;
        if (livePrice > 0 && lastDate && lastDate < today) {
          filteredPrices.push({ ts: today, close: livePrice });
        }
        return {
          securityId: h.security_id,
          quantity: Number(h.quantity || 1),
          avgFill: avgFillPrice,
          fillDate: pDateStr,
          prices: filteredPrices,
        };
      });

      const allPriceData = (await Promise.all(pricePromises)).filter(Boolean);
      const hasStrategyData = Object.keys(strategyPnlByDate).length > 0;

      if (allPriceData.length === 0 && !hasStrategyData) {
        setChartData([]);
        setChartLoading(false);
        return;
      }

          if (abortController.signal.aborted) return;

          const validStocks = priceRes.filter(Boolean);
          const dateSet = new Set();
          validStocks.forEach(s => s.prices.forEach(p => dateSet.add(p.ts)));
          Object.keys(stratPnl).forEach(d => dateSet.add(d));
          const sorted = Array.from(dateSet).sort();

          realPoints = sorted.map(dKey => {
            let total = 0;
            validStocks.forEach(({ h, prices }) => {
              const match = prices.find(p => p.ts === dKey);
              if (match) total += Number(h.quantity || 1) * (match.close - (Number(h.avg_fill || 0) / 100));
            });
            if (stratPnl[dKey]) total += stratPnl[dKey];
            const [y, m, d] = dKey.split("-").map(Number);
            return { d: new Date(y, m - 1, d).getTime(), v: Number(total.toFixed(2)) };
          });
        }

        // Only update if we got valid data and haven't been aborted
        if (!abortController.signal.aborted) {
          if (realPoints.length > 0) {
            console.log(`✅ [Chart] History Hydrated: ${realPoints.length} points`);
            setChartData(realPoints);
            setError(null);
          } else {
            console.log(`⚠️ [Chart] No real data, keeping fallback`);
            // Keep fallback data that was set earlier
          }
        }
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.error("❌ [Chart] Fetch failed, keeping fallback:", err);
        setError(err);
        // Don't clear chartData - keep the fallback
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
          pendingFetchRef.current = false;
        }
      }
    };

    fetchChartPrices();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      pendingFetchRef.current = false;
    };
  }, [userId, holdings, activeTab, selectedAsset, lastUpdated, loading, generateFallbackData]);

  return { chartData, isLoading, error };
};

const SwipeableBalanceCard = ({ userId, mintNumber: mintNumberProp }) => {
  const [activeTab, setActiveTab] = useState("m");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { lastUpdated, isConnected } = useRealtimePrices();
  const settlementCfg = useSettlementConfig();
  const [showUpdatedText, setShowUpdatedText] = useState(false);
  const [dbData, setDbData] = useState({ holdings: [], totalMarketValue: 0, totalInvested: 0, totalInvestedAmount: 0, holdingsCount: 0 });
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletLoading, setWalletLoading] = useState(true);
  const chartWrapRef = useRef(null);
  const holdingsScrollRef = useRef(null);
  const [chartKey, setChartKey] = useState(0);

      setChartData(points);
      setChartLoading(false);
    };

    fetchChartPrices();
  }, [userId, dbData.holdings, activeTab, selectedAsset, lastUpdated, loading]);

  useLayoutEffect(() => {
    const el = chartWrapRef.current;
    if (!el) return;
    let rafId = null;
    let retryTimer = null;
    const measure = () => {
      const w = Math.round(el.getBoundingClientRect().width);
      if (w < 1) return;
      setChartWidth(w);
      if (Math.abs(w - lastMeasuredWidthRef.current) > 1) {
        lastMeasuredWidthRef.current = w;
        setChartKey((k) => k + 1);
      }
    };
    fetchW();
  }, [userId]);

  const [mintNumber, setMintNumber] = useState(mintNumberProp || null);
  useEffect(() => {
    if (!userId || mintNumberProp) { if (mintNumberProp) setMintNumber(mintNumberProp); return; }
    const fetchM = async () => {
      const { data } = await supabase.from("profiles").select("mint_number").eq("id", userId).single();
      if (data) setMintNumber(data.mint_number);
    };
    fetchM();
  }, [userId, mintNumberProp]);

  useEffect(() => {
    const loadD = async () => {
      if (!userId) return;
      if (dbData.holdings.length === 0) setLoading(true);
      try {
        const { data: { session } } = await getCoalescedSession();
        const [holdRes, stratRes] = await Promise.all([
          fetch("/api/user/holdings", { headers: { Authorization: `Bearer ${session?.access_token}` } }).then(r => r.json()),
          fetch("/api/user/strategies", { headers: { Authorization: `Bearer ${session?.access_token}` } }).then(r => r.json())
        ]);
        const stockH = (holdRes.holdings || []).filter(h => !h.strategy_id);
        const stratH = (stratRes.strategies || []).map(s => ({ symbol: s.shortName || s.name || "Strat", name: s.name, market_value: Math.round((s.currentMarketValue || s.investedAmount || 0) * 100), invested_amount: Math.round((s.investedAmount || 0) * 100), avg_fill: Math.round((s.investedAmount || 0) * 100), quantity: 1, isStrategy: true, strategyId: s.id, firstInvestedDate: s.firstInvestedDate }));
        const enriched = [...stockH, ...stratH];
        setDbData({ holdings: enriched, totalMarketValue: enriched.reduce((a, h) => a + Number(h.market_value || 0) / 100, 0), totalInvested: enriched.reduce((a, h) => a + (Number(h.avg_fill || 0) * Number(h.quantity || 0)) / 100, 0), totalInvestedAmount: enriched.reduce((a, h) => a + Number(h.invested_amount || h.market_value || 0) / 100, 0), holdingsCount: enriched.length });
      } catch (e) { } finally { setLoading(false); }
    };
    loadD();
  }, [userId, lastUpdated]);

  const { chartData, isLoading: chartLoading } = useChartData(userId, dbData.holdings, activeTab, selectedAsset, lastUpdated, loading);

  const startTime = getWindowStart(activeTab, dbData.holdings);
  const now = Date.now();
  const padded = useMemo(() => padChartSeriesPoints(chartData, startTime, now), [chartData, startTime, now]);

  // Simplified chart display logic
  const shouldShowChart = chartData.length > 0;
  const shouldShowSkeleton = loading && chartData.length === 0;

  const yDomain = useMemo(() => {
    if (!padded.length) return [0, "auto"];
    const vals = padded.map(p => p.v);
    const min = Math.min(0, ...vals), max = Math.max(...vals);
    const pad = (max - min) * 0.1 || 1;
    return [min - pad, max + pad];
  }, [padded]);

  useLayoutEffect(() => {
    const el = chartWrapRef.current; if (!el) return;
    const ro = new ResizeObserver(() => setChartKey(k => k + 1));
    ro.observe(el); return () => ro.disconnect();
  }, []);

  const mV = selectedAsset ? Number(selectedAsset.market_value || 0) / 100 : dbData.totalMarketValue;
  const iA = selectedAsset ? Number(selectedAsset.invested_amount || selectedAsset.market_value || 0) / 100 : dbData.totalInvestedAmount;
  const iB = selectedAsset ? (Number(selectedAsset.avg_fill || 0) * Number(selectedAsset.quantity || 0)) / 100 : dbData.totalInvested;
  const pnl = mV - iB;
  const isLoss = pnl < 0;

  if (loading && userId) return <div className="w-full h-full rounded-[28px] bg-slate-50 p-4 animate-pulse" />;

  return (
    <div className="relative w-full z-10 rounded-[26px] overflow-hidden">
      <div className="absolute inset-0 rounded-[26px] bg-[radial-gradient(circle_at_78%_18%,rgba(88,62,186,0.45),rgba(8,8,48,0.95)_46%,rgba(5,5,33,0.98)_100%)]" />
      <div className="relative z-10 flex flex-col p-4 text-slate-100">
        <div className="mb-2 flex items-start justify-between">
          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-medium">{selectedAsset ? selectedAsset.symbol : "portfolio value"}</p>
          <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/11">
            {["d", "w", "m"].map(t => (
              <button key={t} onClick={() => setActiveTab(t)} className={`px-3 py-1 text-[10px] font-semibold rounded-md ${activeTab === t ? "bg-white/10 text-white" : "text-slate-300"}`}>{t.toUpperCase()}</button>
            ))}
          </div>
        </div>
        <p className="text-[36px] font-bold text-white mb-3 truncate">{formatFull(iA + pnl)}</p>
        <div className="mb-2 flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-xl border text-sm font-semibold shrink-0 ${isLoss ? "border-rose-700/70 bg-rose-600/15 text-rose-300" : "border-emerald-700/70 bg-emerald-600/15 text-emerald-300"}`}>
            {isLoss ? "▼" : "▲"} {formatKMB(Math.abs(pnl))}
          </span>
          <span className={`text-[12px] font-medium ${isLoss ? "text-rose-300/80" : "text-emerald-300/80"}`}>{iB > 0 ? ((pnl / iB) * 100).toFixed(1) : "0.0"}% all time</span>
        </div>
        <div ref={chartWrapRef} className="mb-3 w-full h-[170px] relative">
          {shouldShowChart ? (
            <ResponsiveContainer key={`chart-${chartKey}`} width="100%" height={170}>
              <ComposedChart data={padded}>
                <defs><linearGradient id={`colorV-${chartKey}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={isLoss ? "#FB7185" : "#10B981"} stopOpacity={0.35} /><stop offset="95%" stopColor={isLoss ? "#FB7185" : "#10B981"} stopOpacity={0} /></linearGradient></defs>
                <XAxis dataKey="d" type="number" domain={[startTime, now]} hide />
                <YAxis yAxisId="pnl" domain={yDomain} hide />
                <Tooltip content={<BalanceChartTooltip />} />
                <ReferenceLine yAxisId="pnl" y={0} stroke="rgba(148,163,184,0.4)" strokeDasharray="3 3" />
                <Area yAxisId="pnl" type="monotone" dataKey="v" stroke={isLoss ? "#FB7185" : "#10B981"} strokeWidth={2} fill={`url(#colorV-${chartKey})`} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : shouldShowSkeleton ? (
            <div className="flex items-end gap-1 w-full h-full py-2">
              {[40, 55, 35, 65, 50, 70, 45, 60, 75, 55, 65, 50].map((h, i) => (<Skeleton key={i} className="flex-1 rounded-sm bg-white/10" style={{ height: `${h}%` }} />))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-[9px] text-slate-400">No chart data available</p>
            </div>
          )}
        </div>

        <div
          ref={chartWrapRef}
          className="mb-3 w-full min-w-0 overflow-hidden"
          style={{ minHeight: 170, height: 170 }}
        >
              {chartData.length > 0 ? (
                chartWidth > 0 ? (
                <ResponsiveContainer
                  key={`chart-${chartKey}-${activeTab}`}
                  width={chartWidth}
                  height={170}
                >
                  <ComposedChart
                    data={paddedChartData}
                    margin={{ top: 8, right: 4, left: 0, bottom: 2 }}
                  >
                    <defs>
                      <linearGradient
                        id={`colorValue-${chartKey}`}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="5%" stopColor={chartColor} stopOpacity={0.35} />
                        <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="d"
                      type="number"
                      domain={[startTime, now]}
                      hide
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="pnl"
                      orientation="right"
                      domain={yAxisDomain}
                      width={0}
                      tick={false}
                      axisLine={false}
                      tickLine={false}
                      hide
                    />
                    <Tooltip content={<BalanceChartTooltip />} />
                    <ReferenceLine
                      yAxisId="pnl"
                      y={0}
                      stroke="rgba(148,163,184,0.45)"
                      strokeDasharray="3 3"
                      strokeWidth={1}
                    />
                    <Area
                      yAxisId="pnl"
                      type="monotone"
                      dataKey="v"
                      stroke={chartColor}
                      strokeWidth={2}
                      fill={`url(#colorValue-${chartKey})`}
                      fillOpacity={1}
                      dot={false}
                      isAnimationActive={false}
                      activeDot={{
                        r: 3,
                        fill: "#fff",
                        stroke: chartColor,
                        strokeWidth: 2,
                      }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
                ) : (
                  <div className="flex h-full w-full items-end gap-1 py-2">
                    {[40, 55, 35, 65, 50, 70, 45, 60, 75, 55].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-sm bg-white/10"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                )
              ) : (
                <div className="flex items-center justify-center h-full">
                  {chartLoading ? (
                    <div className="flex items-end gap-1 w-full h-full py-2">
                      {[40, 55, 35, 65, 50, 70, 45, 60, 75, 55, 65, 50].map(
                        (h, i) => (
                          <Skeleton
                            key={i}
                            className="flex-1 rounded-sm bg-white/10"
                            style={{ height: `${h}%` }}
                          />
                        ),
                      )}
                    </div>
                  ) : (
                    <p className="text-[9px] text-slate-500">No chart data</p>
                  )}
                </div>
              )}
            </div>
        <div className="mt-auto pt-3 pb-5 border-t border-white/10 flex items-start">
          <div className="flex-1 pr-3">
            <p className="text-[8px] uppercase tracking-[0.2em] text-slate-400 font-medium mb-0.5">ACCOUNT BALANCE</p>
            <p className="text-[11px] font-semibold text-slate-100 truncate">{formatFull(walletBalance)}</p>
          </div>
          <div className="w-px self-stretch bg-white/10 mx-3" />
          <div className="flex-1 pl-3">
            <p className="text-[8px] uppercase tracking-[0.2em] text-slate-400 font-medium mb-0.5">MINT NUMBER</p>
            <p className="text-[11px] font-mono font-bold truncate">{mintNumber || "GENERATING..."}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default (props) => (<SwipeableBalanceCard {...props} />);