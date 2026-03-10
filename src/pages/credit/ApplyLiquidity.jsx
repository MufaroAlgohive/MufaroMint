import React from "react";
import { 
  ChevronLeft, 
  ShieldAlert, 
  Info, 
  TrendingUp, 
  Search, 
  ArrowRight, 
  Lock, 
  BarChart3, 
  AlertCircle,
  Sparkles
} from "lucide-react";
import { formatZar } from "../../lib/formatCurrency";

const ApplyLiquidityEmpty = ({ onBack, onNavigateToMarkets, fonts }) => {
  // Mock data of assets that do NOT qualify
  const ineligibleAssets = [
    { id: 1, name: "Penny Stock Ltd", code: "PNY", reason: "Low Liquidity (ADVT < R10m)", value: 12500 },
    { id: 2, name: "Speculative Mining", code: "SPM", reason: "High Volatility (> 50%)", value: 45000 },
    { id: 3, name: "Micro-Cap Tech", code: "MCT", reason: "Market Cap < R10bn", value: 8000 }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="px-6 pt-12 pb-6 flex items-center justify-between bg-white border-b border-slate-100 sticky top-0 z-10">
        <button onClick={onBack} className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 active:scale-95 transition-all">
          <ChevronLeft size={20} />
        </button>
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Apply for Credit</h3>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto pb-32">
        {/* 1. Hero State: The "Unlock" Message */}
        <div className="px-6 pt-8 pb-6">
          <div className="bg-slate-900 rounded-[36px] p-8 text-white shadow-2xl relative overflow-hidden">
            <div className="relative z-10">
              <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center mb-6 border border-white/10">
                <Lock className="text-violet-400" size={28} />
              </div>
              <h2 className="text-3xl font-light tracking-tight mb-3" style={{ fontFamily: fonts.display }}>Liquidity Locked</h2>
              <p className="text-white/50 text-xs leading-relaxed max-w-[240px]">
                Your current portfolio does not meet the minimum requirements for institutional collateral.
              </p>
            </div>
            {/* Visual background glow */}
            <div className="absolute -right-20 -bottom-20 h-64 w-64 bg-violet-600/20 blur-[80px] rounded-full" />
          </div>
        </div>

        {/* 2. Diagnostic Section: Why? */}
        <div className="px-6 mb-8">
          <div className="flex items-center justify-between mb-4 px-2">
            <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Portfolio Diagnostic</h4>
            <Info size={14} className="text-slate-300" />
          </div>

          <div className="space-y-3">
            {ineligibleAssets.map((asset) => (
              <div key={asset.id} className="bg-white rounded-[24px] p-5 border border-slate-100 shadow-sm flex items-center justify-between opacity-70">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center font-black text-slate-300 text-[10px]">
                    {asset.code}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400">{asset.name}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <AlertCircle size={10} className="text-rose-400" />
                      <p className="text-[9px] text-rose-500 font-bold uppercase">{asset.reason}</p>
                    </div>
                  </div>
                </div>
                <p className="text-xs font-bold text-slate-300">{formatZar(asset.value)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Educational Requirement Cards */}
        <div className="px-6 mb-10">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-4">How to qualify</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-[28px] p-5 border border-slate-100 shadow-sm">
                <div className="h-8 w-8 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center mb-3">
                    <TrendingUp size={16} />
                </div>
                <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-1">Scale</p>
                <p className="text-[9px] text-slate-500 leading-tight">Focus on companies with Market Cap {'>'} R10bn.</p>
            </div>
            <div className="bg-white rounded-[28px] p-5 border border-slate-100 shadow-sm">
                <div className="h-8 w-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                    <Zap size={16} />
                </div>
                <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-1">Depth</p>
                <p className="text-[9px] text-slate-500 leading-tight">High liquidity shares (ADVT {'>'} R10m).</p>
            </div>
          </div>
        </div>

        {/* 4. Recommendation Path */}
        <div className="px-6 mb-12">
            <button 
                onClick={onNavigateToMarkets}
                className="w-full bg-white rounded-[32px] p-6 border border-violet-100 shadow-lg shadow-violet-100/20 flex items-center justify-between group active:scale-[0.98] transition-all"
            >
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center shadow-md">
                        <Sparkles size={20} />
                    </div>
                    <div className="text-left">
                        <p className="text-sm font-bold text-slate-900">Explore Tier 1 Assets</p>
                        <p className="text-[10px] text-slate-400 font-medium">Buy shares that unlock instant credit.</p>
                    </div>
                </div>
                <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-violet-600 group-hover:text-white transition-colors">
                    <ArrowRight size={16} />
                </div>
            </button>
        </div>
      </div>

      {/* Action Footer (Raised for Navbar) */}
      <div className="p-6 bg-white border-t border-slate-100 pb-28 shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
        <button 
            onClick={onNavigateToMarkets}
            className="w-full h-14 rounded-2xl bg-slate-900 text-white text-[11px] font-bold uppercase tracking-widest active:scale-95 transition-all shadow-xl"
        >
          View Qualifying Markets
        </button>
      </div>
    </div>
  );
};

export default ApplyLiquidityEmpty;