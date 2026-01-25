import React, { useId, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronRight, Search, SlidersHorizontal } from "lucide-react";
import { StrategyReturnHeaderChart } from "../components/StrategyReturnHeaderChart";
import { ChartContainer } from "../components/ui/line-charts-2";
import { Area, ComposedChart, Line, ReferenceLine, ResponsiveContainer } from "recharts";

const strategyCards = [
  {
    name: "Balanced Growth",
    risk: "Balanced",
    returnRate: "6.7%",
    minimum: "Min. R2,500",
    tags: ["Balanced", "Low risk", "Automated"],
    holdings: ["Apple", "Microsoft", "Nvidia"],
    tickers: ["AAPL", "MSFT", "NVDA"],
    exposure: "Global",
    minInvestment: "R2,500+",
    timeHorizon: "Long",
    sectors: ["Technology", "Consumer"],
    popularity: "Most popular",
    maxDrawdown: "Lowest max drawdown",
    volatility: "Lowest volatility",
    returnScore: 6.7,
    maxDrawdownScore: 6.2,
    volatilityScore: 3.1,
    minInvestmentValue: 2500,
    popularityScore: 4,
    sparkline: [12, 18, 16, 24, 28, 26, 32, 35, 40, 44],
  },
  {
    name: "Dividend Focus",
    risk: "Low risk",
    returnRate: "5.3%",
    minimum: "Min. R1,500",
    tags: ["Income", "Low risk", "Automated"],
    holdings: ["Apple", "Coca-Cola", "Procter & Gamble"],
    tickers: ["AAPL", "KO", "PG"],
    exposure: "Mixed",
    minInvestment: "R500+",
    timeHorizon: "Medium",
    sectors: ["Consumer", "Healthcare"],
    popularity: "Recommended",
    maxDrawdown: "Lowest max drawdown",
    volatility: "Lowest volatility",
    returnScore: 5.3,
    maxDrawdownScore: 4.8,
    volatilityScore: 2.4,
    minInvestmentValue: 500,
    popularityScore: 5,
    sparkline: [10, 12, 15, 14, 18, 20, 22, 24, 26, 28],
  },
  {
    name: "Momentum Select",
    risk: "Growth",
    returnRate: "9.1%",
    minimum: "Min. R5,000",
    tags: ["Growth", "Higher risk", "Automated"],
    holdings: ["Tesla", "Nvidia", "Amazon"],
    tickers: ["TSLA", "NVDA", "AMZN"],
    exposure: "Equities",
    minInvestment: "R10,000+",
    timeHorizon: "Short",
    sectors: ["Technology", "Energy"],
    popularity: "Best performance",
    maxDrawdown: "Lowest max drawdown",
    volatility: "Lowest volatility",
    returnScore: 9.1,
    maxDrawdownScore: 7.4,
    volatilityScore: 5.6,
    minInvestmentValue: 10000,
    popularityScore: 3,
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

const sortOptions = [
  "Recommended",
  "Best performance",
  "Lowest max drawdown",
  "Lowest volatility",
  "Lowest minimum",
  "Most popular",
];

const riskOptions = ["Low risk", "Balanced", "Growth", "High risk"];
const minInvestmentOptions = ["R500+", "R2,500+", "R10,000+"];
const exposureOptions = ["Local", "Global", "Mixed", "Equities", "ETFs"];
const timeHorizonOptions = ["Short", "Medium", "Long"];
const sectorOptions = ["Technology", "Consumer", "Healthcare", "Energy", "Financials"];

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

const OpenStrategiesPage = ({ onBack, onOpenFactsheet }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedHolding, setSelectedHolding] = useState(null);
  const [activeChips, setActiveChips] = useState([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedSort, setSelectedSort] = useState("Recommended");
  const [selectedRisks, setSelectedRisks] = useState(new Set());
  const [selectedMinInvestment, setSelectedMinInvestment] = useState(null);
  const [selectedExposure, setSelectedExposure] = useState(new Set());
  const [selectedTimeHorizon, setSelectedTimeHorizon] = useState(new Set());
  const [selectedSectors, setSelectedSectors] = useState(new Set());
  const [draftSort, setDraftSort] = useState("Recommended");
  const [draftRisks, setDraftRisks] = useState(new Set());
  const [draftMinInvestment, setDraftMinInvestment] = useState(null);
  const [draftExposure, setDraftExposure] = useState(new Set());
  const [draftTimeHorizon, setDraftTimeHorizon] = useState(new Set());
  const [draftSectors, setDraftSectors] = useState(new Set());
  const [sheetOffset, setSheetOffset] = useState(0);
  const dragStartY = useRef(null);
  const isDragging = useRef(false);
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
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const holdingSuggestions = useMemo(() => {
    if (!normalizedQuery) return [];
    const suggestions = new Map();
    strategyCards.forEach((strategy) => {
      strategy.holdings.forEach((holding, index) => {
        const ticker = strategy.tickers[index];
        const label = `${holding} ${ticker}`;
        if (
          holding.toLowerCase().includes(normalizedQuery) ||
          ticker.toLowerCase().includes(normalizedQuery)
        ) {
          suggestions.set(holding, { holding, ticker });
        }
      });
    });
    return Array.from(suggestions.values());
  }, [normalizedQuery]);

  const filteredStrategies = useMemo(() => {
    const results = strategyCards.filter((strategy) => {
      const matchesName =
        normalizedQuery && !selectedHolding
          ? strategy.name.toLowerCase().includes(normalizedQuery)
          : true;
      const matchesHolding = selectedHolding
        ? strategy.holdings.includes(selectedHolding)
        : true;
      const matchesRisk = selectedRisks.size
        ? selectedRisks.has(strategy.risk)
        : true;
      const matchesMinInvestment = selectedMinInvestment
        ? strategy.minInvestment === selectedMinInvestment
        : true;
      const matchesExposure = selectedExposure.size
        ? selectedExposure.has(strategy.exposure)
        : true;
      const matchesTimeHorizon = selectedTimeHorizon.size
        ? selectedTimeHorizon.has(strategy.timeHorizon)
        : true;
      const matchesSector = selectedSectors.size
        ? strategy.sectors.some((sector) => selectedSectors.has(sector))
        : true;

      return (
        matchesName &&
        matchesHolding &&
        matchesRisk &&
        matchesMinInvestment &&
        matchesExposure &&
        matchesTimeHorizon &&
        matchesSector
      );
    });

    const sorted = [...results];
    if (selectedSort === "Best performance") {
      sorted.sort((a, b) => b.returnScore - a.returnScore);
    }
    if (selectedSort === "Lowest max drawdown") {
      sorted.sort((a, b) => a.maxDrawdownScore - b.maxDrawdownScore);
    }
    if (selectedSort === "Lowest volatility") {
      sorted.sort((a, b) => a.volatilityScore - b.volatilityScore);
    }
    if (selectedSort === "Lowest minimum") {
      sorted.sort((a, b) => a.minInvestmentValue - b.minInvestmentValue);
    }
    if (selectedSort === "Most popular") {
      sorted.sort((a, b) => b.popularityScore - a.popularityScore);
    }

    return sorted;
  }, [
    normalizedQuery,
    selectedHolding,
    selectedRisks,
    selectedMinInvestment,
    selectedExposure,
    selectedTimeHorizon,
    selectedSectors,
    selectedSort,
  ]);

  const applyFilters = () => {
    setSelectedSort(draftSort);
    setSelectedRisks(new Set(draftRisks));
    setSelectedMinInvestment(draftMinInvestment);
    setSelectedExposure(new Set(draftExposure));
    setSelectedTimeHorizon(new Set(draftTimeHorizon));
    setSelectedSectors(new Set(draftSectors));
    const chips = [];
    if (draftRisks.size) {
      chips.push(...Array.from(draftRisks));
    }
    if (draftExposure.size) {
      chips.push(...Array.from(draftExposure));
    }
    if (draftMinInvestment) {
      chips.push(draftMinInvestment);
    }
    if (draftTimeHorizon.size) {
      chips.push(...Array.from(draftTimeHorizon));
    }
    if (draftSectors.size) {
      chips.push(...Array.from(draftSectors));
    }
    if (selectedHolding) {
      chips.push(`Holding: ${selectedHolding}`);
    }
    setActiveChips(chips);
    setIsFilterOpen(false);
  };

  const clearAllFilters = () => {
    setSelectedSort("Recommended");
    setSelectedRisks(new Set());
    setSelectedMinInvestment(null);
    setSelectedExposure(new Set());
    setSelectedTimeHorizon(new Set());
    setSelectedSectors(new Set());
    setDraftSort("Recommended");
    setDraftRisks(new Set());
    setDraftMinInvestment(null);
    setDraftExposure(new Set());
    setDraftTimeHorizon(new Set());
    setDraftSectors(new Set());
    setSelectedHolding(null);
    setSearchQuery("");
    setActiveChips([]);
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

  const removeChip = (chip) => {
    if (chip.startsWith("Holding:")) {
      setSelectedHolding(null);
    } else if (chip.startsWith("R")) {
      setSelectedMinInvestment(null);
    } else if (["Low risk", "Balanced", "Growth", "High risk"].includes(chip)) {
      const next = new Set(selectedRisks);
      next.delete(chip);
      setSelectedRisks(next);
    } else if (["Local", "Global", "Mixed", "Equities", "ETFs"].includes(chip)) {
      const next = new Set(selectedExposure);
      next.delete(chip);
      setSelectedExposure(next);
    } else if (["Short", "Medium", "Long"].includes(chip)) {
      const next = new Set(selectedTimeHorizon);
      next.delete(chip);
      setSelectedTimeHorizon(next);
    } else if (sectorOptions.includes(chip)) {
      const next = new Set(selectedSectors);
      next.delete(chip);
      setSelectedSectors(next);
    }
    setActiveChips((prev) => prev.filter((item) => item !== chip));
  };

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
          onClick={onOpenFactsheet}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#111111] via-[#3b1b7a] to-[#5b21b6] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-200/70"
        >
          View factsheet
          <ChevronRight className="h-4 w-4" />
        </button>

        <div className="mt-5 space-y-3">
          <div className="relative">
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search strategies or holdings"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  if (!event.target.value) {
                    setSelectedHolding(null);
                  }
                }}
                className="flex-1 bg-transparent text-sm text-slate-700 outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  setDraftSort(selectedSort);
                  setDraftRisks(new Set(selectedRisks));
                  setDraftMinInvestment(selectedMinInvestment);
                  setDraftExposure(new Set(selectedExposure));
                  setDraftTimeHorizon(new Set(selectedTimeHorizon));
                  setDraftSectors(new Set(selectedSectors));
                  setIsFilterOpen(true);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-white shadow-sm"
                aria-label="Open filters"
              >
                <SlidersHorizontal className="h-4 w-4" />
              </button>
            </div>
            {holdingSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 rounded-2xl border border-slate-100 bg-white p-2 shadow-lg">
                {holdingSuggestions.map((suggestion) => (
                  <button
                    key={suggestion.holding}
                    type="button"
                    onClick={() => {
                      setSelectedHolding(suggestion.holding);
                      setSearchQuery(`${suggestion.holding} ${suggestion.ticker}`);
                      setActiveChips((prev) => {
                        const next = prev.filter((chip) => !chip.startsWith("Holding:"));
                        const holdingChip = `Holding: ${suggestion.holding}`;
                        return next.includes(holdingChip) ? next : [...next, holdingChip];
                      });
                    }}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <span className="font-semibold">{suggestion.holding}</span>
                    <span className="text-xs font-semibold text-slate-400">{suggestion.ticker}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>

        <section className="mt-6 space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">Other strategies</h2>
          {filteredStrategies.length === 0 ? (
            <div className="rounded-2xl border border-slate-100 bg-white p-6 text-center shadow-sm">
              <p className="text-sm font-semibold text-slate-700">
                No strategies match your filters
              </p>
              <button
                type="button"
                onClick={clearAllFilters}
                className="mt-4 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600"
              >
                Clear filters
              </button>
            </div>
          ) : (
            filteredStrategies.map((strategy) => (
              <div
                key={strategy.name}
                className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                role="button"
                tabIndex={0}
                onClick={onOpenFactsheet}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    onOpenFactsheet?.();
                  }
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-900">{strategy.name}</p>
                    <div>
                      <p className="text-xs font-semibold text-emerald-500">
                        +{strategy.returnRate}
                      </p>
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
            ))
          )}
        </section>
      </div>

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
            className="relative z-10 flex h-[60vh] w-full max-w-sm flex-col overflow-hidden rounded-[32px] bg-white shadow-2xl"
            style={{ transform: `translateY(${sheetOffset}px)` }}
            onPointerDown={handleSheetPointerDown}
            onPointerMove={handleSheetPointerMove}
            onPointerUp={handleSheetPointerUp}
            onPointerCancel={handleSheetPointerUp}
          >
            <div className="flex items-center justify-center pt-3">
              <div className="h-1.5 w-12 rounded-full bg-slate-200" />
            </div>
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 pb-4 pt-3">
              <h3 className="text-lg font-semibold text-slate-900">Filters</h3>
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-sm font-semibold text-slate-500"
              >
                Clear all
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
              <div className="space-y-3">
                <p className="text-sm font-semibold text-slate-800">Sort</p>
                <div className="flex flex-wrap gap-2">
                  {sortOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setDraftSort(option)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                        draftSort === option
                          ? "border-transparent bg-gradient-to-r from-[#5b21b6] to-[#7c3aed] text-white"
                          : "border-slate-200 bg-white text-slate-600"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold text-slate-800">Risk level</p>
                <div className="flex flex-wrap gap-2">
                  {riskOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() =>
                        setDraftRisks((prev) => {
                          const next = new Set(prev);
                          if (next.has(option)) {
                            next.delete(option);
                          } else {
                            next.add(option);
                          }
                          return next;
                        })
                      }
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                        draftRisks.has(option)
                          ? "border-transparent bg-gradient-to-r from-[#5b21b6] to-[#7c3aed] text-white"
                          : "border-slate-200 bg-white text-slate-600"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold text-slate-800">Minimum investment</p>
                <div className="flex flex-wrap gap-2">
                  {minInvestmentOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setDraftMinInvestment(option)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                        draftMinInvestment === option
                          ? "border-transparent bg-gradient-to-r from-[#5b21b6] to-[#7c3aed] text-white"
                          : "border-slate-200 bg-white text-slate-600"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold text-slate-800">Asset exposure</p>
                <div className="flex flex-wrap gap-2">
                  {exposureOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() =>
                        setDraftExposure((prev) => {
                          const next = new Set(prev);
                          if (next.has(option)) {
                            next.delete(option);
                          } else {
                            next.add(option);
                          }
                          return next;
                        })
                      }
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                        draftExposure.has(option)
                          ? "border-transparent bg-gradient-to-r from-[#5b21b6] to-[#7c3aed] text-white"
                          : "border-slate-200 bg-white text-slate-600"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold text-slate-800">Time horizon</p>
                <div className="flex flex-wrap gap-2">
                  {timeHorizonOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setDraftTimeHorizon(new Set([option]))}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                        draftTimeHorizon.has(option)
                          ? "border-transparent bg-gradient-to-r from-[#5b21b6] to-[#7c3aed] text-white"
                          : "border-slate-200 bg-white text-slate-600"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold text-slate-800">Sector</p>
                <div className="flex flex-wrap gap-2">
                  {sectorOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() =>
                        setDraftSectors((prev) => {
                          const next = new Set(prev);
                          if (next.has(option)) {
                            next.delete(option);
                          } else {
                            next.add(option);
                          }
                          return next;
                        })
                      }
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                        draftSectors.has(option)
                          ? "border-transparent bg-gradient-to-r from-[#5b21b6] to-[#7c3aed] text-white"
                          : "border-slate-200 bg-white text-slate-600"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 border-t border-slate-100 bg-white px-5 pb-5 pt-3">
              <div className="pointer-events-none absolute left-0 right-0 top-0 h-6 bg-gradient-to-b from-white to-transparent" />
              <button
                type="button"
                onClick={() => {
                  applyFilters();
                  resetSheetPosition();
                }}
                className="relative w-full rounded-2xl bg-gradient-to-r from-[#111111] via-[#3b1b7a] to-[#5b21b6] py-3 text-sm font-semibold text-white shadow-lg shadow-violet-200/60"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OpenStrategiesPage;
