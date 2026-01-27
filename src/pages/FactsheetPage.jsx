import React, { useMemo, useState, useRef, useEffect } from "react";
import { ArrowLeft, X, Info } from "lucide-react";
import {
  Area,
  Line,
  ComposedChart,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

const timeframeOptions = [
  { key: "1W", label: "1W", points: 7 },
  { key: "1M", label: "1M", points: 30 },
  { key: "3M", label: "3M", points: 90 },
  { key: "6M", label: "6M", points: 180 },
  { key: "YTD", label: "YTD", points: 120 },
];

const buildSeries = (points, base = 2.4, timeframe = "6M") => {
  const now = new Date();
  return Array.from({ length: points }, (_, index) => {
    const drift = (index / points) * 3.2;
    const wave = Math.sin(index / 7) * 0.6 + Math.cos(index / 11) * 0.4;
    const value = base + drift + wave;

    let dateLabel = "";
    if (timeframe === "1W") {
      const date = new Date(now);
      date.setDate(date.getDate() - (points - index - 1));
      dateLabel = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()];
    } else if (timeframe === "1M") {
      dateLabel = `${index + 1}`;
    } else if (timeframe === "3M" || timeframe === "6M") {
      dateLabel = index % 15 === 0 ? monthNames[Math.floor((index / points) * 12) % 12] : "";
    } else if (timeframe === "YTD") {
      dateLabel = index % 10 === 0 ? monthNames[Math.floor((index / points) * 12) % 12] : "";
    }

    return {
      label: index + 1,
      dateLabel,
      returnPct: Number(value.toFixed(2)),
    };
  });
};

const holdings = [
  { name: "Apple", ticker: "AAPL", weight: 27.3, dailyChange: 1.62 },
  { name: "Microsoft", ticker: "MSFT", weight: 27.3, dailyChange: 1.09 },
  { name: "Visa", ticker: "V", weight: 18.2, dailyChange: 0.37 },
  { name: "Johnson & Johnson", ticker: "JNJ", weight: 18.2, dailyChange: 0.85 },
  { name: "Berkshire Hathaway", ticker: "BRK.B", weight: 9.09, dailyChange: 1.02 },
];

const monthlyReturns = {
  2023: [2.1, 4.8, 5.0, -1.2, 5.9, 1.1, -2.1, -4.7, 2.0, 5.5, 1.3, 26.8],
  2024: [1.5, 2.3, -1.2, -6.3, 0.3, 2.7, 1.2, 2.8, -2.0, -1.8, 5.1, 1.4, 6.4],
  2025: [3.2, 6.2, 1.1, 7.6, 1.5, 0.7, 0.1, 0.0, 2.4, -0.8, 2.2, 0.7, 24.8],
  2026: [0.5],
};

