import React, { useState, useMemo } from "react";
import { 
  Zap, 
  ChevronRight, 
  Info, 
  Search, 
  SlidersHorizontal, 
  Plus, 
  FileSignature, 
  HandCoins, 
  History,
  X,
  Check
} from "lucide-react";
import { Line, LineChart, ResponsiveContainer, YAxis } from 'recharts';
import { motion, AnimatePresence } from "framer-motion";
import { formatZar } from "../lib/formatCurrency";
import NotificationBell from "../components/NotificationBell";

const InstantLiquidity = ({ profile, onOpenNotifications, onTabChange }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const displayName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ");
  const initials = displayName.split(" ").filter(Boolean).slice(0, 2).map(p => p[0]).join("").toUpperCase() || "MN";

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

  return (
    <div className="min-h-screen pb-32 relative overflow-x-hidden text-slate-900">
      {/* 1. Restored Signature Gradient Background */}
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
        {/* 2. Exact Header Sync with HomePage */}
        <header className="relative flex items-center justify-between mb-10 text-white">
          <div className="flex items-center gap-3">
            {profile?.avatarUrl ? (
              <img src={profile.avatarUrl} alt="Profile" className="h-10 w-10 rounded-full border border-white/40 object-cover" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 border border-white/30 text-xs font-semibold">{initials}</div>
            )}
          </div>

          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="flex items-center rounded-full bg-white/10 p-1 backdrop-blur-md">
              <button 
                onClick={() => onTabChange("home")}
                className="rounded-full px-3 py-1.5 text-xs font-semibold text-white/70 hover:bg-white/10 transition-all"
              >
                Wealth
              </button>
              <button className="rounded-full px-3 py-1.5 text-xs font-semibold bg-white text-slate-900 shadow-sm transition-all">
                Credit
              </button>
              <span className="rounded-full px-3 py-1.5 text-xs font-semibold text-white/30 cursor-default">Transact</span>
            </div>
          </div>

          <NotificationBell onClick={onOpenNotifications} />
        </header>

        {/* 3. Hero Card with Integrated Pledge All Button */}
        <div className="bg-[#111111]/40 backdrop-blur-3xl rounded-[36px] p-6 shadow-2xl border border-white/10 mb-8 relative overflow-hidden">
          <div className="flex justify-between items-start mb-6">
            <div className="max-w-[200px]">
              <p className="text-white/60 text-[12px] leading-tight font-medium" style={{ fontFamily: fonts.text }}>
                Pledge qualifying strategies and assets to unlock <span className="text-white font-bold">instant liquidity</span>.
              </p>
            </div>
            <div className="text-6xl font-black text-white/10" style={{ fontFamily: fonts.display }}>
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
              Pledge All
            </button>
          </div>
        </div>

        {/* 4. Quick Actions */}
        <div className="grid grid-cols-4 gap-4 mb-10 px-1">
          {[
            { label: "Apply", icon: Plus },
            { label: "Active", icon: FileSignature },
            { label: "Pay", icon: HandCoins },
            { label: "History", icon: History }
          ].map((action, i) => (
            <button key={i} className="flex flex-col items-center gap-2 group transition active:scale-90">
              <div className="h-14 w-14 rounded-2xl bg-white/40 backdrop-blur-md border border-white/40 flex items-center justify-center text-slate-700 shadow-sm">
                <action.icon size={22} strokeWidth={1.5} />
              </div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight" style={{ fontFamily: fonts.text }}>{action.label}</span>
            </button>
          ))}
        </div>

        {/* 5. Search & Filter Modal Trigger */}
        <div className="flex gap-2 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search portfolio..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/50 backdrop-blur-xl border border-white/60 rounded-2xl py-3.5 pl-11 pr-4 text-sm focus:outline-none"
              style={{ fontFamily: fonts.text }}
            />
          </div>
          <button 
            onClick={() => setIsFilterOpen(true)}
            className="h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg transition active:scale-95"
          >
            <SlidersHorizontal size={20} />
          </button>
        </div>

        {/* 6. Portfolio List with "Market Insights" Heading Style */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1 mb-4">
            <p className="text-sm font-semibold text-slate-900" style={{ fontFamily: fonts.text }}>Qualifying Assets</p>
            <div className="h-4 w-4 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-500">
              {filteredItems.length}
            </div>
          </div>

          {filteredItems.map((item) => (
            <div key={item.id} className="bg-white/60 backdrop-blur-2xl rounded-[32px] p-6 shadow-sm border border-white/80 transition active:scale-[0.98]">
              <div className="flex justify-between items-center mb-4">
                 <div className="flex items-center gap-4">
                   <div className="h-12 w-12 rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden flex items-center justify-center">
                     {item.logo ? (
                       <img src={item.logo} alt={item.name} className="h-8 w-8 object-contain" />
                     ) : (
                       <div className="text-[10px] font-black text-slate-400">{item.code.slice(0,2)}</div>
                     )}
                   </div>
                   <div>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1" style={{ fontFamily: fonts.text }}>{item.name}</p>
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
                        <Line type="monotone" dataKey="v" stroke="#7c3aed" strokeWidth={2} dot={false} animationDuration={1000} />
                      </LineChart>
                    </ResponsiveContainer>
                 </div>
              </div>

              <div className="flex justify-between items-center pt-5 border-t border-slate-100/50">
                 <p className="text-[12px] font-bold text-slate-500" style={{ fontFamily: fonts.text }}>
                    {formatZar(item.available)} <span className="text-slate-300 font-medium">Available</span>
                 </p>
                 <div className="text-right">
                    <p className="text-[10px] font-black text-slate-900 uppercase">LTV {item.ltv}</p>
                    <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">{item.code}</p>
                 </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter Modal Popup */}
      <AnimatePresence>
        {isFilterOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsFilterOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 inset-x-0 bg-white rounded-t-[32px] p-8 z-[101] shadow-2xl shadow-slate-900/20"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-lg font-bold text-slate-900" style={{ fontFamily: fonts.display }}>Filter Portfolio</h3>
                <button onClick={() => setIsFilterOpen(false)} className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                  <X size={18} />
                </button>
              </div>
              
              <div className="space-y-3">
                {["all", "strategy", "stock"].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => { setActiveFilter(filter); setIsFilterOpen(false); }}
                    className={`w-full flex items-center justify-between p-5 rounded-2xl border transition-all ${
                      activeFilter === filter ? "border-violet-500 bg-violet-50 text-violet-700" : "border-slate-100 bg-slate-50 text-slate-600"
                    }`}
                  >
                    <span className="text-sm font-bold uppercase tracking-widest">{filter}s</span>
                    {activeFilter === filter && <Check size={18} />}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InstantLiquidity;