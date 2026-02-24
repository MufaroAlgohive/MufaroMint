import React, { useState, useMemo, useEffect, useRef } from "react";
import { Eye, EyeOff, TrendingUp, LayoutGrid, ChevronDown, ChevronUp } from "lucide-react";
import { Area, ComposedChart, Line, ResponsiveContainer, YAxis } from "recharts";
import { supabase } from "../lib/supabase";
import { getStrategyPriceHistory } from "../lib/strategyData";
import { getStrategyCurrentValue, getStrategyReturnPct } from "../lib/strategyUtils";
import { useRealtimePrices } from "../lib/useRealtimePrices";
import Skeleton from "./Skeleton";
import SettlementBadge from "./PendingBadge";
import { useSettlementConfig, getSettlementStatusForHolding } from "../lib/useSettlementStatus";

const VISIBILITY_STORAGE_KEY = "mintBalanceVisible";

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

const TIMEFRAME_DAYS = { "1m": 45, "3m": 110, "6m": 220 };

const SwipeableBalanceCard = ({ userId, isBackFacing = true, forceVisible, mintNumber }) => {
  const [activeTab, setActiveTab] = useState("1m");
  const [isOpen, setIsOpen] = useState(false);
  const { lastUpdated, isConnected } = useRealtimePrices();
  const settlementCfg = useSettlementConfig();
  const holdingSettlementStatus = getSettlementStatusForHolding(settlementCfg);
  const [showUpdatedText, setShowUpdatedText] = useState(false);
  const updatedTimerRef = useRef(null);

  useEffect(() => {
    if (lastUpdated) {
      setShowUpdatedText(true);
      if (updatedTimerRef.current) clearTimeout(updatedTimerRef.current);
      updatedTimerRef.current = setTimeout(() => setShowUpdatedText(false), 3000);
    }
    return () => {
      if (updatedTimerRef.current) clearTimeout(updatedTimerRef.current);
    };
  }, [lastUpdated]);

  useEffect(() => {
    if (!isBackFacing) setIsOpen(false);
  }, [isBackFacing]);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState([]);
  const [chartLoading, setChartLoading] = useState(false);
  const holdingsScrollRef = useRef(null);
  const scrollTimerRef = useRef(null);

  const scrollToHoldingIndex = (index) => {
    const container = holdingsScrollRef.current;
    if (!container) return;
    const item = container.querySelector(`[data-holding-index="${index}"]`);
    if (item) {
      const containerRect = container.getBoundingClientRect();
      const itemRect = item.getBoundingClientRect();
      const scrollLeft = container.scrollLeft + (itemRect.left - containerRect.left) - (containerRect.width / 2) + (itemRect.width / 2);
      container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }
  };

  const handleHoldingsScroll = () => {
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      const container = holdingsScrollRef.current;
      if (!container) return;
      const items = container.querySelectorAll('[data-holding-index]');
      const containerRect = container.getBoundingClientRect();
      const containerCenter = containerRect.left + containerRect.width / 2;
      let closestItem = null;
      let closestDist = Infinity;
      items.forEach(item => {
        const rect = item.getBoundingClientRect();
        const itemCenter = rect.left + rect.width / 2;
        const dist = Math.abs(itemCenter - containerCenter);
        if (dist < closestDist) {
          closestDist = dist;
          closestItem = item;
        }
      });
      if (closestItem) {
        const idx = parseInt(closestItem.getAttribute('data-holding-index'), 10);
        if (idx === -1) {
          setSelectedAsset(null);
        } else if (idx >= 0 && idx < dbData.holdings.length) {
          setSelectedAsset(dbData.holdings[idx]);
        }
      }
    }, 150);
  };
  
  const [dbData, setDbData] = useState({
    holdings: [],
    totalMarketValue: 0, 
    totalInvested: 0,
    holdingsCount: 0,
  });

  const isVisible = true;

  useEffect(() => {
    const loadData = async () => {
      if (!userId) return;
      setLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const [holdingsRes, strategiesRes] = token
        ? await Promise.all([
            fetch('/api/user/holdings', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : { holdings: [] }),
            fetch('/api/user/strategies', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : { strategies: [] }),
          ])
        : [{ holdings: [] }, { strategies: [] }];

      const stockHoldings = holdingsRes.holdings || [];
      const strategyItems = (strategiesRes.strategies || []).map(s => {
        const holdingsArr = s.holdings || [];
        const topLogos = holdingsArr
          .sort((a, b) => (b.weight || 0) - (a.weight || 0))
          .slice(0, 3)
          .map(h => h.logo_url || null)
          .filter(Boolean);
        const metrics = s.metrics || {};
        const investedRands = s.investedAmount || 0;
        const currentRands = getStrategyCurrentValue(investedRands, metrics);
        const changePct = getStrategyReturnPct(metrics);
        const investedCents = investedRands * 100;
        const currentCents = currentRands * 100;
        return {
          symbol: s.shortName || s.name || "Strategy",
          name: s.name || "Strategy",
          market_value: currentCents,
          avg_fill: investedCents,
          quantity: 1,
          logo_url: null,
          security_id: null,
          isStrategy: true,
          strategyId: s.id,
          topLogos: topLogos,
          changePct: changePct,
          holdings: holdingsArr,
        };
      });
      const enrichedHoldings = [...stockHoldings, ...strategyItems];

      const mValue = enrichedHoldings.reduce((acc, h) => acc + Number(h.market_value || 0) / 100, 0);
      const invested = enrichedHoldings.reduce((acc, h) => acc + (Number(h.avg_fill || 0) * Number(h.quantity || 0)) / 100, 0);

      setDbData({
        holdings: enrichedHoldings,
        totalMarketValue: mValue,
        totalInvested: invested,
        holdingsCount: enrichedHoldings.length,
      });
      setLoading(false);
    };
    loadData();
  }, [userId, lastUpdated]);

  useEffect(() => {
    const fetchChartPrices = async () => {
      if (!userId || dbData.holdings.length === 0) {
        setChartData([]);
        return;
      }
      setChartLoading(true);

      const days = TIMEFRAME_DAYS[activeTab] || 45;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const cutoffISO = cutoff.toISOString();

      const holdingsToChart = selectedAsset
        ? [selectedAsset]
        : dbData.holdings;

      const totalWeight = holdingsToChart.reduce((s, h) => s + Number(h.market_value || 0), 0);
      if (totalWeight === 0) {
        setChartData([]);
        setChartLoading(false);
        return;
      }

      if (selectedAsset?.isStrategy && selectedAsset?.strategyId) {
        const timeframeMap = { "1m": "1M", "3m": "3M", "6m": "6M" };
        const tf = timeframeMap[activeTab] || "1M";
        const priceHistory = await getStrategyPriceHistory(selectedAsset.strategyId, tf);
        if (priceHistory && priceHistory.length > 0) {
          const investedValue = Number(selectedAsset.avg_fill || 0) / 100;
          const firstNav = priceHistory[0].nav;
          const points = priceHistory.map(p => ({
            d: p.ts,
            v: firstNav > 0 ? Number((investedValue * (p.nav / firstNav)).toFixed(2)) : investedValue,
          }));
          setChartData(points);
        } else {
          setChartData([]);
        }
        setChartLoading(false);
        return;
      }

      const pricePromises = holdingsToChart.map(async (h) => {
        const secId = h.security_id;
        if (!secId) return null;

        const { data, error } = await supabase
          .from("security_prices")
          .select("ts, close_price")
          .eq("security_id", secId)
          .gte("ts", cutoffISO)
          .order("ts", { ascending: true });

        if (error || !data || data.length === 0) return null;

        return {
          securityId: secId,
          weight: Number(h.market_value || 0) / totalWeight,
          quantity: Number(h.quantity || 1),
          prices: data.map(p => ({ ts: p.ts.split("T")[0], close: Number(p.close_price) / 100 })),
        };
      });

      const allPrices = (await Promise.all(pricePromises)).filter(Boolean);
      if (allPrices.length === 0) {
        setChartData([]);
        setChartLoading(false);
        return;
      }

      if (selectedAsset && allPrices.length === 1) {
        const qty = Number(selectedAsset.quantity || 1);
        const points = allPrices[0].prices.map(p => ({
          d: p.ts,
          v: Number((p.close * qty).toFixed(2)),
        }));
        setChartData(points);
        setChartLoading(false);
        return;
      }

      const dateSet = new Set();
      allPrices.forEach(({ prices }) => prices.forEach(p => dateSet.add(p.ts)));
      const sortedDates = Array.from(dateSet).sort();

      const basePrices = {};
      allPrices.forEach(({ securityId, prices }) => {
        if (prices.length > 0) basePrices[securityId] = prices[0].close;
      });

      const priceByDate = {};
      allPrices.forEach(({ securityId, prices }) => {
        priceByDate[securityId] = {};
        prices.forEach(p => { priceByDate[securityId][p.ts] = p.close; });
      });

      const basePortfolioValue = holdingsToChart.reduce((s, h) => s + Number(h.market_value || 0) / 100, 0) || 1;

      const points = [];
      sortedDates.forEach(dateKey => {
        let weightedReturn = 0;
        let usedWeight = 0;

        allPrices.forEach(({ securityId, weight }) => {
          const current = priceByDate[securityId]?.[dateKey];
          const base = basePrices[securityId];
          if (current && base && base !== 0) {
            const ret = current / base;
            weightedReturn += ret * weight;
            usedWeight += weight;
          }
        });

        if (usedWeight > 0) {
          const normalizedReturn = weightedReturn / usedWeight;
          const portfolioValue = basePortfolioValue * normalizedReturn;
          points.push({ d: dateKey, v: Number(portfolioValue.toFixed(2)) });
        }
      });

      setChartData(points);
      setChartLoading(false);
    };

    fetchChartPrices();
  }, [userId, dbData.holdings, activeTab, selectedAsset, lastUpdated]);

  const displayMarketValue = selectedAsset
    ? Number(selectedAsset.market_value || 0) / 100
    : dbData.totalMarketValue;
  const displayInvested = selectedAsset
    ? (Number(selectedAsset.avg_fill || 0) * Number(selectedAsset.quantity || 0)) / 100
    : dbData.totalInvested;
  const displayReturn = displayMarketValue - displayInvested;
  const isLoss = displayReturn < 0;
  const returnPct = displayInvested > 0 ? ((displayReturn / displayInvested) * 100).toFixed(1) : "0.0";
  const chartColor = isLoss ? "#FB7185" : "#10B981"; 

  const masked = "••••";

  if (loading && userId) return (
    <div className="w-full h-full rounded-[28px] bg-slate-50 p-4 flex flex-col">
      <div className="flex flex-1">
        <div className="w-[50%] flex flex-col justify-between border-r border-slate-200 pr-4">
          <div className="space-y-3">
            <div>
              <Skeleton className="h-2.5 w-20 bg-slate-200 mb-2" />
              <Skeleton className="h-5 w-24 bg-slate-200 mb-2" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-16 bg-slate-200" />
                <Skeleton className="h-4 w-10 rounded-full bg-slate-200" />
              </div>
            </div>
            <div>
              <Skeleton className="h-2.5 w-16 bg-slate-200 mb-2" />
              <div className="flex gap-1">
                <Skeleton className="h-5 w-14 rounded-full bg-slate-200" />
                <Skeleton className="h-5 w-14 rounded-full bg-slate-200" />
                <Skeleton className="h-5 w-10 rounded-full bg-slate-200" />
              </div>
            </div>
          </div>
        </div>
        <div className="w-[50%] flex flex-col justify-between pl-4">
          <div className="flex gap-1.5">
            <Skeleton className="h-5 w-8 rounded-full bg-slate-200" />
            <Skeleton className="h-5 w-8 rounded-full bg-slate-200" />
            <Skeleton className="h-5 w-8 rounded-full bg-slate-200" />
          </div>
          <div className="flex-1 flex items-end gap-1 py-3">
            {[40, 55, 35, 65, 50, 70, 45, 60, 75, 55].map((h, i) => (
              <Skeleton key={i} className="flex-1 rounded-sm bg-slate-200" style={{ height: `${h}%` }} />
            ))}
          </div>
          <Skeleton className="h-8 w-full rounded-xl bg-slate-200" />
        </div>
      </div>
      <div className="mt-2 flex justify-start">
        <Skeleton className="h-3 w-32 bg-slate-200" />
      </div>
    </div>
  );

  const getUpdatedAgoText = () => {
    if (!lastUpdated) return "";
    const seconds = Math.round((Date.now() - lastUpdated) / 1000);
    if (seconds < 5) return "Updated just now";
    if (seconds < 60) return `Updated ${seconds}s ago`;
    return `Updated ${Math.round(seconds / 60)}m ago`;
  };

  return (
    <div className="relative w-full h-full z-[100]">
      {isConnected && (
        <div className="absolute top-2 right-3 z-20 flex items-center gap-1.5">
          {showUpdatedText && (
            <span
              className="text-[8px] text-slate-500 font-medium transition-opacity duration-500"
              style={{ animation: "fadeInOut 3s ease-in-out" }}
            >
              {getUpdatedAgoText()}
            </span>
          )}
          <span
            className="block w-1.5 h-1.5 rounded-full bg-emerald-400"
            style={{ animation: "pulse-dot 2s ease-in-out infinite" }}
          />
          <style>{`
            @keyframes pulse-dot {
              0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.4); }
              50% { opacity: 0.7; box-shadow: 0 0 0 3px rgba(52, 211, 153, 0); }
            }
            @keyframes fadeInOut {
              0% { opacity: 0; }
              10% { opacity: 1; }
              80% { opacity: 1; }
              100% { opacity: 0; }
            }
          `}</style>
        </div>
      )}
      <div className="relative z-10 flex flex-col h-full text-slate-700">
        <div className="flex flex-1 min-h-0">
        <div className="w-[50%] p-4 pb-3 flex flex-col border-r border-slate-200">
          <div className="flex flex-col flex-1 min-h-0 gap-2">
            <div className="shrink-0">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-medium mb-1.5">
                {selectedAsset ? selectedAsset.symbol : "portfolio value"}
              </p>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-base font-semibold">{isVisible ? formatKMB(displayMarketValue) : masked}</span>
                <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-[8px] font-medium uppercase text-slate-500 border border-slate-200">
                  {isVisible ? formatKMB(displayInvested) : masked}(inv)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold ${isLoss ? 'text-rose-400' : 'text-emerald-400'}`}>{isVisible ? formatKMB(displayReturn) : masked}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-medium uppercase ${isLoss ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                  {isVisible ? `${returnPct}%` : masked}
                </span>
              </div>
            </div>
            {mintNumber && mintNumber.length > 0 && (
              <div className="mt-5">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-medium mb-1" style={{ fontFamily: "-apple-system, 'Inter', 'Helvetica Neue', sans-serif" }}>
                  Mint Number
                </p>
                <p className="text-[15px] tracking-[0.18em] text-slate-700 font-semibold" style={{ fontFamily: "'SF Mono', 'JetBrains Mono', 'Fira Code', 'Consolas', monospace", letterSpacing: '0.18em' }}>
                  {mintNumber.length >= 13
                    ? `${mintNumber.substring(0, 3)} ${mintNumber.substring(3, 7)} ${mintNumber.substring(7, 13)}`
                    : mintNumber}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="w-[50%] p-4 pb-1 flex flex-col">
          <div className="flex justify-end mb-2">
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              {["1m", "3m", "6m"].map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`px-3 py-1 text-[10px] font-semibold rounded-md ${activeTab === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>{tab.toUpperCase()}</button>
              ))}
            </div>
          </div>
          <div className="flex-1 min-h-0">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <YAxis hide domain={['auto', 'auto']} /> 
                  <Area type="monotone" dataKey="v" stroke="none" fill={chartColor} fillOpacity={0.1} />
                  <Line type="monotone" dataKey="v" stroke={chartColor} strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                {chartLoading ? (
                  <div className="flex items-end gap-1 w-full h-full py-2">
                    {[40, 55, 35, 65, 50, 70, 45, 60, 75, 55, 65, 50].map((h, i) => (
                      <Skeleton key={i} className="flex-1 rounded-sm bg-white/10" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                ) : (
                  <p className="text-[9px] text-slate-500">No chart data</p>
                )}
              </div>
            )}
          </div>
          <button onClick={() => setIsOpen(!isOpen)} className="mt-2 flex items-center justify-between p-2 rounded-xl bg-slate-100 border border-slate-200">
            <div className="flex items-center gap-2">
              <LayoutGrid size={12} className="text-violet-400" />
              <span className="text-[10px] font-medium text-slate-700">{selectedAsset ? selectedAsset.symbol : "All Investments"}</span>
            </div>
            {isOpen ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
          </button>
        </div>
        </div>
      </div>

      {isOpen && (
        <div className="absolute bottom-0 right-0 w-[55%] max-h-[70%] bg-white rounded-xl z-[120] overflow-hidden border border-slate-200 shadow-lg">
          <div className="py-1 overflow-y-auto max-h-[140px]">
            <button onClick={() => { setSelectedAsset(null); setIsOpen(false); scrollToHoldingIndex(-1); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-left ${!selectedAsset ? 'bg-slate-100' : 'hover:bg-slate-50'}`}>
              <LayoutGrid size={10} className="text-violet-400 shrink-0" />
              <span className="text-[9px] font-medium text-slate-700 truncate">All Investments</span>
            </button>
            {dbData.holdings.map((item, idx) => (
              <button key={idx} onClick={() => { setSelectedAsset(item); setIsOpen(false); scrollToHoldingIndex(idx); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-left ${selectedAsset?.symbol === item.symbol ? 'bg-slate-100' : 'hover:bg-slate-50'}`}>
                <div className="w-4 h-4 rounded-full overflow-hidden bg-slate-100 shrink-0">
                  {item.isStrategy && item.topLogos?.length > 0 ? (
                    <div className="flex -space-x-1 h-full items-center justify-center">
                      {item.topLogos.slice(0, 2).map((logo, li) => (
                        <img key={li} src={logo} className="w-3 h-3 rounded-full object-cover border border-white/25" />
                      ))}
                    </div>
                  ) : item.logo_url ? (
                    <img src={item.logo_url} className="w-full h-full object-cover" />
                  ) : (
                    <span className="flex items-center justify-center w-full h-full text-[6px] text-slate-500">{item.symbol?.substring(0, 2)}</span>
                  )}
                </div>
                <span className="text-[9px] font-medium text-slate-700 truncate">{item.symbol}</span>
                {(() => {
                  const s = item.settlement_status || holdingSettlementStatus;
                  return s && s !== "confirmed" ? <SettlementBadge status={s} size="xs" /> : null;
                })()}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SwipeableBalanceCard;
