import React, { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import {
  Area,
  Line,
  ComposedChart,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

const timeframeOptions = [
  { key: "1W", label: "1W", points: 7 },
  { key: "1M", label: "1M", points: 30 },
  { key: "3M", label: "3M", points: 90 },
  { key: "6M", label: "6M", points: 180 },
  { key: "YTD", label: "YTD", points: 120 },
];

const buildSeries = (points, base = 2.4) => {
  return Array.from({ length: points }, (_, index) => {
    const drift = (index / points) * 3.2;
    const wave = Math.sin(index / 7) * 0.6 + Math.cos(index / 11) * 0.4;
    const value = base + drift + wave;
    return {
      label: index + 1,
      returnPct: Number(value.toFixed(2)),
    };
  });
};

const holdings = [
  { name: "AAPL", weight: "18%" },
  { name: "MSFT", weight: "16%" },
  { name: "NVDA", weight: "14%" },
  { name: "TSLA", weight: "9%" },
  { name: "AMZN", weight: "8%" },
  { name: "PRX", weight: "7%" },
];

const metrics = [
  { label: "Max drawdown", value: "6.2%" },
  { label: "Volatility", value: "Low" },
  { label: "Fees", value: "20%" },
  { label: "Strategy age", value: "3 yrs" },
];

const FactsheetPage = ({ onBack }) => {
  const [timeframe, setTimeframe] = useState("6M");
  const [activeLabel, setActiveLabel] = useState(null);

  const data = useMemo(() => {
    const selected = timeframeOptions.find((option) => option.key === timeframe);
    return buildSeries(selected?.points ?? 180);
  }, [timeframe]);

  const lastIndex = data.length - 1;
  const lastValue = data[lastIndex]?.returnPct ?? 0;
  const formattedReturn = `${lastValue >= 0 ? "+" : ""}${lastValue.toFixed(2)}%`;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex w-full max-w-sm flex-col px-4 pb-32 pt-10 md:max-w-md md:px-6">
        <header className="flex items-start justify-between">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex flex-1 flex-col items-center gap-1 text-center">
            <h1 className="text-lg font-semibold">AlgoHive Core Factsheet</h1>
            <p className="text-xs font-semibold text-slate-500">Balanced • Automated</p>
          </div>
          <div className="h-10 w-10" />
        </header>

        <section className="mt-6 rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_16px_32px_rgba(15,23,42,0.08)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-slate-900">AlgoHive Core</h2>
                <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-semibold text-violet-600">
                  Popular
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-400">Balanced • Automated</p>
            </div>
          </div>

          <div className="mt-4 space-y-1">
            <div className="flex items-center gap-3">
              <p className="text-3xl font-semibold text-slate-900">{formattedReturn}</p>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-600">
                {timeframe} return
              </span>
            </div>
            <p className="text-xs text-slate-500">Last updated 2h ago</p>
          </div>

          <div className="mt-4 h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={data}
                margin={{ top: 12, right: 16, left: 8, bottom: 0 }}
                onMouseMove={(state) => {
                  if (state?.activeLabel) {
                    setActiveLabel(state.activeLabel);
                  }
                }}
                onMouseLeave={() => setActiveLabel(null)}
              >
                <defs>
                  <linearGradient id="factsheetGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5b21b6" stopOpacity={0.25} />
                    <stop offset="70%" stopColor="#3b1b7a" stopOpacity={0.1} />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                {activeLabel ? (
                  <ReferenceLine
                    x={activeLabel}
                    stroke="#CBD5E1"
                    strokeOpacity={0.6}
                    strokeDasharray="3 3"
                  />
                ) : null}
                <XAxis dataKey="label" hide />
                <YAxis hide />
                <Area
                  type="monotone"
                  dataKey="returnPct"
                  stroke="transparent"
                  fill="url(#factsheetGradient)"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="returnPct"
                  stroke="#5b21b6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {timeframeOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setTimeframe(option.key)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  timeframe === option.key
                    ? "bg-slate-900 text-white"
                    : "border border-slate-200 bg-white text-slate-600"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-3 text-[11px] font-semibold text-slate-400">
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
              Balanced
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
              Low risk
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
              Automated
            </span>
          </div>

        </section>

        <section className="mt-6 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-2 gap-4 text-xs text-slate-500">
            {metrics.map((metric) => (
              <div key={metric.label}>
                <p className="font-semibold text-slate-600">{metric.label}</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{metric.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Strategy description</h2>
          <p className="mt-3 text-sm text-slate-600">
            AlgoHive Core targets steady, diversified growth using an automated allocation model
            that adapts to changing market regimes. It aims to smooth volatility while maintaining
            consistent participation in upside moves, making it suitable for investors seeking a
            balanced, long-term portfolio anchor.
          </p>
        </section>

        <section className="mt-6 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Top holdings</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {holdings.map((holding) => (
              <div
                key={holding.name}
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
              >
                <span>{holding.name}</span>
                <span className="text-slate-400">{holding.weight}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Risk and suitability</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>Risk level: Balanced</li>
            <li>Time horizon: Medium to long term</li>
            <li>Suitable for investors seeking steady, diversified growth</li>
          </ul>
        </section>
      </div>

      <div className="sticky bottom-0 bg-slate-50 px-4 pb-6 pt-2">
        <button
          type="button"
          className="w-full rounded-2xl bg-gradient-to-r from-[#111111] via-[#3b1b7a] to-[#5b21b6] py-3 text-sm font-semibold text-white shadow-lg shadow-violet-200/60"
        >
          Invest in AlgoHive Core
        </button>
      </div>
    </div>
  );
};

export default FactsheetPage;
