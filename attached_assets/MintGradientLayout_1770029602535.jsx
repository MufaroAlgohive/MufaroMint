import React from "react";
import { 
  ArrowLeft, Landmark, Zap, Briefcase, ChevronDown, ChevronUp, 
  Info, AlertCircle, ShieldCheck, CheckCircle2, TrendingUp, 
  ArrowRight, HandCoins, Table, BadgeCheck
} from "lucide-react";

export const MintGradientLayout = ({ children, title, subtitle, onBack, stepInfo, showBack = true }) => {
  return (
    <div className="min-h-screen bg-slate-50 pb-[env(safe-area-inset-bottom)] text-slate-900 font-sans">
      <div className="rounded-b-[36px] bg-gradient-to-b from-[#111111] via-[#3b1b7a] to-[#5b21b6] px-4 pb-12 pt-10 text-white md:px-8 transition-all duration-500 ease-in-out">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
          {showBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/70 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          )}
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
              {subtitle && <p className="text-sm text-white/80 mt-1 max-w-md leading-relaxed">{subtitle}</p>}
            </div>
            {stepInfo && (
               <div className="hidden sm:block text-right">
                  <span className="text-[10px] uppercase tracking-widest text-white/60">Step</span>
                  <p className="text-xl font-bold">{stepInfo}</p>
               </div>
            )}
          </div>
        </div>
      </div>
      <div className="mx-auto -mt-8 w-full max-w-2xl px-4 md:px-8 space-y-6">
        {children}
      </div>
    </div>
  );
};
