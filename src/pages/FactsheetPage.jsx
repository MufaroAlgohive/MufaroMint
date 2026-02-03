import React, { useMemo, useState, useRef, useEffect } from "react";
import { ArrowLeft, X, Info, Heart } from "lucide-react";
import { supabase } from "../lib/supabase";
import { formatChangePct, getChangeColor } from "../lib/strategyData.js";
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

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const FactsheetPage = ({ onBack, strategy, onOpenInvest }) => {
  const [timeframe, setTimeframe] = useState("1M");
  const [activeLabel, setActiveLabel] = useState(null);
  const [selectedMetricModal, setSelectedMetricModal] = useState(null);
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [holdingsSecurities, setHoldingsSecurities] = useState([]);
  const [strategyData, setStrategyData] = useState(strategy);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState(null);
  const marqueeRef = useRef(null);

  const strategyId = strategy?.id || strategy?.strategy_id || strategyData?.id || null;
  const strategySlug = strategy?.slug || strategyData?.slug || null;

  const formatPercent = (value) => {
    if (value == null || Number.isNaN(value)) return "N/A";
    return `${(Number(value) * 100).toFixed(2)}%`;
  };

  const analyticsTimestamp = analytics?.computed_at || analytics?.as_of_date || null;
  const analyticsUnavailable = !analytics || analytics?.error || analyticsError;
  const analyticsMessage = analytics?.error || analyticsError
    ? "Analytics unavailable. Data is being updated."
    : "Analytics not available yet.";
  const lastUpdatedLabel = analyticsTimestamp
    ? new Date(analyticsTimestamp).toLocaleString()
    : strategyData?.as_of_date
      ? new Date(strategyData.as_of_date).toLocaleString()
      : strategy?.as_of_date
        ? new Date(strategy.as_of_date).toLocaleString()
        : "";

  // Fetch strategy metadata + analytics
  useEffect(() => {
    let isMounted = true;

    const fetchStrategyData = async () => {
      try {
        if (!supabase) {
          if (isMounted) {
            setAnalyticsError("Database not connected");
            setLoading(false);
            setAnalyticsLoading(false);
          }
          return;
        }

        setLoading(true);
        setAnalyticsLoading(true);
        setAnalyticsError(null);

        let resolvedStrategy = strategyData || strategy;
        let resolvedId = strategyId;

        if (!resolvedId && strategySlug) {
          const { data, error } = await supabase
            .from("strategies")
            .select("id, slug, name, short_name, description, risk_level, sector, tags, base_currency, icon_url, image_url, holdings")
            .eq("slug", strategySlug)
            .maybeSingle();

          if (error) throw error;
          if (data) {
            resolvedStrategy = data;
            resolvedId = data.id;
            if (isMounted) {
              setStrategyData(data);
            }
          }
        }

        if (resolvedId) {
          const { data, error } = await supabase
            .from("strategies")
            .select("id, slug, name, short_name, description, risk_level, sector, tags, base_currency, icon_url, image_url, holdings")
            .eq("id", resolvedId)
            .maybeSingle();

          if (error) throw error;
          if (data && isMounted) {
            resolvedStrategy = data;
            setStrategyData(data);
          }

          const { data: analyticsRow, error: analyticsFetchError } = await supabase
            .from("strategy_analytics")
            .select("strategy_id, as_of_date, base_currency, latest_value, ytd_return, summary, curves, calendar_returns, computed_at, error")
            .eq("strategy_id", resolvedId)
            .maybeSingle();

          if (analyticsFetchError) {
            if (isMounted) {
              setAnalytics(null);
              setAnalyticsError(analyticsFetchError.message);
            }
          } else if (isMounted) {
            setAnalytics(analyticsRow || null);
            if (analyticsRow?.error) {
              setAnalyticsError(analyticsRow.error);
            }
          }
        } else if (isMounted) {
          setAnalytics(null);
          setAnalyticsError("Strategy not found");
        }
      } catch (error) {
        console.error("Error fetching strategy data:", error);
        if (isMounted) {
          setAnalyticsError(error.message || "Unable to load analytics");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          setAnalyticsLoading(false);
        }
      }
    };

    fetchStrategyData();
    return () => {
      isMounted = false;
    };
  }, [strategyId, strategySlug]);

  const currentStrategy = strategyData || strategy || {
    name: "AlgoHive Core",
    tags: ["Balanced", "Low risk", "Automated"],
    description: "AlgoHive Core targets steady, diversified growth using an automated allocation model that adapts to changing market regimes. It aims to smooth volatility while maintaining consistent participation in upside moves, making it suitable for investors seeking a balanced, long-term portfolio anchor.",
    holdings: [],
  };

  const availableTimeframes = useMemo(() => {
    const curves = analytics?.curves || {};
    return timeframeOptions
      .map((option) => option.key)
      .filter((key) => Array.isArray(curves[key]) && curves[key].length > 0);
  }, [analytics]);

  useEffect(() => {
    if (availableTimeframes.length === 0) {
      return;
    }
    setTimeframe((prev) => {
      if (availableTimeframes.includes(prev)) return prev;
      if (availableTimeframes.includes("1M")) return "1M";
      return availableTimeframes[0];
    });
  }, [availableTimeframes]);

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

  // Generate chart data from analytics curves (index levels)
  const { data, yDomain, baseIndexValue } = useMemo(() => {
    const curves = analytics?.curves || {};
    const series = Array.isArray(curves[timeframe]) ? curves[timeframe] : [];
    const labelIndices = series.length ? [0, Math.floor(series.length / 2), series.length - 1] : [];
    const values = series.map((point) => point?.v ?? 0);
    const minValue = values.length ? Math.min(...values) : 0;
    const maxValue = values.length ? Math.max(...values) : 0;
    const padding = (maxValue - minValue) * 0.2;
    const domain = values.length
      ? [minValue - padding, maxValue + padding]
      : [0, 0];

    const mapped = series.map((point, index) => {
      const date = point?.d ? new Date(point.d) : null;
      const dateLabel = labelIndices.includes(index) && date
        ? date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : "";
      return {
        label: index + 1,
        dateLabel,
        returnPct: point?.v ?? 0,
      };
    });

    return {
      data: mapped,
      yDomain: domain,
      baseIndexValue: values.length ? values[0] : null,
    };
  }, [analytics, timeframe]);

  const lastIndex = data.length - 1;
  const lastValue = data[lastIndex]?.returnPct ?? null;
  const firstValue = baseIndexValue;
  const periodReturn = data.length > 1 && firstValue
    ? ((lastValue - firstValue) / firstValue) * 100
    : null;
  const formattedReturn = periodReturn != null
    ? `${periodReturn >= 0 ? "+" : ""}${periodReturn.toFixed(2)}%`
    : "—";
  const allTimeReturn = analytics?.latest_value != null
    ? (Number(analytics.latest_value) / 100 - 1)
    : null;
  const formattedAllTimeReturn = allTimeReturn != null
    ? `${allTimeReturn >= 0 ? "+" : ""}${(allTimeReturn * 100).toFixed(2)}%`
    : "—";
  const returnTextClass = periodReturn > 0
    ? "text-emerald-600"
    : periodReturn < 0
      ? "text-rose-600"
      : "text-slate-500";
  const allTimeTextClass = allTimeReturn > 0
    ? "text-emerald-600"
    : allTimeReturn < 0
      ? "text-rose-600"
      : "text-slate-500";
  const chartLineColor = periodReturn > 0
    ? "#16a34a"
    : periodReturn < 0
      ? "#dc2626"
      : "#94a3b8";
    
  // Get current metrics

  // Calculate cumulative returns for calendar
  const calendarData = useMemo(() => {
    const returns = Array.isArray(analytics?.calendar_returns) ? analytics.calendar_returns : [];
    return returns.reduce((acc, entry) => {
      if (!entry?.month) return acc;
      const [year, month] = entry.month.split("-");
      if (!acc[year]) acc[year] = {};
      acc[year][month] = entry.return;
      return acc;
    }, {});
  }, [analytics]);

  const availableCalendarYears = useMemo(
    () => Object.keys(calendarData).sort(),
    [calendarData],
  );

  useEffect(() => {
    if (!availableCalendarYears.length) return;
    const latestYear = Number(availableCalendarYears[availableCalendarYears.length - 1]);
    setCalendarYear((prev) => (availableCalendarYears.includes(String(prev)) ? prev : latestYear));
  }, [availableCalendarYears]);

  const holdingsWithMetrics = useMemo(() => {
    if (!currentStrategy.holdings || currentStrategy.holdings.length === 0) return [];
    const totalWeight = currentStrategy.holdings.reduce(
      (sum, holding) => sum + (Number(holding.weight) || 0),
      0,
    );
    return currentStrategy.holdings.map((holding) => {
      const symbol = holding.ticker || holding.symbol || holding;
      const security = holdingsSecurities.find((s) => s.symbol === symbol);
      const metrics = Array.isArray(security?.security_metrics)
        ? security.security_metrics[0]
        : security?.security_metrics;
      const rawWeight = Number(holding.weight) || 0;
      const weightNorm = totalWeight > 0 ? rawWeight / totalWeight : null;
      return {
        symbol,
        name: holding.name || security?.name || symbol,
        weight: rawWeight,
        weightNorm,
        logoUrl: security?.logo_url,
        dailyChange: metrics?.r_1d ?? null,
      };
    });
  }, [currentStrategy.holdings, holdingsSecurities]);

  const performanceSummary = useMemo(() => {
    const summary = analytics?.summary || {};
    return [
      {
        label: "Best Day",
        value: formatPercent(summary.best_day),
        description: "The highest daily return this strategy has achieved.",
      },
      {
        label: "Worst Day",
        value: formatPercent(summary.worst_day),
        description: "The lowest daily return (most negative) this strategy has experienced.",
      },
      {
        label: "Avg Daily Return",
        value: formatPercent(summary.avg_day),
        description: "The average daily percentage change across all trading days.",
      },
      {
        label: "YTD Return",
        value: formatPercent(summary.ytd_return ?? analytics?.ytd_return),
        description: "Year-to-date return for the strategy.",
      },
    ];
  }, [analytics]);

  // Auto-scroll removed to allow manual scrolling.

  const getReturnColor = (value) => {
    if (value == null) return "bg-slate-50 text-slate-600";
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
            <div className="flex items-baseline gap-3">
              <p className={`text-3xl font-semibold ${returnTextClass}`}>{formattedReturn}</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>{timeframe} return</span>
              <span>•</span>
              <span className={returnTextClass}>{formattedReturn}</span>
            </div>
            <p className="text-xs text-slate-500">
              {lastUpdatedLabel ? `Last updated ${lastUpdatedLabel}` : ""}
            </p>
          </div>

          <div className="mt-4 h-48 w-full">
            {analyticsUnavailable || data.length === 0 ? (
              <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
                <div className="text-center">
                  <p className="text-sm text-slate-500">{analyticsMessage}</p>
                  {analyticsTimestamp ? (
                    <p className="mt-1 text-xs text-slate-400">
                      As of {new Date(analyticsTimestamp).toLocaleString()}
                    </p>
                  ) : null}
                </div>
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
                      <stop offset="0%" stopColor={chartLineColor} stopOpacity={0.25} />
                      <stop offset="70%" stopColor={chartLineColor} stopOpacity={0.1} />
                      <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <ReferenceLine y={100} stroke="#e2e8f0" strokeDasharray="3 3" />
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
                        formatter={(value) => {
                          if (!baseIndexValue) {
                            return [`${Number(value).toFixed(2)}`, "Index"];
                          }
                          const delta = ((Number(value) - baseIndexValue) / baseIndexValue) * 100;
                          return [`${delta >= 0 ? "+" : ""}${delta.toFixed(2)}%`, "Change"];
                        }}
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
                  <YAxis hide domain={yDomain} />
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
                    stroke={chartLineColor}
                    strokeWidth={2}
                    dot={false}
                    activeDot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {timeframeOptions.map((option) => {
              const isDisabled = !availableTimeframes.includes(option.key);
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setTimeframe(option.key)}
                  disabled={isDisabled}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    timeframe === option.key
                      ? "bg-slate-900 text-white"
                      : "border border-slate-200 bg-white text-slate-600"
                  } ${isDisabled ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  {option.label}
                </button>
              );
            })}
            <span
              className={`rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold ${allTimeTextClass}`}
            >
              All-time {formattedAllTimeReturn}
            </span>
          </div>

          <div className="mt-4 flex items-center gap-3 text-[11px] font-semibold text-slate-400">
            {(currentStrategy.tags || []).map((tag) => (
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
            {analyticsTimestamp ? (
              <p className="text-xs text-slate-500">Updated {new Date(analyticsTimestamp).toLocaleDateString()}</p>
            ) : null}
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
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Performance Summary</h2>
            {analyticsTimestamp ? (
              <p className="text-xs text-slate-500">As of {new Date(analyticsTimestamp).toLocaleDateString()}</p>
            ) : null}
          </div>
          {analyticsUnavailable ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">
              {analyticsMessage}
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3">
              {performanceSummary.map((metric) => (
                <button
                  key={metric.label}
                  type="button"
                  onClick={() => setSelectedMetricModal(metric)}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-left"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-500">{metric.label}</p>
                    <Info className="h-3 w-3 text-slate-400" />
                  </div>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{metric.value}</p>
                </button>
              ))}
            </div>
          )}
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
            {holdingsWithMetrics.length > 0 ? (
              holdingsWithMetrics.map((holding, index) => {
                const displayWeight = holding.weightNorm != null
                  ? holding.weightNorm * 100
                  : holding.weight;
                return (
                  <div key={holding.symbol || index} className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                      {holding.logoUrl ? (
                        <img
                          src={holding.logoUrl}
                          alt={holding.name || holding.symbol}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-xs font-semibold text-slate-400">{holding.symbol ? holding.symbol.slice(0, 2) : "—"}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-900">{holding.symbol || "—"}</p>
                      <p className="text-[11px] text-slate-500 truncate">{holding.name || holding.symbol || "—"}</p>
                    </div>
                    <p className="text-xs font-semibold text-slate-900">{Number(displayWeight || 0).toFixed(2)}%</p>
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">
                Data unavailable
              </div>
            )}
          </div>
        </section>

        {/* Calendar Returns */}
        <section className="mt-6 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 className="text-sm font-semibold text-slate-900">Calendar Returns</h2>
            {availableCalendarYears.length > 1 ? (
              <div className="flex flex-wrap gap-2">
                {availableCalendarYears.map((year) => (
                  <button
                    key={year}
                    type="button"
                    onClick={() => setCalendarYear(Number(year))}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      Number(year) === Number(calendarYear)
                        ? "bg-slate-900 text-white"
                        : "border border-slate-200 bg-white text-slate-600"
                    }`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          {analyticsUnavailable || !availableCalendarYears.length ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">
              {analyticsMessage}
            </div>
          ) : (
            <div>
              <p className="mb-2 text-xs font-semibold text-slate-500">{calendarYear}</p>
              <div className="grid grid-cols-3 gap-3">
                {monthNames.map((label, index) => {
                  const monthKey = String(index + 1).padStart(2, "0");
                  const value = calendarData[String(calendarYear)]?.[monthKey];
                  return (
                    <div
                      key={`${calendarYear}-${label}`}
                      className={`rounded-2xl px-3 py-3 text-center text-xs font-semibold ${getReturnColor(value)}`}
                    >
                      <p className="text-[11px] font-semibold text-slate-600">{label}</p>
                      <p className="mt-1 text-sm text-slate-900">
                        {value == null ? "—" : `${(Number(value) * 100).toFixed(2)}%`}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
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
