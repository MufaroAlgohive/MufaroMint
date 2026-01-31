import React, { useMemo, useState, useRef, useEffect } from "react";
import { ArrowLeft, X, Info, Heart, TrendingUp, TrendingDown } from "lucide-react";
import { supabase } from "../lib/supabase";
import { getStrategyById, getStrategyPriceHistory, formatChangePct, formatChangeAbs, getChangeColor } from "../lib/strategyData.js";
import { formatCurrency } from "../lib/formatCurrency";
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
  { key: "1W", label: "1W", points: 28 },
  { key: "1M", label: "1M", points: 120 },
  { key: "3M", label: "3M", points: 240 },
  { key: "6M", label: "6M", points: 480 },
  { key: "YTD", label: "YTD", points: 360 },
];

const buildSeries = (points, base = 2.4, timeframe = "6M") => {
  const now = new Date();
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  
  return Array.from({ length: points }, (_, index) => {
    const drift = (index / points) * 3.2;
    const wave = Math.sin(index / 7) * 0.6 + Math.cos(index / 11) * 0.4;
    const value = base + drift + wave;

    let dateLabel = "";
    let showLabel = false;

    // Calculate which indices should show labels (max 3 labels)
    const labelIndices = [0, Math.floor(points / 2), points - 1];

    if (timeframe === "1W") {
      const date = new Date(now);
      date.setDate(date.getDate() - (points - index - 1));
      if (labelIndices.includes(index)) {
        dateLabel = `${dayNames[date.getDay()]} ${date.getDate()}`;
        showLabel = true;
      }
    } else if (timeframe === "1M") {
      const date = new Date(now);
      date.setDate(date.getDate() - (points - index - 1));
      if (labelIndices.includes(index)) {
        dateLabel = `${date.getDate()}`;
        showLabel = true;
      }
    } else {
      // For 3M, 6M, YTD - show month abbreviations at key points
      const monthIndex = Math.floor((index / points) * 12);
      if (labelIndices.includes(index)) {
        dateLabel = monthNames[monthIndex % 12];
        showLabel = true;
      }
    }

    return {
      label: index + 1,
      dateLabel: showLabel ? dateLabel : "",
      returnPct: Number(value.toFixed(2)),
    };
  });
};

const holdings = [];

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

