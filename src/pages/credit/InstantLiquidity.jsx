import React, { useState, useMemo, useRef, useEffect } from "react";
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
  ChevronRight
} from "lucide-react";
import { Line, LineChart, ResponsiveContainer, YAxis, Area, AreaChart } from 'recharts';
import { formatZar } from "../../lib/formatCurrency";
import NotificationBell from "../../components/NotificationBell";
import NavigationPill from "../../components/NavigationPill";

const InstantLiquidity = ({ profile, onOpenNotifications, onTabChange }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [portalTarget, setPortalTarget] = useState(null);

  // --- Filter States (The Ultimate Filter Logic) ---
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeChips, setActiveChips] = useState([]);
  
  // Applied States
  const [selectedTypes, setSelectedTypes] = useState(new Set());
  const [selectedRisks, setSelectedRisks] = useState(new Set());
  const [selectedLtv, setSelectedLtv] = useState(null);

  // Draft States (for the Modal)
  const [draftTypes, setDraftTypes] = useState(new Set());
  const [draftRisks, setDraftRisks] = useState(new Set());
  const [draftLtv, setDraftLtv] = useState(null);

  // --- Workflow States ---
  const [selectedItem, setSelectedItem] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [pledgeAmount, setPledgeAmount] = useState("");
  const [repaymentDate, setRepaymentDate] = useState("");
  const [workflowStep, setWorkflowStep] = useState("idle");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => { setPortalTarget(document.body); }, []);

  const fonts = {
    display: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    text: "'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif"
  };

  const portfolioItems = [
    { id: 1, name: "Bitcoin Alpha", balance: 4250.34, available: 5749.66, ltv: "50%", risk: "High risk", type: "strategy", code: "BTC-005", logo: "https://cryptologos.cc/logos/bitcoin-btc-logo.png" },
    { id: 2, name: "Global Equity", balance: 12890.12, available: 8200.00, ltv: "40%", risk: "Balanced", type: "strategy", code: "GEQ-012", logo: null },
    { id: 3, name: "Nvidia Corp", balance: 15420.50, available: 7710.25, ltv: "50%", risk: "Growth", type: "stock", code: "NVDA", logo: "https://logo.clearbit.com/nvidia.com" },
    { id: 4, name: "Apple Inc", balance: 9800.00, available: 4900.00, ltv: "50%", risk: "Growth", type: "stock", code: "AAPL", logo: "https://logo.clearbit.com/apple.com" },
  ];

  const totalAvailable = portfolioItems.reduce((acc, item) => acc + item.available, 0);

  // --- Ultimate Filtering Logic ---
  const filteredItems = useMemo(() => {
    return portfolioItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            item.code.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = selectedTypes.size === 0 || selectedTypes.has(item.type);
      const matchesRisk = selectedRisks.size === 0 || selectedRisks.has(item.risk);
      const matchesLtv = !selectedLtv || item.ltv === selectedLtv;

      return matchesSearch && matchesType && matchesRisk && matchesLtv;
    });
  }, [searchQuery, selectedTypes, selectedRisks, selectedLtv]);

  const sparklineData = [{ v: 40 }, { v: 35 }, { v: 55 }, { v: 45 }, { v: 60 }, { v: 50 }, { v: 75 }];

  // --- Filter Handlers ---
  const applyFilters = () => {
    setSelectedTypes(new Set(draftTypes));
    setSelectedRisks(new Set(draftRisks));
    setSelectedLtv(draftLtv);

    const chips = [];
    draftTypes.forEach(t => chips.push(t.charAt(0).toUpperCase() + t.slice(1)));
    draftRisks.forEach(r => chips.push(r));
    if (draftLtv) chips.push(`LTV: ${draftLtv}`);
    
    setActiveChips(chips);
    setIsFilterOpen(false);
  };

  const clearAllFilters = () => {
    setDraftTypes(new Set());
    setDraftRisks(new Set());
    setDraftLtv(null);
    setSelectedTypes(new Set());
    setSelectedRisks(new Set());
    setSelectedLtv(null);
    setActiveChips([]);
  };

  // --- Other Handlers ---
  const handleOpenDetail = (item) => {
    setSelectedItem(item);
    setPledgeAmount("");
    setRepaymentDate("");
    setIsDetailOpen(true);
    setWorkflowStep("idle");
  };

  const closeDetail = () => {
    setIsDetailOpen(false);
    setTimeout(() => {
      setSelectedItem(null);
      setWorkflowStep("idle");
    }, 300);
  };

  const handleAmountChange = (val) => {
    const max = selectedItem === 'all' ? totalAvailable : selectedItem?.available || 0;
    const num = Math.min(Math.max(0, val), max);
    setPledgeAmount(num || "");
  };

  const handleSliderChange = (percent) => {
    const max = selectedItem === 'all' ? totalAvailable : selectedItem?.available || 0;
    setPledgeAmount(Math.floor((percent / 100) * max));
  };

  const handleConfirmPledge = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setWorkflowStep("success");
    }, 1500);
  };

  const initials = [profile?.firstName, profile?.lastName]
    .filter(Boolean).map(p => p[0]).join("").toUpperCase() || "MN";

  const principal = parseFloat(pledgeAmount) || 0;
  const interest = principal * 0.105 * 0.08;
  const totalRepayment = principal + interest + 60;

  return (
    <div className="min-h-screen pb-32 relative overflow-x-hidden text-slate-900">
      {/* Background Gradient (Preserved) */}
      <div className="absolute inset-x-0 top-0 -z-10 h-full">
        <div 
          className="absolute inset-x-0 top-0"
          style={{ 
            height: '100vh',
            background: 'linear-gradient(180deg, #0d0d12 0%, #0e0a14 0.5%, #100b18 1%, #120c1c 1.5%, #150e22 2%, #181028 2.5%, #1c122f 3%, #201436 3.5%, #25173e 4%, #2a1a46 5%, #301d4f 6%, #362158 7%, #3d2561 8%, #44296b 9%, #4c2e75 10%, #54337f 11%, #5d3889 12%, #663e93 13%, #70449d 14%, #7a4aa7 15%, #8451b0 16%, #8e58b9 17%, #9860c1 18%, #a268c8 19%, #ac71ce 20%, #b57ad3 21%, #be84d8 22%, #c68edc 23%, #cd98e0 24%, #d4a2e3 25%, #daace6 26%, #dfb6e9 27%, #e4c0eb 28%, #e8c9ed 29%, #ecd2ef 30%, #efdaf1 31%, #f2e1f3 32%, #f4e7f5 33%, #f6ecf7 34%, #f8f0f9 35%, #f9f3fa 36%, #faf5fb 38%, #fbf7fc 40%, #fcf9fd 42%, #fdfafd 45%, #faf8fc 55%, #f8f6fa 100%)'
          }} 
        />
      </div>

      <div className="px-5 pt-12 pb-8">
        <header className="relative flex items-center justify-between mb-10 text-white">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 border border-white/30 text-xs font-semibold">{initials}</div>
          <NavigationPill activeTab="credit" onTabChange={(tab) => tab === "home" ? onTabChange("home") : null} />
          <NotificationBell onClick={onOpenNotifications} />
        </header>

        {/* Top Card (Preserved) */}
        <div className="bg-white/40 backdrop-blur-3xl rounded-[36px] p-6 shadow-xl border border-white/80 mb-8 relative overflow-hidden">
          <div className="flex justify-between items-start mb-6">
            <div className="max-w-[200px]">
              <p className="text-slate-600 text-[12px] leading-tight font-medium" style={{ fontFamily: fonts.text }}>
                Pledge qualifying strategies and assets to unlock <span className="text-slate-900 font-bold">instant liquidity</span>.
              </p>
            </div>
            <div className="text-6xl font-black text-slate-900/5" style={{ fontFamily: fonts.display }}>{portfolioItems.length}</div>
          </div>

          <div className="bg-gradient-to-br from-violet-600 to-purple-900 rounded-[32px] p-6 shadow-xl relative min-h-[160px] flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                   <p className="text-white/70 text-[9px] font-black uppercase tracking-[0.2em]" style={{ fontFamily: fonts.text }}>Liquidity Available</p>
                   <span className="text-white/30"><Info size={11} /></span>
                </div>
                <div className="flex items-baseline text-white tracking-tight" style={{ fontFamily: fonts.display }}>
                  <span className="text-3xl font-light">R{Math.floor(totalAvailable).toLocaleString()}</span>
                  <span className="text-xl font-medium opacity-60">.{(totalAvailable % 1).toFixed(2).split('.')[1]}</span>
                </div>
              </div>
              <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                <Zap size={20} className="text-white fill-white/20" />
              </div>
            </div>
            <button 
                onClick={() => handleOpenDetail('all')}
                className="w-full bg-white text-slate-900 text-[10px] uppercase tracking-[0.2em] font-black py-4 rounded-xl shadow-xl transition-all active:scale-[0.97] mt-5"
            >
              Pledge All Assets
            </button>
          </div>
        </div>

        {/* Action Grid */}
        <div className="grid grid-cols-4 gap-3 mb-10 text-[11px] font-medium">
          {[
            { label: "Apply", icon: Plus, color: "text-violet-700 bg-violet-50" },
            { label: "Active", icon: FileSignature, color: "text-violet-700 bg-violet-50" },
            { label: "Pay", icon: HandCoins, color: "text-violet-700 bg-violet-50" },
            { label: "History", icon: History, color: "text-violet-700 bg-violet-50" }
          ].map((action, i) => {
            const Icon = action.icon;
            return (
              <button key={i} className="flex flex-col items-center gap-2 rounded-2xl bg-white px-2 py-3 text-slate-700 shadow-md transition-all active:scale-95 active:shadow-sm border border-slate-100/50">
                <span className={`flex h-8 w-8 items-center justify-center rounded-full ${action.color}`}><Icon className="h-4 w-4" /></span>
                <span className="text-center leading-tight">{action.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search & Filter Trigger */}
        <div className="flex gap-2 mb-4 px-1">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search assets or strategies" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 pl-11 pr-4 text-sm focus:outline-none shadow-sm focus:border-violet-300 transition-colors"
            />
          </div>
          <button 
            onClick={() => {
              setDraftTypes(new Set(selectedTypes));
              setDraftRisks(new Set(selectedRisks));
              setDraftLtv(selectedLtv);
              setIsFilterOpen(true);
            }} 
            className="h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg transition active:scale-95"
          >
            <SlidersHorizontal size={18} />
          </button>
        </div>

        {/* Filter Chips (Mint Style) */}
        {activeChips.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8 px-1">
            {activeChips.map((chip, idx) => (
              <div key={idx} className="flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1.5 text-[10px] font-bold text-purple-700 border border-purple-200">
                {chip}
              </div>
            ))}
            <button onClick={clearAllFilters} className="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-bold text-slate-600">Clear all</button>
          </div>
        )}

        {/* Asset List */}
        <div className="space-y-4">
          <div className="px-5 mb-2 flex items-center justify-between">
             <p className="text-sm font-semibold text-slate-900">Your eligible assets</p>
             <Info className="h-4 w-4 text-slate-300" />
          </div>

          {filteredItems.map((item) => (
            <button 
                key={item.id} 
                onClick={() => handleOpenDetail(item)}
                className="relative w-full overflow-hidden bg-white rounded-[28px] p-5 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.1)] border border-slate-100 text-left transition-all active:scale-[0.98]"
            >
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                   <div className="flex items-center gap-3">
                     <div className="h-11 w-11 rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden flex items-center justify-center">
                       {item.logo ? <img src={item.logo} alt={item.name} className="h-7 w-7 object-contain" /> : <div className="text-[10px] font-black text-slate-400">{item.code.slice(0,2)}</div>}
                     </div>
                     <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{item.name}</p>
                       <div className="flex items-baseline tracking-tight" style={{ fontFamily: fonts.display }}>
                          <span className="text-xl font-bold text-slate-900">R{Math.floor(item.balance).toLocaleString()}</span>
                          <span className="text-sm font-bold text-slate-300">.{(item.balance % 1).toFixed(2).split('.')[1]}</span>
                       </div>
                     </div>
                   </div>
                   <div className="h-8 w-16">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={sparklineData}>
                          <Line type="monotone" dataKey="v" stroke="#7c3aed" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                   </div>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                   <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Available Liquidity</p>
                      <p className="text-xs font-bold text-emerald-600">{formatZar(item.available)}</p>
                   </div>
                   <div className="flex items-center gap-3">
                      <span className="inline-block rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-black text-slate-600 uppercase">LTV {item.ltv}</span>
                      <ChevronRight className="h-4 w-4 text-slate-300" />
                   </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Filter Sheet (The Ultimate Multi-Filter) */}
      {isFilterOpen && portalTarget && createPortal(
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-900/40 backdrop-blur-sm px-4 pb-28">
           <button className="absolute inset-0 cursor-default" onClick={() => setIsFilterOpen(false)} />
           <div className="relative w-full max-w-sm bg-white rounded-[32px] overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300">
              <div className="flex items-center justify-center pt-3"><div className="h-1.5 w-12 rounded-full bg-slate-200" /></div>
              <div className="p-6">
                 <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-900">Filter Portfolio</h3>
                    <button onClick={clearAllFilters} className="text-xs font-bold text-violet-600">Clear all</button>
                 </div>
                 
                 <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-1">
                    {/* Asset Type */}
                    <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Asset Type</p>
                       <div className="flex flex-wrap gap-2">
                          {["strategy", "stock"].map(type => (
                             <button key={type} onClick={() => {
                                const next = new Set(draftTypes);
                                next.has(type) ? next.delete(type) : next.add(type);
                                setDraftTypes(next);
                             }} className={`rounded-full px-4 py-2 text-xs font-semibold border transition-all ${draftTypes.has(type) ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200"}`}>
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                             </button>
                          ))}
                       </div>
                    </div>

                    {/* Risk Level */}
                    <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Risk Level</p>
                       <div className="flex flex-wrap gap-2">
                          {["Balanced", "Growth", "High risk"].map(risk => (
                             <button key={risk} onClick={() => {
                                const next = new Set(draftRisks);
                                next.has(risk) ? next.delete(risk) : next.add(risk);
                                setDraftRisks(next);
                             }} className={`rounded-full px-4 py-2 text-xs font-semibold border transition-all ${draftRisks.has(risk) ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200"}`}>
                                {risk}
                             </button>
                          ))}
                       </div>
                    </div>

                    {/* LTV Availability */}
                    <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Max LTV</p>
                       <div className="flex flex-wrap gap-2">
                          {["40%", "50%"].map(ltv => (
                             <button key={ltv} onClick={() => setDraftLtv(draftLtv === ltv ? null : ltv)} className={`rounded-full px-4 py-2 text-xs font-semibold border transition-all ${draftLtv === ltv ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200"}`}>
                                {ltv}
                             </button>
                          ))}
                       </div>
                    </div>
                 </div>

                 <button onClick={applyFilters} className="w-full h-14 bg-gradient-to-r from-[#111111] via-[#3b1b7a] to-[#5b21b6] text-white rounded-2xl font-bold uppercase tracking-widest text-xs mt-8 shadow-xl">Apply Filters</button>
              </div>
           </div>
        </div>
      , portalTarget)}

      {/* Detail View (Raised Height for Navbar) */}
      {isDetailOpen && portalTarget && createPortal(
        <div className="fixed inset-0 z-[150] bg-slate-50 flex flex-col animate-in slide-in-from-right duration-300">
            <div className="px-6 pt-12 pb-6 flex items-center justify-between bg-white border-b border-slate-100">
                <button onClick={closeDetail} className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 active:scale-95 transition-all"><ChevronLeft size={20} /></button>
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Pledge Position</h3>
                <div className="w-10" />
            </div>
            <div className="flex-1 overflow-y-auto">
                <div className="p-8">
                    <div className="mb-8">
                        <div className="flex items-center gap-3 mb-2">
                             <h1 className="text-2xl font-bold tracking-tight text-slate-900" style={{ fontFamily: fonts.display }}>{selectedItem === 'all' ? "Multi-Asset Portfolio" : selectedItem?.name}</h1>
                             <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-600 border border-emerald-100">+12.4%</span>
                        </div>
                        <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">Instant Settlement • 10.5% APR</p>
                    </div>
                    <div className="h-40 w-full mb-10">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={sparklineData}>
                                <defs><linearGradient id="detailGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#5b21b6" stopOpacity={0.2}/><stop offset="100%" stopColor="#ffffff" stopOpacity={0}/></linearGradient></defs>
                                <Area type="monotone" dataKey="v" stroke="#5b21b6" fill="url(#detailGrad)" strokeWidth={3} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="space-y-8">
                        <div className="text-center">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Maximum Liquidity</p>
                             <p className="text-4xl font-extralight text-slate-900 tracking-tight" style={{ fontFamily: fonts.display }}>{formatZar(selectedItem === 'all' ? totalAvailable : selectedItem?.available || 0)}</p>
                        </div>
                        <div className="space-y-4">
                            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex justify-between items-center">
                                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Repayment Date</span>
                                <input type="date" value={repaymentDate} onChange={(e) => setRepaymentDate(e.target.value)} className="text-sm font-bold text-slate-900 bg-slate-50 px-3 py-2 rounded-xl outline-none" />
                            </div>
                            <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-lg">
                                <div className="flex justify-between items-center mb-6">
                                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Pledge Amount</span>
                                    <div className="flex items-baseline gap-1 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100"><span className="text-slate-400 font-bold text-sm">R</span><input type="number" value={pledgeAmount} onChange={(e) => handleAmountChange(e.target.value)} placeholder="0" className="w-24 bg-transparent text-right text-lg font-bold text-slate-900 outline-none" /></div>
                                </div>
                                <div className="px-2">
                                    <input type="range" min="0" max="100" value={(pledgeAmount / (selectedItem === 'all' ? totalAvailable : selectedItem?.available || 1)) * 100 || 0} onChange={(e) => handleSliderChange(e.target.value)} className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-violet-600" />
                                    <div className="flex justify-between mt-3 text-[10px] font-bold text-slate-400 uppercase"><span>0%</span><span>50%</span><span>100%</span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="p-6 bg-white border-t border-slate-100 pb-28 shadow-[0_-10px_40px_rgba(0,0,0,0.03)]"><button disabled={!pledgeAmount || !repaymentDate} onClick={() => setWorkflowStep("contract")} className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#111111] via-[#3b1b7a] to-[#5b21b6] text-white text-sm font-bold uppercase tracking-[0.2em] shadow-xl transition-all active:scale-[0.97] disabled:opacity-30">Review Pledge</button></div>
        </div>
      , portalTarget)}

      {/* Workflow Modals (Raised Offset) */}
      {workflowStep !== "idle" && portalTarget && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-md px-6 pb-20">
            {workflowStep === "contract" && (
                <div className="bg-white w-full max-w-sm rounded-[36px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                    <div className="p-8">
                        <div className="flex items-center gap-3 mb-6"><div className="h-10 w-10 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center"><FileText size={20} /></div><h3 className="text-xl font-bold text-slate-900" style={{ fontFamily: fonts.display }}>Loan Agreement</h3></div>
                        <div className="space-y-4 mb-8">
                             <div className="flex justify-between pb-3 border-b border-slate-50 text-sm"><span className="text-slate-500 font-medium">Principal</span><span className="font-bold text-slate-900">{formatZar(principal)}</span></div>
                             <div className="flex justify-between pb-3 border-b border-slate-50 text-sm"><span className="text-slate-500 font-medium">Interest (10.5%)</span><span className="font-bold text-emerald-600">+{formatZar(interest)}</span></div>
                             <div className="bg-slate-900 rounded-3xl p-5 flex justify-between items-center shadow-lg shadow-slate-900/20"><span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Total Repayment</span><span className="text-xl font-bold text-white">{formatZar(totalRepayment)}</span></div>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-relaxed text-center mb-8 font-medium">Proceeding constitutes a legal signature. Your collateral assets will be restricted until full repayment.</p>
                        <div className="flex flex-col gap-3">
                             <button onClick={() => setWorkflowStep("auth")} className="w-full bg-gradient-to-r from-[#111111] via-[#3b1b7a] to-[#5b21b6] text-white py-4 rounded-2xl text-xs font-bold uppercase tracking-widest shadow-xl active:scale-95 transition-all">Agree & Authorize</button>
                             <button onClick={() => setWorkflowStep("idle")} className="w-full py-2 text-xs font-bold text-slate-400 uppercase tracking-widest">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
            {workflowStep === "auth" && (
                <div className="bg-white w-full max-w-sm rounded-[36px] p-8 text-center shadow-2xl animate-in fade-in duration-300">
                    <div className="h-16 w-16 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center mx-auto mb-6"><Lock size={28} /></div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Security Verification</h3>
                    <p className="text-sm text-slate-500 mb-8 font-medium">Enter your secure PIN to confirm the pledge.</p>
                    <div className="flex justify-center gap-3 mb-10">{[1,2,3,4].map(i => <div key={i} className="h-14 w-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 text-2xl font-bold">•</div>)}</div>
                    <button onClick={handleConfirmPledge} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold uppercase tracking-widest text-xs shadow-lg flex items-center justify-center active:scale-95 transition-all">{isProcessing ? <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Confirm Transaction"}</button>
                </div>
            )}
            {workflowStep === "success" && (
                <div className="bg-white w-full max-w-sm rounded-[36px] p-8 text-center shadow-2xl animate-in slide-in-from-bottom duration-500">
                    <div className="h-20 w-20 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto mb-8 shadow-inner"><Check size={40} strokeWidth={3} /></div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">Pledge Complete</h3>
                    <p className="text-sm text-slate-500 mb-8 font-medium">Funds are now available in your balance.</p>
                    <div className="bg-slate-50 rounded-[32px] p-6 mb-8 border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Liquidity Unlocked</p>
                        <h2 className="text-3xl font-bold text-slate-900">{formatZar(principal)}</h2>
                        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 border border-slate-100"><Zap size={10} className="text-violet-600 fill-violet-600" /><span className="text-[10px] font-bold text-slate-500 uppercase">Instant Transfer</span></div>
                    </div>
                    <button onClick={closeDetail} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold uppercase tracking-widest text-xs shadow-lg active:scale-95 transition-all">Back to Dashboard</button>
                </div>
            )}
        </div>
      , portalTarget)}
    </div>
  );
};

export default InstantLiquidity;