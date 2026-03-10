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
  Check
} from "lucide-react";
import { Line, LineChart, ResponsiveContainer, YAxis } from 'recharts';
import { formatZar } from "../../lib/formatCurrency";
import NotificationBell from "../../components/NotificationBell";
import NavigationPill from "../../components/NavigationPill"; // Calling your new component

const InstantLiquidity = ({ profile, onOpenNotifications, onTabChange }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [portalTarget, setPortalTarget] = useState(null);
  const [filterTab, setFilterTab] = useState("assets");

  // --- Filter States ---
  const [draftFilter, setDraftFilter] = useState("all");
  const [draftSort, setDraftSort] = useState("Recommended");
  const [draftRisks, setDraftRisks] = useState(new Set());

  // --- Sheet Drag Logic (Exact from MarketsPage.jsx) ---
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

  const filteredItems = useMemo(() => {
    return portfolioItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            item.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = activeFilter === "all" || item.type === activeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [searchQuery, activeFilter]);

  const sparklineData = [{ v: 40 }, { v: 35 }, { v: 55 }, { v: 45 }, { v: 60 }, { v: 50 }, { v: 75 }];

  // --- Interaction Handlers ---
  const resetSheetPosition = () => {
    setSheetOffset(0);
    dragStartY.current = null;
    isDragging.current = false;
  };

  const handleSheetPointerDown = (e) => {
    dragStartY.current = e.clientY;
    isDragging.current = true;
  };

  const handleSheetPointerMove = (e) => {
    if (!isDragging.current || dragStartY.current === null) return;
    const delta = e.clientY - dragStartY.current;
    setSheetOffset(delta > 0 ? delta : 0);
  };

  const handleSheetPointerUp = () => {
    if (!isDragging.current) return;
    if (sheetOffset > 80) setIsFilterOpen(false);
    resetSheetPosition();
  };

  const applyFilters = () => {
    setActiveFilter(draftFilter);
    setIsFilterOpen(false);
    resetSheetPosition();
  };

  const clearAllFilters = () => {
    if (filterTab === "assets") setDraftFilter("all");
    else {
      setDraftSort("Recommended");
      setDraftRisks(new Set());
    }
  };

  const initials = [profile?.firstName, profile?.lastName]
    .filter(Boolean).map(p => p[0]).join("").toUpperCase() || "MN";

  return (
    <div className="min-h-screen pb-32 relative overflow-x-hidden text-slate-900">
      {/* RESTORED: Background Gradient */}
      <div className="absolute inset-x-0 top-0 -z-10 h-full">
        <div 
          className="absolute inset-x-0 top-0"
          style={{ 
            height: '100vh',
            background: 'linear-gradient(180deg, #0d0d12 0%, #0e0a14 0.5%, #100b18 1%, #120c1c 1.5%, #150e22 2%, #181028 2.5%, #1c122f 3%, #201436 3.5%, #25173e 4%, #2a1a46 5%, #301d4f 6%, #362158 7%, #3d2561 8%, #44296b 9%, #4c2e75 10%, #54337f 11%, #5d3889 12%, #663e93 13%, #70449d 14%, #7a4aa7 15%, #8451b0 16%, #8e58b9 17%, #9860c1 18%, #a268c8 19%, #ac71ce 20%, #b57ad3 21%, #be84d8 22%, #c68edc 23%, #cd98e0 24%, #d4a2e3 25%, #daace6 26%, #dfb6e9 27%, #e4c0eb 28%, #e8c9ed 29%, #ecd2ef 30%, #efdaf1 31%, #f2e1f3 32%, #f4e7f5 33%, #f6ecf7 34%, #f8f0f9 35%, #f9f3fa 36%, #faf5fb 38%, #fbf7fc 40%, #fcf9fd 42%, #fdfafd 45%, #faf8fc 55%, #f8f6fa 100%)'
          }} 
        />
        <div className="absolute inset-x-0 top-[100vh] bottom-0" style={{ background: '#f8f6fa' }} />
      </div>

      <div className="px-5 pt-12 pb-8">
        <header className="relative flex items-center justify-between mb-10 text-white">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 border border-white/30 text-xs font-semibold">{initials}</div>
          
          {/* NAV PILL COMPONENT */}
          <NavigationPill 
            activeTab="credit" 
            onTabChange={(tab) => tab === "home" ? onTabChange("home") : null} 
          />

          <NotificationBell onClick={onOpenNotifications} />
        </header>

        {/* WHITE GLASS Top Card */}
        <div className="bg-white/40 backdrop-blur-3xl rounded-[36px] p-6 shadow-xl border border-white/80 mb-8 relative overflow-hidden">
          <div className="flex justify-between items-start mb-6">
            <div className="max-w-[200px]">
              <p className="text-slate-600 text-[12px] leading-tight font-medium" style={{ fontFamily: fonts.text }}>
                Pledge qualifying strategies and assets to unlock <span className="text-slate-900 font-bold">instant liquidity</span>.
              </p>
            </div>
            <div className="text-6xl font-black text-slate-900/5" style={{ fontFamily: fonts.display }}>
              {portfolioItems.length}
            </div>
          </div>

          <div className="bg-gradient-to-br from-violet-600 to-purple-900 rounded-[32px] p-6 shadow-xl relative min-h-[160px] flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                   <p className="text-white/70 text-[9px] font-black uppercase tracking-[0.2em]" style={{ fontFamily: fonts.text }}>Liquidity Available</p>
                   <Info size={11} className="text-white/30" />
                </div>
                <div className="flex items-baseline text-white tracking-tight" style={{ fontFamily: fonts.display }}>
                  <span className="text-3xl font-light">R14,567</span>
                  <span className="text-xl font-medium opacity-60">.89</span>
                </div>
              </div>
              <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                <Zap size={20} className="text-white fill-white/20" />
              </div>
            </div>
            <button className="w-full bg-white text-slate-900 text-[10px] uppercase tracking-[0.2em] font-black py-3 rounded-xl shadow-xl transition-all active:scale-[0.97] mt-5">
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
              type="text" 
              placeholder="Search portfolio..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/50 backdrop-blur-xl border border-white/60 rounded-2xl py-3.5 pl-11 pr-4 text-sm focus:outline-none shadow-sm"
            />
          </div>
          <button 
            onClick={() => setIsFilterOpen(true)}
            className="h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg transition active:scale-95"
          >
            <SlidersHorizontal size={20} />
          </button>
        </div>

        {/* Asset List */}
        <div className="space-y-4">
          {filteredItems.map((item) => (
            <div key={item.id} className="bg-white/60 backdrop-blur-2xl rounded-[32px] p-6 shadow-sm border border-white/80 transition active:scale-[0.98]">
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

      {/* DUAL-TAB FILTER SHEET */}
      {isFilterOpen && portalTarget && createPortal(
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/40 backdrop-blur-sm px-4 pb-6">
          <button type="button" className="absolute inset-0 h-full w-full cursor-default" onClick={() => { setIsFilterOpen(false); resetSheetPosition(); }} />
          <div
            className="relative z-10 flex h-[65vh] w-full max-w-sm flex-col overflow-hidden rounded-[32px] bg-white shadow-2xl"
            style={{ 
              transform: `translateY(${sheetOffset}px)`,
              transition: isDragging.current ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
            }}
            onPointerDown={handleSheetPointerDown} onPointerMove={handleSheetPointerMove} onPointerUp={handleSheetPointerUp} onPointerCancel={handleSheetPointerUp}
          >
            <div className="flex items-center justify-center pt-3 pb-2"><div className="h-1.5 w-12 rounded-full bg-slate-200" /></div>

            {/* Header + Tab Switcher */}
            <div className="sticky top-0 z-10 bg-white px-6 pb-4 pt-3 border-b border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900" style={{ fontFamily: fonts.display }}>Filters</h3>
                <button type="button" onClick={clearAllFilters} className="text-sm font-semibold text-slate-500">Clear all</button>
              </div>
              <div className="flex p-1 bg-slate-100 rounded-xl">
                <button onClick={() => setFilterTab("assets")} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${filterTab === "assets" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>Assets</button>
                <button onClick={() => setFilterTab("strategies")} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${filterTab === "strategies" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>Strategies</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              {filterTab === "assets" ? (
                /* ASSETS SIDE (Exact logic/UI from MarketsPage.jsx) */
                <div className="space-y-6">
                  <div>
                    <h4 className="mb-4 text-xs font-black text-slate-400 uppercase tracking-widest">Asset Category</h4>
                    <div className="space-y-3">
                      {["all", "strategy", "stock"].map((option) => (
                        <button key={option} onClick={() => setDraftFilter(option)} className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${draftFilter === option ? "border-violet-500 bg-violet-50 text-violet-700 shadow-sm" : "border-slate-100 bg-slate-50 text-slate-600 hover:bg-slate-100"}`}>
                          <span className="text-sm font-bold capitalize">{option === 'all' ? 'All Assets' : option + 's'}</span>
                          {draftFilter === option && <Check size={18} className="text-violet-600" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* STRATEGIES SIDE (Exact logic/UI from OpenStrategiesPage.jsx) */
                <div className="space-y-6 pb-6">
                  <div>
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Risk level</h4>
                    <div className="flex flex-wrap gap-2">
                      {["Low risk", "Balanced", "Growth", "High risk"].map(risk => (
                        <button key={risk} onClick={() => {
                          const next = new Set(draftRisks);
                          next.has(risk) ? next.delete(risk) : next.add(risk);
                          setDraftRisks(next);
                        }} className={`px-4 py-2 rounded-full text-xs font-bold border transition-all ${draftRisks.has(risk) ? "bg-violet-600 border-violet-600 text-white shadow-sm" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>{risk}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Sort</h4>
                    <div className="flex flex-wrap gap-2">
                      {["Recommended", "Best performance", "Lowest minimum"].map(opt => (
                        <button key={opt} onClick={() => setDraftSort(opt)} className={`px-4 py-2 rounded-full text-xs font-bold border transition-all ${draftSort === opt ? "bg-slate-900 border-slate-900 text-white shadow-sm" : "border-slate-200 text-slate-500"}`}>{opt}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 border-t border-slate-100 bg-white px-6 pb-8 pt-4">
              <button type="button" onClick={applyFilters} className="w-full rounded-2xl bg-gradient-to-r from-[#111111] via-[#3b1b7a] to-[#5b21b6] py-4 text-sm font-bold text-white shadow-lg transition active:scale-[0.98]">Apply</button>
            </div>
          </div>
        </div>
      , portalTarget)}
    </div>
  );
};

export default InstantLiquidity;