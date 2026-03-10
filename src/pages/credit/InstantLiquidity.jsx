import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Zap, Info, Search, SlidersHorizontal, Plus, FileSignature,
  HandCoins, History, Check, ChevronLeft, FileText, Lock,
  ChevronRight, AlertTriangle,
} from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Area, AreaChart } from "recharts";
import { formatZar } from "../../lib/formatCurrency";
import NotificationBell from "../../components/NotificationBell";
import NavigationPill from "../../components/NavigationPill";
import { supabase } from "../../lib/supabase";

// ─── Yahoo Finance CORS proxy ─────────────────────────────────────────────────
const YF_PROXY = "https://query1.finance.yahoo.com/v8/finance/chart/";

// ─── Collateral Scoring (per spec doc) ───────────────────────────────────────
// Score = 0.4 × LiquidityScore + 0.4 × VolatilityScore + 0.2 × MarketCapScore
// Proxies used until Iress integration:
//   LiquidityScore  → 1.0 (all listed JSE stocks assumed to meet R10m ADVT)
//   VolatilityScore → derived from max single holding weight (concentration risk)
//   MarketCapScore  → portfolio value relative to R5bn threshold
function computeCollateralScore(portfolioValue, maxHoldingWeight) {
  const liquidityScore  = 1.0;
  const volatilityScore = 1 - Math.min(maxHoldingWeight / 100, 1);
  const marketCapScore  = Math.min(portfolioValue / 5_000_000, 1);
  return 0.4 * liquidityScore + 0.4 * volatilityScore + 0.2 * marketCapScore;
}

function scoreToLTV(score) {
  if (score >= 0.8) return 0.55;
  if (score >= 0.5) return 0.50;
  if (score >= 0.3) return 0.30;
  if (score >= 0.1) return 0.20;
  return 0;
}

function scoreColor(score) {
  if (score >= 0.8) return "text-emerald-600";
  if (score >= 0.5) return "text-violet-600";
  if (score >= 0.3) return "text-amber-500";
  return "text-red-500";
}

// ─── Brand watermark ──────────────────────────────────────────────────────────
const MintLogoSilver = ({ className = "" }) => (
  <svg viewBox="0 0 1826.64 722.72" className={className}>
    <g opacity="0.05">
      <path fill="#334155" d="M1089.47,265.13c25.29,12.34,16.69,50.37-11.45,50.63h0s-512.36,0-512.36,0c-14.73,0-26.67,11.94-26.67,26.67v227.94c0,14.73-11.94,26.67-26.67,26.67H26.67c-14.73,0-26.67-11.94-26.67-26.67v-248.55c0-9.54,5.1-18.36,13.38-23.12L526.75,3.55c7.67-4.41,17.03-4.73,24.99-.85l537.73,262.43Z"/>
      <path fill="#334155" d="M737.17,457.58c-25.29-12.34-16.69-50.37,11.45-50.63h0s512.36,0,512.36,0c14.73,0,26.67-11.94,26.67-26.67v-227.94c0-14.73,11.94-26.67,26.67-26.67h485.66c14.73,0,26.67,11.94,26.67,26.67v248.55c0,9.54-5.1,18.36-13.38,23.12l-513.38,295.15c-7.67,4.41-17.03,4.73-24.99.85l-537.73-262.43Z"/>
    </g>
  </svg>
);

// ─── Fetch one live price from Yahoo Finance ──────────────────────────────────
async function fetchLivePrice(symbol) {
  try {
    const res   = await fetch(`${YF_PROXY}${encodeURIComponent(symbol)}?interval=1d&range=5d`);
    const data  = await res.json();
    const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
    return price ? parseFloat(price) : null;
  } catch {
    return null;
  }
}

