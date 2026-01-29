import React, { useState, useEffect } from "react";
import { ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";
import { getSecurityBySymbol, getSecurityPrices, normalizePriceSeries } from "../lib/marketData.js";

const StockDetailPage = ({ security: initialSecurity, onBack }) => {
  const [selectedPeriod, setSelectedPeriod] = useState("1M");
  const [security, setSecurity] = useState(initialSecurity);
  const [priceHistory, setPriceHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const periods = ["1W", "1M", "3M", "6M", "YTD", "1Y"];

  // Fetch updated security data with metrics
  useEffect(() => {
    const fetchSecurityData = async () => {
      if (!initialSecurity?.symbol) return;
      
      try {
        const updatedSecurity = await getSecurityBySymbol(initialSecurity.symbol);
        if (updatedSecurity) {
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

  const currentPrice = security.currentPrice != null 
    ? security.currentPrice.toFixed(2) 
    : "—";
  const priceChange = security.changeAbs != null 
    ? (security.changeAbs >= 0 ? '+' : '') + security.changeAbs.toFixed(2)
    : "—";
  const percentChange = security.changePct != null 
    ? (security.changePct >= 0 ? '+' : '') + security.changePct.toFixed(2) + '%'
    : "—";
  const isPositive = security.changePct != null && security.changePct >= 0;

  // Generate chart data from price history
  const chartData = priceHistory.length > 0 ? priceHistory.map(p => p.close) : [];
  const minValue = chartData.length > 0 ? Math.min(...chartData) : 0;
  const maxValue = chartData.length > 0 ? Math.max(...chartData) : 0;
  const range = maxValue - minValue;
  const hasValidRange = range > 0;

  const formatTimestamp = () => {
    if (!security.asOfDate) {
      return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    }
    const date = new Date(security.asOfDate);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  // Helper function to safely calculate Y position
  const getYPosition = (value) => {
    if (!hasValidRange) return 50; // Center line if all values are the same
    return ((maxValue - value) / range) * 100;
  };

  return (
    <div className="min-h-screen bg-white pb-[env(safe-area-inset-bottom)] text-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white px-4 pb-4 pt-12">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 active:scale-95"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="mt-6 flex items-start gap-3">
          {security.logo_url ? (
            <img
              src={security.logo_url}
              alt={security.symbol}
              className="h-16 w-16 rounded-full border border-slate-200 object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-purple-600 text-xl font-bold text-white">
              {security.symbol?.substring(0, 2) || "—"}
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-900">
              {security.name || security.short_name}
            </h1>
            <div className="mt-1 flex items-center gap-2">
              <p className="text-sm text-slate-600">{security.symbol}</p>
              <span className="text-slate-300">•</span>
              <div className="flex items-center gap-1">
                <img
                  src="https://flagcdn.com/w20/za.png"
                  alt="South Africa"
                  className="h-3 w-4 rounded-sm object-cover"
                />
                <p className="text-sm text-slate-600">{security.exchange}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Price Section */}
        <div className="mt-6">
          <div className="flex items-baseline gap-2">
            <p className="text-4xl font-bold text-slate-900">{currentPrice}</p>
            <span className="text-sm text-slate-500">{security.currency || "ZAC"}</span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className={`text-lg font-semibold ${isPositive ? "text-emerald-600" : "text-red-600"}`}>
              {priceChange}
            </span>
            <span className={`text-lg font-semibold ${isPositive ? "text-emerald-600" : "text-red-600"}`}>
              {percentChange}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {security.asOfDate 
              ? `As of ${new Date(security.asOfDate).toLocaleDateString()} at ${formatTimestamp()} GMT+2`
              : `As of today at ${formatTimestamp()} GMT+2`
            }
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 px-4">
        <div className="flex gap-6">
          {["Overview", "Financials", "News", "Documents"].map((tab, idx) => (
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
          <div className="mt-4 flex gap-2">
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

          {/* Chart */}
          <div className="relative mt-6 h-64">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-sm text-slate-400">Loading chart...</div>
              </div>
            ) : chartData.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-sm text-slate-400">No price data available</div>
              </div>
            ) : (
              <svg width="100%" height="100%" className="overflow-visible">
                {/* Grid lines */}
                {[0, 1, 2, 3, 4].map((i) => (
                  <line
                    key={i}
                    x1="0"
                    y1={`${(i / 4) * 100}%`}
                    x2="100%"
                    y2={`${(i / 4) * 100}%`}
                    stroke="#e2e8f0"
                    strokeWidth="1"
                  />
                ))}

                {/* Area fill */}
                <defs>
                  <linearGradient id="areaGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity="0" />
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
                    stroke={isPositive ? "#10b981" : "#ef4444"}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>

                {/* Y-axis labels */}
                <g className="text-xs text-slate-400">
                  {[maxValue, (maxValue + minValue) / 2, minValue].map((val, i) => (
                    <text 
                      key={i} 
                      x="100%" 
                      y={`${(i / 2) * 100}%`}
                      textAnchor="end"
                      dx="-5"
                      dy="4"
                      fill="currentColor"
                      fontSize="10"
                    >
                      {val.toFixed(0)}
                    </text>
                  ))}
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
          <button className="rounded-2xl bg-gradient-to-r from-purple-600 to-purple-500 py-4 font-semibold text-white shadow-lg transition-all active:scale-95">
            Buy
          </button>
          <button className="rounded-2xl border-2 border-slate-200 bg-white py-4 font-semibold text-slate-900 transition-all active:scale-95">
            Add to Watchlist
          </button>
        </div>
      </div>
    </div>
  );
};

export default StockDetailPage;