const performanceMetrics = [
  {
    label: "Best Day",
    value: "+10.19%",
    description: "The highest daily return this strategy has achieved.",
  },
  {
    label: "Worst Day",
    value: "-4.49%",
    description: "The lowest daily return (most negative) this strategy has experienced.",
  },
  {
    label: "Avg Daily Return",
    value: "+0.07%",
    description: "The average daily percentage change across all trading days.",
  },
  {
    label: "Positive Days",
    value: "54%",
    description: "Percentage of trading days that ended with positive returns.",
  },
];

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const FactsheetPage = ({ onBack }) => {
  const [timeframe, setTimeframe] = useState("6M");
  const [activeLabel, setActiveLabel] = useState(null);
  const [selectedMetricModal, setSelectedMetricModal] = useState(null);
  const [calendarYear, setCalendarYear] = useState(2025);
  const marqueeRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const data = useMemo(() => {
    const selected = timeframeOptions.find((option) => option.key === timeframe);
    return buildSeries(selected?.points ?? 180, 2.4, timeframe);
  }, [timeframe]);

  const lastIndex = data.length - 1;
  const lastValue = data[lastIndex]?.returnPct ?? 0;
  const formattedReturn = `${lastValue >= 0 ? "+" : ""}${lastValue.toFixed(2)}%`;

  // Calculate cumulative returns for calendar
  const calendarData = useMemo(() => {
    const returns = monthlyReturns[calendarYear] || [];
    let cumulative = 0;
    return returns.map((ret) => {
      cumulative += ret;
      return { return: ret, cumulative: Number(cumulative.toFixed(2)) };
    });
  }, [calendarYear]);

  // Auto-scroll marquee
  useEffect(() => {
    const marquee = marqueeRef.current;
    if (!marquee) return;

    const scroll = () => {
      marquee.scrollLeft += 2;
      if (marquee.scrollLeft >= marquee.scrollWidth - marquee.clientWidth) {
        marquee.scrollLeft = 0;
      }
      updateMarqueeScroll();
    };

    const interval = setInterval(scroll, 30);
    return () => clearInterval(interval);
  }, []);

  const updateMarqueeScroll = () => {
    const marquee = marqueeRef.current;
    if (!marquee) return;
    setCanScrollLeft(marquee.scrollLeft > 0);
    setCanScrollRight(marquee.scrollLeft < marquee.scrollWidth - marquee.clientWidth - 10);
  };

  const scrollMarquee = (direction) => {
    const marquee = marqueeRef.current;
    if (!marquee) return;
    marquee.scrollBy({ left: direction === "left" ? -200 : 200, behavior: "smooth" });
    setTimeout(updateMarqueeScroll, 100);
  };

  const getReturnColor = (value) => {
    if (value > 0) return "bg-emerald-50 text-emerald-600";
    if (value < 0) return "bg-rose-50 text-rose-600";
    return "bg-slate-50 text-slate-600";
  };

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
                margin={{ top: 12, right: 16, left: 8, bottom: 24 }}
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
                  <>
                    <ReferenceLine
                      x={activeLabel}
                      stroke="#CBD5E1"
                      strokeOpacity={0.6}
                      strokeDasharray="3 3"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "1px solid #475569",
                        borderRadius: "12px",
                        padding: "8px 12px",
                      }}
                      labelStyle={{ color: "#e2e8f0" }}
                      formatter={(value) => [`${value.toFixed(2)}%`, "Return"]}
                    />
                  </>
                ) : null}
                <XAxis
                  dataKey="dateLabel"
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
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

        {/* Performance Summary */}
        <section className="mt-6 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Performance Summary</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {performanceMetrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-slate-600">{metric.label}</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{metric.value}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedMetricModal(metric)}
                    className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-[#5b21b6] to-[#7c3aed] text-white"
                  >
                    <Info className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Strategy Description */}
        <section className="mt-6 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Strategy Description</h2>
          <p className="mt-3 text-sm text-slate-600">
            AlgoHive Core targets steady, diversified growth using an automated allocation model
            that adapts to changing market regimes. It aims to smooth volatility while maintaining
            consistent participation in upside moves, making it suitable for investors seeking a
            balanced, long-term portfolio anchor.
          </p>
        </section>

        {/* Holdings */}
        <section className="mt-6 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Portfolio Holdings</h2>
          <p className="mt-1 text-xs text-slate-500">Top 10 by weight</p>
          <div className="mt-4 space-y-3">
            {holdings.map((holding) => (
              <div key={holding.ticker} className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                  <img
                    src={`https://s3-symbol-logo.tradingview.com/${holding.ticker.toLowerCase()}--big.svg`}
                    alt={holding.ticker}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.target.src = `https://via.placeholder.com/32?text=${holding.ticker}`;
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-900">{holding.ticker}</p>
                  <p className="text-[11px] text-slate-500 truncate">{holding.name}</p>
                </div>
                <p className="text-xs font-semibold text-slate-900">{holding.weight.toFixed(2)}%</p>
              </div>
            ))}
          </div>
        </section>

        {/* Calendar Returns */}
        <section className="mt-6 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Calendar Returns</h2>
            <select
              value={calendarYear}
              onChange={(e) => setCalendarYear(Number(e.target.value))}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700"
            >
              {Object.keys(monthlyReturns).map((year) => (
                <option key={year} value={Number(year)}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-4 space-y-2">
            {calendarData.map((data, index) => (
              <div key={index} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                <div>
                  <p className="text-xs font-semibold text-slate-600">{monthNames[index]}</p>
                  <p className={`text-xs font-semibold ${data.return > 0 ? "text-emerald-600" : data.return < 0 ? "text-rose-600" : "text-slate-600"}`}>
                    {data.return > 0 ? "+" : ""}{data.return.toFixed(2)}%
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">YTD</p>
                  <p className="text-xs font-semibold text-slate-900">
                    {data.cumulative > 0 ? "+" : ""}{data.cumulative.toFixed(2)}%
                  </p>
                </div>
                <div className={`rounded-lg px-2 py-1 text-xs font-semibold ${getReturnColor(data.return)}`}>
                  {data.return > 0 ? "📈" : data.return < 0 ? "📉" : "➡️"}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Marquee - Daily Change */}
        <section className="mt-6 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Daily Change</h2>
            <p className="text-xs text-slate-500">Updated 27 Jan, 02:00 SAST</p>
          </div>
          <div className="relative mt-4">
            <div
              ref={marqueeRef}
              className="flex gap-3 overflow-x-auto scroll-smooth pb-2 snap-x snap-mandatory"
              style={{ scrollBehavior: "smooth", WebkitOverflowScrolling: "touch" }}
              onScroll={updateMarqueeScroll}
            >
              {holdings.map((holding) => (
                <div
                  key={holding.ticker}
                  className="flex-shrink-0 w-48 rounded-2xl border border-slate-100 bg-slate-50 p-4 snap-center"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white">
                      <img
                        src={`https://s3-symbol-logo.tradingview.com/${holding.ticker.toLowerCase()}--big.svg`}
                        alt={holding.ticker}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.target.src = `https://via.placeholder.com/32?text=${holding.ticker}`;
                        }}
                      />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-900">{holding.ticker}</p>
                      <p className="text-[10px] text-slate-500">{holding.name}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-xs text-slate-600">{holding.weight.toFixed(2)}% weight</p>
                    <p className={`text-sm font-semibold ${holding.dailyChange > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {holding.dailyChange > 0 ? "📈" : "📉"} {holding.dailyChange > 0 ? "+" : ""}{holding.dailyChange.toFixed(2)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Fees & Disclaimers */}
        <section className="mt-6 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Fees & Disclaimers</h2>
          <ul className="mt-3 space-y-2 text-xs text-slate-600">
            <li>• Management fee: 0.50% per annum</li>
            <li>• Performance fee: 20% of profits (if applicable)</li>
            <li>• Past performance does not guarantee future results</li>
            <li>• All data is for informational purposes only</li>
          </ul>
        </section>
      </div>

      {/* Metric Info Modal */}
      {selectedMetricModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-sm rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{selectedMetricModal.label}</h3>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{selectedMetricModal.value}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMetricModal(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-4 text-sm text-slate-600">{selectedMetricModal.description}</p>
            <button
              type="button"
              onClick={() => setSelectedMetricModal(null)}
              className="mt-6 w-full rounded-2xl bg-gradient-to-r from-[#5b21b6] to-[#7c3aed] py-2 text-sm font-semibold text-white"
            >
              Got it
            </button>
          </div>
        </div>
      )}

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
