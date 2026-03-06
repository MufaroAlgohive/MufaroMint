import React, { useMemo } from "react";
import { 
  Zap, 
  ChevronRight, 
  Info, 
  Search, 
  SlidersHorizontal, 
  Plus, 
  FileSignature, 
  HandCoins, 
  History 
} from "lucide-react";
import { Line, LineChart, ResponsiveContainer, YAxis } from 'recharts';
import { formatZar } from "../lib/formatCurrency";
import NotificationBell from "../components/NotificationBell";

const InstantLiquidity = ({ profile, onOpenNotifications, onTabChange }) => {
  const displayName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ");
  const initials = displayName.split(" ").filter(Boolean).slice(0, 2).map(p => p[0]).join("").toUpperCase() || "MN";

  // Font stacks matched exactly to HomePage (8).jsx
  const fonts = {
    display: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    text: "'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif"
  };

  // Sample data for mini line charts
  const sparklineData = [
    { v: 40 }, { v: 35 }, { v: 55 }, { v: 45 }, { v: 60 }, { v: 50 }, { v: 75 }
  ];

  return (
    <div className="min-h-screen pb-32 relative overflow-x-hidden text-slate-900">
      {/* 1. Integrated Background from NewPortfolioPage (1).jsx */}
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
        {/* 2. Exact Header Sync with HomePage (8).jsx */}
        <header className="relative flex items-center justify-between mb-10 text-white">
          <div className="flex items-center gap-3">
            {profile?.avatarUrl ? (
              <img src={profile.avatarUrl} alt="Profile" className="h-10 w-10 rounded-full border border-white/40 object-cover" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 border border-white/30 text-xs font-semibold">{initials}</div>
            )}
          </div>

          {/* Central Pill Switcher - Re-activating Credit */}
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

        {/* 3. Refined Glass Hero Card */}
        <div className="bg-[#111111]/40 backdrop-blur-2xl rounded-[36px] p-6 shadow-2xl border border-white/10 mb-8 relative overflow-hidden">
          <div className="flex justify-between items-start mb-6">
            <div className="max-w-[180px]">
              <p 
                className="text-white/60 text-[12px] leading-tight font-medium" 
                style={{ fontFamily: fonts.text }}
              >
                Access up to <span className="text-white font-bold">50% of your portfolio</span> value instantly by pledging qualifying strategies.
              </p>
            </div>
            <div 
                className="text-5xl font-light text-white tracking-tighter opacity-20" 
                style={{ fontFamily: fonts.display }}
            >
              LQD
            </div>
          </div>

          {/* Embedded Internal Gradient Card matching Dashboard Impact style */}
          <div className="bg-gradient-to-br from-violet-600 to-purple-800 rounded-[28px] p-6 shadow-xl relative">
            <div className="flex justify-between items-center">
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                   <p 
                    className="text-white/70 text-[9px] font-black uppercase tracking-[0.2em]" 
                    style={{ fontFamily: fonts.text }}
                   >
                    Liquidity Available
                   </p>
                   <Info size={12} className="text-white/30" />
                </div>
                <div className="flex items-baseline text-white tracking-wide" style={{ fontFamily: fonts.display }}>
                  <span className="text-3xl font-light">R14,567</span>
                  <span className="text-xl font-medium opacity-60">.89</span>
                </div>
              </div>
              <div className="h-11 w-11 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                <Zap size={22} className="text-white fill-white/20" />
              </div>
            </div>
          </div>
          
          <button className="mt-6 w-full bg-white text-slate-900 text-[11px] uppercase tracking-[0.15em] font-black py-4 rounded-2xl shadow-lg transition-all active:scale-[0.98]">
            Pledge All
          </button>
        </div>

        {/* 4. Quick Actions with Dashboard Containers */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: "Apply", icon: Plus },
            { label: "Active", icon: FileSignature },
            { label: "Pay", icon: HandCoins },
            { label: "History", icon: History }
          ].map((action, i) => (
            <button key={i} className="flex flex-col items-center gap-2 rounded-2xl bg-white/60 backdrop-blur-md p-3 shadow-sm border border-slate-100 transition active:scale-95">
              <div className="h-10 w-10 rounded-full bg-violet-50 flex items-center justify-center text-violet-700">
                <action.icon size={20} />
              </div>
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest" style={{ fontFamily: fonts.text }}>{action.label}</span>
            </button>
          ))}
        </div>

        {/* 5. Search & Filter Bar matched to App aesthetics */}
        <div className="flex gap-2 mb-10">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search strategies..." 
              className="w-full bg-white/70 backdrop-blur-md border border-slate-200 rounded-2xl py-3.5 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/10 transition-all"
              style={{ fontFamily: fonts.text }}
            />
          </div>
          <button className="h-12 w-12 rounded-2xl bg-[#0d0d12] text-white flex items-center justify-center shadow-lg transition active:scale-95">
            <SlidersHorizontal size={20} />
          </button>
        </div>

        {/* 6. Qualifying Strategy List with Line Sparklines */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Qualifying Strategies</h3>
          {[
            { name: "Bitcoin Alpha", balance: 4250.34, available: 5749.66, ltv: "50%", code: "BTC-005" },
            { name: "Global Equity", balance: 12890.12, available: 8200.00, ltv: "40%", code: "GEQ-012" }
          ].map((strat, i) => (
            <div key={i} className="bg-white/80 backdrop-blur-xl rounded-[32px] p-6 shadow-sm border border-slate-100 transition active:bg-white/95">
              <div className="flex justify-between items-center mb-4">
                 <div className="flex items-center gap-4">
                   <div className="h-12 w-12 rounded-2xl bg-violet-50 flex items-center justify-center text-violet-700">
                     <Zap size={24} className="fill-violet-700" />
                   </div>
                   <div>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1" style={{ fontFamily: fonts.text }}>{strat.name}</p>
                     <div className="flex items-baseline tracking-tight" style={{ fontFamily: fonts.display }}>
                        <span className="text-2xl font-bold text-slate-900">R{Math.floor(strat.balance).toLocaleString()}</span>
                        <span className="text-lg font-bold text-slate-300">.{(strat.balance % 1).toFixed(2).split('.')[1]}</span>
                     </div>
                   </div>
                 </div>

                 {/* Recharts Mini Line Chart matched to Portfolio styling */}
                 <div className="h-10 w-20">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={sparklineData}>
                        <YAxis hide domain={['dataMin - 10', 'dataMax + 10']} />
                        <Line 
                          type="monotone" 
                          dataKey="v" 
                          stroke="#7c3aed" 
                          strokeWidth={2} 
                          dot={false} 
                          animationDuration={1500}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                 </div>
              </div>

              <div className="flex justify-between items-center pt-5 border-t border-slate-50">
                 <p className="text-[12px] font-bold text-slate-500" style={{ fontFamily: fonts.text }}>
                    {formatZar(strat.available)} <span className="text-slate-300 font-medium">Available</span>
                 </p>
                 <div className="text-right">
                    <p className="text-[10px] font-black text-slate-900 uppercase">LTV {strat.ltv}</p>
                    <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">{strat.code}</p>
                 </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default InstantLiquidity;