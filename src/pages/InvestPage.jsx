import React from "react";
import { ArrowLeft, ChevronRight, Layers, LineChart } from "lucide-react";

const InvestPage = ({ onBack, onOpenOpenStrategies, onOpenMarkets }) => (
  <div className="min-h-screen bg-slate-50 pb-[env(safe-area-inset-bottom)] text-slate-900">
    <div className="rounded-b-[36px] bg-gradient-to-b from-[#111111] via-[#3b1b7a] to-[#5b21b6] px-4 pb-10 pt-12 text-white">
      <div className="mx-auto flex w-full max-w-sm flex-col md:max-w-md">
        <header className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-semibold tracking-wide">Invest</h1>
          <div className="h-10 w-10" aria-hidden="true" />
        </header>

        <p className="mt-6 text-xs font-medium uppercase tracking-[0.2em] text-white/60">
          Choose how you want to invest
        </p>

        <div className="mt-4 space-y-3">
          <button
            type="button"
            onClick={onOpenOpenStrategies}
            className="flex w-full items-center gap-4 rounded-[20px] border border-white/10 bg-white/10 px-4 py-5 text-left backdrop-blur-sm transition hover:bg-white/15 active:scale-[0.98]"
          >
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-violet-400/20 text-violet-200">
              <Layers className="h-5 w-5" />
            </div>
            <div className="flex-1 space-y-0.5">
              <p className="text-sm font-semibold text-white">OpenStrategies</p>
              <p className="text-xs text-white/60">Ready-made investment strategies</p>
            </div>
            <ChevronRight className="h-4 w-4 text-white/40" />
          </button>

          <button
            type="button"
            onClick={onOpenMarkets}
            className="flex w-full items-center gap-4 rounded-[20px] border border-white/10 bg-white/10 px-4 py-5 text-left backdrop-blur-sm transition hover:bg-white/15 active:scale-[0.98]"
          >
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-violet-400/20 text-violet-200">
              <LineChart className="h-5 w-5" />
            </div>
            <div className="flex-1 space-y-0.5">
              <p className="text-sm font-semibold text-white">Markets</p>
              <p className="text-xs text-white/60">Explore trends and opportunities</p>
            </div>
            <ChevronRight className="h-4 w-4 text-white/40" />
          </button>
        </div>
      </div>
    </div>
  </div>
);

export default InvestPage;
