import React from "react";
import { Zap, Bell, ArrowLeft, ChevronRight, Info } from "lucide-react";
import { formatZar } from "../lib/formatCurrency";

const InstantLiquidity = ({ profile, onOpenNotifications, onBack }) => {
  const firstName = profile?.firstName || "Mufaro";
  const initials = [profile?.firstName, profile?.lastName]
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join("")
    .toUpperCase() || "MN";

  return (
    <div className="min-h-screen pb-32 relative overflow-x-hidden text-slate-900">
      {/* Signature Multi-layered Background */}
      <div className="absolute inset-x-0 top-0 -z-10 h-full">
        <div 
          className="absolute inset-x-0 top-0"
          style={{ 
            height: '100vh',
            background: 'linear-gradient(180deg, #0d0d12 0%, #0e0a14 0.5%, #100b18 1%, #120c1c 1.5%, #150e22 2%, #181028 2.5%, #1c122f 3%, #201436 3.5%, #25173e 4%, #2a1a46 5%, #301d4f 6%, #362158 7%, #3d2561 8%, #44296b 9%, #4c2e75 10%, #54337f 11%, #5d3889 12%, #663e93 13%, #70449d 14%, #7a4aa7 15%, #8451b0 16%, #8e58b9 17%, #9860c1 18%, #a268c8 19%, #ac71ce 20%, #b57ad3 21%, #be84d8 22%, #c68edc 23%, #cd98e0 24%, #d4a2e3 25%, #daace6 26%, #dfb6e9 27%, #e4c0eb 28%, #e8c9ed 29%, #ecd2ef 30%, #efdaf1 31%, #f2e1f3 32%, #f4e7f5 33%, #f6ecf7 34%, #f8f0f9 35%, #f9f3fa 36%, #faf5fb 38%, #fbf7fc 40%, #fcf9fd 42%, #fdfafd 45%, #faf8fc 55%, #f8f6fa 100%)'
          }} 
        />
        <div 
          className="absolute inset-x-0 top-[100vh] bottom-0"
          style={{ background: '#f8f6fa' }} 
        />
        <div 
          className="absolute top-[6%] left-1/2 -translate-x-1/2 w-[300px] h-[160px] rounded-full opacity-50"
          style={{ 
            background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.3) 0%, transparent 70%)', 
            filter: 'blur(50px)' 
          }}
        />
      </div>

      <div className="px-5 pt-12 pb-8">
        {/* Transparent Header */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
             <button 
                onClick={onBack}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-sm"
             >
                <ArrowLeft size={20} className="text-white" />
             </button>
             <div className="h-10 w-10 rounded-full bg-white/20 border border-white/30 flex items-center justify-center font-bold text-xs text-white">
               {initials}
             </div>
          </div>
          <button onClick={onOpenNotifications} className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20 backdrop-blur-md shadow-sm">
            <Bell size={20} className="text-white" />
          </button>
        </header>

        {/* Score Hero Section (Inspired by Screenshot) */}
        <div className="bg-[#1a1a24] rounded-[36px] p-6 shadow-2xl mb-8 relative overflow-hidden">
          <div className="flex justify-between items-start mb-6">
            <div className="max-w-[180px]">
              <p className="text-white/60 text-[13px] leading-tight font-medium">
                The higher your <span className="text-white font-bold">Liquidity score</span>, the more instant access you have to capital.
              </p>
            </div>
            <div className="text-5xl font-bold text-white tracking-tighter">72</div>
          </div>

          {/* Embedded Internal Card */}
          <div className="bg-gradient-to-br from-violet-500 to-purple-700 rounded-3xl p-5 shadow-lg relative">
            <div className="flex justify-between items-center">
              <div>
                <div className="flex items-center gap-1.5 mb-0.5">
                   <p className="text-white/80 text-[11px] font-black uppercase tracking-widest">Total Available</p>
                   <Info size={12} className="text-white/40" />
                </div>
                <div className="flex items-baseline text-white">
                  <span className="text-2xl font-black">R14,567</span>
                  <span className="text-lg font-medium opacity-60">.89</span>
                </div>
              </div>
              <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                <ChevronRight size={20} className="text-white" />
              </div>
            </div>
          </div>
          
          <div className="mt-5 flex justify-center">
            <button className="bg-white/5 hover:bg-white/10 text-white text-[13px] font-bold py-2.5 px-8 rounded-full transition-all border border-white/10">
              Increase my score
            </button>
          </div>
        </div>

        {/* Pagination Dots */}
        <div className="flex justify-center gap-2 mb-10">
          <div className="h-2 w-2 rounded-full bg-slate-400" />
          <div className="h-2 w-2 rounded-full bg-slate-200" />
          <div className="h-2 w-2 rounded-full bg-slate-200" />
        </div>

        {/* Strategy List Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold px-1 mb-2">Qualifying Strategies</h3>
          
          {[
            { name: "Bitcoin Alpha", balance: 4250.34, available: 5749.66, ltv: "50%", code: "BTC-005" },
            { name: "Global Equity", balance: 12890.12, available: 8200.00, ltv: "40%", code: "GEQ-012" }
          ].map((strat, i) => (
            <div key={i} className="bg-white/80 backdrop-blur-xl rounded-[32px] p-6 shadow-sm border border-slate-100 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                 <div className="flex items-center gap-4">
                   <div className="h-12 w-12 rounded-2xl bg-violet-50 flex items-center justify-center">
                     <Zap size={24} className="text-violet-600 fill-violet-600" />
                   </div>
                   <div>
                     <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{strat.name}</p>
                     <div className="flex items-baseline">
                        <span className="text-2xl font-black text-slate-900">R{Math.floor(strat.balance).toLocaleString()}</span>
                        <span className="text-lg font-bold text-slate-400">.{(strat.balance % 1).toFixed(2).split('.')[1]}</span>
                     </div>
                   </div>
                 </div>
                 {/* Mini Sparkline Visualization */}
                 <div className="h-10 w-20 flex items-end gap-0.5">
                    {[30, 45, 35, 55, 40, 60, 50].map((h, j) => (
                      <div key={j} className="flex-1 bg-violet-100 rounded-t-sm" style={{ height: `${h}%` }} />
                    ))}
                 </div>
              </div>
              
              <div className="flex justify-between items-center pt-5 border-t border-slate-50">
                 <p className="text-[13px] font-bold text-slate-500">
                    {formatZar(strat.available)} <span className="text-slate-300 font-medium">Available</span>
                 </p>
                 <div className="text-right">
                    <p className="text-[11px] font-black text-slate-900 uppercase">LTV {strat.ltv}</p>
                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter">{strat.code}</p>
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