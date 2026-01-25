import React, { useId, useMemo, useState } from "react";
import { ArrowLeft, ChevronRight, Search } from "lucide-react";
import { StrategyReturnHeaderChart } from "../components/StrategyReturnHeaderChart";
import { ChartContainer } from "../components/ui/line-charts-2";
import { Area, ComposedChart, Line, ReferenceLine, ResponsiveContainer } from "recharts";

const tabOptions = ["Strategies", "Stocks"];

const strategyCards = [
  {
    name: "Balanced Growth",
    risk: "Balanced",
    returnRate: "6.7%",
    minimum: "Min. $2,500",
    tags: ["Balanced", "Low risk", "Automated"],
    sparkline: [12, 18, 16, 24, 28, 26, 32, 35, 40, 44],
  },
  {
    name: "Dividend Focus",
    risk: "Low risk",
    returnRate: "5.3%",
    minimum: "Min. $1,500",
    tags: ["Income", "Low risk", "Automated"],
    sparkline: [10, 12, 15, 14, 18, 20, 22, 24, 26, 28],
  },
  {
    name: "Momentum Select",
    risk: "Growth",
    returnRate: "9.1%",
    minimum: "Min. $5,000",
    tags: ["Growth", "Higher risk", "Automated"],
    sparkline: [8, 14, 12, 20, 26, 24, 30, 36, 34, 42],
  },
];

const holdingsSnapshot = [
  {
    name: "Apple",
    src: "https://s3-symbol-logo.tradingview.com/apple--big.svg",
  },
  {
    name: "Microsoft",
    src: "https://s3-symbol-logo.tradingview.com/microsoft--big.svg",
  },
  {
    name: "Nvidia",
    src: "https://s3-symbol-logo.tradingview.com/nvidia--big.svg",
  },
];

const StrategyMiniChart = ({ values }) => {
  const chartConfig = {
    returnPct: {
      label: "Return",
      color: "var(--color-mint-purple, #5b21b6)",
    },
  };
  const data = useMemo(
    () =>
      values.map((value, index) => ({
        label: `P${index + 1}`,
        returnPct: value,
      })),
    [values],
  );
  const lastIndex = data.length - 1;
  const gradientId = useId();
  const [activeLabel, setActiveLabel] = useState(null);
  const renderLastDot = ({ cx, cy, index }) => {
    if (index !== lastIndex) return null;
    return (
      <g>
        <circle cx={cx} cy={cy} r={5} fill="#ffffff" opacity={0.95} />
        <circle cx={cx} cy={cy} r={2.5} fill={chartConfig.returnPct.color} />
      </g>
    );
  };

  return (
    <ChartContainer config={chartConfig} className="h-12 w-24">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 4, right: 6, left: 6, bottom: 4 }}
          onMouseMove={(state) => {
            if (state?.activeLabel) {
              setActiveLabel(state.activeLabel);
            }
          }}
          onMouseLeave={() => {
            setActiveLabel(null);
          }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5b21b6" stopOpacity={0.22} />
              <stop offset="70%" stopColor="#3b1b7a" stopOpacity={0.08} />
              <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
            </linearGradient>
          </defs>

          {activeLabel ? (
            <ReferenceLine
              x={activeLabel}
              stroke="#CBD5E1"
              strokeOpacity={0.7}
              strokeDasharray="3 3"
            />
          ) : null}

          <Area
            type="monotone"
            dataKey="returnPct"
            stroke="transparent"
            fill={`url(#${gradientId})`}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="returnPct"
            stroke={chartConfig.returnPct.color}
            strokeWidth={2}
            dot={renderLastDot}
            activeDot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};

const OpenStrategiesPage = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState("Strategies");
  const series = [
    { label: "Jan", returnPct: 1.2 },
    { label: "Feb", returnPct: 2.0 },
    { label: "Mar", returnPct: 3.1 },
    { label: "Apr", returnPct: 4.5 },
    { label: "May", returnPct: 5.9 },
    { label: "Jun", returnPct: 7.1 },
    { label: "Jul", returnPct: 8.2 },
    { label: "Aug", returnPct: 9.1 },
    { label: "Sep", returnPct: 10.4 },
    { label: "Oct", returnPct: 11.2 },
    { label: "Nov", returnPct: 11.9 },
    { label: "Dec", returnPct: 12.4 },
  ];
  const [returnValue, setReturnValue] = useState(series[series.length - 1]?.returnPct ?? 5.5);
  const allTimeReturn = series[series.length - 1]?.returnPct ?? 12.4;
  const formattedReturn = `${returnValue >= 0 ? "+" : ""}${returnValue.toFixed(2)}%`;
  const formattedAllTimeReturn = `${allTimeReturn >= 0 ? "+" : ""}${allTimeReturn.toFixed(2)}%`;

  return (
    <div className="min-h-screen bg-slate-50 pb-[env(safe-area-inset-bottom)] text-slate-900">
      <div className="mx-auto flex w-full max-w-sm flex-col px-3 pb-10 pt-12 md:max-w-md md:px-6">
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
          </div>
          <div className="h-10 w-10" />
        </header>

        <section className="mt-6 rounded-[28px] border border-slate-100 bg-white p-5 shadow-[0_18px_40px_rgba(79,70,229,0.08)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-white shadow-sm ring-1 ring-slate-100">
                <img
                  src="https://s3-symbol-logo.tradingview.com/country/ZA--big.svg"
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
                All time gain {formattedAllTimeReturn}
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

          <div className="mt-3 grid grid-cols-3 items-center text-[11px] font-semibold text-slate-400">
            <span className="text-left">Max DD: 6.2%</span>
            <span className="text-center">Volatility: Low</span>
            <span className="text-right">Fees: 20%</span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {["Balanced", "Low risk", "Automated"].map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600"
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-3">
            <div className="flex -space-x-2">
              {holdingsSnapshot.map((company) => (
                <div
                  key={company.name}
                  className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-white bg-white shadow-sm"
                >
                  <img
                    src={company.src}
                    alt={company.name}
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
              <div className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-[10px] font-semibold text-slate-500">
                +3
              </div>
            </div>
            <span className="text-xs font-semibold text-slate-500">Holdings snapshot</span>
          </div>
        </section>

        <button
          type="button"
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#111111] via-[#3b1b7a] to-[#5b21b6] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-200/70"
        >
          View factsheet
          <ChevronRight className="h-4 w-4" />
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
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-900">{strategy.name}</p>
                  <div>
                    <p className="text-xs font-semibold text-emerald-500">+{strategy.returnRate}</p>
                    <p className="text-[11px] text-slate-400">{strategy.minimum}</p>
                  </div>
                </div>
                <div className="flex items-center rounded-xl bg-slate-50 px-2">
                  <StrategyMiniChart values={strategy.sparkline} />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {strategy.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="mt-3 flex items-center gap-3">
                <div className="flex -space-x-2">
                  {holdingsSnapshot.map((company) => (
                    <div
                      key={`${strategy.name}-${company.name}`}
                      className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-white bg-white shadow-sm"
                    >
                      <img
                        src={company.src}
                        alt={company.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ))}
                  <div className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-[10px] font-semibold text-slate-500">
                    +3
                  </div>
                </div>
                <span className="text-xs font-semibold text-slate-500">Holdings snapshot</span>
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
};

export default OpenStrategiesPage;
