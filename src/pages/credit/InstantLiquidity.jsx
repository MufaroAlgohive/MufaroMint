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
  Lock
} from "lucide-react";
import { Line, LineChart, ResponsiveContainer, YAxis, Area, AreaChart } from 'recharts';
import { formatZar } from "../../lib/formatCurrency";
import NotificationBell from "../../components/NotificationBell";
import NavigationPill from "../../components/NavigationPill";

const InstantLiquidity = ({ profile, onOpenNotifications, onTabChange }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [portalTarget, setPortalTarget] = useState(null);
  const [filterTab, setFilterTab] = useState("assets");

  // --- Workflow States ---
  const [selectedItem, setSelectedItem] = useState(null); // null, 'all', or asset object
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [pledgeAmount, setPledgeAmount] = useState("");
  const [repaymentDate, setRepaymentDate] = useState("");
  const [workflowStep, setWorkflowStep] = useState("idle"); // idle, contract, auth, success
  const [isProcessing, setIsProcessing] = useState(false);

  // --- Sheet Drag Logic ---
  const [sheetOffset, setSheetOffset] = useState(0);
  const dragStartY = useRef(null);
  const isDragging = useRef(false);

  useEffect(() => { setPortalTarget(document.body); }, []);

  const fonts = {
    display: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    text: "'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif"
  };

  const portfolioItems = [
    { id: 1, name: "Bitcoin Alpha", balance: 4250.34, available: 5749.66, ltv: "50%", type: "strategy", code: "BTC-005", logo: "https://cryptologos.cc/logos/bitcoin-btc-logo.png" },
    { id: 2, name: "Global Equity", balance: 12890.12, available: 8200.00, ltv: "40%", type: "strategy", code: "GEQ-012", logo: null },
    { id: 3, name: "Nvidia Corp", balance: 15420.50, available: 7710.25, ltv: "50%", type: "stock", code: "NVDA", logo: "https://logo.clearbit.com/nvidia.com" },
    { id: 4, name: "Apple Inc", balance: 9800.00, available: 4900.00, ltv: "50%", type: "stock", code: "AAPL", logo: "https://logo.clearbit.com/apple.com" },
  ];

  const totalAvailable = portfolioItems.reduce((acc, item) => acc + item.available, 0);

  const filteredItems = useMemo(() => {
    return portfolioItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            item.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = activeFilter === "all" || item.type === activeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [searchQuery, activeFilter]);

  const sparklineData = [{ v: 40 }, { v: 35 }, { v: 55 }, { v: 45 }, { v: 60 }, { v: 50 }, { v: 75 }];

  // --- Handlers ---
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

  // Calculation helpers (Matching HTML logic)
  const principal = parseFloat(pledgeAmount) || 0;
  const interest = principal * 0.105 * 0.08; // Example interest logic from file
  const totalRepayment = principal + interest + 60;

  return (
    <div className="min-h-screen pb-32 relative overflow-x-hidden text-slate-900">
      {/* Background Gradient */}
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

        {/* Top Card */}
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
                   <Info size={11} className="text-white/30" />
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
            {/* PLEDGE ALL ACTION */}
            <button 
                onClick={() => handleOpenDetail('all')}
                className="w-full bg-white text-slate-900 text-[10px] uppercase tracking-[0.2em] font-black py-4 rounded-xl shadow-xl transition-all active:scale-[0.97] mt-5"
            >
              Pledge All Assets
            </button>
          </div>
        </div>

        {/* Action Grid */}
        <div className="grid grid-cols-4 gap-3 mb-10 px-1">
          {[
            { label: "Apply", icon: Plus, color: "bg-emerald-50 text-emerald-600" },
            { label: "Active", icon: FileSignature, color: "bg-blue-50 text-blue-600" },
            { label: "Pay", icon: HandCoins, color: "bg-violet-50 text-violet-600" },
            { label: "History", icon: History, color: "bg-slate-100 text-slate-600" }
          ].map((action, i) => (
            <button key={i} className="flex flex-col items-center gap-2.5 transition active:scale-95">
              <div className={`h-[60px] w-full rounded-[22px] ${action.color} border border-white shadow-sm flex items-center justify-center`}>
                <action.icon size={22} strokeWidth={2} />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{action.label}</span>
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="flex gap-2 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" placeholder="Search portfolio..." value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/50 backdrop-blur-xl border border-white/60 rounded-2xl py-3.5 pl-11 pr-4 text-sm focus:outline-none shadow-sm"
            />
          </div>
          <button onClick={() => setIsFilterOpen(true)} className="h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg transition active:scale-95">
            <SlidersHorizontal size={20} />
          </button>
        </div>

        {/* Asset List */}
        <div className="space-y-4">
          {filteredItems.map((item) => (
            <div 
                key={item.id} 
                onClick={() => handleOpenDetail(item)}
                className="bg-white/60 backdrop-blur-2xl rounded-[32px] p-6 shadow-sm border border-white/80 transition active:scale-[0.98]"
            >
              <div className="flex justify-between items-center mb-4">
                 <div className="flex items-center gap-4">
                   <div className="h-12 w-12 rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden flex items-center justify-center">
                     {item.logo ? <img src={item.logo} alt={item.name} className="h-8 w-8 object-contain" /> : <div className="text-[10px] font-black text-slate-400">{item.code.slice(0,2)}</div>}
                   </div>
                   <div>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{item.name}</p>
                     <div className="flex items-baseline tracking-tight" style={{ fontFamily: fonts.display }}>
                        <span className="text-2xl font-bold text-slate-900">R{Math.floor(item.balance).toLocaleString()}</span>
                        <span className="text-lg font-bold text-slate-300">.{(item.balance % 1).toFixed(2).split('.')[1]}</span>
                     </div>
                   </div>
                 </div>
                 <div className="h-10 w-20">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={sparklineData}>
                        <YAxis hide domain={['dataMin - 10', 'dataMax + 10']} />
                        <Line type="monotone" dataKey="v" stroke="#7c3aed" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                 </div>
              </div>
              <div className="flex justify-between items-center pt-5 border-t border-slate-100/50">
                 <p className="text-[12px] font-bold text-slate-600">{formatZar(item.available)} <span className="text-slate-300 font-medium">Available</span></p>
                 <div className="text-right">
                    <p className="text-[10px] font-black text-slate-900 uppercase">LTV {item.ltv}</p>
                    <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">{item.code}</p>
                 </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FULL SCREEN PLEDGE DETAIL VIEW (Triggered by Pledge All or Asset Click) */}
      {isDetailOpen && portalTarget && createPortal(
        <div className="fixed inset-0 z-[150] bg-slate-50 flex flex-col">
            {/* Header */}
            <div className="px-6 pt-12 pb-6 flex items-center justify-between bg-white border-b border-slate-100">
                <button onClick={closeDetail} className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600">
                    <ChevronLeft size={20} />
                </button>
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Pledge Position</h3>
                <div className="w-10" />
            </div>

            <div className="flex-1 overflow-y-auto">
                <div className="p-8">
                    <div className="mb-8">
                        <div className="flex items-center gap-3 mb-2">
                             <h1 className="text-3xl font-bold tracking-tight text-slate-900" style={{ fontFamily: fonts.display }}>
                                {selectedItem === 'all' ? "Multi-Asset Portfolio" : selectedItem?.name}
                             </h1>
                             <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 text-[10px] font-bold border border-emerald-100">+12.4%</span>
                        </div>
                        <p className="text-slate-500 text-xs font-medium">Max LTV: 50% • Instant Settlement</p>
                    </div>

                    {/* Simple Chart Area */}
                    <div className="h-40 w-full mb-10">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={sparklineData}>
                                <defs>
                                    <linearGradient id="colorV" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <Area type="monotone" dataKey="v" stroke="#7c3aed" fillOpacity={1} fill="url(#colorV)" strokeWidth={3} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="space-y-8">
                        <div>
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Available to Pledge</p>
                             <p className="text-4xl font-bold text-slate-900" style={{ fontFamily: fonts.display }}>
                                {formatZar(selectedItem === 'all' ? totalAvailable : selectedItem?.available || 0)}
                             </p>
                        </div>

                        {/* Input Group */}
                        <div className="space-y-4">
                            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-500 uppercase">Repayment Date</span>
                                <input 
                                    type="date" value={repaymentDate} onChange={(e) => setRepaymentDate(e.target.value)}
                                    className="text-sm font-bold text-slate-900 bg-transparent text-right outline-none cursor-pointer" 
                                />
                            </div>

                            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                                <div className="flex justify-between items-center mb-6">
                                    <span className="text-xs font-bold text-slate-500 uppercase">Pledge Amount</span>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-slate-900 font-bold text-xl">R</span>
                                        <input 
                                            type="number" value={pledgeAmount} 
                                            onChange={(e) => handleAmountChange(e.target.value)}
                                            placeholder="0"
                                            className="w-32 bg-transparent text-right text-xl font-bold text-slate-900 outline-none" 
                                        />
                                    </div>
                                </div>
                                <input 
                                    type="range" min="0" max="100" 
                                    value={(pledgeAmount / (selectedItem === 'all' ? totalAvailable : selectedItem?.available || 1)) * 100 || 0}
                                    onChange={(e) => handleSliderChange(e.target.value)}
                                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-violet-600" 
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-6 bg-white border-t border-slate-100 pb-12">
                <button 
                    disabled={!pledgeAmount || !repaymentDate}
                    onClick={() => setWorkflowStep("contract")}
                    className="w-full h-14 rounded-2xl bg-slate-900 text-white font-bold shadow-xl transition-all active:scale-[0.98] disabled:opacity-30"
                >
                    Pledge Assets
                </button>
            </div>
        </div>
      , portalTarget)}

      {/* WORKFLOW MODALS (Contract, Auth, Success) */}
      {workflowStep !== "idle" && portalTarget && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-md px-6">
            
            {/* CONTRACT STEP */}
            {workflowStep === "contract" && (
                <div className="bg-white w-full max-w-sm rounded-[36px] overflow-hidden shadow-2xl animate-in">
                    <div className="p-8">
                        <h3 className="text-xl font-bold text-slate-900 mb-6" style={{ fontFamily: fonts.display }}>Loan Agreement</h3>
                        <div className="space-y-4 mb-8">
                             <div className="flex justify-between pb-3 border-b border-slate-50 text-sm">
                                <span className="text-slate-500">Principal</span>
                                <span className="font-bold text-slate-900">{formatZar(principal)}</span>
                             </div>
                             <div className="flex justify-between pb-3 border-b border-slate-50 text-sm">
                                <span className="text-slate-500">Repayment Date</span>
                                <span className="font-bold text-slate-900">{repaymentDate}</span>
                             </div>
                             <div className="bg-slate-50 rounded-2xl p-4 flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-400 uppercase">Total Repayment</span>
                                <span className="text-lg font-bold text-violet-600">{formatZar(totalRepayment)}</span>
                             </div>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-relaxed mb-8">
                            By proceeding, you acknowledge that you have read and understood the terms. The asset listed will serve as collateral.
                        </p>
                        <div className="flex gap-3">
                             <button onClick={() => setWorkflowStep("idle")} className="flex-1 py-4 text-sm font-bold text-slate-400">Cancel</button>
                             <button onClick={() => setWorkflowStep("auth")} className="flex-1 bg-slate-900 text-white py-4 rounded-xl text-sm font-bold">I Agree</button>
                        </div>
                    </div>
                </div>
            )}

            {/* AUTH STEP */}
            {workflowStep === "auth" && (
                <div className="bg-white w-full max-w-sm rounded-[36px] p-8 text-center shadow-2xl animate-in">
                    <div className="h-16 w-16 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center mx-auto mb-6">
                        <Lock size={28} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Authorize</h3>
                    <p className="text-sm text-slate-500 mb-8">Enter your secure PIN to confirm.</p>
                    <div className="flex justify-center gap-3 mb-10">
                        {[1,2,3,4].map(i => <div key={i} className="h-12 w-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300">•</div>)}
                    </div>
                    <button 
                        onClick={handleConfirmPledge}
                        className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold shadow-lg flex items-center justify-center"
                    >
                        {isProcessing ? <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Confirm PIN"}
                    </button>
                </div>
            )}

            {/* SUCCESS STEP */}
            {workflowStep === "success" && (
                <div className="bg-white w-full max-w-sm rounded-[36px] p-8 text-center shadow-2xl animate-in">
                    <div className="h-20 w-20 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto mb-8">
                        <Check size={40} strokeWidth={3} />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">Success!</h3>
                    <p className="text-sm text-slate-500 mb-8">Your liquidity has been secured.</p>
                    <div className="bg-slate-50 rounded-3xl p-6 mb-8">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Liquidity Unlocked</p>
                        <h2 className="text-3xl font-bold text-slate-900">{formatZar(principal)}</h2>
                        <p className="text-xs text-slate-400 mt-2 font-medium">Source: {selectedItem === 'all' ? "Multi-Asset Portfolio" : selectedItem?.name}</p>
                    </div>
                    <button onClick={closeDetail} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold shadow-lg">Done</button>
                </div>
            )}

        </div>
      , portalTarget)}

      {/* DUAL-TAB FILTER SHEET (Existing) */}
      {isFilterOpen && portalTarget && createPortal(
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/40 backdrop-blur-sm px-4 pb-6">
          {/* ... existing filter sheet code ... */}
        </div>
      , portalTarget)}
    </div>
  );
};

export default InstantLiquidity;