// ─── Main component ───────────────────────────────────────────────────────────
const InstantLiquidity = ({ profile, onOpenNotifications, onTabChange }) => {
  const [searchQuery,    setSearchQuery]   = useState("");
  const [portalTarget,   setPortalTarget]  = useState(null);

  // Data
  const [portfolioItems, setPortfolioItems] = useState([]);
  const [loadingData,    setLoadingData]    = useState(true);
  const [priceStatus,    setPriceStatus]    = useState("idle"); // idle | fetching | done

  // Workflow
  const [selectedItem,  setSelectedItem]  = useState(null);
  const [isDetailOpen,  setIsDetailOpen]  = useState(false);
  const [pledgeAmount,  setPledgeAmount]  = useState("");
  const [repaymentDate, setRepaymentDate] = useState("");
  const [workflowStep,  setWorkflowStep]  = useState("idle");
  const [isProcessing,  setIsProcessing]  = useState(false);

  useEffect(() => { setPortalTarget(document.body); }, []);

  // ── 1. Fetch strategies via supabase client (uses logged-in user's session) ──
  useEffect(() => {
    async function loadStrategies() {
      setLoadingData(true);
      try {
        const { data, error } = await supabase
          .from("strategies")
          .select("id, name, slug, holdings, min_investment, risk_level")
          .eq("status", "active");

        if (error) {
          console.error("Supabase strategies error:", error.message);
          setLoadingData(false);
          return;
        }

        // Only keep strategies with real symbol-based holdings
        const valid = (data || []).filter(
          (s) => Array.isArray(s.holdings) && s.holdings.some((h) => h.symbol || h.ticker)
        );

        setLoadingData(false);
        enrichWithPrices(valid);
      } catch (e) {
        console.error("Failed to load strategies:", e);
        setLoadingData(false);
      }
    }
    loadStrategies();
  }, []);

  // ── 2. Fetch live prices for every holding, compute collateral values ─────────
  async function enrichWithPrices(strategies) {
    setPriceStatus("fetching");

    const enriched = await Promise.all(
      strategies.map(async (strategy) => {
        const holdings = strategy.holdings || [];

        const pricedHoldings = await Promise.all(
          holdings.map(async (h) => {
            const sym    = h.symbol || h.ticker;
            const shares = h.shares || h.quantity || 0;
            if (!sym || !shares) return { ...h, price: 0, value: 0 };

            const rawPrice = await fetchLivePrice(sym);
            if (!rawPrice) return { ...h, price: 0, value: 0 };

            // JSE prices on Yahoo Finance can be in ZAR cents — detect by magnitude
            const price = rawPrice > 5000 ? rawPrice / 100 : rawPrice;
            return { ...h, price, value: price * shares };
          })
        );

        const totalValue = pricedHoldings.reduce((sum, h) => sum + h.value, 0);
        const maxWeight  = Math.max(...holdings.map((h) => h.weight || 0));

        // Collateral quality score → LTV
        const score    = computeCollateralScore(totalValue, maxWeight);
        const ltvRatio = scoreToLTV(score);

        // Concentration cap: no single holding contributes more than 45% of total
        const cap45               = 0.45 * totalValue;
        const recognisedCollateral = pricedHoldings.reduce(
          (sum, h) => sum + Math.min(h.value, cap45), 0
        );
        const available = Math.max(0, recognisedCollateral * ltvRatio);

        return {
          id:                   strategy.id,
          name:                 strategy.name,
          slug:                 strategy.slug,
          riskLevel:            strategy.risk_level,
          balance:              totalValue,
          available,
          recognisedCollateral,
          ltvRatio,
          ltv:                  `${Math.round(ltvRatio * 100)}%`,
          score:                parseFloat(score.toFixed(2)),
          code:                 strategy.slug?.toUpperCase().slice(0, 5),
          type:                 "strategy",
          holdings:             pricedHoldings,
          marginCallAt:         ltvRatio + 0.05,
          liquidationAt:        ltvRatio + 0.10,
          hasConcentration:     holdings.some((h) => (h.weight || 0) > 45),
          hasPrices:            pricedHoldings.some((h) => h.price > 0),
        };
      })
    );

    setPortfolioItems(enriched.filter((s) => s.hasPrices));
    setPriceStatus("done");
  }

  // ── Derived totals ─────────────────────────────────────────────────────────
  const totalAvailable = portfolioItems.reduce((acc, i) => acc + i.available, 0);

  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return portfolioItems.filter(
      (i) => i.name.toLowerCase().includes(q) || i.code?.toLowerCase().includes(q)
    );
  }, [searchQuery, portfolioItems]);

  // ── Loan cost ──────────────────────────────────────────────────────────────
  const principal      = parseFloat(pledgeAmount) || 0;
  const daysToRepay    = repaymentDate
    ? Math.max(1, Math.ceil((new Date(repaymentDate) - new Date()) / 86_400_000))
    : 30;
  const interest       = principal * 0.105 * (daysToRepay / 365);
  const originationFee = 60;
  const totalRepayment = principal + interest + originationFee;
  const maxForSelected = selectedItem === "all" ? totalAvailable : selectedItem?.available || 0;

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleOpenDetail = (item) => {
    setSelectedItem(item);
    setPledgeAmount("");
    setRepaymentDate("");
    setIsDetailOpen(true);
    setWorkflowStep("idle");
  };

  const closeDetail = () => {
    setIsDetailOpen(false);
    setTimeout(() => { setSelectedItem(null); setWorkflowStep("idle"); }, 300);
  };

  const handleAmountChange = (val) => {
    const num = Math.min(Math.max(0, parseFloat(val) || 0), maxForSelected);
    setPledgeAmount(num || "");
  };

  const handleSliderChange = (pct) =>
    setPledgeAmount(Math.floor((pct / 100) * maxForSelected));

  const handleConfirmPledge = () => {
    setIsProcessing(true);
    setTimeout(() => { setIsProcessing(false); setWorkflowStep("success"); }, 1500);
  };

  const initials = [profile?.firstName, profile?.lastName]
    .filter(Boolean).map((p) => p[0]).join("").toUpperCase() || "MN";

  const isLoading    = loadingData || priceStatus === "fetching";
  const sparkline    = [{ v:40 },{ v:35 },{ v:55 },{ v:45 },{ v:60 },{ v:50 },{ v:75 }];
  const displayFont  = "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pb-32 relative overflow-x-hidden text-slate-900 bg-slate-50">

      {/* Background */}
      <div className="absolute inset-x-0 top-0 -z-10 h-full">
        <div className="absolute inset-x-0 top-0" style={{
          height: "100vh",
          background: "linear-gradient(180deg,#0d0d12 0%,#0e0a14 0.5%,#100b18 1%,#150e22 2%,#201436 3.5%,#2a1a46 5%,#362158 7%,#4c2e75 10%,#663e93 13%,#8451b0 16%,#a268c8 19%,#be84d8 22%,#d4a2e3 25%,#e4c0eb 28%,#efdaf1 31%,#f4e7f5 33%,#f4e7f5 100%)"
        }} />
      </div>

      <div className="px-5 pt-12 pb-8">

        {/* Header */}
        <header className="relative flex items-center justify-between mb-10 text-white">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 border border-white/30 text-xs font-semibold">{initials}</div>
          <NavigationPill activeTab="credit" onTabChange={(tab) => tab === "home" ? onTabChange("home") : null} />
          <NotificationBell onClick={onOpenNotifications} />
        </header>

        {/* Hero card */}
        <div className="bg-white/40 backdrop-blur-3xl rounded-[36px] p-6 shadow-xl border border-white/80 mb-8 relative overflow-hidden">
          <div className="flex justify-between items-start mb-6">
            <p className="text-slate-600 text-[12px] leading-tight font-medium max-w-[200px]">
              Pledge qualifying strategies to unlock{" "}
              <span className="text-slate-900 font-bold">instant liquidity</span>.
            </p>
            <div className="text-6xl font-black text-slate-900/5" style={{ fontFamily: displayFont }}>
              {isLoading ? "…" : portfolioItems.length}
            </div>
          </div>

          <div className="bg-gradient-to-br from-violet-600 to-purple-900 rounded-[32px] p-6 shadow-xl relative min-h-[160px] flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <p className="text-white/70 text-[9px] font-black uppercase tracking-[0.2em]">Liquidity Available</p>
                  <Info size={11} className="text-white/30" />
                </div>
                {isLoading ? (
                  <div className="flex items-center gap-2 mt-2">
                    <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span className="text-white/60 text-sm">
                      {loadingData ? "Loading strategies…" : "Fetching live prices…"}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-baseline text-white tracking-tight" style={{ fontFamily: displayFont }}>
                    <span className="text-3xl font-light">R{Math.floor(totalAvailable).toLocaleString()}</span>
                    <span className="text-xl font-medium opacity-60">.{(totalAvailable % 1).toFixed(2).split(".")[1]}</span>
                  </div>
                )}
              </div>
              <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                <Zap size={20} className="text-white fill-white/20" />
              </div>
            </div>

            {priceStatus === "done" && (
              <div className="flex items-center gap-1.5 mt-1">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-white/50 text-[9px] font-bold uppercase tracking-wider">Live JSE prices</span>
              </div>
            )}

            <button
              onClick={() => handleOpenDetail("all")}
              disabled={isLoading || totalAvailable === 0}
              className="w-full bg-white text-slate-900 text-[10px] uppercase tracking-[0.2em] font-black py-4 rounded-xl shadow-xl transition-all active:scale-[0.97] mt-5 disabled:opacity-40"
            >
              Pledge All Assets
            </button>
          </div>
        </div>

        {/* Action grid */}
        <div className="grid grid-cols-4 gap-3 mb-10 text-[11px] font-medium">
          {[
            { label: "Apply",   icon: Plus },
            { label: "Active",  icon: FileSignature },
            { label: "Pay",     icon: HandCoins },
            { label: "History", icon: History },
          ].map(({ label, icon: Icon }, i) => (
            <button key={i} className="flex flex-col items-center gap-2 rounded-2xl bg-white px-2 py-3 text-slate-700 shadow-md transition-all active:scale-95 border border-slate-100/50">
              <span className="flex h-8 w-8 items-center justify-center rounded-full text-violet-700 bg-violet-50">
                <Icon className="h-4 w-4" />
              </span>
              <span className="text-center leading-tight">{label}</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex gap-2 mb-8 px-1">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search strategies"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 pl-11 pr-4 text-sm focus:outline-none shadow-sm focus:border-violet-300 transition-colors"
            />
          </div>
          <button className="h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg active:scale-95">
            <SlidersHorizontal size={18} />
          </button>
        </div>

        {/* Strategy cards */}
        <div className="space-y-4">
          <div className="px-1 mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">Your eligible strategies</p>
            <Info className="h-4 w-4 text-slate-300" />
          </div>

          {isLoading && (
            <div className="flex flex-col items-center py-16 gap-3 text-slate-400">
              <div className="h-8 w-8 border-2 border-slate-200 border-t-violet-500 rounded-full animate-spin" />
              <p className="text-sm font-medium">
                {loadingData ? "Loading your strategies…" : "Fetching live prices…"}
              </p>
            </div>
          )}

          {!isLoading && filteredItems.length === 0 && (
            <div className="flex flex-col items-center py-16 gap-3 text-slate-400">
              <AlertTriangle size={32} className="text-slate-300" />
              <p className="text-sm font-medium">No eligible strategies found</p>
            </div>
          )}

          {!isLoading && filteredItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleOpenDetail(item)}
              className="relative w-full overflow-hidden bg-white rounded-[28px] p-5 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.1)] border border-slate-100 text-left transition-all active:scale-[0.98]"
            >
              <MintLogoSilver className="absolute -right-10 -bottom-10 h-40 w-auto pointer-events-none" />
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center">
                      <span className="text-[10px] font-black text-violet-500">{item.code?.slice(0, 2)}</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{item.name}</p>
                      <div className="flex items-baseline tracking-tight" style={{ fontFamily: displayFont }}>
                        <span className="text-xl font-bold text-slate-900">R{Math.floor(item.balance).toLocaleString()}</span>
                        <span className="text-sm font-bold text-slate-300">.{(item.balance % 1).toFixed(2).split(".")[1]}</span>
                      </div>
                    </div>
                  </div>
                  <div className="h-8 w-16">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={sparkline}>
                        <Line type="monotone" dataKey="v" stroke="#7c3aed" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Score bar */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Collateral Score</span>
                  <span className={`text-[11px] font-black ${scoreColor(item.score)}`}>{item.score.toFixed(2)}</span>
                  <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-violet-400 to-emerald-400 rounded-full" style={{ width: `${item.score * 100}%` }} />
                  </div>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-slate-50">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Available Liquidity</p>
                    <p className="text-xs font-bold text-emerald-600">{formatZar(item.available)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-black text-slate-600 uppercase">LTV {item.ltv}</span>
                    <ChevronRight className="h-4 w-4 text-slate-300" />
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Detail View ─────────────────────────────────────────────────────── */}
      {isDetailOpen && portalTarget && createPortal(
        <div className="fixed inset-0 z-[150] bg-slate-50 flex flex-col animate-in slide-in-from-right duration-300">
          <div className="px-6 pt-12 pb-6 flex items-center justify-between bg-white border-b border-slate-100">
            <button onClick={closeDetail} className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 active:scale-95">
              <ChevronLeft size={20} />
            </button>
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Pledge Position</h3>
            <div className="w-10" />
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="p-8">
              {/* Title */}
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900" style={{ fontFamily: displayFont }}>
                    {selectedItem === "all" ? "Multi-Strategy Portfolio" : selectedItem?.name}
                  </h1>
                  {selectedItem !== "all" && selectedItem?.score != null && (
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold border ${
                      selectedItem.score >= 0.8 ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                      : selectedItem.score >= 0.5 ? "bg-violet-50 text-violet-600 border-violet-100"
                      : "bg-amber-50 text-amber-600 border-amber-100"
                    }`}>
                      Score {selectedItem.score.toFixed(2)}
                    </span>
                  )}
                </div>
                <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">
                  Instant Settlement • 10.5% APR • LTV {selectedItem === "all" ? "Dynamic" : selectedItem?.ltv}
                </p>
              </div>

              {/* Holdings table */}
              {selectedItem !== "all" && selectedItem?.holdings?.length > 0 && (
                <div className="bg-white rounded-[24px] border border-slate-100 p-5 mb-6 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Holdings</p>
                  <div className="space-y-3">
                    {selectedItem.holdings.filter((h) => h.symbol || h.ticker).slice(0, 6).map((h, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black text-slate-300 w-14">{(h.symbol || h.ticker)?.replace(".JO", "")}</span>
                          <span className="text-xs font-medium text-slate-600 truncate max-w-[130px]">{h.name}</span>
                        </div>
                        <div className="flex items-center gap-1 text-right">
                          <span className="text-xs font-bold text-slate-900">{h.price > 0 ? `R${h.price.toFixed(2)}` : "—"}</span>
                          <span className="text-[9px] text-slate-400">×{h.shares || h.quantity}</span>
                          <span className="text-[9px] font-bold text-emerald-600 ml-1">{h.value > 0 ? `R${Math.round(h.value).toLocaleString()}` : ""}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {selectedItem.hasConcentration && (
                    <div className="mt-4 flex items-start gap-2 bg-amber-50 rounded-xl p-3 border border-amber-100">
                      <AlertTriangle size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
                      <p className="text-[10px] text-amber-700 font-medium leading-relaxed">
                        One or more holdings exceed 45% concentration. Recognised collateral has been capped per lending policy.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Chart */}
              <div className="h-40 w-full mb-8">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sparkline}>
                    <defs>
                      <linearGradient id="dg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#5b21b6" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="v" stroke="#5b21b6" fill="url(#dg)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Max liquidity */}
              <div className="text-center mb-6">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Maximum Liquidity</p>
                <p className="text-4xl font-extralight text-slate-900 tracking-tight" style={{ fontFamily: displayFont }}>
                  {formatZar(maxForSelected)}
                </p>
                {selectedItem !== "all" && selectedItem?.recognisedCollateral > 0 && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    Based on R{Math.floor(selectedItem.recognisedCollateral).toLocaleString()} recognised collateral
                  </p>
                )}
              </div>

              {/* Risk thresholds */}
              {selectedItem !== "all" && (
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-6">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Risk Thresholds</p>
                  <div className="flex justify-around text-xs">
                    <div className="text-center">
                      <p className="font-bold text-violet-600">{selectedItem?.ltv}</p>
                      <p className="text-slate-400 text-[9px] mt-0.5">Current LTV</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-amber-500">{Math.round((selectedItem?.marginCallAt || 0) * 100)}%</p>
                      <p className="text-slate-400 text-[9px] mt-0.5">Margin Call</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-red-500">{Math.round((selectedItem?.liquidationAt || 0) * 100)}%</p>
                      <p className="text-slate-400 text-[9px] mt-0.5">Auto-Liquidate</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {/* Repayment date */}
                <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex justify-between items-center">
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Repayment Date</span>
                  <input
                    type="date"
                    value={repaymentDate}
                    onChange={(e) => setRepaymentDate(e.target.value)}
                    min={new Date(Date.now() + 86_400_000).toISOString().split("T")[0]}
                    className="text-sm font-bold text-slate-900 bg-slate-50 px-3 py-2 rounded-xl outline-none"
                  />
                </div>

                {/* Amount + slider */}
                <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-lg">
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Pledge Amount</span>
                    <div className="flex items-baseline gap-1 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
                      <span className="text-slate-400 font-bold text-sm">R</span>
                      <input
                        type="number"
                        value={pledgeAmount}
                        onChange={(e) => handleAmountChange(e.target.value)}
                        placeholder="0"
                        className="w-24 bg-transparent text-right text-lg font-bold text-slate-900 outline-none"
                      />
                    </div>
                  </div>
                  <div className="px-2">
                    <input
                      type="range" min="0" max="100"
                      value={(pledgeAmount / (maxForSelected || 1)) * 100 || 0}
                      onChange={(e) => handleSliderChange(e.target.value)}
                      className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-violet-600"
                    />
                    <div className="flex justify-between mt-3 text-[10px] font-bold text-slate-400 uppercase">
                      <span>0%</span><span>50%</span><span>100%</span>
                    </div>
                  </div>
                </div>

                {/* Live cost breakdown */}
                {principal > 0 && repaymentDate && (
                  <div className="bg-violet-50 rounded-2xl p-5 border border-violet-100 space-y-2">
                    <p className="text-[9px] font-black text-violet-400 uppercase tracking-widest mb-3">
                      Cost Estimate · {daysToRepay} days
                    </p>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Principal</span>
                      <span className="font-bold">{formatZar(principal)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Interest (10.5% p.a.)</span>
                      <span className="font-bold text-violet-600">+{formatZar(interest)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Origination fee</span>
                      <span className="font-bold text-violet-600">+{formatZar(originationFee)}</span>
                    </div>
                    <div className="flex justify-between text-xs pt-2 border-t border-violet-100">
                      <span className="font-black text-slate-700">Total Repayment</span>
                      <span className="font-black text-slate-900">{formatZar(totalRepayment)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-6 bg-white border-t border-slate-100 pb-12 shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
            <button
              disabled={!pledgeAmount || !repaymentDate}
              onClick={() => setWorkflowStep("contract")}
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#111111] via-[#3b1b7a] to-[#5b21b6] text-white text-sm font-bold uppercase tracking-[0.2em] shadow-xl transition-all active:scale-[0.97] disabled:opacity-30"
            >
              Review Pledge
            </button>
          </div>
        </div>,
        portalTarget
      )}

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {workflowStep !== "idle" && portalTarget && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-md px-6">

          {workflowStep === "contract" && (
            <div className="bg-white w-full max-w-sm rounded-[36px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
              <div className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center"><FileText size={20} /></div>
                  <h3 className="text-xl font-bold text-slate-900" style={{ fontFamily: displayFont }}>Loan Agreement</h3>
                </div>
                <div className="space-y-4 mb-8">
                  <div className="flex justify-between pb-3 border-b border-slate-50 text-sm">
                    <span className="text-slate-500 font-medium">Principal</span>
                    <span className="font-bold text-slate-900">{formatZar(principal)}</span>
                  </div>
                  <div className="flex justify-between pb-3 border-b border-slate-50 text-sm">
                    <span className="text-slate-500 font-medium">Interest ({daysToRepay}d @ 10.5%)</span>
                    <span className="font-bold text-emerald-600">+{formatZar(interest)}</span>
                  </div>
                  <div className="flex justify-between pb-3 border-b border-slate-50 text-sm">
                    <span className="text-slate-500 font-medium">Origination Fee</span>
                    <span className="font-bold text-emerald-600">+{formatZar(originationFee)}</span>
                  </div>
                  <div className="bg-slate-900 rounded-3xl p-5 flex justify-between items-center shadow-lg">
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Total Repayment</span>
                    <span className="text-xl font-bold text-white">{formatZar(totalRepayment)}</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed text-center mb-8 font-medium">
                  Proceeding constitutes a legal signature. Your collateral assets will be restricted until full repayment.
                </p>
                <div className="flex flex-col gap-3">
                  <button onClick={() => setWorkflowStep("auth")} className="w-full bg-gradient-to-r from-[#111111] via-[#3b1b7a] to-[#5b21b6] text-white py-4 rounded-2xl text-xs font-bold uppercase tracking-widest shadow-xl active:scale-95 transition-all">Agree & Authorize</button>
                  <button onClick={() => setWorkflowStep("idle")} className="w-full py-2 text-xs font-bold text-slate-400 uppercase tracking-widest">Cancel</button>
                </div>
              </div>
            </div>
          )}

          {workflowStep === "auth" && (
            <div className="bg-white w-full max-w-sm rounded-[36px] p-8 text-center shadow-2xl animate-in fade-in duration-300">
              <div className="h-16 w-16 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center mx-auto mb-6"><Lock size={28} /></div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Security Verification</h3>
              <p className="text-sm text-slate-500 mb-8 font-medium">Enter your secure PIN to confirm the pledge.</p>
              <div className="flex justify-center gap-3 mb-10">
                {[1,2,3,4].map((i) => (
                  <div key={i} className="h-14 w-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 text-2xl font-bold">•</div>
                ))}
              </div>
              <button onClick={handleConfirmPledge} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold uppercase tracking-widest text-xs shadow-lg flex items-center justify-center active:scale-95 transition-all">
                {isProcessing
                  ? <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : "Confirm Transaction"}
              </button>
            </div>
          )}

          {workflowStep === "success" && (
            <div className="bg-white w-full max-w-sm rounded-[36px] p-8 text-center shadow-2xl animate-in slide-in-from-bottom duration-500">
              <div className="h-20 w-20 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto mb-8 shadow-inner">
                <Check size={40} strokeWidth={3} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Pledge Complete</h3>
              <p className="text-sm text-slate-500 mb-8 font-medium">Funds are now available in your balance.</p>
              <div className="bg-slate-50 rounded-[32px] p-6 mb-8 border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Liquidity Unlocked</p>
                <h2 className="text-3xl font-bold text-slate-900">{formatZar(principal)}</h2>
                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 border border-slate-100">
                  <Zap size={10} className="text-violet-600 fill-violet-600" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Instant Transfer</span>
                </div>
              </div>
              <button onClick={closeDetail} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold uppercase tracking-widest text-xs shadow-lg active:scale-95 transition-all">
                Back to Dashboard
              </button>
            </div>
          )}
        </div>,
        portalTarget
      )}
    </div>
  );
};

export default InstantLiquidity;
