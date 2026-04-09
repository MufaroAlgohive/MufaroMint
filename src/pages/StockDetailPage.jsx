import React, { useState, useEffect, useMemo } from "react";
import { ArrowLeft, TrendingUp, TrendingDown, Star, Check } from "lucide-react";
import { getSecurityBySymbol, getSecurityPrices, normalizePriceSeries } from "../lib/marketData.js";
import { supabase } from "../lib/supabase.js";
import { useProfile } from "../lib/useProfile";
import { checkOnboardingComplete } from "../lib/checkOnboardingComplete";
import { useOnboardingStatus } from "../lib/useOnboardingStatus";

const StockDetailPage = ({ security: initialSecurity, onBack, onOpenBuy, onNavigateToOnboarding }) => {
  const { onboardingComplete, loading: onboardingLoading } = useOnboardingStatus();
  const { profile } = useProfile();
  const [selectedPeriod, setSelectedPeriod] = useState("YTD");
  const [security, setSecurity] = useState(initialSecurity);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [buyChecking, setBuyChecking] = useState(false);
  const [priceHistory, setPriceHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [watchlist, setWatchlist] = useState([]);
  const [watchlistAnimating, setWatchlistAnimating] = useState(false);
  const periods = ["1W", "1M", "3M", "6M", "YTD", "1Y"];

  useEffect(() => {
    if (profile?.watchlist && Array.isArray(profile.watchlist)) {
      setWatchlist(profile.watchlist);
    }
  }, [profile]);

  const isWatched = useMemo(() => {
    return watchlist.includes(initialSecurity?.symbol);
  }, [watchlist, initialSecurity?.symbol]);

  const toggleWatchlist = async () => {
    if (!profile?.id || !initialSecurity?.symbol) return;

    const symbol = initialSecurity.symbol;
    const wasWatched = watchlist.includes(symbol);
    const newWatchlist = wasWatched
      ? watchlist.filter((t) => t !== symbol)
      : [...watchlist, symbol];

    setWatchlist(newWatchlist);
    setWatchlistAnimating(true);
    setTimeout(() => setWatchlistAnimating(false), 600);

    const { error } = await supabase
      .from('profiles')
      .update({ watchlist: newWatchlist })
      .eq('id', profile.id);

    if (error) {
      setWatchlist(watchlist);
      console.error("Watchlist sync failed:", error);
    }
  };

  console.log("🔍 Initial security prop:", {
    symbol: initialSecurity?.symbol,
    currentPrice: initialSecurity?.currentPrice,
    change_price: initialSecurity?.change_price,
    changePct: initialSecurity?.changePct
  });

  // Fetch updated security data with metrics
  useEffect(() => {
    const fetchSecurityData = async () => {
      if (!initialSecurity?.symbol) return;
      
      try {
        const updatedSecurity = await getSecurityBySymbol(initialSecurity.symbol);
        if (updatedSecurity) {
          console.log("📊 Updated security data:", {
            currentPrice: updatedSecurity.currentPrice,
              change_price: updatedSecurity.change_price,
            changePct: updatedSecurity.changePct
          });
          setSecurity(updatedSecurity);
        }
      } catch (error) {
        console.error("Error fetching security data:", error);
      }
    };

    fetchSecurityData();
  }, [initialSecurity?.symbol]);

  // Fetch price history when period changes
  useEffect(() => {
    const fetchPriceHistory = async () => {
      if (!security?.id) return;
      
      setLoading(true);
      try {
        const prices = await getSecurityPrices(security.id, selectedPeriod);
        setPriceHistory(prices);
      } catch (error) {
        console.error("Error fetching price history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPriceHistory();
  }, [security?.id, selectedPeriod]);

  // Always prefer fetched security data, fallback to initialSecurity for display
  const displaySecurity = security?.id ? security : initialSecurity;
  
  console.log("💰 Display data:", {
    currentPrice: displaySecurity?.currentPrice,
      change_price: displaySecurity?.change_price,
    changePct: displaySecurity?.changePct,
    hasCurrentPrice: displaySecurity?.currentPrice != null,
      hasChangePrice: displaySecurity?.change_price != null
  });
  
  const currentPrice = displaySecurity?.currentPrice != null 
    ? Number(displaySecurity.currentPrice).toFixed(2)
    : "—";
    // change_price is in cents, convert to Rands
    const priceChange = displaySecurity?.change_price != null 
      ? (displaySecurity.change_price >= 0 ? '+' : '') + (Number(displaySecurity.change_price) / 100).toFixed(2)
    : "—";
  const rawPercentChange = displaySecurity?.change_percentage != null
    ? Number(displaySecurity.change_percentage)
    : displaySecurity?.change_percent != null
      ? Number(displaySecurity.change_percent)
      : displaySecurity?.changePct != null
        ? Number(displaySecurity.changePct)
        : null;
  const percentChange = rawPercentChange != null
    ? (rawPercentChange >= 0 ? '+' : '') + rawPercentChange.toFixed(2) + '%'
    : "—";
  const isPositive = rawPercentChange != null && rawPercentChange >= 0;

  // Generate chart data from price history - filter out nulls
  const chartData = priceHistory.length > 0 
    ? priceHistory.filter(p => p.close != null).map(p => p.close) 
    : [];
  
  // Calculate chart return for the selected period
  const chartReturn = chartData.length >= 2 
    ? ((chartData[chartData.length - 1] - chartData[0]) / chartData[0]) * 100
    : 0;
  const isChartPositive = chartReturn >= 0;
  
  // Get return from security metrics for selected period
  const getSelectedPeriodReturn = () => {
    if (!displaySecurity?.returns) return null;
    const periodMap = {
      '1W': displaySecurity.returns.r_1w,
      '1M': displaySecurity.returns.r_1m,
      '3M': displaySecurity.returns.r_3m,
      '6M': displaySecurity.returns.r_6m,
      'YTD': displaySecurity.returns.r_ytd,
      '1Y': displaySecurity.returns.r_1y
    };
    return periodMap[selectedPeriod];
  };
  const selectedPeriodReturn = getSelectedPeriodReturn();
  
  // Calculate Y-axis domain with 5% padding (TradingView style)
  const dataMin = chartData.length > 0 ? Math.min(...chartData) : 0;
  const dataMax = chartData.length > 0 ? Math.max(...chartData) : 0;
  let range = dataMax - dataMin;
  
  // If range is 0 (flat line), use small percentage of max value
  if (range === 0) {
    range = dataMax * 0.001 || 1;
  }
  
  // Apply 5% padding on top and bottom for breathing room
  const minValue = dataMin - (range * 0.05);
  const maxValue = dataMax + (range * 0.05);
  const paddedRange = maxValue - minValue;
  const hasValidRange = paddedRange > 0 && chartData.length > 1;

  const formatTimestamp = () => {
    // AsOfTime is a text field in format like "16:30" or "2024-01-15 16:30:00"
    if (displaySecurity?.AsOfTime) {
      // If it's a full timestamp, extract time
      if (displaySecurity.AsOfTime.includes(' ')) {
        return displaySecurity.AsOfTime.split(' ')[1].substring(0, 5);
      }
      // If it's just time, use it directly
      if (displaySecurity.AsOfTime.includes(':')) {
        return displaySecurity.AsOfTime.substring(0, 5);
      }
    }
    return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  // Helper function to calculate Y position with proper domain
  const getYPosition = (value) => {
    if (!hasValidRange) return 50;
    // Map value to SVG Y coordinate: maxValue -> 0% (top), minValue -> 100% (bottom)
    return ((maxValue - value) / paddedRange) * 100;
  };

  // Format date for X-axis labels (short format: "Jan 29")
  const formatXAxisDate = (index) => {
    if (priceHistory.length === 0 || index >= priceHistory.length) return '';
    const date = new Date(priceHistory[index].ts);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-[env(safe-area-inset-bottom)] text-slate-900">
      {/* Header */}
      <div className="rounded-b-[36px] bg-gradient-to-b from-[#111111] via-[#3b1b7a] to-[#5b21b6] px-4 pb-8 pt-12 text-white">
        <div className="mx-auto w-full max-w-sm md:max-w-md">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onBack}
              aria-label="Back"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm active:scale-95"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <button
              onClick={toggleWatchlist}
              className={`flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300 active:scale-90 ${
                isWatched ? "bg-yellow-400/20" : "bg-white/10"
              } ${watchlistAnimating ? "scale-125" : "scale-100"}`}
              aria-label={isWatched ? "Remove from Watchlist" : "Add to Watchlist"}
            >
              <Star className={`h-5 w-5 transition-all duration-300 ${
                isWatched ? "fill-yellow-400 text-yellow-400" : "text-white/60"
              } ${watchlistAnimating ? "scale-110" : ""}`} />
            </button>
          </div>

          <div className="mt-6 flex items-start gap-4">
            {security.logo_url ? (
              <img
                src={security.logo_url}
                alt={security.symbol}
                className="h-14 w-14 rounded-full border border-white/20 object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15 text-lg font-bold text-white">
                {security.symbol?.substring(0, 2) || "—"}
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-xl font-bold text-white">
                {security.name || security.short_name}
              </h1>
              <div className="mt-1 flex items-center gap-2">
                <p className="text-sm text-white/60">{security.symbol}</p>
                <span className="text-white/30">•</span>
                <div className="flex items-center gap-1">
                  <img
                    src="https://flagcdn.com/w20/za.png"
                    alt="South Africa"
                    className="h-3 w-4 rounded-sm object-cover"
                  />
                  <p className="text-sm text-white/60">{security.exchange}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Price Section */}
          <div className="mt-6">
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-bold text-white">{currentPrice}</p>
              <span className="text-sm text-white/50">{security.currency || "ZAR"}</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className={`text-lg font-semibold ${isPositive ? "text-emerald-300" : "text-rose-300"}`}>
                {priceChange}
              </span>
              <span className={`text-lg font-semibold ${isPositive ? "text-emerald-300" : "text-rose-300"}`}>
                {percentChange}
              </span>
            </div>
            <p className="mt-1 text-xs text-white/40">
              As of today at {formatTimestamp()} GMT+2
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 px-4">
        <div className="flex gap-6">
          {["Overview"].map((tab, idx) => (
            <button
              key={tab}
              className={`pb-3 text-sm font-semibold transition-colors ${
                idx === 0
                  ? "border-b-2 border-slate-900 text-slate-900"
                  : "text-slate-400"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-10">
        {/* Chart Section */}
        <section className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Chart</h2>
            <button className="text-sm text-slate-500">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
            </button>
          </div>

          {/* Period Selector */}
          <div className="mt-4">
            <div className="flex gap-2">
              {periods.map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                    selectedPeriod === period
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
            {(() => {
              const periodReturnValue = selectedPeriodReturn != null ? selectedPeriodReturn : (!loading && chartData.length >= 2 ? chartReturn : null);
              if (periodReturnValue == null) return null;
              const isPeriodPositive = periodReturnValue >= 0;
              return (
                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className={`text-lg font-bold ${isPeriodPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                    {isPeriodPositive ? '+' : ''}{periodReturnValue.toFixed(2)}%
                  </span>
                  <span className="text-xs text-slate-400">{selectedPeriod} return</span>
                </div>
              );
            })()}
          </div>

          {/* Chart */}
          <div className="relative mt-6 h-64">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-sm text-slate-400">Loading chart...</div>
              </div>
            ) : chartData.length < 2 ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-sm text-slate-400">
                  {chartData.length === 0 ? 'No price data available' : 'Insufficient data for chart'}
                </div>
              </div>
            ) : (
              <svg 
                width="100%" 
                height="100%" 
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="overflow-visible"
              >
                {/* Grid lines (horizontal only) */}
                {[0, 0.25, 0.5, 0.75, 1].map((y) => (
                  <line
                    key={y}
                    x1="0"
                    y1={y * 100}
                    x2="100"
                    y2={y * 100}
                    stroke="#e2e8f0"
                    strokeWidth="0.3"
                    vectorEffect="non-scaling-stroke"
                  />
                ))}

                {/* Area fill */}
                <defs>
                  <linearGradient id="areaGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={isChartPositive ? "#10b981" : "#ef4444"} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={isChartPositive ? "#10b981" : "#ef4444"} stopOpacity="0" />
                  </linearGradient>
                </defs>

                {/* Chart line and area */}
                <g>
                  {/* Area path */}
                  <path
                    d={`M 0 ${getYPosition(chartData[0])} ${chartData
                      .map((value, i) => {
                        const x = (i / Math.max(1, chartData.length - 1)) * 100;
                        const y = getYPosition(value);
                        return `L ${x} ${y}`;
                      })
                      .join(' ')} L 100 100 L 0 100 Z`}
                    fill="url(#areaGradient)"
                    vectorEffect="non-scaling-stroke"
                  />
                  {/* Line path */}
                  <path
                    d={`M 0 ${getYPosition(chartData[0])} ${chartData
                      .map((value, i) => {
                        const x = (i / Math.max(1, chartData.length - 1)) * 100;
                        const y = getYPosition(value);
                        return `L ${x} ${y}`;
                      })
                      .join(' ')}`}
                    fill="none"
                    stroke={isChartPositive ? "#10b981" : "#ef4444"}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                </g>
              </svg>
            )}
          </div>
        </section>

        {/* Key Stats */}
        <section className="mt-8">
          <h3 className="text-sm font-semibold text-slate-700">Key Statistics</h3>
          <div className="mt-4 grid grid-cols-2 gap-4">
            {security.pe && (
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">P/E Ratio</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{Number(security.pe).toFixed(2)}</p>
              </div>
            )}
            {security.eps && (
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">EPS</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{Number(security.eps).toFixed(2)}</p>
              </div>
            )}
            {security.dividend_yield && (
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Dividend Yield</p>
                <p className="mt-2 text-lg font-semibold text-emerald-600">{Number(security.dividend_yield).toFixed(2)}%</p>
              </div>
            )}
            {security.beta && (
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Beta</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{Number(security.beta).toFixed(2)}</p>
              </div>
            )}
          </div>
        </section>

        {/* About */}
        {security.description && (
          <section className="mt-8">
            <h3 className="text-sm font-semibold text-slate-700">About</h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">{security.description}</p>
            {security.website && (
              <a
                href={security.website}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block text-sm font-medium text-purple-600 hover:text-purple-700"
              >
                Visit website →
              </a>
            )}
          </section>
        )}

        {/* Sector & Industry */}
        {(security.sector || security.industry) && (
          <section className="mt-8">
            <h3 className="text-sm font-semibold text-slate-700">Classification</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {security.sector && (
                <span className="rounded-full bg-purple-100 px-3 py-1.5 text-xs font-medium text-purple-700">
                  {security.sector}
                </span>
              )}
              {security.industry && (
                <span className="rounded-full bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-700">
                  {security.industry}
                </span>
              )}
            </div>
          </section>
        )}

        {/* Action Buttons */}
        <div className="mt-8 grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={buyChecking}
            onClick={async () => {
              setBuyChecking(true);
              try {
              // Use hook status to prevent race conditions on clicks while fetching
              if (onboardingLoading) return;
              if (!onboardingComplete) {
                setShowOnboardingModal(true);
                return;
              }
                onOpenBuy?.();
              } finally {
                setBuyChecking(false);
              }
            }}
            className="rounded-2xl bg-gradient-to-r from-black to-purple-600 py-4 font-semibold text-white shadow-lg transition-all active:scale-95 disabled:opacity-60"
          >
            {buyChecking ? "Checking…" : "Buy"}
          </button>
          <button
            onClick={toggleWatchlist}
            className={`relative overflow-hidden rounded-2xl border-2 py-4 font-semibold transition-all duration-300 active:scale-95 ${
              isWatched
                ? "border-yellow-400 bg-yellow-50 text-yellow-700"
                : "border-slate-200 bg-white text-slate-900"
            } ${watchlistAnimating ? "scale-95" : ""}`}
          >
            <span className={`flex items-center justify-center gap-2 transition-all duration-300 ${watchlistAnimating ? "scale-110" : "scale-100"}`}>
              {isWatched ? (
                <>
                  <Star className={`h-5 w-5 fill-yellow-400 text-yellow-400 ${watchlistAnimating ? "animate-[spin_0.4s_ease-out]" : ""}`} />
                  Watchlisted
                </>
              ) : (
                <>
                  <Star className="h-5 w-5" />
                  Add to Watchlist
                </>
              )}
            </span>
          </button>
        </div>
      </div>

      {showOnboardingModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowOnboardingModal(false)}>
          <div className="mx-6 w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-50 mx-auto mb-4">
              <Star className="h-7 w-7 text-violet-600" />
            </div>
            <h3 className="text-center text-lg font-semibold text-slate-900 mb-2">Complete Your Onboarding</h3>
            <p className="text-center text-sm text-slate-500 mb-6">
              You need to complete your identity verification and onboarding before you can start investing. This helps us keep your account secure.
            </p>
            <button
              onClick={() => {
                setShowOnboardingModal(false);
                if (onNavigateToOnboarding) onNavigateToOnboarding();
              }}
              className="w-full rounded-2xl bg-gradient-to-r from-black to-purple-600 py-3 text-sm font-semibold text-white shadow-lg"
            >
              Complete Onboarding
            </button>
            <button
              onClick={() => setShowOnboardingModal(false)}
              className="w-full mt-2 rounded-2xl py-3 text-sm font-semibold text-slate-500"
            >
              Not now
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockDetailPage;
