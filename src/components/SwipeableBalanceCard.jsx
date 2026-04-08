import React, { useState, useMemo, useEffect, useLayoutEffect, useRef, useCallback } from "react";
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

// Fix for Supabase auth lock warning in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const originalWarn = console.warn;
  console.warn = (...args) => {
    if (args[0]?.includes?.('Lock') && args[0]?.includes?.('not released')) {
      return; // Suppress the lock warning
    }  
    originalWarn.apply(console, args);
  };
}

// Simple debounce implementation
const debounce = (func, wait) => {
  let timeout;
  const debounced = (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
  debounced.cancel = () => clearTimeout(timeout);
  return debounced;
};

// Shared promise to avoid lock contention when multiple cards mount at once
let sharedSessionPromise = null;
const getCoalescedSession = async () => {
  if (sharedSessionPromise) return sharedSessionPromise;
  sharedSessionPromise = supabase.auth.getSession().finally(() => {
    setTimeout(() => { sharedSessionPromise = null; }, 5000);
  });
  return sharedSessionPromise;
};

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

const TIMEFRAME_DAYS = { d: 1, w: 7, m: 30 };

function getWindowStart(activeTab, holdings) {
  const days = TIMEFRAME_DAYS[activeTab] || 30;
  const tabCutoff = new Date();
  tabCutoff.setHours(0, 0, 0, 0);
  tabCutoff.setDate(tabCutoff.getDate() - days);

  const allDates = (holdings || [])
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
  const isFetchingRef = useRef(false);

  const generateFallbackData = useCallback(() => {
    if (!holdings || holdings.length === 0) return [];
    
    const days = TIMEFRAME_DAYS[activeTab] || 30;
    const points = [];
    const now = Date.now();
    const targetSet = selectedAsset ? [selectedAsset] : holdings;
    
    const endValue = targetSet.reduce((acc, h) => {
      const marketValue = Number(h.market_value || 0) / 100;
      const invested = (Number(h.avg_fill || 0) * Number(h.quantity || 1)) / 100;
      return acc + (marketValue - invested);
    }, 0);

    for (let i = days; i >= 0; i--) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000);
      const progress = 1 - (i / days);
      const value = endValue * Math.pow(progress, 0.8);
      points.push({ d: date.getTime(), v: Number(value.toFixed(2)) });
    }
    return points;
  }, [activeTab, holdings, selectedAsset]);

  useEffect(() => {
    if (!userId || holdings.length === 0) {
      if (!loading) setChartData([]);
      return;
    }
    if (loading) return;

    if (isFetchingRef.current) return;
    if (abortControllerRef.current) abortControllerRef.current.abort();
    
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const fetchChartPrices = async () => {
      isFetchingRef.current = true;
      const fbData = generateFallbackData();
      if (fbData.length > 0) setChartData(fbData);
      
      setIsLoading(true);
      try {
        const holdingsToChart = selectedAsset ? [selectedAsset] : holdings;
        const days = TIMEFRAME_DAYS[activeTab] || 30;
        const cutoff = new Date();
        cutoff.setHours(0, 0, 0, 0);
        cutoff.setDate(cutoff.getDate() - days);
        const startDateStr = cutoff.toISOString().split("T")[0];

        let realPoints = [];
        
        if (selectedAsset?.isStrategy && (selectedAsset?.strategy_id || selectedAsset?.id)) {
          const tf = { d: "1D", w: "1W", m: "1M" }[activeTab] || "1M";
          const sid = selectedAsset.strategy_id || selectedAsset.id;
          let ph = await getStrategyPriceHistory(sid, tf);
          if (abortController.signal.aborted) return;
          
          if (ph && ph.length > 0) {
            const latestNav = ph[ph.length - 1]?.nav;
            const currentMV = Number(selectedAsset.market_value || 0) / 100;
            const cost = (Number(selectedAsset.avg_fill || 0) * Number(selectedAsset.quantity || 1)) / 100;
            if (latestNav > 0) {
              realPoints = ph.map(p => ({
                d: new Date(p.ts).getTime(),
                v: Number((currentMV * (p.nav / latestNav) - cost).toFixed(2))
              }));
            }
          }
        } else {
          const stockHoldings = holdingsToChart.filter(h => h.security_id && !h.isStrategy);
          const strategyHoldings = holdingsToChart.filter(h => h.isStrategy);
          const stratPnl = {};
          
          for (const sh of strategyHoldings) {
            const tf = { d: "1D", w: "1W", m: "1M" }[activeTab] || "1M";
            let history = await getStrategyPriceHistory(sh.strategy_id || sh.id, tf);
            if (abortController.signal.aborted) return;
            if (history && history.length > 0) {
              const latest = history[history.length - 1]?.nav;
              const current = Number(sh.market_value || 0) / 100;
              const cost = (Number(sh.avg_fill || 0) * Number(sh.quantity || 1)) / 100;
              if (latest > 0) {
                history.forEach(p => {
                  const k = p.ts.split("T")[0];
                  stratPnl[k] = (stratPnl[k] || 0) + (current * (p.nav / latest) - cost);
                });
              }
            }
          }
          
          const priceRes = await Promise.all(stockHoldings.map(async (h) => {
            if (!h.security_id) return null;
            let { data, error } = await supabase.from("security_prices").select("ts, close_price").eq("security_id", h.security_id).gte("ts", startDateStr).order("ts", { ascending: true }).abortSignal(abortController.signal);
            if (error || !data || data.length < 2) {
              const fb = await supabase.from("security_prices").select("ts, close_price").eq("security_id", h.security_id).order("ts", { ascending: false }).limit(30).abortSignal(abortController.signal);
              if (fb.data && fb.data.length > 0) data = fb.data.reverse();
            }
            if (!data || data.length === 0) return null;
            return { h, prices: data.map(p => ({ ts: p.ts.split("T")[0], close: Number(p.close_price) / 100 })) };
          }));
          
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
              if (match) {
                const pnl = Number(h.quantity || 1) * (match.close - (Number(h.avg_fill || 0) / 100));
                total += pnl;
              }
            });
            if (stratPnl[dKey]) total += stratPnl[dKey];
            const [y, m, d] = dKey.split("-").map(Number);
            return { d: new Date(y, m - 1, d).getTime(), v: Number(total.toFixed(2)) };
          });
        }

        if (!abortController.signal.aborted) {
          if (realPoints.length > 0) {
            setChartData(realPoints);
            setError(null);
          }
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error("❌ [Chart] Fetch failed:", err);
          setError(err);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
          isFetchingRef.current = false;
        }
      }
    };

    fetchChartPrices();
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      isFetchingRef.current = false;
    };
  }, [userId, holdings, activeTab, selectedAsset, lastUpdated, loading, generateFallbackData]);

  return { chartData, isLoading, error };
};

class ChartErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return <div className="h-[170px] flex items-center justify-center bg-rose-500/5 rounded-2xl border border-rose-500/20"><p className="text-[10px] text-rose-300">Chart rendering failed</p></div>;
    return this.props.children;
  }
}

const SwipeableBalanceCard = ({ userId, mintNumber: mintNumberProp }) => {
  const [activeTab, setActiveTab] = useState("m");
  const { lastUpdated } = useRealtimePrices();
  const [dbData, setDbData] = useState({ holdings: [], totalMarketValue: 0, totalInvested: 0, totalInvestedAmount: 0, holdingsCount: 0 });
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState(0);
  const [mintNumber, setMintNumber] = useState(mintNumberProp || null);
  const chartWrapRef = useRef(null);
  const [chartKey, setChartKey] = useState(0);

  useEffect(() => {
    if (!userId) return;
    const fetchW = async () => {
      const { data } = await supabase.from("wallets").select("balance").eq("user_id", userId).maybeSingle();
      if (data) setWalletBalance(Number(data.balance) / 100);
    };
    const fetchM = async () => {
      if (mintNumberProp) { setMintNumber(mintNumberProp); return; }
      const { data } = await supabase.from("profiles").select("mint_number").eq("id", userId).maybeSingle();
      if (data) setMintNumber(data.mint_number);
    };
    fetchW();
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
        const stratH = (stratRes.strategies || []).map(s => ({
          symbol: s.shortName || s.name || "Strat",
          name: s.name,
          market_value: Math.round((s.currentMarketValue || s.investedAmount || 0) * 100),
          invested_amount: Math.round((s.investedAmount || 0) * 100),
          avg_fill: Math.round((s.investedAmount || 0) * 100),
          quantity: 1,
          isStrategy: true,
          strategy_id: s.id,
          firstInvestedDate: s.firstInvestedDate
        }));
        const enriched = [...stockH, ...stratH];
        setDbData({
          holdings: enriched,
          totalMarketValue: enriched.reduce((a, h) => a + Number(h.market_value || 0) / 100, 0),
          totalInvested: enriched.reduce((a, h) => a + (Number(h.avg_fill || 0) * Number(h.quantity || 0)) / 100, 0),
          totalInvestedAmount: enriched.reduce((a, h) => a + Number(h.invested_amount || h.market_value || 0) / 100, 0),
          holdingsCount: enriched.length
        });
      } catch (e) { console.error('❌ [Holdings] Load failed:', e); }
      finally { setLoading(false); }
    };
    loadD();
  }, [userId, lastUpdated]);

  const { chartData, isLoading: chartLoading } = useChartData(userId, dbData.holdings, activeTab, selectedAsset, lastUpdated, loading);

  const startTime = useMemo(() => getWindowStart(activeTab, dbData.holdings), [activeTab, dbData.holdings]);
  const now = Date.now();
  const padded = useMemo(() => padChartSeriesPoints(chartData, startTime, now), [chartData, startTime, now]);

  const yDomain = useMemo(() => {
    if (!padded.length) return [0, "auto"];
    const vals = padded.map(p => p.v);
    const min = Math.min(0, ...vals);
    const max = Math.max(...vals);
    const pad = Math.abs(max - min) * 0.1 || 1;
    return [min - pad, max + pad];
  }, [padded]);

  useLayoutEffect(() => {
    const el = chartWrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setChartKey(k => k + 1));
    ro.observe(el);
    return () => ro.disconnect();
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
          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-medium">
            {selectedAsset ? selectedAsset.symbol : "portfolio value"}
          </p>
          <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/11">
            {["d", "w", "m"].map(t => (
              <button
                key={t}
                onClick={(e) => { e.stopPropagation(); setActiveTab(t); }}
                className={`px-3 py-1 text-[10px] font-semibold rounded-md transition-colors ${
                  activeTab === t ? "bg-white/10 text-white" : "text-slate-300 hover:text-white"
                }`}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <p className="text-[36px] font-bold text-white mb-3 truncate">{formatFull(iA + pnl)}</p>
        <div className="mb-2 flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-xl border text-sm font-semibold shrink-0 ${
            isLoss ? "border-rose-700/70 bg-rose-600/15 text-rose-300" : "border-emerald-700/70 bg-emerald-600/15 text-emerald-300"
          }`}>
            {isLoss ? "▼" : "▲"} {formatKMB(Math.abs(pnl))}
          </span>
          <span className={`text-[12px] font-medium ${isLoss ? "text-rose-300/80" : "text-emerald-300/80"}`}>
            {iB > 0 ? ((pnl / iB) * 100).toFixed(1) : "0.0"}% all time
          </span>
        </div>
        <div ref={chartWrapRef} className="mb-3 w-full h-[170px] relative">
          {padded.length > 0 ? (
            <ResponsiveContainer key={`chart-${chartKey}-${activeTab}`} width="100%" height={170}>
              <ComposedChart data={padded}>
                <defs>
                  <linearGradient id={`colorV-${chartKey}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={isLoss ? "#FB7185" : "#10B981"} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={isLoss ? "#FB7185" : "#10B981"} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="d" type="number" domain={[startTime, now]} hide />
                <YAxis yAxisId="pnl" domain={yDomain} hide />
                <Tooltip content={<BalanceChartTooltip />} />
                <ReferenceLine yAxisId="pnl" y={0} stroke="rgba(148,163,184,0.4)" strokeDasharray="3 3" />
                <Area
                  yAxisId="pnl"
                  type="monotone"
                  dataKey="v"
                  stroke={isLoss ? "#FB7185" : "#10B981"}
                  strokeWidth={2}
                  fill={`url(#colorV-${chartKey})`}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (loading || chartLoading) ? (
            <div className="flex items-end gap-1 w-full h-full py-2">
              {[40, 55, 35, 65, 50, 70, 45, 60, 75, 55, 65, 50].map((h, i) => (
                <Skeleton key={i} className="flex-1 rounded-sm bg-white/10" style={{ height: `${h}%` }} />
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-[9px] text-slate-400">No chart data available</p>
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

export default (props) => (<ChartErrorBoundary><SwipeableBalanceCard {...props} /></ChartErrorBoundary>);