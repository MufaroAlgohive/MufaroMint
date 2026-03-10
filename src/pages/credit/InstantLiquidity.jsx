import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  Zap, 
  Info, 
  Search, 
  SlidersHorizontal, 
  Plus, 
  FileSignature, 
  HandCoins, 
  History,
  Check,
  ChevronLeft,
  X,
  FileText,
  Lock,
  ChevronRight,
  Star,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
  Wallet,
  Landmark,
  TrendingDown,
  AlertCircle
} from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Area, AreaChart, ReferenceLine } from 'recharts';
import { formatZar } from "../../lib/formatCurrency";
import NotificationBell from "../../components/NotificationBell";
import NavigationPill from "../../components/NavigationPill";

// --- SUB-COMPONENTS ---

const LiquidityHistory = ({ onBack, fonts }) => {
  const [search, setSearch] = useState("");
  const historyData = [
    { id: 1, type: 'pledge', asset: 'Naspers Ltd', amount: 450000, date: '2026-03-08', status: 'completed' },
    { id: 2, type: 'repayment', asset: 'Standard Bank', amount: 120000, date: '2026-03-05', status: 'completed' },
    { id: 3, type: 'pledge', asset: 'Capitec Bank', amount: 85000, date: '2026-03-01', status: 'completed' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col animate-in slide-in-from-right duration-300">
      <div className="px-6 pt-12 pb-6 flex items-center justify-between bg-white border-b border-slate-100 sticky top-0 z-10">
        <button onClick={onBack} className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center active:scale-95"><ChevronLeft size={20} /></button>
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">History</h3>
        <div className="w-10" />
      </div>
      <div className="flex-1 overflow-y-auto p-6 pb-32">
        <div className="bg-slate-900 rounded-[32px] p-6 text-white shadow-xl mb-8">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Total Life-cycle Interest</p>
            <h2 className="text-3xl font-light" style={{ fontFamily: fonts.display }}>{formatZar(6535.40)}</h2>
        </div>
        <div className="space-y-3">
            {historyData.map((item) => (
                <div key={item.id} className="bg-white rounded-[24px] p-4 border border-slate-100 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-2xl bg-slate-50 flex items-center justify-center">
                            {item.type === 'pledge' ? <ArrowUpRight className="h-4 w-4 text-rose-500" /> : <ArrowDownLeft className="h-4 w-4 text-emerald-500" />}
                        </div>
                        <div><p className="text-xs font-bold text-slate-900">{item.asset}</p><p className="text-[9px] text-slate-400 uppercase font-bold">{item.type}</p></div>
                    </div>
                    <div className="text-right">
                        <p className={`text-sm font-bold ${item.type === 'pledge' ? 'text-slate-900' : 'text-emerald-600'}`}>{formatZar(item.amount)}</p>
                        <p className="text-[8px] text-slate-400 uppercase font-black">{item.date}</p>
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};

const ActiveLiquidity = ({ onBack, fonts }) => {
  const activeDebt = { total: 256450.00, ltv: 58.4, daily: 72.45 };
  const ltvTrend = [{ v: 52 }, { v: 54 }, { v: 58 }, { v: 57 }, { v: 61 }, { v: 59 }, { v: 58.4 }];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col animate-in slide-in-from-right duration-300">
      <div className="px-6 pt-12 pb-6 flex items-center justify-between bg-white border-b border-slate-100 sticky top-0 z-10">
        <button onClick={onBack} className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center active:scale-95"><ChevronLeft size={20} /></button>
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Active Debt</h3>
        <ShieldCheck className="text-emerald-500" size={20} />
      </div>
      <div className="flex-1 overflow-y-auto p-6 pb-32">
        <div className="bg-slate-900 rounded-[36px] p-8 text-white shadow-2xl relative overflow-hidden mb-8">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Outstanding Balance</p>
            <h2 className="text-4xl font-light mb-6" style={{ fontFamily: fonts.display }}>{formatZar(activeDebt.total)}</h2>
            <div className="flex justify-between pt-6 border-t border-white/10">
                <div><p className="text-[9px] text-white/40 uppercase font-black">LTV Ratio</p><p className="font-bold text-amber-500">{activeDebt.ltv}%</p></div>
                <div className="text-right"><p className="text-[9px] text-white/40 uppercase font-black">Daily Cost</p><p className="font-bold text-white">{formatZar(activeDebt.daily)}</p></div>
            </div>
        </div>
        <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Risk Trend (7D)</p>
            <div className="h-32 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={ltvTrend}>
                        <defs><linearGradient id="activeGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7c3aed" stopOpacity={0.2}/><stop offset="100%" stopColor="#7c3aed" stopOpacity={0}/></linearGradient></defs>
                        <ReferenceLine y={65} stroke="#fbbf24" strokeDasharray="3 3" />
                        <Area type="monotone" dataKey="v" stroke="#7c3aed" strokeWidth={3} fill="url(#activeGrad)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>
    </div>
  );
};

const RepayLiquidity = ({ onBack, fonts, totalDebt }) => {
  const [repayAmount, setRepayAmount] = useState("");
  const [method, setMethod] = useState("bank");
  const [isSuccess, setIsSuccess] = useState(false);

  if (isSuccess) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center animate-in fade-in">
        <div className="h-20 w-20 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mb-6"><Check size={40} strokeWidth={3} /></div>
        <h2 className="text-2xl font-bold text-slate-900 mb-8" style={{ fontFamily: fonts.display }}>Settlement Received</h2>
        <button onClick={onBack} className="w-full h-14 bg-slate-900 text-white rounded-2xl font-bold uppercase tracking-widest text-xs">Back to Dashboard</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col animate-in slide-in-from-right duration-300">
      <div className="px-6 pt-12 pb-6 flex items-center justify-between bg-white border-b border-slate-100 sticky top-0 z-10">
        <button onClick={onBack} className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center active:scale-95"><ChevronLeft size={20} /></button>
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Settle Debt</h3>
        <div className="w-10" />
      </div>
      <div className="flex-1 overflow-y-auto px-6 pt-8 pb-32">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Outstanding</p>
        <h2 className="text-4xl font-light text-slate-900 mb-8" style={{ fontFamily: fonts.display }}>{formatZar(totalDebt)}</h2>
        <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm mb-6">
            <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount to Repay</span>
                <button onClick={() => setRepayAmount(totalDebt)} className="text-[10px] font-bold text-violet-600 uppercase">Max</button>
            </div>
            <input type="number" value={repayAmount} onChange={(e) => setRepayAmount(e.target.value)} placeholder="0.00" className="w-full text-3xl font-bold text-slate-900 outline-none" />
        </div>
        <div className="space-y-3">
            {[{ id: 'bank', label: 'Linked Bank', sub: 'Standard Bank ••• 429', icon: Landmark }, { id: 'wallet', label: 'Mint Wallet', sub: 'Available: R12,450', icon: Wallet }].map(m => (
                <button key={m.id} onClick={() => setMethod(m.id)} className={`w-full flex items-center justify-between p-5 rounded-[24px] border transition-all ${method === m.id ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-900'}`}>
                    <div className="flex items-center gap-4 text-left">
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${method === m.id ? 'bg-white/10' : 'bg-slate-50'}`}><m.icon size={20} /></div>
                        <div><p className="text-xs font-bold">{m.label}</p><p className="text-[10px] opacity-50">{m.sub}</p></div>
                    </div>
                    {method === m.id && <Check size={18} className="text-emerald-400" />}
                </button>
            ))}
        </div>
      </div>
      <div className="p-6 bg-white border-t border-slate-100 pb-28">
        <button onClick={() => setIsSuccess(true)} disabled={!repayAmount} className="w-full h-14 bg-gradient-to-r from-[#111111] via-[#3b1b7a] to-[#5b21b6] text-white rounded-2xl font-bold uppercase tracking-widest text-xs shadow-xl active:scale-95 disabled:opacity-30">Confirm Repayment</button>
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---

const InstantLiquidity = ({ profile, onOpenNotifications, onTabChange }) => {
  const [view, setView] = useState("main");
  const [searchQuery, setSearchQuery] = useState("");
  const [portalTarget, setPortalTarget] = useState(null);

  // Ultimate Filter States (Drafting System)
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState(new Set());
  const [draftTypes, setDraftTypes] = useState(new Set());

  // Workflow States
  const [selectedItem, setSelectedItem] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [pledgeAmount, setPledgeAmount] = useState("");
  const [workflowStep, setWorkflowStep] = useState("idle");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => { setPortalTarget(document.body); }, []);

  const fonts = {
    display: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    text: "'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif"
  };

  // --- Portfolio Engine (Scoring, Capping, Eligibility) ---
  const portfolioItems = useMemo(() => [
    { id: 1, name: "Naspers Ltd", balance: 600000, type: "stock", code: "NPN", marketCap: 1500e9, advt: 120e6, volatility: 0.22, isSuspended: false, freeFloat: 30000e6 },
    { id: 2, name: "Standard Bank", balance: 250000, type: "stock", code: "SBK", marketCap: 320e9, advt: 45e6, volatility: 0.18, isSuspended: false, freeFloat: 15000e6 },
    { id: 3, name: "Capitec Bank", balance: 150000, type: "stock", code: "CPI", marketCap: 210e9, advt: 30e6, volatility: 0.25, isSuspended: false, freeFloat: 8000e6 },
    { id: 4, name: "Speculative Mining", balance: 50000, type: "stock", code: "SPM", marketCap: 2e9, advt: 1e6, volatility: 0.65, isSuspended: false, freeFloat: 500e6 },
  ], []);

  const totalPortfolioValue = portfolioItems.reduce((acc, item) => acc + item.balance, 0);
  const maxPerCounter = totalPortfolioValue * 0.45;

  const enrichedItems = useMemo(() => portfolioItems.map(item => {
    // Step 1: Eligibility
    const isEligible = item.marketCap >= 10e9 && item.advt >= 10e6 && item.volatility <= 0.5 && !item.isSuspended;
    const isTier1 = item.advt >= 10e6 && (item.advt / item.freeFloat >= 0.004);
    
    // Step 2: Scoring
    const liqScore = Math.min(item.advt / 100e6, 1);
    const volScore = 1 - (item.volatility / 0.5);
    const capScore = Math.min(item.marketCap / 200e9, 1);
    const score = (0.4 * liqScore) + (0.4 * volScore) + (0.2 * capScore);

    // Step 3: LTV Mapping
    let ltv = 0;
    if (score >= 0.8) ltv = 0.55;
    else if (score >= 0.5) ltv = 0.50;
    else if (score >= 0.3) ltv = 0.30;

    // Step 5: Concentration Capping
    const recognizedValue = Math.min(item.balance, maxPerCounter);
    const available = isEligible ? recognizedValue * ltv : 0;

    return { ...item, isEligible, isTier1, score, ltv, recognizedValue, available, isCapped: item.balance > maxPerCounter };
  }), [portfolioItems, maxPerCounter]);

  const totalAvailable = enrichedItems.reduce((acc, item) => acc + item.available, 0);

  const filteredItems = useMemo(() => {
    return enrichedItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            item.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = selectedTypes.size === 0 || selectedTypes.has(item.type);
      return matchesSearch && matchesType;
    });
  }, [searchQuery, selectedTypes, enrichedItems]);

  const handleOpenDetail = (item) => {
    if (item !== 'all' && !item.isEligible) return;
    setSelectedItem(item);
    setIsDetailOpen(true);
    setWorkflowStep("idle");
    setPledgeAmount("");
  };

  const closeDetail = () => { setIsDetailOpen(false); setTimeout(() => setSelectedItem(null), 300); };

  // Router Logic
  if (view === "history") return <LiquidityHistory onBack={() => setView("main")} fonts={fonts} />;
  if (view === "active") return <ActiveLiquidity onBack={() => setView("main")} fonts={fonts} />;
  if (view === "repay") return <RepayLiquidity onBack={() => setView("main")} fonts={fonts} totalDebt={256450.00} />;

  return (
    <div className="min-h-screen pb-32 relative overflow-x-hidden text-slate-900">
      {/* 100vh High-Fidelity Background */}
      <div className="absolute inset-x-0 top-0 -z-10 h-full">
        <div className="absolute inset-x-0 top-0" style={{ height: '100vh', background: 'linear-gradient(180deg, #0d0d12 0%, #0e0a14 0.5%, #100b18 1%, #120c1c 1.5%, #150e22 2%, #181028 2.5%, #1c122f 3%, #201436 3.5%, #25173e 4%, #2a1a46 5%, #301d4f 6%, #362158 7%, #3d2561 8%, #44296b 9%, #4c2e75 10%, #54337f 11%, #5d3889 12%, #663e93 13%, #70449d 14%, #7a4aa7 15%, #8451b0 16%, #8e58b9 17%, #9860c1 18%, #a268c8 19%, #ac71ce 20%, #b57ad3 21%, #be84d8 22%, #c68edc 23%, #cd98e0 24%, #d4a2e3 25%, #daace6 26%, #dfb6e9 27%, #e4c0eb 28%, #e8c9ed 29%, #ecd2ef 30%, #efdaf1 31%, #f2e1f3 32%, #f4e7f5 33%, #f6ecf7 34%, #f8f0f9 35%, #f9f3fa 36%, #faf5fb 38%, #fbf7fc 40%, #fcf9fd 42%, #fdfafd 45%, #faf8fc 55%, #f8f6fa 100%)' }} />
      </div>

      <div className="px-5 pt-12 pb-8">
        <header className="relative flex items-center justify-between mb-10 text-white">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 border border-white/30 text-xs font-semibold uppercase">{profile?.firstName?.[0]}{profile?.lastName?.[0]}</div>
          <NavigationPill activeTab="credit" onTabChange={(tab) => tab === "home" ? onTabChange("home") : null} />
          <NotificationBell onClick={onOpenNotifications} />
        </header>

        {/* Hero Card */}
        <div className="bg-white/40 backdrop-blur-3xl rounded-[36px] p-6 shadow-xl border border-white/80 mb-8 overflow-hidden relative">
          <div className="flex justify-between items-start mb-6">
            <p className="text-slate-600 text-[12px] leading-tight font-medium max-w-[200px]">Unlock <span className="text-slate-900 font-bold">instant liquidity</span> using your portfolio as collateral.</p>
            <div className="text-6xl font-black text-slate-900/5" style={{ fontFamily: fonts.display }}>PBC</div>
          </div>
          <div className="bg-gradient-to-br from-violet-600 to-purple-900 rounded-[32px] p-6 shadow-xl relative min-h-[160px] flex flex-col justify-between">
            <div>
              <p className="text-white/70 text-[9px] font-black uppercase tracking-[0.2em] mb-1.5">Max Recognized Liquidity</p>
              <div className="flex items-baseline text-white tracking-tight" style={{ fontFamily: fonts.display }}>
                <span className="text-3xl font-light">R{Math.floor(totalAvailable).toLocaleString()}</span>
                <span className="text-xl font-medium opacity-60">.00</span>
              </div>
            </div>
            <button onClick={() => handleOpenDetail('all')} className="w-full bg-white text-slate-900 text-[10px] uppercase tracking-[0.2em] font-black py-4 rounded-xl active:scale-[0.97] transition-all mt-5">Apply for Credit</button>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-4 gap-3 mb-10 text-[11px] font-medium">
          {[
            { label: "Apply", icon: Plus, onClick: () => handleOpenDetail('all') },
            { label: "Active", icon: FileSignature, onClick: () => setView("active") },
            { label: "Pay", icon: HandCoins, onClick: () => setView("repay") },
            { label: "History", icon: History, onClick: () => setView("history") }
          ].map((action, i) => (
            <button key={i} onClick={action.onClick} className="flex flex-col items-center gap-2 rounded-2xl bg-white px-2 py-3 text-slate-700 shadow-md active:scale-95 border border-slate-100/50">
              <span className="flex h-8 w-8 items-center justify-center rounded-full text-violet-700 bg-violet-50"><action.icon className="h-4 w-4" /></span>
              <span>{action.label}</span>
            </button>
          ))}
        </div>

        {/* Search & Ultimate Filter Trigger */}
        <div className="flex gap-2 mb-8 px-1">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Search assets..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 pl-11 text-sm focus:outline-none shadow-sm" />
          </div>
          <button onClick={() => { setDraftTypes(new Set(selectedTypes)); setIsFilterOpen(true); }} className="h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg active:scale-95"><SlidersHorizontal size={18} /></button>
        </div>

        {/* Asset List with PBC Logic */}
        <div className="space-y-4">
          <div className="px-5 mb-2 flex items-center justify-between"><p className="text-sm font-semibold text-slate-900">Eligible Collateral</p><Info className="h-4 w-4 text-slate-300" /></div>
          {filteredItems.map((item) => (
            <button key={item.id} onClick={() => handleOpenDetail(item)} disabled={!item.isEligible} className={`relative w-full overflow-hidden bg-white rounded-[28px] p-5 shadow-sm border text-left transition-all ${!item.isEligible ? 'opacity-40 grayscale pointer-events-none' : 'active:scale-[0.98] border-slate-100'}`}>
              <div className="flex justify-between items-start mb-4">
                 <div className="flex items-center gap-3">
                   <div className="h-11 w-11 rounded-2xl bg-slate-50 flex items-center justify-center font-black text-slate-400 text-[10px]">{item.code}</div>
                   <div>
                     <div className="flex items-center gap-2 mb-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.name}</p>
                        {item.isTier1 && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />}
                     </div>
                     <p className="text-xl font-bold text-slate-900" style={{ fontFamily: fonts.display }}>R{item.balance.toLocaleString()}</p>
                   </div>
                 </div>
                 <span className="text-[8px] font-black bg-emerald-50 text-emerald-600 px-2 py-1 rounded-full uppercase">Score: {item.score.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                 <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Recognized</p>
                    <p className={`text-xs font-bold ${item.isCapped ? 'text-amber-600' : 'text-slate-900'}`}>{formatZar(item.recognizedValue)} {item.isCapped && <span className="text-[8px] opacity-40">(45% CAP)</span>}</p>
                 </div>
                 <div className="flex items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-black text-slate-600 uppercase">LTV {(item.ltv * 100).toFixed(0)}%</span>
                    <ChevronRight className="h-4 w-4 text-slate-300" />
                 </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Filter Sheet (Drafting Logic) */}
      {isFilterOpen && portalTarget && createPortal(
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-900/40 backdrop-blur-sm px-4 pb-28">
           <button className="absolute inset-0" onClick={() => setIsFilterOpen(false)} />
           <div className="relative w-full max-w-sm bg-white rounded-[32px] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
              <div className="flex justify-between items-center mb-6"><h3 className="text-lg font-bold text-slate-900">Filter Portfolio</h3><button onClick={() => setDraftTypes(new Set())} className="text-xs font-bold text-violet-600">Clear all</button></div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Asset Type</p>
              <div className="flex gap-2 mb-8">
                {["strategy", "stock"].map(t => (
                   <button key={t} onClick={() => { const n = new Set(draftTypes); n.has(t) ? n.delete(t) : n.add(t); setDraftTypes(n); }} className={`rounded-full px-5 py-2 text-xs font-bold border transition-all ${draftTypes.has(t) ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200"}`}>{t}</button>
                ))}
              </div>
              <button onClick={() => { setSelectedTypes(new Set(draftTypes)); setIsFilterOpen(false); }} className="w-full h-14 bg-gradient-to-r from-[#111111] via-[#3b1b7a] to-[#5b21b6] text-white rounded-2xl font-bold uppercase tracking-widest text-xs">Apply Filters</button>
           </div>
        </div>
      , portalTarget)}

      {/* Asset Detail / Pledge Flow */}
      {isDetailOpen && portalTarget && createPortal(
        <div className="fixed inset-0 z-[150] bg-white flex flex-col animate-in slide-in-from-right">
            <div className="px-6 pt-12 pb-6 flex items-center justify-between border-b border-slate-100 sticky top-0 bg-white">
                <button onClick={closeDetail} className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center active:scale-95 transition-all"><ChevronLeft size={20} /></button>
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Pledge Analysis</h3>
                <div className="w-10" />
            </div>
            <div className="flex-1 overflow-y-auto p-8 pb-32">
                <div className="mb-8 flex justify-between items-start">
                    <div>
                         <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-1" style={{ fontFamily: fonts.display }}>{selectedItem === 'all' ? "Recognized Portfolio" : selectedItem?.name}</h1>
                         <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">LTV Cap: {(selectedItem?.ltv * 100 || 50)}%</p>
                    </div>
                    <div className="h-14 w-14 rounded-full border-4 border-violet-600 flex items-center justify-center font-black text-xs text-violet-600">{(selectedItem?.score || 0.85).toFixed(2)}</div>
                </div>

                <div className="bg-slate-50 rounded-[32px] p-6 border border-slate-100 mb-10">
                    <div className="flex justify-between items-center mb-4"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Liquidation Safety Bar</p><span className="text-[10px] font-bold text-emerald-600">Secure</span></div>
                    <div className="relative h-4 w-full bg-slate-200 rounded-full overflow-hidden flex">
                        <div className="h-full bg-emerald-500" style={{ width: '55%' }} /><div className="h-full bg-amber-400" style={{ width: '10%' }} /><div className="h-full bg-rose-500" style={{ width: '35%' }} />
                        <div className="absolute top-0 bottom-0 w-1 bg-white shadow-xl" style={{ left: `${(selectedItem?.ltv || 0.5) * 100}%` }} />
                    </div>
                    <div className="flex justify-between mt-3 text-[8px] font-black uppercase text-slate-400 tracking-tighter">
                        <span>Current: {(selectedItem?.ltv * 100 || 0)}%</span><span className="text-amber-500">Call: 65%</span><span className="text-rose-500">Liquidation: 70%</span>
                    </div>
                </div>

                <div className="text-center mb-10">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Maximum Credit Capacity</p>
                    <p className="text-4xl font-extralight text-slate-900 tracking-tight" style={{ fontFamily: fonts.display }}>{formatZar(selectedItem === 'all' ? totalAvailable : selectedItem?.available || 0)}</p>
                </div>

                <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-lg">
                    <div className="flex justify-between items-center mb-6">
                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Withdrawal Amount</span>
                        <input type="number" value={pledgeAmount} onChange={(e) => setPledgeAmount(e.target.value)} placeholder="0.00" className="w-32 bg-slate-50 px-4 py-2 rounded-xl text-right font-bold text-slate-900 outline-none" />
                    </div>
                    <input type="range" className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none accent-violet-600 cursor-pointer" />
                </div>
            </div>
            <div className="p-6 bg-white border-t border-slate-100 pb-28">
                <button disabled={!pledgeAmount} onClick={() => setWorkflowStep("contract")} className="w-full h-14 rounded-2xl bg-slate-900 text-white font-bold uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all">Review Agreement</button>
            </div>
        </div>
      , portalTarget)}

      {/* Workflow Modals */}
      {workflowStep !== "idle" && portalTarget && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-md px-6 pb-20">
            {workflowStep === "contract" && (
                <div className="bg-white w-full max-w-sm rounded-[36px] p-8 shadow-2xl animate-in zoom-in-95">
                    <div className="flex items-center gap-3 mb-6"><div className="h-10 w-10 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center"><FileText size={20} /></div><h3 className="text-xl font-bold text-slate-900">Loan Agreement</h3></div>
                    <div className="space-y-4 mb-8">
                        <div className="flex justify-between pb-3 border-b border-slate-50 text-sm"><span className="text-slate-500 font-medium">Applied LTV</span><span className="font-bold text-slate-900">{(selectedItem?.ltv * 100 || 50)}%</span></div>
                        <div className="bg-slate-900 rounded-2xl p-4 flex justify-between items-center text-white"><span className="text-[10px] font-black opacity-40 uppercase">Interest Cost</span><span className="font-bold">{formatZar((pledgeAmount || 0) * 0.105 / 12)} / mo</span></div>
                    </div>
                    <div className="flex flex-col gap-3">
                        <button onClick={() => setWorkflowStep("auth")} className="w-full bg-slate-900 text-white py-4 rounded-2xl text-xs font-bold uppercase tracking-widest shadow-xl">Agree & Continue</button>
                        <button onClick={() => setWorkflowStep("idle")} className="w-full py-2 text-xs font-bold text-slate-400 uppercase">Cancel</button>
                    </div>
                </div>
            )}
            {workflowStep === "auth" && (
                <div className="bg-white w-full max-w-sm rounded-[36px] p-8 text-center shadow-2xl">
                    <div className="h-16 w-16 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center mx-auto mb-6"><Lock size={28} /></div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Authorize</h3>
                    <div className="flex justify-center gap-3 my-8">{[1,2,3,4].map(i => <div key={i} className="h-12 w-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300">•</div>)}</div>
                    <button onClick={() => { setIsProcessing(true); setTimeout(() => { setIsProcessing(false); setWorkflowStep("success"); }, 1500); }} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold text-xs">{isProcessing ? "Processing..." : "Confirm PIN"}</button>
                </div>
            )}
            {workflowStep === "success" && (
                <div className="bg-white w-full max-w-sm rounded-[36px] p-8 text-center shadow-2xl">
                    <div className="h-20 w-20 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto mb-6"><Check size={40} strokeWidth={3} /></div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">Credit Secured</h3>
                    <div className="bg-slate-50 rounded-2xl p-6 mb-8 border border-slate-100"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Available Capital</p><h2 className="text-2xl font-bold text-slate-900">{formatZar(pledgeAmount)}</h2></div>
                    <button onClick={closeDetail} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold text-xs uppercase tracking-widest">Done</button>
                </div>
            )}
        </div>
      , portalTarget)}
    </div>
  );
};

export default InstantLiquidity;