const FactsheetPage = ({ onBack, strategy, onOpenInvest }) => {
  const [timeframe, setTimeframe] = useState("6M");
  const [activeLabel, setActiveLabel] = useState(null);
  const [selectedMetricModal, setSelectedMetricModal] = useState(null);
  const [calendarYear, setCalendarYear] = useState(2025);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [holdingsSecurities, setHoldingsSecurities] = useState([]);
  const [strategyData, setStrategyData] = useState(strategy);
  const [priceHistory, setPriceHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const marqueeRef = useRef(null);

  // Fetch updated strategy data with metrics if we have an ID
  useEffect(() => {
    const fetchStrategyData = async () => {
      if (!strategy?.id) {
        setLoading(false);
        return;
      }
      
      try {
        const updatedStrategy = await getStrategyById(strategy.id);
        if (updatedStrategy) {
          console.log("📊 Updated strategy data:", updatedStrategy);
          setStrategyData(updatedStrategy);
        }
      } catch (error) {
        console.error("Error fetching strategy data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStrategyData();
  }, [strategy?.id]);

  // Fetch price history when timeframe changes
  useEffect(() => {
    const fetchPriceHistory = async () => {
      if (!strategy?.id) return;
      
      setLoading(true);
      try {
        const prices = await getStrategyPriceHistory(strategy.id, timeframe);
        setPriceHistory(prices);
      } catch (error) {
        console.error("Error fetching price history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPriceHistory();
  }, [strategy?.id, timeframe]);

  const currentStrategy = strategyData || strategy || {
    name: "AlgoHive Core",
    tags: ["Balanced", "Low risk", "Automated"],
    description: "AlgoHive Core targets steady, diversified growth using an automated allocation model that adapts to changing market regimes. It aims to smooth volatility while maintaining consistent participation in upside moves, making it suitable for investors seeking a balanced, long-term portfolio anchor.",
    holdings: [],
  };

  // Fetch securities for strategy holdings with logos
  useEffect(() => {
    let isMounted = true;

    const fetchHoldingsSecurities = async () => {
      if (!supabase || !currentStrategy.holdings || currentStrategy.holdings.length === 0) return;

      try {
        const tickers = currentStrategy.holdings.map((h) => h.ticker || h.symbol || h);

        const { data, error } = await supabase
          .from("securities")
          .select("symbol, name, logo_url, security_metrics(r_1d)")
          .in("symbol", tickers);

        if (error) throw error;
        if (isMounted && data) {
          setHoldingsSecurities(data);
        }
      } catch (error) {
        console.error("Error fetching holdings securities:", error);
      }
    };

    fetchHoldingsSecurities();

    return () => {
      isMounted = false;
    };
  }, [currentStrategy]);

  // Generate chart data from price history
  const data = useMemo(() => {
    if (priceHistory.length > 0) {
      // Convert strategy_prices to chart format
      return priceHistory.map((p, index) => ({
        label: index + 1,
        dateLabel: new Date(p.ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        returnPct: p.nav || 0,
      }));
    }
    return [];
  }, [priceHistory, timeframe]);

  const lastIndex = data.length - 1;
  const lastValue = data[lastIndex]?.returnPct ?? 0;
  const firstValue = data[0]?.returnPct ?? 0;
  const periodReturn = priceHistory.length > 0 
    ? ((lastValue - firstValue) / firstValue) * 100 
    : lastValue;
  const formattedReturn = priceHistory.length > 0
    ? `${periodReturn >= 0 ? "+" : ""}${periodReturn.toFixed(2)}%`
    : "Data unavailable";
    
  // Get current metrics
  const currentPrice = currentStrategy.last_close;
  const changePct = currentStrategy.change_pct;
  const changeAbs = currentStrategy.change_abs;
  const isPositive = changePct != null && changePct >= 0;

  // Calculate cumulative returns for calendar
  const calendarData = useMemo(() => {
    return [];
  }, [calendarYear]);

  const holdingsWithMetrics = useMemo(() => {
    if (!currentStrategy.holdings || currentStrategy.holdings.length === 0) return [];
    return currentStrategy.holdings.map((holding) => {
      const symbol = holding.ticker || holding.symbol || holding;
      const security = holdingsSecurities.find((s) => s.symbol === symbol);
      const metrics = Array.isArray(security?.security_metrics)
        ? security.security_metrics[0]
        : security?.security_metrics;
      return {
        symbol,
        name: holding.name || security?.name || symbol,
        weight: holding.weight ?? 0,
        logoUrl: security?.logo_url,
        dailyChange: metrics?.r_1d ?? null,
      };
    });
  }, [currentStrategy.holdings, holdingsSecurities]);

  // Auto-scroll marquee only
  useEffect(() => {
    const marquee = marqueeRef.current;
    if (!marquee) return;

    const scroll = () => {
      marquee.scrollLeft += 2;
      if (marquee.scrollLeft >= marquee.scrollWidth - marquee.clientWidth) {
        marquee.scrollLeft = 0;
      }
    };

    const interval = setInterval(scroll, 30);
    return () => clearInterval(interval);
  }, []);

  const getReturnColor = (value) => {
    if (value > 0) return "bg-emerald-50 text-emerald-600";
    if (value < 0) return "bg-rose-50 text-rose-600";
    return "bg-slate-50 text-slate-600";
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex w-full max-w-sm flex-col px-3 pb-32 pt-12 md:max-w-md md:px-6">
        <header className="flex items-center justify-center gap-3 mb-6 relative">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="absolute left-0 flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm flex-shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold">{currentStrategy.name}</h1>
          <button
            type="button"
            onClick={() => setIsInWatchlist(!isInWatchlist)}
            aria-label="Add to watchlist"
            className="absolute right-0 flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm flex-shrink-0"
          >
            <Heart className={`h-5 w-5 ${isInWatchlist ? "fill-current text-rose-600" : ""}`} />
          </button>
        </header>

        <section className="mt-6 rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_16px_32px_rgba(15,23,42,0.08)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-slate-900">{currentStrategy.name}</h2>
              </div>
              <p className="text-xs font-semibold text-slate-400">
                {currentStrategy.risk_level || 'Balanced'} • Automated
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-1">
            {currentPrice != null ? (
              <>
                <div className="flex items-baseline gap-3">
                  <p className="text-3xl font-semibold text-slate-900">
                    {formatCurrency(currentPrice, currentStrategy.currency || 'R')}
                  </p>
                  {changePct != null && (
                    <div className={`flex items-center gap-1 text-sm font-semibold ${getChangeColor(changePct)}`}>
                      {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                      <span>{formatChangePct(changePct)}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>Today {changeAbs != null ? formatChangeAbs(changeAbs) : ''}</span>
                  <span>•</span>
                  <span>{timeframe} {formattedReturn}</span>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <p className="text-3xl font-semibold text-slate-900">{formattedReturn}</p>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-600">
                  {timeframe} return
                </span>
              </div>
            )}
            <p className="text-xs text-slate-500">
              Last updated {currentStrategy.as_of_date ? new Date(currentStrategy.as_of_date).toLocaleString() : '2h ago'}
            </p>
          </div>

          <div className="mt-4 h-48 w-full">
            {data.length === 0 ? (
              <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
                Data unavailable
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={data}
                  margin={{ top: 12, right: 16, left: 8, bottom: 28 }}
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
                          backgroundColor: "#ffffff",
                          border: "none",
                          borderRadius: "20px",
                          padding: "3px 8px",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                        }}
                        labelStyle={{ display: "none" }}
                        formatter={(value) => [`${value.toFixed(2)}%`, "Return"]}
                        cursor={{ strokeDasharray: "3 3" }}
                      />
                    </>
                  ) : null}
                  <XAxis
                    dataKey="dateLabel"
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    axisLine={{ stroke: "#e2e8f0" }}
                    tickLine={false}
                    height={24}
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
            )}
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
            {currentStrategy.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600"
              >
                {tag}
              </span>
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
            >
              {holdingsWithMetrics.length > 0 ? (
                holdingsWithMetrics.map((holding) => (
                  <div
                    key={holding.symbol}
                    className="flex-shrink-0 w-48 rounded-2xl border border-slate-100 bg-slate-50 p-4 snap-center"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white">
                        {holding.logoUrl ? (
                          <img
                            src={holding.logoUrl}
                            alt={holding.symbol}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-[10px] font-semibold text-slate-500">
                            {holding.symbol?.slice(0, 2)}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-900">{holding.symbol}</p>
                        <p className="text-[10px] text-slate-500">{holding.name}</p>
                      </div>
                    </div>
                    <div className="mt-3 space-y-1">
                      {holding.dailyChange != null ? (
                        <p className={`text-sm font-semibold ${holding.dailyChange > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                          {holding.dailyChange > 0 ? "+" : ""}{Number(holding.dailyChange).toFixed(2)}%
                        </p>
                      ) : (
                        <p className="text-sm font-semibold text-slate-400">Data unavailable</p>
                      )}
                      <p className="text-xs text-slate-600">{Number(holding.weight || 0).toFixed(2)}% weight</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex h-32 w-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
                  Data unavailable
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Performance Summary */}
        <section className="mt-6 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Performance Summary</h2>
          <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">
            Data unavailable
          </div>
        </section>

        {/* Period Returns */}
        {(currentStrategy.r_1w != null || currentStrategy.r_1m != null || currentStrategy.r_3m != null || 
          currentStrategy.r_6m != null || currentStrategy.r_ytd != null || currentStrategy.r_1y != null) && (
          <section className="mt-6 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Performance Returns</h2>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {currentStrategy.r_1w != null && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-center">
                  <p className="text-xs font-semibold text-slate-600">1W</p>
                  <p className={`mt-1 text-sm font-semibold ${getChangeColor(currentStrategy.r_1w)}`}>
                    {formatChangePct(currentStrategy.r_1w)}
                  </p>
                </div>
              )}
              {currentStrategy.r_1m != null && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-center">
                  <p className="text-xs font-semibold text-slate-600">1M</p>
                  <p className={`mt-1 text-sm font-semibold ${getChangeColor(currentStrategy.r_1m)}`}>
                    {formatChangePct(currentStrategy.r_1m)}
                  </p>
                </div>
              )}
              {currentStrategy.r_3m != null && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-center">
                  <p className="text-xs font-semibold text-slate-600">3M</p>
                  <p className={`mt-1 text-sm font-semibold ${getChangeColor(currentStrategy.r_3m)}`}>
                    {formatChangePct(currentStrategy.r_3m)}
                  </p>
                </div>
              )}
              {currentStrategy.r_6m != null && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-center">
                  <p className="text-xs font-semibold text-slate-600">6M</p>
                  <p className={`mt-1 text-sm font-semibold ${getChangeColor(currentStrategy.r_6m)}`}>
                    {formatChangePct(currentStrategy.r_6m)}
                  </p>
                </div>
              )}
              {currentStrategy.r_ytd != null && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-center">
                  <p className="text-xs font-semibold text-slate-600">YTD</p>
                  <p className={`mt-1 text-sm font-semibold ${getChangeColor(currentStrategy.r_ytd)}`}>
                    {formatChangePct(currentStrategy.r_ytd)}
                  </p>
                </div>
              )}
              {currentStrategy.r_1y != null && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-center">
                  <p className="text-xs font-semibold text-slate-600">1Y</p>
                  <p className={`mt-1 text-sm font-semibold ${getChangeColor(currentStrategy.r_1y)}`}>
                    {formatChangePct(currentStrategy.r_1y)}
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Strategy Description */}
        <section className="mt-6 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Strategy Description</h2>
          <p className="mt-3 text-sm text-slate-600">
            {currentStrategy.description}
          </p>
        </section>

        {/* Holdings */}
        <section className="mt-6 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Portfolio Holdings</h2>
          <p className="mt-1 text-xs text-slate-500">Top 10 by weight</p>
          <div className="mt-4 space-y-3">
            {currentStrategy.holdings && currentStrategy.holdings.length > 0 ? (
              currentStrategy.holdings.map((holding) => {
                const security = holdingsSecurities.find((s) => s.symbol === holding.ticker);
                return (
                  <div key={holding.ticker} className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                      {security?.logo_url ? (
                        <img
                          src={security.logo_url}
                          alt={security.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-xs font-semibold text-slate-400">{holding.ticker.slice(0, 2)}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-900">{holding.ticker}</p>
                      <p className="text-[11px] text-slate-500 truncate">{security?.name || holding.ticker}</p>
                    </div>
                    <p className="text-xs font-semibold text-slate-900">{holding.weight.toFixed(2)}%</p>
                  </div>
                );
              })
            ) : (
              holdings.map((holding) => (
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
              ))
            )}
          </div>
        </section>

        {/* Calendar Returns */}
        <section className="mt-6 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 className="text-sm font-semibold text-slate-900">Calendar Returns</h2>
          </div>
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">
            Data unavailable
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
          onClick={() => onOpenInvest?.(currentStrategy)}
          className="w-full rounded-2xl bg-gradient-to-r from-[#111111] via-[#3b1b7a] to-[#5b21b6] py-3 text-sm font-semibold text-white shadow-lg shadow-violet-200/60"
        >
          Invest in {currentStrategy.name}
        </button>
      </div>
    </div>
  );
};

export default FactsheetPage;
