import React, { useState, useMemo, useEffect } from "react";
import { Eye, EyeOff, TrendingUp, LayoutGrid, ChevronDown, ChevronUp } from "lucide-react";
import { Area, ComposedChart, Line, ResponsiveContainer, YAxis } from "recharts";
import { supabase } from "../lib/supabase";
import { getStrategyPriceHistory } from "../lib/strategyData";
import { getStrategyCurrentValue, getStrategyReturnPct } from "../lib/strategyUtils";
import Skeleton from "./Skeleton";

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

const SwipeableBalanceCard = ({ userId, isBackFacing = true, forceVisible }) => {
  const [activeTab, setActiveTab] = useState("1m");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isBackFacing) setIsOpen(false);
  }, [isBackFacing]);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState([]);
  const [chartLoading, setChartLoading] = useState(false);
  
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
  }, [userId]);

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
  }, [userId, dbData.holdings, activeTab, selectedAsset]);

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
    <div className="w-full aspect-[1.7/1] rounded-[28px] bg-white/5 p-4 flex">
      <div className="w-[50%] flex flex-col justify-between border-r border-white/5 pr-4">
        <div className="space-y-3">
          <div>
            <Skeleton className="h-2.5 w-20 bg-white/10 mb-2" />
            <Skeleton className="h-5 w-24 bg-white/20 mb-2" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-16 bg-white/10" />
              <Skeleton className="h-4 w-10 rounded-full bg-white/10" />
            </div>
          </div>
          <div>
            <Skeleton className="h-2.5 w-16 bg-white/10 mb-2" />
            <div className="flex gap-1">
              <Skeleton className="h-5 w-14 rounded-full bg-white/10" />
              <Skeleton className="h-5 w-14 rounded-full bg-white/10" />
              <Skeleton className="h-5 w-10 rounded-full bg-white/10" />
            </div>
          </div>
        </div>
      </div>
      <div className="w-[50%] flex flex-col justify-between pl-4">
        <div className="flex gap-1.5">
          <Skeleton className="h-5 w-8 rounded-full bg-white/10" />
          <Skeleton className="h-5 w-8 rounded-full bg-white/10" />
          <Skeleton className="h-5 w-8 rounded-full bg-white/10" />
        </div>
        <div className="flex-1 flex items-end gap-1 py-3">
          {[40, 55, 35, 65, 50, 70, 45, 60, 75, 55].map((h, i) => (
            <Skeleton key={i} className="flex-1 rounded-sm bg-white/10" style={{ height: `${h}%` }} />
          ))}
        </div>
        <Skeleton className="h-8 w-full rounded-xl bg-white/10" />
      </div>
    </div>
  );

  return (
    <div className="relative w-full h-full z-[100]">
      <div className="relative z-10 flex h-full text-white">
        <div className="w-[50%] p-4 flex flex-col justify-between border-r border-white/5">
          <div className="space-y-3">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/50 font-medium mb-1.5">
                {selectedAsset ? selectedAsset.symbol : "portfolio value"}
              </p>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-base font-semibold">{isVisible ? formatKMB(displayMarketValue) : masked}</span>
                <span className="px-1.5 py-0.5 rounded-full bg-white/10 text-[8px] font-medium uppercase text-white/60">
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
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/50 font-medium mb-1.5">
                holdings ({dbData.holdingsCount})
              </p>
              {dbData.holdings.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {dbData.holdings.slice(0, 3).map((h, i) => (
                    <div key={i} className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white/10">
                      {h.isStrategy && h.topLogos?.length > 0 ? (
                        <div className="flex -space-x-1">
                          {h.topLogos.slice(0, 3).map((logo, li) => (
                            <img key={li} src={logo} className="w-3 h-3 rounded-full object-cover border border-white/20" />
                          ))}
                        </div>
                      ) : h.logo_url ? (
                        <img src={h.logo_url} className="w-3 h-3 rounded-full object-cover" />
                      ) : (
                        <span className="text-[6px] text-white/60">{h.symbol?.substring(0, 2)}</span>
                      )}
                      <span className="text-[8px] font-medium text-white/80">{h.isStrategy ? h.symbol : h.symbol?.replace('.JO', '')}</span>
                    </div>
                  ))}
                  {dbData.holdings.length > 3 && (
                    <span className="text-[8px] text-white/40 self-center">+{dbData.holdings.length - 3}</span>
                  )}
                </div>
              ) : (
                <p className="text-[9px] text-white/40">No holdings yet</p>
              )}
            </div>
          </div>
        </div>

        <div className="w-[50%] p-4 flex flex-col">
          <div className="flex justify-end mb-2">
            <div className="flex bg-black/20 p-0.5 rounded-lg border border-white/5">
              {["1m", "3m", "6m"].map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`px-3 py-1 text-[10px] font-semibold rounded-md ${activeTab === tab ? "bg-white text-slate-900" : "text-white/50"}`}>{tab.toUpperCase()}</button>
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
                  <p className="text-[9px] text-white/30">No chart data</p>
                )}
              </div>
            )}
          </div>
          <button onClick={() => setIsOpen(!isOpen)} className="mt-2 flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5">
            <div className="flex items-center gap-2">
              <LayoutGrid size={12} className="text-violet-400" />
              <span className="text-[10px] font-medium text-white/80">{selectedAsset ? selectedAsset.symbol : "All Investments"}</span>
            </div>
            {isOpen ? <ChevronUp size={14} className="opacity-50" /> : <ChevronDown size={14} className="opacity-50" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="absolute bottom-0 right-0 w-[55%] max-h-[70%] bg-black/80 backdrop-blur-md rounded-xl z-[120] overflow-hidden border border-white/10">
          <div className="py-1 overflow-y-auto max-h-[140px]">
            <button onClick={() => { setSelectedAsset(null); setIsOpen(false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-left ${!selectedAsset ? 'bg-white/10' : 'hover:bg-white/5'}`}>
              <LayoutGrid size={10} className="text-violet-400 shrink-0" />
              <span className="text-[9px] font-medium text-white/90 truncate">All Investments</span>
            </button>
            {dbData.holdings.map((item, idx) => (
              <button key={idx} onClick={() => { setSelectedAsset(item); setIsOpen(false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-left ${selectedAsset?.symbol === item.symbol ? 'bg-white/10' : 'hover:bg-white/5'}`}>
                <div className="w-4 h-4 rounded-full overflow-hidden bg-white/10 shrink-0">
                  {item.isStrategy && item.topLogos?.length > 0 ? (
                    <div className="flex -space-x-1 h-full items-center justify-center">
                      {item.topLogos.slice(0, 2).map((logo, li) => (
                        <img key={li} src={logo} className="w-3 h-3 rounded-full object-cover border border-white/20" />
                      ))}
                    </div>
                  ) : item.logo_url ? (
                    <img src={item.logo_url} className="w-full h-full object-cover" />
                  ) : (
                    <span className="flex items-center justify-center w-full h-full text-[6px] text-white/60">{item.symbol?.substring(0, 2)}</span>
                  )}
                </div>
                <span className="text-[9px] font-medium text-white/90 truncate">{item.symbol}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SwipeableBalanceCard;
