import React, { useState, useMemo, useEffect } from "react";
import { Eye, EyeOff, TrendingUp, LayoutGrid, ChevronDown, ChevronUp } from "lucide-react";
import { Area, ComposedChart, Line, ResponsiveContainer, YAxis } from "recharts";
import { supabase } from "../lib/supabase"; // Existing team client

const VISIBILITY_STORAGE_KEY = "mintBalanceVisible";

const formatKMB = (value) => {
  const num = Number(value);
  const sign = num < 0 ? "-" : "";
  const absNum = Math.abs(num);
  let formatted = absNum;
  if (absNum >= 1e9) formatted = (absNum / 1e9).toFixed(1) + "b";
  else if (absNum >= 1e6) formatted = (absNum / 1e6).toFixed(1) + "m";
  else if (absNum >= 1e3) formatted = (absNum / 1e3).toFixed(1) + "k";
  else formatted = absNum.toFixed(0);
  return `${sign}R${formatted}`;
};

const SwipeableBalanceCard = ({ userId, isBackFacing = true, forceVisible }) => {
  const [activeTab, setActiveTab] = useState("1m");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isBackFacing) setIsOpen(false);
  }, [isBackFacing]);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [dbData, setDbData] = useState({
    holdings: [],
    snapshots: [],
    strategiesCount: 0,
    totalMarketValue: 0, 
    totalInvested: 0,
    strategyMarketValue: 0,
    strategyInvested: 0
  });

  const [localVisible, setLocalVisible] = useState(() => {
    if (typeof window !== "undefined") {
      return window.localStorage.getItem(VISIBILITY_STORAGE_KEY) !== "false";
    }
    return true;
  });

  const isVisible = true;

  // Isolated Fetch Logic: Only affects this component
  useEffect(() => {
    const loadData = async () => {
      if (!userId) return;
      setLoading(true);
      
      // Fetching specifically from your defined tables
      const { data: holdings } = await supabase
        .from('stock_holdings')
        .select('id, user_id, security_id, quantity, avg_fill, market_value, unrealized_pnl, as_of_date, created_at, updated_at, Status')
        .eq('user_id', userId);

      const { data: snapshots } = await supabase
        .from('mint_balance_snapshots')
        .select('snapshot_date, total_balance')
        .eq('user_id', userId)
        .order('snapshot_date', { ascending: true });

      const { count: sCount } = await supabase
        .from('strategies')
        .select('*', { count: 'exact', head: true });

      if (holdings) {
        const secIds = holdings.map(h => h.security_id).filter(Boolean);
        let secMap = {};
        if (secIds.length > 0) {
          const { data: secData } = await supabase.from('securities').select('id, symbol, name, logo_url').in('id', secIds);
          if (secData) secData.forEach(s => { secMap[s.id] = s; });
        }
        const enrichedHoldings = holdings.map(h => ({
          ...h,
          symbol: secMap[h.security_id]?.symbol || "N/A",
          name: secMap[h.security_id]?.name || "Unknown",
          logo_url: secMap[h.security_id]?.logo_url || null,
        }));

        const mValue = enrichedHoldings.reduce((acc, h) => acc + Number(h.market_value || 0) / 100, 0);
        const invested = enrichedHoldings.reduce((acc, h) => acc + (Number(h.avg_fill || 0) * Number(h.quantity || 0)) / 100, 0);

        setDbData({
          holdings: enrichedHoldings,
          snapshots: snapshots?.map(s => ({ d: s.snapshot_date, v: Number(s.total_balance) })) || [],
          strategiesCount: sCount || 0,
          totalMarketValue: mValue,
          totalInvested: invested,
          strategyMarketValue: mValue * 0.3, 
          strategyInvested: invested * 0.35
        });
      }
      setLoading(false);
    };
    loadData();
  }, [userId]);

  useEffect(() => {
    const fetchChartData = async () => {
      if (!userId) return;

      const { data, error } = await supabase.rpc('get_isolated_portfolio_history', {
        p_user_id: userId,
        p_security_id: selectedAsset?.security_id || null 
      });

      if (!error && data) {
        setDbData(prev => ({
          ...prev,
          snapshots: data.map(point => ({ d: point.d, v: Number(point.v) }))
        }));
      }
    };

    fetchChartData();
  }, [userId, selectedAsset]);

  const portfolioReturn = dbData.totalMarketValue - dbData.totalInvested;
  const strategyReturn = dbData.strategyMarketValue - dbData.strategyInvested;
  const portfolioIsLoss = portfolioReturn < 0;
  const strategyIsLoss = strategyReturn < 0;
  const chartColor = portfolioIsLoss ? "#FB7185" : "#10B981"; 

  const masked = "••••";

  if (loading && userId) return <div className="w-full aspect-[1.7/1] animate-pulse bg-white/5 rounded-[28px]" />;

  return (
    <div className="relative w-full h-full z-[100]">
      <div className="relative z-10 flex h-full text-white">
        <div className="w-[50%] p-4 flex flex-col justify-between border-r border-white/5">
          <div className="space-y-3">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/50 font-medium mb-1.5">portfolio value</p>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-base font-semibold">{isVisible ? formatKMB(dbData.totalMarketValue) : masked}</span>
                <span className="px-1.5 py-0.5 rounded-full bg-white/10 text-[8px] font-medium uppercase text-white/60">
                  {isVisible ? formatKMB(dbData.totalInvested) : masked}(inv)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold ${portfolioIsLoss ? 'text-rose-400' : 'text-emerald-400'}`}>{isVisible ? formatKMB(portfolioReturn) : masked}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-medium uppercase ${portfolioIsLoss ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                  {isVisible ? "return" : masked}
                </span>
              </div>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/50 font-medium mb-1.5">strategies ({dbData.strategiesCount})</p>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-sm font-semibold">{isVisible ? formatKMB(dbData.strategyMarketValue) : masked}</span>
                <span className="px-1.5 py-0.5 rounded-full bg-white/10 text-[8px] font-medium uppercase text-white/60">
                  {isVisible ? formatKMB(dbData.strategyInvested) : masked}(inv)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold ${strategyIsLoss ? 'text-rose-400' : 'text-emerald-400'}`}>{isVisible ? formatKMB(strategyReturn) : masked}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-medium uppercase ${strategyIsLoss ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                  {isVisible ? "return" : masked}
                </span>
              </div>
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
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={dbData.snapshots}>
                <YAxis hide domain={['auto', 'auto']} /> 
                <Area type="monotone" dataKey="v" stroke="none" fill={chartColor} fillOpacity={0.1} />
                <Line type="monotone" dataKey="v" stroke={chartColor} strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
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
              <button key={idx} onClick={() => { setSelectedAsset(item); setIsOpen(false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-left ${selectedAsset === item ? 'bg-white/10' : 'hover:bg-white/5'}`}>
                <div className="w-4 h-4 rounded-full overflow-hidden bg-white/10 shrink-0">
                  {item.logo_url ? <img src={item.logo_url} className="w-full h-full object-cover" /> : <span className="flex items-center justify-center w-full h-full text-[6px] text-white/60">{item.symbol?.substring(0, 2)}</span>}
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