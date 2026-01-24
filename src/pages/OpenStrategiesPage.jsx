import React, { useState } from "react";
import { ArrowLeft, ChevronRight, Search } from "lucide-react";

const filterOptions = ["Low risk", "Balanced", "Growth", "High risk", "Income"];

const strategyCards = [
  {
    name: "Balanced Growth",
    risk: "Balanced",
    returnRate: "R 6.7%",
    minimum: "Min. R 2,500",
    holdings: [
      { label: "A", bg: "bg-slate-100 text-slate-600" },
      { label: "G", bg: "bg-slate-100 text-slate-600" },
      { label: "M", bg: "bg-slate-100 text-slate-600" },
      { label: "+4", bg: "bg-slate-100 text-slate-500" },
    ],
  },
  {
    name: "Secure Yield",
    risk: "Income",
    returnRate: "R 5.2%",
    minimum: "Min. R 1,000",
    holdings: [
      { label: "S", bg: "bg-slate-100 text-slate-600" },
      { label: "B", bg: "bg-slate-100 text-slate-600" },
      { label: "I", bg: "bg-slate-100 text-slate-600" },
      { label: "+6", bg: "bg-slate-100 text-slate-500" },
    ],
  },
  {
    name: "Early Stage Tech",
    risk: "High risk",
    returnRate: "R 14.1%",
    minimum: "Min. R 10,000",
    holdings: [
      { label: "T", bg: "bg-slate-100 text-slate-600" },
      { label: "N", bg: "bg-slate-100 text-slate-600" },
      { label: "A", bg: "bg-slate-100 text-slate-600" },
      { label: "+3", bg: "bg-slate-100 text-slate-500" },
    ],
  },
];

const OpenStrategiesPage = ({ onBack }) => {
  const [activeFilter, setActiveFilter] = useState("Balanced");

  return (
    <div className="min-h-screen bg-slate-50 pb-[env(safe-area-inset-bottom)] text-slate-900">
      <div className="mx-auto flex w-full max-w-sm flex-col px-4 pb-10 pt-12 md:max-w-md md:px-8">
        <header className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold">AlgoHive Core</h1>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                Popular
              </span>
            </div>
          </div>
          <button
            type="button"
            aria-label="Search"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm"
          >
            <Search className="h-5 w-5" />
          </button>
        </header>

        <button
          type="button"
          className="mt-6 flex w-full items-center justify-between rounded-2xl border border-slate-100 bg-white/90 px-4 py-3 text-sm font-semibold text-slate-700 shadow-[0_6px_18px_rgba(15,23,42,0.06)]"
        >
          View factsheet
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </button>


        <div className="mt-5 space-y-3">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search strategies"
              className="flex-1 bg-transparent text-sm text-slate-700 outline-none"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {filterOptions.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${
                  activeFilter === filter
                    ? "bg-slate-900 text-white"
                    : "border border-slate-200 bg-white text-slate-600"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <section className="mt-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">More strategies</h2>
          {strategyCards.map((strategy) => (
            <div
              key={strategy.name}
              className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{strategy.name}</p>
                  <p className="text-xs text-slate-500">{strategy.risk}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-emerald-500">{strategy.returnRate}</p>
                  <p className="text-xs text-slate-500">{strategy.minimum}</p>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                {strategy.holdings.map((holding, index) => (
                  <div
                    key={`${strategy.name}-${holding.label}-${index}`}
                    className={`flex h-8 w-8 items-center justify-center rounded-full border border-slate-100 text-[11px] font-semibold ${holding.bg}`}
                  >
                    {holding.label}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
};

export default OpenStrategiesPage;
