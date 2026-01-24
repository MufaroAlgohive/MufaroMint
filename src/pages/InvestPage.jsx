import React from "react";
import { ArrowLeft, ChevronRight, Layers, LineChart } from "lucide-react";

const InvestPage = ({ onBack }) => (
  <div className="min-h-screen bg-slate-50 pb-[env(safe-area-inset-bottom)] text-slate-900">
    <div className="mx-auto flex w-full max-w-sm flex-col px-4 pb-10 pt-8 md:max-w-md md:px-8">
      <header className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold">Invest</h1>
        <div className="h-10 w-10" aria-hidden="true" />
      </header>

      <div className="mt-5 space-y-5">
        <div className="space-y-2">
          <p className="text-base font-semibold text-slate-900">Choose how you want to invest</p>
          <p className="text-sm text-slate-500">
            We will guide you through the next steps once you make a selection.
          </p>
        </div>

        <div className="rounded-[28px] bg-gradient-to-b from-violet-50/80 via-white to-white p-4 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
          <button
            type="button"
            className="flex w-full items-center gap-4 rounded-[24px] border border-white/70 bg-white/70 px-4 py-5 text-left shadow-[0_10px_30px_-20px_rgba(79,70,229,0.6)] backdrop-blur"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
              <Layers className="h-5 w-5" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between gap-3">
                <p className="text-base font-semibold text-slate-900">OpenStrategies</p>
                <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-violet-700">
                  Recommended
                </span>
              </div>
              <p className="text-sm text-slate-600">
                Ready-made strategies, curated and managed by experts for confident growth.
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-400" />
          </button>

          <button
            type="button"
            className="mt-4 flex w-full items-center gap-4 rounded-[22px] border border-slate-100 bg-white px-4 py-4 text-left shadow-sm"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
              <LineChart className="h-5 w-5" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-800">Markets</p>
              </div>
              <p className="text-xs text-slate-500">
                Research trends, compare opportunities, and discover what to invest in next.
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-300" />
          </button>
        </div>
      </div>
    </div>
  </div>
);

export default InvestPage;
