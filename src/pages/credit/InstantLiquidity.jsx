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
  ChevronRight,
  Star,
  AlertTriangle
} from "lucide-react";
import { Line, LineChart, ResponsiveContainer, YAxis, Area, AreaChart } from 'recharts';
import { formatZar } from "../../lib/formatCurrency";
import NotificationBell from "../../components/NotificationBell";
import NavigationPill from "../../components/NavigationPill";

const InstantLiquidity = ({ profile, onOpenNotifications, onTabChange }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [portalTarget, setPortalTarget] = useState(null);

  // --- Filter & Workflow States ---
  const [isFilterOpen, setIsFilterOpen] = useState(false);
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

  // --- Portfolio Data with Credit Metrics ---
  const portfolioItems = useMemo(() => [
    { 
      id: 1, name: "Naspers Ltd", balance: 600000, type: "stock", code: "NPN", logo: null,
      marketCap: 1500e9, advt: 120e6, volatility: 0.22, isSuspended: false, freeFloat: 30000e6, sector: "Technology"
    },
    { 
      id: 2, name: "Standard Bank", balance: 250000, type: "stock", code: "SBK", logo: null,
      marketCap: 320e9, advt: 45e6, volatility: 0.18, isSuspended: false, freeFloat: 15000e6, sector: "Financials"
    },
    { 
      id: 3, name: "Capitec Bank", balance: 150000, type: "stock", code: "CPI", logo: null,
      marketCap: 210e9, advt: 30e6, volatility: 0.25, isSuspended: false, freeFloat: 8000e6, sector: "Financials"
    },
    { 
      id: 4, name: "Small Cap Mining", balance: 50000, type: "stock", code: "SCM", logo: null,
      marketCap: 2e9, advt: 1e6, volatility: 0.65, isSuspended: false, freeFloat: 500e6, sector: "Materials"
    },
  ], []);

  // --- Credit Logic (Step 1-3) ---
  const calculateAssetMetrics = (item) => {
    // Step 1: Filters [cite: 6, 13, 27, 33]
    const isEligible = item.marketCap >= 5e9 && item.advt >= 10e6 && item.volatility <= 0.5 && !item.isSuspended;
    const isTier1 = item.advt >= 10e6 && (item.advt / item.freeFloat >= 0.004); // Gold Star [cite: 18]

    // Step 2: Collateral Score [cite: 51-55]
    const liqScore = Math.min(item.advt / 100e6, 1);
    const volScore = 1 - (item.volatility / 0.5); 
    const capScore = Math.min(item.marketCap / 200e9, 1);
    const totalScore = (0.4 * liqScore) + (0.4 * volScore) + (0.2 * capScore);

    // Step 3: LTV Mapping 
    let ltv = 0;
    if (totalScore >= 0.8) ltv = 0.55;
    else if (totalScore >= 0.5) ltv = 0.50;
    else if (totalScore >= 0.3) ltv = 0.30;
    else if (totalScore >= 0.1) ltv = 0.20;

    return { isEligible, isTier1, totalScore, ltv };
  };

  // --- Step 5: Concentration Rules ---
  const totalPortfolioValue = portfolioItems.reduce((acc, item) => acc + item.balance, 0);
  const maxPerCounter = totalPortfolioValue * 0.45; // [cite: 70, 83]

  const enrichedItems = useMemo(() => portfolioItems.map(item => {
    const metrics = calculateAssetMetrics(item);
    const recognizedValue = Math.min(item.balance, maxPerCounter); // [cite: 86]
    const availableLiquidity = metrics.isEligible ? recognizedValue * metrics.ltv : 0;
    return { ...item, ...metrics, recognizedValue, availableLiquidity, isCapped: item.balance > maxPerCounter };
  }), [portfolioItems, maxPerCounter]);

  const totalAvailable = enrichedItems.reduce((acc, item) => acc + item.availableLiquidity, 0);

  const filteredItems = useMemo(() => {
    return enrichedItems.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.code.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, enrichedItems]);

  const sparklineData = [{ v: 40 }, { v: 35 }, { v: 55 }, { v: 45 }, { v: 60 }, { v: 50 }, { v: 75 }];

  // --- Handlers ---
  const handleOpenDetail = (item) => {
    if (item !== 'all' && !item.isEligible) return;
    setSelectedItem(item);
    setPledgeAmount("");
    setRepaymentDate("");
    setIsDetailOpen(true);
    setWorkflowStep("idle");
  };

  const closeDetail = () => {
    setIsDetailOpen(false);
    setTimeout(() => { setSelectedItem(null); setWorkflowStep("idle"); }, 300);
  };

  const handleAmountChange = (val) => {
    const max = selectedItem === 'all' ? totalAvailable : selectedItem?.availableLiquidity || 0;
    setPledgeAmount(Math.min(Math.max(0, val), max) || "");
  };

  const handleSliderChange = (percent) => {
    const max = selectedItem === 'all' ? totalAvailable : selectedItem?.availableLiquidity || 0;
    setPledgeAmount(Math.floor((percent / 100) * max));
  };

  const handleConfirmPledge = () => {
    setIsProcessing(true);
    setTimeout(() => { setIsProcessing(false); setWorkflowStep("success"); }, 1500);
  };

  const initials = [profile?.firstName, profile?.lastName]
    .filter(Boolean).map(p => p[0]).join("").toUpperCase() || "MN";

  const principal = parseFloat(pledgeAmount) || 0;
  const interest = principal * 0.105 * (30/365); 
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
                Pledge qualifying assets to unlock <span className="text-slate-900 font-bold">instant liquidity</span> based on collateral quality[cite: 1, 99].
              </p>
            </div>
            <div className="text-6xl font-black text-slate-900/5" style={{ fontFamily: fonts.display }}>{portfolioItems.length}</div>
          </div>

          <div className="bg-gradient-to-br from-violet-600 to-purple-900 rounded-[32px] p-6 shadow-xl relative min-h-[160px] flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                   <p className="text-white/70 text-[9px] font-black uppercase tracking-[0.2em]" style={{ fontFamily: fonts.text }}>Max Recognized Liquidity</p>
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
            <button 
                onClick={() => handleOpenDetail('all')}
                className="w-full bg-white text-slate-900 text-[10px] uppercase tracking-[0.2em] font-black py-4 rounded-xl shadow-xl transition-all active:scale-[0.97] mt-5"
            >
              Pledge Total Collateral
            </button>
          </div>
        </div>

        {/* Quick Actions */}
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

        {/* Search Bar */}
        <div className="flex gap-2 mb-8 px-1">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" placeholder="Search assets or strategies" value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 pl-11 pr-4 text-sm focus:outline-none shadow-sm focus:border-violet-300"
            />
          </div>
          <button className="h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg transition active:scale-95">
            <SlidersHorizontal size={18} />
          </button>
        </div>

        {/* Portfolio List with Eligibility and Concentration UI */}
        <div className="space-y-4">
          <div className="px-5 mb-2 flex items-center justify-between">
             <p className="text-sm font-semibold text-slate-900">Your Eligible Assets [cite: 100]</p>
             <Info className="h-4 w-4 text-slate-300" />
          </div>

          {filteredItems.map((item) => (
            <button 
                key={item.id} 
                onClick={() => handleOpenDetail(item)}
                disabled={!item.isEligible}
                className={`relative w-full overflow-hidden bg-white rounded-[28px] p-5 shadow-sm border transition-all ${!item.isEligible ? 'opacity-50 grayscale' : 'active:scale-[0.98] border-slate-100'}`}
            >
              <div className="relative z-10 text-left">
                <div className="flex justify-between items-start mb-4">
                   <div className="flex items-center gap-3">
                     <div className="h-11 w-11 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center font-black text-slate-400 text-[10px]">{item.code.slice(0,2)}</div>
                     <div>
                       <div className="flex items-center gap-2 mb-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{item.name}</p>
                          {item.isTier1 && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />}
                       </div>
                       <div className="flex items-baseline tracking-tight" style={{ fontFamily: fonts.display }}>
                          <span className="text-xl font-bold text-slate-900">R{item.balance.toLocaleString()}</span>
                       </div>
                     </div>
                   </div>
                   <div className="text-right">
                      {!item.isEligible ? (
                        <span className="text-[8px] font-black bg-rose-50 text-rose-500 px-2 py-1 rounded-full uppercase">Ineligible [cite: 30]</span>
                      ) : (
                        <span className="text-[8px] font-black bg-emerald-50 text-emerald-600 px-2 py-1 rounded-full uppercase">Score: {item.totalScore.toFixed(2)} [cite: 55]</span>
                      )}
                   </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                   <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Recognized Collateral</p>
                      <p className={`text-xs font-bold ${item.isCapped ? 'text-amber-600' : 'text-slate-900'}`}>
                        {formatZar(item.recognizedValue)} {item.isCapped && <span className="text-[8px] opacity-60">(Capped 45% [cite: 86])</span>}
                      </p>
                   </div>
                   <div className="flex items-center gap-2">
                      <div className="text-right">
                        <span className="inline-block rounded-full bg-slate-100 px-2 py-1 text-[9px] font-black text-slate-600 uppercase">LTV {(item.ltv * 100).toFixed(0)}%</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-300" />
                   </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* DETAIL VIEW WITH SCORE GAUGE AND BUFFER BAR */}
      {isDetailOpen && portalTarget && createPortal(
        <div className="fixed inset-0 z-[150] bg-slate-50 flex flex-col animate-in slide-in-from-right">
            <div className="px-6 pt-12 pb-6 flex items-center justify-between bg-white border-b border-slate-100">
                <button onClick={closeDetail} className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 active:scale-95 transition-all"><ChevronLeft size={20} /></button>
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Collateral Analysis</h3>
                <div className="w-10" />
            </div>

            <div className="flex-1 overflow-y-auto">
                <div className="p-8">
                    <div className="mb-8 flex justify-between items-start">
                        <div>
                             <h1 className="text-2xl font-bold tracking-tight text-slate-900" style={{ fontFamily: fonts.display }}>{selectedItem === 'all' ? "Recognized Portfolio" : selectedItem?.name}</h1>
                             <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider mt-1">Tier {(selectedItem?.ltv * 100) > 50 ? '1' : '2'} Liquidity [cite: 18]</p>
                        </div>
                        <div className="h-16 w-16 rounded-full border-4 border-violet-100 flex items-center justify-center relative">
                            <span className="text-xs font-black text-violet-600">{(selectedItem?.totalScore || 0).toFixed(2)}</span>
                            <div className="absolute inset-0 rounded-full border-4 border-violet-600 border-t-transparent -rotate-45" />
                        </div>
                    </div>

                    {/* Step 6: Safety Buffer Bar Visualization [cite: 96] */}
                    <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm mb-8">
                        <div className="flex justify-between items-center mb-4">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Liquidation Buffers [cite: 93]</p>
                            <span className="text-[10px] font-bold text-emerald-600">Secure Range</span>
                        </div>
                        <div className="relative h-6 w-full bg-slate-100 rounded-full overflow-hidden flex">
                            <div className="h-full bg-emerald-500" style={{ width: '60%' }} />
                            <div className="h-full bg-amber-400" style={{ width: '10%' }} />
                            <div className="h-full bg-rose-500" style={{ width: '30%' }} />
                            {/* Marker */}
                            <div className="absolute top-0 bottom-0 w-1 bg-white shadow-md z-10" style={{ left: '45%' }} />
                        </div>
                        <div className="flex justify-between mt-3 text-[8px] font-black uppercase text-slate-400 tracking-tighter">
                            <span>Current LTV: {(selectedItem?.ltv * 100 || 0)}%</span>
                            <span className="text-amber-500">Margin Call: {(selectedItem?.ltv * 100 || 0) + 5}% [cite: 96]</span>
                            <span className="text-rose-500">Liquidation: {(selectedItem?.ltv * 100 || 0) + 10}% [cite: 96]</span>
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div className="text-center">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Max Pledge Capacity [cite: 94]</p>
                             <p className="text-4xl font-extralight text-slate-900 tracking-tight" style={{ fontFamily: fonts.display }}>{formatZar(selectedItem === 'all' ? totalAvailable : selectedItem?.availableLiquidity || 0)}</p>
                        </div>

                        <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-lg">
                            <div className="flex justify-between items-center mb-6">
                                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Pledge Amount</span>
                                <div className="flex items-baseline gap-1 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100"><span className="text-slate-400 font-bold text-sm">R</span><input type="number" value={pledgeAmount} onChange={(e) => handleAmountChange(e.target.value)} placeholder="0" className="w-24 bg-transparent text-right text-lg font-bold text-slate-900 outline-none" /></div>
                            </div>
                            <input type="range" min="0" max="100" value={(pledgeAmount / (selectedItem === 'all' ? totalAvailable : selectedItem?.availableLiquidity || 1)) * 100 || 0} onChange={(e) => handleSliderChange(e.target.value)} className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-violet-600" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-6 bg-white border-t border-slate-100 pb-28"><button disabled={!pledgeAmount} onClick={() => setWorkflowStep("contract")} className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#111111] via-[#3b1b7a] to-[#5b21b6] text-white text-xs font-bold uppercase tracking-[0.2em] shadow-xl transition-all active:scale-[0.97] disabled:opacity-30">Review Agreement</button></div>
        </div>
      , portalTarget)}

      {/* MODALS */}
      {workflowStep !== "idle" && portalTarget && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-md px-6 pb-20">
            {workflowStep === "contract" && (
                <div className="bg-white w-full max-w-sm rounded-[36px] overflow-hidden shadow-2xl p-8">
                    <div className="flex items-center gap-3 mb-6"><div className="h-10 w-10 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center"><FileText size={20} /></div><h3 className="text-xl font-bold text-slate-900" style={{ fontFamily: fonts.display }}>Credit Agreement</h3></div>
                    <div className="space-y-4 mb-8">
                        <div className="flex justify-between pb-3 border-b border-slate-50 text-sm"><span className="text-slate-500 font-medium">Applied LTV</span><span className="font-bold text-slate-900">{(selectedItem?.ltv * 100 || 0)}% </span></div>
                        <div className="flex justify-between pb-3 border-b border-slate-50 text-sm"><span className="text-slate-500 font-medium">Interest</span><span className="font-bold text-emerald-600">+{formatZar(interest)}</span></div>
                        <div className="bg-slate-900 rounded-3xl p-5 flex justify-between items-center"><span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Repayment</span><span className="text-xl font-bold text-white">{formatZar(totalRepayment)}</span></div>
                    </div>
                    <div className="flex flex-col gap-3">
                         <button onClick={() => setWorkflowStep("auth")} className="w-full bg-slate-900 text-white py-4 rounded-2xl text-xs font-bold uppercase tracking-widest shadow-xl active:scale-95">Agree & Confirm</button>
                         <button onClick={() => setWorkflowStep("idle")} className="w-full py-2 text-xs font-bold text-slate-400 uppercase tracking-widest">Cancel</button>
                    </div>
                </div>
            )}

            {workflowStep === "auth" && (
                <div className="bg-white w-full max-w-sm rounded-[36px] p-8 text-center shadow-2xl animate-in fade-in">
                    <div className="h-16 w-16 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center mx-auto mb-6"><Lock size={28} /></div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Authorize</h3>
                    <div className="flex justify-center gap-3 mb-10">{[1,2,3,4].map(i => <div key={i} className="h-14 w-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 text-2xl font-bold">•</div>)}</div>
                    <button onClick={handleConfirmPledge} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold uppercase tracking-widest text-xs shadow-lg flex items-center justify-center">{isProcessing ? <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Confirm PIN"}</button>
                </div>
            )}

            {workflowStep === "success" && (
                <div className="bg-white w-full max-w-sm rounded-[36px] p-8 text-center shadow-2xl">
                    <div className="h-20 w-20 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto mb-8 shadow-inner"><Check size={40} strokeWidth={3} /></div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">Liquidity Secured</h3>
                    <div className="bg-slate-50 rounded-[32px] p-6 mb-8 border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Unlocked Capital</p>
                        <h2 className="text-3xl font-bold text-slate-900">{formatZar(principal)}</h2>
                    </div>
                    <button onClick={closeDetail} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold uppercase tracking-widest text-xs shadow-lg">Done</button>
                </div>
            )}
        </div>
      , portalTarget)}
    </div>
  );
};

export default InstantLiquidity;