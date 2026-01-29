import React, { useEffect, useState, useRef, useMemo } from "react";
import { supabase } from "../lib/supabase.js";
import { useProfile } from "../lib/useProfile";
import { TrendingUp, Search, SlidersHorizontal, X, ChevronRight } from "lucide-react";
import NotificationBell from "../components/NotificationBell";
import Skeleton from "../components/Skeleton";

const sortOptions = ["Market Cap", "Dividend Yield", "P/E Ratio", "Beta"];

const MarketsPage = ({ onOpenNotifications, onOpenStockDetail }) => {
  const { profile, loading: profileLoading } = useProfile();
  const [securities, setSecurities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("stocks"); // "stocks" or "news"
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sheetOffset, setSheetOffset] = useState(0);
  const dragStartY = useRef(null);
  const isDragging = useRef(false);
  
  // Filter states
  const [selectedSort, setSelectedSort] = useState("Market Cap");
  const [selectedSectors, setSelectedSectors] = useState(new Set());
  const [selectedExchanges, setSelectedExchanges] = useState(new Set());
  const [draftSort, setDraftSort] = useState("Market Cap");
  const [draftSectors, setDraftSectors] = useState(new Set());
  const [draftExchanges, setDraftExchanges] = useState(new Set());
  const [activeChips, setActiveChips] = useState([]);

  const displayName = [profile.firstName, profile.lastName].filter(Boolean).join(" ");
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  useEffect(() => {
    const fetchSecurities = async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }

      let isMounted = true;

      try {
        const { data, error } = await supabase
          .from("securities")
          .select("*")
          .eq("is_active", true)
          .order("market_cap", { ascending: false, nullsFirst: false });

        if (error) throw error;

        if (isMounted) {
          setSecurities(data || []);
          setLoading(false);
        }
      } catch (error) {
        console.error("Error fetching securities:", error);
        if (isMounted) {
          setLoading(false);
        }
      }

      return () => {
        isMounted = false;
      };
    };

    fetchSecurities();
  }, []);

  const sectors = useMemo(() => {
    return [...new Set(securities.map((s) => s.sector).filter(Boolean))];
  }, [securities]);

  const exchanges = useMemo(() => {
    return [...new Set(securities.map((s) => s.exchange).filter(Boolean))];
  }, [securities]);

  const filteredSecurities = useMemo(() => {
    let filtered = securities.filter((security) => {
      const matchesSearch =
        security.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        security.symbol?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        security.sector?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSector = selectedSectors.size === 0 || selectedSectors.has(security.sector);
      const matchesExchange = selectedExchanges.size === 0 || selectedExchanges.has(security.exchange);

      return matchesSearch && matchesSector && matchesExchange;
    });

    // Sort
    if (selectedSort === "Market Cap") {
      filtered.sort((a, b) => (b.market_cap || 0) - (a.market_cap || 0));
    } else if (selectedSort === "Dividend Yield") {
      filtered.sort((a, b) => (b.dividend_yield || 0) - (a.dividend_yield || 0));
    } else if (selectedSort === "P/E Ratio") {
      filtered.sort((a, b) => (a.pe || Infinity) - (b.pe || Infinity));
    } else if (selectedSort === "Beta") {
      filtered.sort((a, b) => (b.beta || 0) - (a.beta || 0));
    }

    return filtered;
  }, [securities, searchQuery, selectedSectors, selectedExchanges, selectedSort]);

  const largestCompanies = useMemo(() => {
    return securities
      .filter((s) => s.market_cap)
      .sort((a, b) => b.market_cap - a.market_cap)
      .slice(0, 10);
  }, [securities]);

  const highestDividendYield = useMemo(() => {
    return securities
      .filter((s) => s.dividend_yield && s.dividend_yield > 0)
      .sort((a, b) => b.dividend_yield - a.dividend_yield)
      .slice(0, 10);
  }, [securities]);

  const formatMarketCap = (value) => {
    if (!value) return "—";
    const num = Number(value);
    if (num >= 1e12) return `${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    return `${num.toFixed(2)}`;
  };

  const formatPrice = (security) => {
    if (security.eps && security.pe) {
      return (security.eps * security.pe).toFixed(2);
    }
    return "—";
  };

  const resetSheetPosition = () => {
    setSheetOffset(0);
    dragStartY.current = null;
    isDragging.current = false;
  };

  const handleSheetPointerDown = (event) => {
    dragStartY.current = event.clientY;
    isDragging.current = true;
  };

  const handleSheetPointerMove = (event) => {
    if (!isDragging.current || dragStartY.current === null) return;
    const delta = event.clientY - dragStartY.current;
    setSheetOffset(delta > 0 ? delta : 0);
  };

  const handleSheetPointerUp = () => {
    if (!isDragging.current) return;
    if (sheetOffset > 80) {
      setIsFilterOpen(false);
    }
    resetSheetPosition();
  };

  const applyFilters = () => {
    setSelectedSort(draftSort);
    setSelectedSectors(new Set(draftSectors));
    setSelectedExchanges(new Set(draftExchanges));
    
    const chips = [];
    if (draftSectors.size) chips.push(...Array.from(draftSectors));
    if (draftExchanges.size) chips.push(...Array.from(draftExchanges));
    setActiveChips(chips);
    setIsFilterOpen(false);
  };

  const clearAllFilters = () => {
    setSelectedSort("Market Cap");
    setSelectedSectors(new Set());
    setSelectedExchanges(new Set());
    setDraftSort("Market Cap");
    setDraftSectors(new Set());
    setDraftExchanges(new Set());
    setActiveChips([]);
  };

  const removeChip = (chip) => {
    if (sectors.includes(chip)) {
      const next = new Set(selectedSectors);
      next.delete(chip);
      setSelectedSectors(next);
    } else if (exchanges.includes(chip)) {
      const next = new Set(selectedExchanges);
      next.delete(chip);
      setSelectedExchanges(next);
    }
    setActiveChips((prev) => prev.filter((item) => item !== chip));
  };

  if (profileLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-50 pb-[env(safe-area-inset-bottom)]">
        <div className="rounded-b-[36px] bg-gradient-to-b from-[#111111] via-[#3b1b7a] to-[#5b21b6] px-4 pb-12 pt-12">
          <div className="mx-auto flex w-full max-w-sm flex-col gap-6 md:max-w-md">
            <header className="flex items-center justify-between">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-10 w-10 rounded-full" />
            </header>
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        </div>
        <div className="mx-auto -mt-10 flex w-full max-w-sm flex-col gap-4 px-4 pb-10 md:max-w-md">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-[env(safe-area-inset-bottom)] text-slate-900">
      {/* Header */}
      <div className="rounded-b-[36px] bg-gradient-to-b from-[#111111] via-[#3b1b7a] to-[#5b21b6] px-4 pb-6 pt-12 text-white md:px-8">
        <div className="mx-auto flex w-full max-w-sm flex-col gap-6 md:max-w-md">
          <header className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={displayName || "Profile"}
                  className="h-10 w-10 rounded-full border border-white/40 object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-xs font-semibold text-slate-700">
                  {initials || "—"}
                </div>
              )}
            </div>
            <NotificationBell onClick={onOpenNotifications} />
          </header>

          {/* Toggle between Stocks and News */}
          <div className="flex gap-2 rounded-2xl bg-white/10 p-1 backdrop-blur-sm">
            <button
              onClick={() => setViewMode("stocks")}
              className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                viewMode === "stocks"
                  ? "bg-white text-slate-900 shadow-md"
                  : "text-white/70"
              }`}
            >
              Stocks
            </button>
            <button
              onClick={() => setViewMode("news")}
              className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                viewMode === "news"
                  ? "bg-white text-slate-900 shadow-md"
                  : "text-white/70"
              }`}
            >
              News
            </button>
          </div>

          {viewMode === "stocks" && (
            <>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/50" />
                <input
                  type="text"
                  placeholder="Search by name, symbol, or sector..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-2xl border border-white/20 bg-white/10 px-12 py-3 text-sm text-white placeholder-white/50 backdrop-blur-sm focus:border-white/40 focus:bg-white/15 focus:outline-none"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto -mt-2 flex w-full max-w-sm flex-col gap-6 px-4 pb-10 md:max-w-md md:px-8">
        {viewMode === "stocks" ? (
          <>
            {/* Filter and Sort Bar */}
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => {
                  setIsFilterOpen(true);
                  setDraftSort(selectedSort);
                  setDraftSectors(new Set(selectedSectors));
                  setDraftExchanges(new Set(selectedExchanges));
                }}
                className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm transition-all active:scale-95"
              >
                <SlidersHorizontal className="h-4 w-4 text-slate-600" />
                <span className="text-sm font-semibold text-slate-700">Filter & Sort</span>
              </button>
              <span className="text-sm font-medium text-slate-500">
                {filteredSecurities.length} stocks
              </span>
            </div>

            {/* Active Filter Chips */}
            {activeChips.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {activeChips.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => removeChip(chip)}
                    className="flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1.5 text-xs font-semibold text-purple-700 transition-all active:scale-95"
                  >
                    {chip}
                    <X className="h-3 w-3" />
                  </button>
                ))}
                <button
                  onClick={clearAllFilters}
                  className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-all active:scale-95"
                >
                  Clear all
                </button>
              </div>
            )}

            {/* Largest Companies Section */}
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Largest companies</h2>
                <ChevronRight className="h-5 w-5 text-slate-400" />
              </div>
              <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 scrollbar-hide">
                {largestCompanies.map((security) => (
                  <button
                    key={security.id}
                    onClick={() => onOpenStockDetail(security)}
                    className="flex-shrink-0 w-64 snap-center rounded-3xl border border-slate-100 bg-white p-4 text-left shadow-sm transition-all hover:shadow-md active:scale-[0.98]"
                  >
                    <div className="flex items-start gap-3">
                      {security.logo_url ? (
                        <img
                          src={security.logo_url}
                          alt={security.symbol}
                          className="h-12 w-12 rounded-full border border-slate-100 object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-purple-600 text-sm font-bold text-white">
                          {security.symbol?.substring(0, 2) || "—"}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900">
                          {security.short_name || security.name}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">{security.symbol}</p>
                        <div className="mt-2 flex items-baseline gap-2">
                          <p className="text-lg font-bold text-slate-900">
                            {formatMarketCap(security.market_cap)}
                          </p>
                          <span className="text-xs text-slate-400">ZAC</span>
                        </div>
                        {security.dividend_yield && (
                          <p className="mt-1 text-xs font-semibold text-emerald-600">
                            +{Number(security.dividend_yield).toFixed(2)}%
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 h-12 w-full rounded-xl bg-slate-50"></div>
                  </button>
                ))}
              </div>
            </section>

            {/* Highest Dividend Yield Section */}
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Highest dividend yield</h2>
                <ChevronRight className="h-5 w-5 text-slate-400" />
              </div>
              <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 scrollbar-hide">
                {highestDividendYield.map((security) => (
                  <button
                    key={security.id}
                    onClick={() => onOpenStockDetail(security)}
                    className="flex-shrink-0 w-64 snap-center rounded-3xl border border-slate-100 bg-white p-4 text-left shadow-sm transition-all hover:shadow-md active:scale-[0.98]"
                  >
                    <div className="flex items-start gap-3">
                      {security.logo_url ? (
                        <img
                          src={security.logo_url}
                          alt={security.symbol}
                          className="h-12 w-12 rounded-full border border-slate-100 object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-sm font-bold text-white">
                          {security.symbol?.substring(0, 2) || "—"}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900">
                          {security.short_name || security.name}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">{security.symbol}</p>
                        <div className="mt-2 flex items-baseline gap-2">
                          <p className="text-lg font-bold text-emerald-600">
                            {Number(security.dividend_yield).toFixed(2)}%
                          </p>
                          <span className="text-xs text-slate-400">yield</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          Market cap: {formatMarketCap(security.market_cap)} ZAC
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 h-12 w-full rounded-xl bg-slate-50"></div>
                  </button>
                ))}
              </div>
            </section>

            {/* All Securities List */}
            {searchQuery && (
              <section>
                <h2 className="mb-4 text-lg font-bold text-slate-900">Search results</h2>
                {filteredSecurities.length === 0 ? (
                  <div className="rounded-3xl bg-white px-6 py-12 text-center shadow-md">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                      <Search className="h-8 w-8 text-slate-400" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700">No securities found</p>
                    <p className="mt-1 text-xs text-slate-400">Try adjusting your search or filter</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredSecurities.map((security) => (
                      <button
                        key={security.id}
                        onClick={() => onOpenStockDetail(security)}
                        className="w-full rounded-3xl bg-white p-4 text-left shadow-sm transition-all hover:shadow-md active:scale-[0.98]"
                      >
                        <div className="flex items-start gap-3">
                          {security.logo_url ? (
                            <img
                              src={security.logo_url}
                              alt={security.symbol}
                              className="h-12 w-12 rounded-full border border-slate-100 object-cover"
                            />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-purple-600 text-sm font-bold text-white">
                              {security.symbol?.substring(0, 2) || "—"}
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-900">
                                  {security.short_name || security.name}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {security.symbol} · {security.exchange}
                                </p>
                              </div>
                              {security.dividend_yield && (
                                <div className="text-right">
                                  <p className="text-xs text-emerald-600">
                                    {Number(security.dividend_yield).toFixed(2)}% yield
                                  </p>
                                </div>
                              )}
                            </div>

                            <div className="mt-3 flex items-center gap-2">
                              {security.sector && (
                                <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600">
                                  {security.sector}
                                </span>
                              )}
                              {security.pe && (
                                <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-700">
                                  P/E {Number(security.pe).toFixed(2)}
                                </span>
                              )}
                              {security.beta && (
                                <span
                                  className={`rounded-full px-2 py-1 text-[10px] font-medium ${
                                    security.beta > 1
                                      ? "bg-orange-50 text-orange-700"
                                      : "bg-green-50 text-green-700"
                                  }`}
                                >
                                  β {Number(security.beta).toFixed(2)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        ) : (
          /* News View - Empty for now */
          <div className="rounded-3xl bg-white px-6 py-16 text-center shadow-md">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">
              <TrendingUp className="h-10 w-10 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-700">Market news coming soon</p>
            <p className="mt-2 text-xs text-slate-400">
              Stay tuned for the latest market updates and insights
            </p>
          </div>
        )}
      </div>

      {/* Filter Sheet */}
      {isFilterOpen && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/40 px-4 pb-6">
          <button
            type="button"
            className="absolute inset-0 h-full w-full cursor-default"
            aria-label="Close filters"
            onClick={() => {
              setIsFilterOpen(false);
              resetSheetPosition();
            }}
          />
          <div
            className="relative z-10 flex h-[70vh] w-full max-w-sm flex-col overflow-hidden rounded-[32px] bg-white shadow-2xl"
            style={{ transform: `translateY(${sheetOffset}px)` }}
            onPointerDown={handleSheetPointerDown}
            onPointerMove={handleSheetPointerMove}
            onPointerUp={handleSheetPointerUp}
            onPointerCancel={handleSheetPointerUp}
          >
            {/* Drag Handle */}
            <div className="flex items-center justify-center pt-3">
              <div className="h-1.5 w-12 rounded-full bg-slate-200" />
            </div>

            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 pb-4 pt-3">
              <h3 className="text-lg font-semibold text-slate-900">Filter & Sort</h3>
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-sm font-semibold text-slate-500"
              >
                Clear all
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {/* Sort Options */}
              <section className="mb-6">
                <h4 className="mb-3 text-sm font-semibold text-slate-700">Sort by</h4>
                <div className="space-y-2">
                  {sortOptions.map((option) => (
                    <button
                      key={option}
                      onClick={() => setDraftSort(option)}
                      className={`w-full rounded-xl px-4 py-3 text-left text-sm font-medium transition-all ${
                        draftSort === option
                          ? "bg-purple-50 text-purple-700 ring-2 ring-purple-200"
                          : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </section>

              {/* Sector Filter */}
              <section className="mb-6">
                <h4 className="mb-3 text-sm font-semibold text-slate-700">Sector</h4>
                <div className="flex flex-wrap gap-2">
                  {sectors.map((sector) => (
                    <button
                      key={sector}
                      onClick={() => {
                        const next = new Set(draftSectors);
                        if (next.has(sector)) {
                          next.delete(sector);
                        } else {
                          next.add(sector);
                        }
                        setDraftSectors(next);
                      }}
                      className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                        draftSectors.has(sector)
                          ? "bg-purple-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {sector}
                    </button>
                  ))}
                </div>
              </section>

              {/* Exchange Filter */}
              <section className="mb-6">
                <h4 className="mb-3 text-sm font-semibold text-slate-700">Exchange</h4>
                <div className="flex flex-wrap gap-2">
                  {exchanges.map((exchange) => (
                    <button
                      key={exchange}
                      onClick={() => {
                        const next = new Set(draftExchanges);
                        if (next.has(exchange)) {
                          next.delete(exchange);
                        } else {
                          next.add(exchange);
                        }
                        setDraftExchanges(next);
                      }}
                      className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                        draftExchanges.has(exchange)
                          ? "bg-purple-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {exchange}
                    </button>
                  ))}
                </div>
              </section>
            </div>

            {/* Apply Button */}
            <div className="border-t border-slate-100 bg-white p-5">
              <button
                type="button"
                onClick={applyFilters}
                className="w-full rounded-2xl bg-gradient-to-r from-purple-600 to-purple-500 py-4 font-semibold text-white shadow-lg transition-all active:scale-95"
              >
                Apply filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketsPage;
