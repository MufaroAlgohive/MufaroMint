import React, { useState } from "react";
import { ArrowLeft, ChevronRight, Scale, Search } from "lucide-react";
import { StrategyReturnHeaderChart } from "../components/StrategyReturnHeaderChart";

const tabOptions = ["Strategies", "Stocks"];

const strategyCards = [
  {
    name: "Balanced Growth",
    risk: "Balanced",
    returnRate: "6.7%",
    minimum: "Min. $2,500",
  },
  {
    name: "Dividend Focus",
    risk: "Low risk",
    returnRate: "5.3%",
    minimum: "Min. $1,500",
  },
  {
    name: "Momentum Select",
    risk: "Growth",
    returnRate: "9.1%",
    minimum: "Min. $5,000",
  },
];

const OpenStrategiesPage = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState("Strategies");
  const series = [
    { label: "Jan", returnPct: 0.6 },
    { label: "Feb", returnPct: 1.4 },
    { label: "Mar", returnPct: 1.1 },
    { label: "Apr", returnPct: 2.0 },
    { label: "May", returnPct: 2.8 },
    { label: "Jun", returnPct: 3.3 },
    { label: "Jul", returnPct: 3.9 },
    { label: "Aug", returnPct: 4.1 },
    { label: "Sep", returnPct: 4.6 },
    { label: "Oct", returnPct: 4.9 },
    { label: "Nov", returnPct: 5.2 },
    { label: "Dec", returnPct: 5.5 },
  ];
  const [returnValue, setReturnValue] = useState(series[series.length - 1]?.returnPct ?? 5.5);
  const formattedReturn = `${returnValue >= 0 ? "+" : ""}${returnValue.toFixed(2)}%`;

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
          <div className="flex flex-col items-center">
            <h1 className="text-lg font-semibold">OpenStrategies</h1>
            <p className="text-sm text-slate-500">Ready made investing</p>
          </div>
          <div className="h-10 w-10" />
        </header>

        <p className="mt-4 text-center text-sm text-slate-500">Choose a strategy to start.</p>

        <section className="mt-6 rounded-[28px] border border-slate-100 bg-white p-5 shadow-[0_18px_40px_rgba(79,70,229,0.08)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-white shadow-sm ring-1 ring-slate-100">
                <img
                  src="https://s3-symbol-logo.tradingview.com/country/ZA.svg"
                  alt="South Africa"
                  className="h-full w-full object-cover"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-slate-900">AlgoHive Core</h2>
                  <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-semibold text-violet-600">
                    Popular
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-400">MI90b · JSE</p>
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-1">
            <div className="flex items-center gap-3">
              <p className="text-2xl font-semibold text-slate-900">{formattedReturn}</p>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-600">
                All time gain {formattedReturn}
              </span>
            </div>
            <p className="text-xs text-slate-400">Last updated 2h ago</p>
          </div>

          <div className="mt-4">
            <StrategyReturnHeaderChart
              series={series}
              onValueChange={(value) => setReturnValue(value)}
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
              <Scale className="h-3.5 w-3.5 text-slate-400" />
              Balanced
            </span>
            {["Low risk", "Automated"].map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600"
              >
                {tag}
              </span>
            ))}
          </div>

          <button
            type="button"
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-200/70"
          >
            View factsheet
            <ChevronRight className="h-4 w-4" />
          </button>
        </section>

        <button
          type="button"
          className="mt-5 flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-900">Today</span>
            <span className="text-sm text-slate-500">US rates steady as tech rallies</span>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </button>

        <div className="mt-5 space-y-3">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search strategies or stocks"
              className="flex-1 bg-transparent text-sm text-slate-700 outline-none"
            />
          </div>

          <div className="flex gap-2">
            {tabOptions.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-full px-4 py-2 text-xs font-semibold ${
                  activeTab === tab
                    ? "bg-slate-900 text-white"
                    : "border border-slate-200 bg-white text-slate-600"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <section className="mt-6 space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">Other strategies</h2>
          {strategyCards.map((strategy) => (
            <div
              key={strategy.name}
              className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{strategy.name}</p>
                  <p className="text-xs text-slate-500">{strategy.risk}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-emerald-500">+{strategy.returnRate}</p>
                  <p className="text-xs text-slate-500">{strategy.minimum}</p>
                </div>
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
};

export default OpenStrategiesPage;
