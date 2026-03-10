import React, { useEffect, useState, useMemo, useRef } from "react";
import { ArrowDownLeft, ArrowUpRight, MoreHorizontal, X, Search, TrendingUp, CreditCard, Wallet, RefreshCw, Gift } from "lucide-react";
import { generateMintStatement } from "../lib/generateMintStatement";
import { useProfile } from "../lib/useProfile";
import NotificationBell from "../components/NotificationBell";
import Skeleton from "../components/Skeleton";
import { supabase } from "../lib/supabase";
import { formatCurrency } from "../lib/formatCurrency";
import { normalizeSymbol, getHoldingsArray, buildHoldingsBySymbol, getStrategyHoldingsSnapshot } from "../lib/strategyUtils";
import { useTransactions } from "../lib/useFinancialData";
import SettlementBadge from "../components/PendingBadge";
import { useSettlementConfig, getSettlementStatusForHolding } from "../lib/useSettlementStatus";

const activityFilters = ["All", "Investments", "Deposits", "Withdrawals"];

const getTransactionIcon = (name, direction) => {
  const lower = (name || "").toLowerCase();
  if (lower.includes("dividend") || lower.includes("interest")) return Gift;
  if (lower.includes("credit") || lower.includes("loan")) return CreditCard;
  if (lower.includes("withdraw") || lower.includes("repay")) return Wallet;
  if (lower.includes("recurring") || lower.includes("auto")) return RefreshCw;
  if (lower.includes("invest") || lower.includes("strategy") || lower.includes("purchas") || lower.includes("buy") || lower.includes("bought")) return TrendingUp;
  if (direction === "credit") return ArrowDownLeft;
  return ArrowUpRight;
};

const getIconColors = (direction, name) => {
  const lower = (name || "").toLowerCase();
  if (lower.includes("invest") || lower.includes("strategy") || lower.includes("purchas") || lower.includes("buy") || lower.includes("bought")) return { bg: "bg-blue-50", text: "text-blue-600" };
  if (direction === "credit") return { bg: "bg-emerald-50", text: "text-emerald-600" };
  return { bg: "bg-red-50", text: "text-red-500" };
};

const getFilterCategory = (direction, name) => {
  const lower = (name || "").toLowerCase();
  if (lower.includes("withdraw") || lower.includes("repay")) return "Withdrawals";
  if (lower.includes("deposit") || direction === "credit") return "Deposits";
  if (lower.includes("invest") || lower.includes("buy") || lower.includes("strategy") || direction === "debit") return "Investments";
  return "Other";
};

const formatRelativeDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((today - itemDate) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return "This Week";
  if (diffDays < 30) return "This Month";
  return date.toLocaleDateString("en-ZA", { month: "long", year: "numeric" });
};

const formatTime = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" });
};

const formatShortDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
};

const formatAmount = (amount) => {
  if (amount === undefined || amount === null) return "R0.00";
  const val = Math.abs(amount) / 100;
  return `R${val.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// ─────────────────────────────────────────────────────────────────────────────
const StatementsPage = ({ onOpenNotifications }) => {
  const { profile } = useProfile();
  const settlementCfg = useSettlementConfig();
  const holdingSettlementStatus = getSettlementStatusForHolding(settlementCfg);

  const [activeTab, setActiveTab]           = useState("strategy");
  const [page, setPage]                     = useState(1);
  const [perPage, setPerPage]               = useState(9);
  const [selectedCard, setSelectedCard]     = useState(null);
  const [searchQuery, setSearchQuery]       = useState("");

  const [holdingsRows, setHoldingsRows]     = useState([]);
  const [holdingsRaw, setHoldingsRaw]       = useState([]);
  const [strategyRows, setStrategyRows]     = useState([]);
  const [rawStrategies, setRawStrategies]   = useState([]);
  const [holdingsSecurities, setHoldingsSecurities] = useState([]);

  const [strategiesLoading, setStrategiesLoading] = useState(true);
  const [holdingsLoading, setHoldingsLoading]     = useState(true);
  const [pdfLoading, setPdfLoading]               = useState(false);

  const { transactions: activityTransactions, loading: activityLoading } = useTransactions(100);

  const [activityFilter, setActivityFilter]           = useState("All");
  const [activitySearchQuery, setActivitySearchQuery] = useState("");
  const [dateRange, setDateRange]                     = useState(null);
  const activitySearchRef = useRef(null);

  const displayName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ");
  const initials = displayName.split(" ").filter(Boolean).slice(0, 2).map(p => p[0]).join("").toUpperCase();

  const mintAccountNumber =
    profile?.mintNumber ||
    profile?.accountNumber ||
    (profile?.id ? `MINT-${String(profile.id).slice(0, 8).toUpperCase()}` : "MINT-XXXXXXXX");

  // ── Computed date range ────────────────────────────────────────────────────
  const { computedFrom, computedTo } = useMemo(() => {
    if (!dateRange) return { computedFrom: null, computedTo: null };
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - dateRange);
    return {
      computedFrom: from.toISOString().split("T")[0],
      computedTo: to.toISOString().split("T")[0],
    };
  }, [dateRange]);

  // ── All data loaded? ───────────────────────────────────────────────────────
  const dataReady = !strategiesLoading && !holdingsLoading && !activityLoading;

  // ── Viewport-based perPage ─────────────────────────────────────────────────
  useEffect(() => {
    const calc = () => setPerPage(Math.max(4, Math.floor((window.innerHeight - 380) / 80)));
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  // ── Load strategies ────────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (!supabase || !profile?.id) return;
      if (alive) setStrategiesLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) { if (alive) setStrategiesLoading(false); return; }
        const res = await fetch("/api/user/strategies", { headers: { Authorization: `Bearer ${session.access_token}` } });
        if (!res.ok) { if (alive) setStrategiesLoading(false); return; }
        const { strategies: userStrats = [] } = await res.json();
        if (userStrats.length === 0) { if (alive) { setStrategyRows([]); setRawStrategies([]); setStrategiesLoading(false); } return; }

        const { data: strategies, error } = await supabase
          .from("strategies")
          .select("id, name, short_name, description, risk_level, holdings, strategy_metrics(as_of_date, last_close, change_pct, r_1m, r_1w, r_3m, r_6m, r_ytd, r_1y, change_abs, prev_close)")
          .in("id", userStrats.map(s => s.id))
          .eq("status", "active");
        if (error) throw error;

        const mapped = (strategies || []).map(strategy => {
          const m = Array.isArray(strategy.strategy_metrics) ? strategy.strategy_metrics[0] : strategy.strategy_metrics;
          const asOf = m?.as_of_date ? new Date(m.as_of_date) : null;
          return {
            type: "Strategy",
            title: strategy.short_name || strategy.name || "—",
            fullName: strategy.name || "—",
            desc: strategy.description ? strategy.description.slice(0, 40) + (strategy.description.length > 40 ? "…" : "") : "—",
            date: asOf ? asOf.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }) : "—",
            amount: formatCurrency(m?.last_close || 0),
            meta: strategy.risk_level || "—",
            riskLevel: strategy.risk_level || null,
            changePct: m?.change_pct != null ? Number(m.change_pct) : null,
            flow: "out",
            objective: strategy.objective || null,
            currentValue: m?.last_close ? formatCurrency(m.last_close) : null,
            changeAbs: m?.change_abs || null,
            r1w: m?.r_1w || null, r1m: m?.r_1m || null, r3m: m?.r_3m || null,
            r6m: m?.r_6m || null, rytd: m?.r_ytd || null, r1y: m?.r_1y || null,
            baseCurrency: strategy.base_currency || "ZAR",
            minInvestment: strategy.min_investment || null,
            providerName: strategy.provider_name || null,
            managementFeeBps: strategy.management_fee_bps || null,
            holdingsCount: Array.isArray(strategy.holdings) ? strategy.holdings.length : 0,
          };
        });

        if (alive) { setStrategyRows(mapped); setRawStrategies(strategies || []); setStrategiesLoading(false); }
      } catch (e) {
        console.error("Failed to load strategies", e);
        if (alive) setStrategiesLoading(false);
      }
    };
    load();
    return () => { alive = false; };
  }, [profile?.id]);

  // ── Load holdings securities logos ─────────────────────────────────────────
  useEffect(() => {
    if (!supabase || rawStrategies.length === 0) return;
    const fetch_ = async () => {
      try {
        const tickers = [...new Set(rawStrategies.flatMap(s =>
          getHoldingsArray(s).flatMap(h => {
            const raw = h.ticker || h.symbol || h;
            const norm = normalizeSymbol(raw);
            return norm && norm !== raw ? [raw, norm] : [raw];
          })
        ))];
        if (!tickers.length) return;
        const chunks = Array.from({ length: Math.ceil(tickers.length / 50) }, (_, i) =>
          supabase.from("securities").select("id, symbol, logo_url, name, last_price").in("symbol", tickers.slice(i * 50, (i + 1) * 50))
        );
        const results = await Promise.all(chunks);
        const merged = results.flatMap(({ data, error }) => (!error && data) ? data : []);
        if (merged.length) setHoldingsSecurities(merged);
      } catch (e) { console.error(e); }
    };
    fetch_();
  }, [rawStrategies]);

  // ── Load holdings ──────────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (!supabase || !profile?.id) return;
      if (alive) setHoldingsLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) { if (alive) setHoldingsLoading(false); return; }
        const res = await fetch("/api/user/holdings", { headers: { Authorization: `Bearer ${session.access_token}` } });
        if (!res.ok) { if (alive) setHoldingsLoading(false); return; }
        const { holdings = [] } = await res.json();
        if (!holdings.length) { if (alive) { setHoldingsRows([]); setHoldingsLoading(false); } return; }

        const mapped = holdings.map(h => {
          const symbol = h.symbol || "—";
          const qty    = Number(h.quantity);
          const avg    = Number(h.avg_fill);
          const price  = Number(h.last_price);
          const mktVal = isFinite(price) && isFinite(qty) ? price * qty : NaN;
          const unreal = isFinite(price) && isFinite(avg) && isFinite(qty) ? (price - avg) * qty : NaN;
          return {
            type: "Holdings",
            logoUrl: h.logo_url || null,
            title: h.name || symbol,
            instrument: h.name || symbol,
            desc: h.exchange ? `${symbol} · ${h.exchange}` : symbol,
            ticker: symbol,
            quantity: isFinite(qty) ? qty.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 6 }) : "—",
            avgCost:    isFinite(avg)    ? formatCurrency(avg / 100)    : "—",
            marketPrice: isFinite(price)  ? formatCurrency(price / 100)  : "—",
            marketValue: isFinite(mktVal) ? formatCurrency(mktVal / 100) : "—",
            unrealizedPL: isFinite(unreal) ? `${unreal < 0 ? "-" : "+"}${formatCurrency(Math.abs(unreal) / 100)}` : "—",
            amount: isFinite(mktVal) ? formatCurrency(mktVal / 100) : "—",
            date: (() => { const d = new Date(h.as_of_date || h.updated_at || h.created_at); return isNaN(d) ? "—" : d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }); })(),
            time: (() => { const d = new Date(h.as_of_date || h.updated_at || h.created_at); return isNaN(d) ? "—" : d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }); })(),
            meta: "Market value", flow: "in",
            status: h.Status || null,
            settlement_status: h.settlement_status || null,
          };
        });

        if (alive) {
          setHoldingsRows(mapped);
          setHoldingsRaw(holdings.map(h => ({ id: h.id, quantity: Number(h.quantity), marketValue: Number(h.market_value), lastPrice: Number(h.last_price) })));
          setHoldingsLoading(false);
        }
      } catch (e) {
        console.error("Failed to load holdings", e);
        if (alive) setHoldingsLoading(false);
      }
    };
    load();
    return () => { alive = false; };
  }, [profile?.id]);

  // ── Update market values ───────────────────────────────────────────────────
  useEffect(() => {
    const update = async () => {
      if (!supabase || activeTab !== "holdings" || !holdingsRaw.length) return;
      const updates = holdingsRaw.filter(h => isFinite(h.quantity) && isFinite(h.lastPrice)).map(h => {
        const cv = h.lastPrice * h.quantity;
        return (!isFinite(h.marketValue) || Math.abs(h.marketValue - cv) > 0.01) ? { id: h.id, market_value: cv } : null;
      }).filter(Boolean);
      if (!updates.length) return;
      await Promise.all(updates.map(u => supabase.from("stock_holdings").update({ market_value: u.market_value }).eq("id", u.id)));
    };
    update();
  }, [activeTab, holdingsRaw]);

  const holdingsBySymbol     = useMemo(() => buildHoldingsBySymbol(holdingsSecurities), [holdingsSecurities]);
  const strategySnapshotsMap = useMemo(() => {
    const map = new Map();
    rawStrategies.forEach(s => map.set(s.short_name || s.name, getStrategyHoldingsSnapshot(s, holdingsBySymbol)));
    return map;
  }, [rawStrategies, holdingsBySymbol]);

  // ── Activity items ─────────────────────────────────────────────────────────
  const activityItems = useMemo(() =>
    activityTransactions.map(t => ({
      id: t.id,
      title: t.name || t.description || "Transaction",
      description: t.description || t.store_reference || "",
      date: t.transaction_date || t.created_at || "",
      displayDate: formatShortDate(t.transaction_date || t.created_at),
      time: formatTime(t.transaction_date || t.created_at),
      amount: formatAmount(t.amount, t.direction),
      rawAmount: (t.amount || 0) / 100,
      direction: t.direction,
      status: t.status,
      settlement_status: t.settlement_status || null,
      filterCategory: getFilterCategory(t.direction, t.name),
      isPositive: t.direction === "credit",
      groupLabel: formatRelativeDate(t.transaction_date || t.created_at),
      logo_url: t.logo_url,
      holding_logos: t.holding_logos || [],
    }))
  , [activityTransactions]);

  const activitySummaryStats = useMemo(() => {
    const totalIn  = activityItems.filter(i => !/(withdraw|repay)/i.test(i.title)).reduce((s, i) => s + Math.abs(i.rawAmount), 0);
    const totalOut = activityItems.filter(i =>  /(withdraw|repay)/i.test(i.title)).reduce((s, i) => s + Math.abs(i.rawAmount), 0);
    return { totalIn, totalOut, count: activityItems.length };
  }, [activityItems]);

  const activityVisibleItems = useMemo(() => {
    let items = activityFilter === "All" ? activityItems : activityItems.filter(i => i.filterCategory === activityFilter);
    if (activitySearchQuery.trim()) {
      const q = activitySearchQuery.toLowerCase();
      items = items.filter(i => i.title.toLowerCase().includes(q) || i.description.toLowerCase().includes(q) || i.amount.toLowerCase().includes(q));
    }
    if (computedFrom || computedTo) {
      const ft = computedFrom ? new Date(`${computedFrom}T00:00:00`).getTime() : null;
      const tt = computedTo   ? new Date(`${computedTo}T23:59:59`).getTime()   : null;
      items = items.filter(i => { const t = new Date(i.date).getTime(); return !isNaN(t) && (!ft || t >= ft) && (!tt || t <= tt); });
    }
    return items;
  }, [activityFilter, activitySearchQuery, computedFrom, computedTo, activityItems]);

  const activityGroupedItems = useMemo(() => {
    const groups = {};
    activityVisibleItems.forEach(i => { if (!groups[i.groupLabel]) groups[i.groupLabel] = []; groups[i.groupLabel].push(i); });
    const ORDER = ["Today", "Yesterday", "This Week", "This Month"];
    return Object.entries(groups)
      .sort(([a, ai], [b, bi]) => {
        const ia = ORDER.indexOf(a), ib = ORDER.indexOf(b);
        if (ia !== -1 && ib !== -1) return ia - ib;
        if (ia !== -1) return -1; if (ib !== -1) return 1;
        return new Date(bi[0].date).getTime() - new Date(ai[0].date).getTime();
      })
      .map(([label, items]) => ({ label, items }));
  }, [activityVisibleItems]);

  // ── Filters / pagination ───────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const combined = [...strategyRows, ...holdingsRows];
    return combined.filter(r => activeTab === "strategy" ? r.type === "Strategy" : activeTab === "holdings" ? r.type === "Holdings" : false);
  }, [strategyRows, holdingsRows, activeTab]);

  const searchFiltered = useMemo(() =>
    searchQuery.trim() ? filtered.filter(r => r.title.toLowerCase().includes(searchQuery.trim().toLowerCase())) : filtered
  , [filtered, searchQuery]);

  const pages    = Math.max(1, Math.ceil(searchFiltered.length / perPage));
  const pageRows = searchFiltered.slice((page - 1) * perPage, page * perPage);

  useEffect(() => { setPage(1); }, [activeTab, searchQuery]);

  const isLoadingTab = (activeTab === "strategy" && strategiesLoading) || (activeTab === "holdings" && holdingsLoading);

  // ── PDF download ───────────────────────────────────────────────────────────
  const handleDownloadPdf = async () => {
    if (!dataReady || pdfLoading) return;
    setPdfLoading(true);
    try {
      await generateMintStatement(profile, displayName, holdingsRows, strategyRows, activityItems, computedFrom, computedTo);
    } catch (e) {
      console.error("PDF generation failed:", e);
    } finally {
      setPdfLoading(false);
    }
  };

  const pdfLabel    = pdfLoading ? "Generating…" : !dataReady ? "Loading…" : "Download Statement PDF";
  const btnDisabled = !dataReady || pdfLoading;

  // ── Date range pill selector ───────────────────────────────────────────────
  // Rendered as an inline block — parent controls width
  const DateRangePills = () => (
    <div className="flex rounded-full bg-white/10 p-0.5 gap-0.5 w-full">
      {[null, 30, 60, 90].map((d) => (
        <button
          key={d ?? "all"}
          type="button"
          onClick={() => setDateRange(d)}
          className={`flex-1 rounded-full px-2 py-1.5 text-xs font-semibold transition whitespace-nowrap text-center ${
            dateRange === d
              ? "bg-white text-slate-900 shadow-sm"
              : "text-white/70 hover:bg-white/10 hover:text-white"
          }`}
        >
          {d ? `${d}d` : "All"}
        </button>
      ))}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 pb-[env(safe-area-inset-bottom)] text-slate-900">

      {/* ── Header gradient ── */}
      <div className="rounded-b-[36px] bg-gradient-to-b from-[#111111] via-[#3b1b7a] to-[#5b21b6] px-4 pb-10 pt-8 text-white">
        <div className="mx-auto flex w-full max-w-md flex-col gap-4">

          {/* Top bar: avatar | title | bell */}
          <header className="flex items-center justify-between">
            <div>
              {profile?.avatarUrl
                ? <img src={profile.avatarUrl} alt={displayName} className="h-10 w-10 rounded-full border border-white/40 object-cover" />
                : <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 border border-white/30 text-xs font-semibold text-white">{initials || "—"}</div>
              }
            </div>
            <h1 className="absolute left-1/2 -translate-x-1/2 text-xl font-semibold">Statements</h1>
            <NotificationBell onClick={onOpenNotifications} />
          </header>

          {/* Account number pill */}
          <div className="flex justify-center">
            <span className="rounded-full bg-white/10 border border-white/20 px-4 py-1 text-[11px] font-semibold text-white/80 tracking-wide backdrop-blur-sm">
              {mintAccountNumber}
            </span>
          </div>

          {/* Tabs */}
          <div className="grid w-full grid-cols-3 rounded-full bg-white/10 p-1 backdrop-blur-md">
            {[
              { id: "strategy",  label: "Strategy" },
              { id: "holdings",  label: "Individual Stocks" },
              { id: "activity",  label: "Transaction History" },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={
                  activeTab === tab.id
                    ? "w-full rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-sm"
                    : "w-full rounded-full px-3 py-1.5 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white"
                }
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Controls block — always two rows, never overflows ── */}
          <div className="flex flex-col gap-2 w-full">

            {/* Row 1: search (strategy/holdings only) + date pills */}
            <div className="flex items-center gap-2 w-full">
              {activeTab !== "activity" && (
                <input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-20 flex-shrink-0 rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs text-white placeholder:text-white/50 shadow-sm backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-white/40"
                />
              )}
              <DateRangePills />
            </div>

            {/* Row 2: full-width download button */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={btnDisabled}
              className="w-full rounded-full bg-white py-2.5 text-xs font-semibold text-slate-900 shadow-sm transition hover:bg-white/90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {pdfLabel}
            </button>

          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          ACTIVITY TAB
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "activity" ? (
        <div className="mx-auto -mt-6 w-full max-w-md px-4 pb-16">
          {activityLoading ? (
            <div className="space-y-3 mt-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm border border-slate-100/50">
                  <Skeleton className="h-11 w-11 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-24" /></div>
                  <Skeleton className="h-4 w-14 flex-shrink-0" />
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                {[
                  { label: "Money In",  val: activitySummaryStats.totalIn,  Icon: ArrowDownLeft, bg: "bg-emerald-50", ic: "text-emerald-600" },
                  { label: "Money Out", val: activitySummaryStats.totalOut, Icon: ArrowUpRight,  bg: "bg-red-50",     ic: "text-red-500"    },
                ].map(({ label, val, Icon, bg, ic }) => (
                  <div key={label} className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100/80">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className={`h-6 w-6 rounded-full ${bg} flex items-center justify-center`}><Icon className={`h-3 w-3 ${ic}`} /></div>
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
                    </div>
                    <p className="text-lg font-bold text-slate-900">
                      R{val.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                ))}
              </div>

              {/* Search */}
              <div className="mt-4 relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  ref={activitySearchRef}
                  type="text"
                  placeholder="Search transactions..."
                  value={activitySearchQuery}
                  onChange={e => setActivitySearchQuery(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-10 py-3 text-sm text-slate-700 placeholder-slate-400 focus:border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-50 transition"
                />
                {activitySearchQuery && (
                  <button
                    onClick={() => setActivitySearchQuery("")}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded-full bg-slate-200 text-slate-500 hover:bg-slate-300"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Filter pills */}
              <div className="mt-4 flex gap-2 overflow-x-auto scrollbar-none">
                {activityFilters.map(f => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setActivityFilter(f)}
                    className={`flex-shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition ${
                      activityFilter === f
                        ? "bg-slate-900 text-white shadow-sm"
                        : "bg-white text-slate-500 hover:text-slate-700 shadow-sm border border-slate-100"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {/* Active date range indicator */}
              {dateRange && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-500 bg-violet-50 border border-violet-100 rounded-full px-3 py-1">
                    Last {dateRange} days
                  </span>
                  <button
                    type="button"
                    onClick={() => setDateRange(null)}
                    className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 flex items-center gap-1"
                  >
                    <X className="h-3 w-3" /> Clear
                  </button>
                </div>
              )}

              <p className="mt-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                {activityVisibleItems.length} transaction{activityVisibleItems.length !== 1 ? "s" : ""}
              </p>

              {activityGroupedItems.length === 0 ? (
                <div className="mt-8 flex flex-col items-center justify-center text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-4">
                    {activitySearchQuery ? <Search className="h-7 w-7" /> : <TrendingUp className="h-7 w-7" />}
                  </div>
                  <p className="text-sm font-semibold text-slate-900 mb-1">
                    {activitySearchQuery ? "No results found" : "No activity yet"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {activitySearchQuery ? `No transactions matching "${activitySearchQuery}"` : "Your transactions will appear here"}
                  </p>
                </div>
              ) : (
                <section className="mt-3 space-y-5">
                  {activityGroupedItems.map((group, gi) => (
                    <div key={`${group.label}-${gi}`}>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3 px-1">{group.label}</p>
                      <div className="space-y-2">
                        {group.items.map((item, ii) => {
                          const Icon   = getTransactionIcon(item.title, item.direction);
                          const colors = getIconColors(item.direction, item.title);
                          return (
                            <div key={`${item.id || ii}`} className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm border border-slate-100/50">
                              {item.holding_logos?.length > 0 ? (
                                <div className="flex -space-x-2 flex-shrink-0">
                                  {item.holding_logos.slice(0, 3).map((hl, hi) => (
                                    <img
                                      key={`${hl.symbol}-${hi}`}
                                      src={hl.logo_url}
                                      alt={hl.name || hl.symbol}
                                      className="h-9 w-9 rounded-full object-cover bg-white border-2 border-white shadow-sm"
                                      onError={e => { e.target.style.display = "none"; }}
                                    />
                                  ))}
                                </div>
                              ) : item.logo_url ? (
                                <img
                                  src={item.logo_url}
                                  alt=""
                                  className="h-11 w-11 flex-shrink-0 rounded-full object-cover bg-slate-50 border border-slate-100"
                                  onError={e => { e.target.style.display = "none"; }}
                                />
                              ) : (
                                <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full ${colors.bg}`}>
                                  <Icon className={`h-5 w-5 ${colors.text}`} />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-800 truncate">{item.title}</p>
                                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                  <p className="text-[11px] text-slate-400">{item.displayDate}</p>
                                  {item.time && (
                                    <><span className="text-slate-300">&middot;</span><p className="text-[11px] text-slate-400">{item.time}</p></>
                                  )}
                                  {item.settlement_status && item.settlement_status !== "confirmed" ? (
                                    <><span className="text-slate-300">&middot;</span><SettlementBadge status={item.settlement_status} size="xs" /></>
                                  ) : item.status ? (
                                    <>
                                      <span className="text-slate-300">&middot;</span>
                                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                                        ["successful","completed","posted"].includes(item.status) ? "bg-emerald-50 text-emerald-600"
                                          : item.status === "pending" ? "bg-amber-50 text-amber-600"
                                          : item.status === "failed"  ? "bg-rose-50 text-rose-500"
                                          : "bg-slate-100 text-slate-500"
                                      }`}>
                                        {["successful","completed","posted"].includes(item.status)
                                          ? "Completed"
                                          : item.status === "pending" ? "Pending"
                                          : item.status === "failed"  ? "Failed"
                                          : item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                                      </span>
                                    </>
                                  ) : null}
                                </div>
                              </div>
                              <p className="text-sm font-bold tabular-nums flex-shrink-0 text-slate-900">{item.amount}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </section>
              )}
            </>
          )}
        </div>

      ) : (
      /* ══════════════════════════════════════════════════════════════════════
          STRATEGY / HOLDINGS TABS
      ══════════════════════════════════════════════════════════════════════ */
        <div className="mx-auto -mt-6 w-full max-w-md px-4 pb-16">
          <div className="rounded-3xl border border-slate-100/80 bg-white/90 backdrop-blur-sm p-4 shadow-[0_2px_16px_-2px_rgba(0,0,0,0.08)]">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-semibold text-slate-700">Recent items</p>
              <p className="text-xs text-slate-500">Showing {pageRows.length} of {searchFiltered.length}</p>
            </div>

            {isLoadingTab ? (
              <div className="mt-4 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="w-full rounded-3xl border border-slate-100/80 bg-white/90 p-4">
                    <div className="flex items-start gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-24" /></div>
                      <div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-3 w-14" /></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : pageRows.length === 0 ? (
              <div className="rounded-3xl bg-white px-6 py-12 text-center shadow-md mt-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                  <MoreHorizontal className="h-7 w-7 text-slate-400" />
                </div>
                <p className="mt-4 text-sm font-semibold text-slate-700">
                  {activeTab === "strategy" ? "No strategies subscribed" : "No data available"}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {activeTab === "strategy"
                    ? "You haven't subscribed to any strategies yet."
                    : "There are no items to display for this view."}
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {pageRows.map((row, idx) => {
                  if (row.type === "Strategy") {
                    const pct      = row.changePct;
                    const hasPct   = pct != null && isFinite(pct);
                    const snapshot = strategySnapshotsMap.get(row.title) || [];
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedCard(row)}
                        className="w-full rounded-3xl border border-slate-100/80 bg-white/90 backdrop-blur-sm p-4 text-left shadow-[0_2px_16px_-2px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.12)] active:scale-[0.97] transition-all"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-1.5">
                              <p className="truncate text-sm font-semibold text-slate-900">{row.title}</p>
                              {(() => {
                                const s = row.settlement_status || holdingSettlementStatus;
                                return s && s !== "confirmed" ? <SettlementBadge status={s} size="xs" /> : null;
                              })()}
                            </div>
                            <p className="text-xs text-slate-600 line-clamp-1">{row.riskLevel || row.meta} • {row.desc}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-semibold text-slate-900">{row.amount}</p>
                            {hasPct && (
                              <p className={`text-xs font-semibold ${pct >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                                {pct >= 0 ? "+" : ""}{pct.toFixed(2)}%
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          {row.riskLevel && (
                            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                              {row.riskLevel}
                            </span>
                          )}
                          {snapshot.length > 0 && (
                            <div className="flex items-center gap-2">
                              <div className="flex -space-x-2">
                                {snapshot.slice(0, 3).map(h => (
                                  <div key={`${row.title}-${h.id || h.symbol}`} className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-white bg-white shadow-sm">
                                    {h.logo_url
                                      ? <img src={h.logo_url} alt={h.name} className="h-full w-full object-cover" />
                                      : <div className="flex h-full w-full items-center justify-center bg-slate-100 text-[8px] font-bold text-slate-600">{h.symbol?.substring(0, 2)}</div>}
                                  </div>
                                ))}
                                {snapshot.length > 3 && (
                                  <div className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-[10px] font-semibold text-slate-500">
                                    +{snapshot.length - 3}
                                  </div>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-400">Holdings</span>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  }

                  if (row.type === "Holdings") {
                    const pnlText  = row.unrealizedPL || "—";
                    const pnlColor = pnlText.startsWith("+") ? "text-emerald-600" : pnlText.startsWith("-") ? "text-red-600" : "text-slate-400";
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedCard(row)}
                        className="w-full rounded-3xl border border-slate-100/80 bg-white/90 backdrop-blur-sm p-4 text-left shadow-[0_2px_16px_-2px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.12)] active:scale-[0.97] transition-all"
                      >
                        <div className="flex items-start gap-3">
                          {row.logoUrl
                            ? <img src={row.logoUrl} alt={row.ticker} className="h-10 w-10 rounded-full border border-slate-100 object-cover" />
                            : <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-purple-600 text-sm font-bold text-white">{row.ticker?.substring(0, 2) || "—"}</div>
                          }
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="truncate text-sm font-semibold text-slate-900">{row.title}</p>
                                  {(() => {
                                    const s = row.settlement_status || holdingSettlementStatus;
                                    return s && s !== "confirmed" ? <SettlementBadge status={s} size="xs" /> : null;
                                  })()}
                                </div>
                                <p className="text-xs text-slate-500">{row.desc}</p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-sm font-semibold text-slate-900">{row.amount}</p>
                                <p className={`text-xs font-semibold ${pnlColor}`}>{pnlText}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  }
                  return null;
                })}
              </div>
            )}

            {/* Pagination */}
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-slate-600">Page {page} of {pages}</span>
              <button
                onClick={() => setPage(p => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          DETAIL MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      {selectedCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
          <button type="button" className="absolute inset-0 h-full w-full cursor-default" onClick={() => setSelectedCard(null)} />
          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-center pt-3 pb-1">
              <div className="h-1.5 w-12 rounded-full bg-slate-200" />
            </div>
            <div className="max-h-[75vh] overflow-y-auto px-6 pb-6 pt-2">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">
                  {selectedCard.type === "Holdings"  ? "Stock Details"
                    : selectedCard.type === "Strategy" ? "Strategy Details"
                    : "Transaction Details"}
                </h2>
                <button
                  type="button"
                  onClick={() => setSelectedCard(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* ── Holdings detail ── */}
              {selectedCard.type === "Holdings" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                      {selectedCard.logoUrl
                        ? <img src={selectedCard.logoUrl} alt={selectedCard.title} className="h-full w-full object-contain" />
                        : <div className="flex h-full w-full items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 text-lg font-bold text-white">{selectedCard.ticker?.substring(0, 2) || "—"}</div>}
                    </div>
                    <div>
                      <p className="text-base font-bold text-slate-900">{selectedCard.title}</p>
                      <p className="text-sm text-slate-500">{selectedCard.desc}</p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-4 text-center">
                    <p className="text-2xl font-bold text-slate-900">{selectedCard.amount}</p>
                    <p className={`mt-1 text-sm font-semibold ${
                      selectedCard.unrealizedPL?.startsWith("+") ? "text-emerald-600"
                        : selectedCard.unrealizedPL?.startsWith("-") ? "text-red-600"
                        : "text-slate-400"
                    }`}>{selectedCard.unrealizedPL || "—"}</p>
                    <p className="mt-0.5 text-xs text-slate-400">Unrealised P/L</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ["Quantity",     selectedCard.quantity],
                      ["Avg Cost",     selectedCard.avgCost],
                      ["Market Price", selectedCard.marketPrice],
                      ["Market Value", selectedCard.marketValue],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-2xl border border-slate-100 bg-white p-3.5">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{value || "—"}</p>
                      </div>
                    ))}
                  </div>
                  {selectedCard.date && (
                    <p className="text-center text-xs text-slate-400">As of {selectedCard.date}</p>
                  )}
                </div>
              )}

              {/* ── Strategy detail ── */}
              {selectedCard.type === "Strategy" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const snap = strategySnapshotsMap.get(selectedCard.title) || [];
                      return snap.length > 0 ? (
                        <div className="flex -space-x-2">
                          {snap.slice(0, 3).map(h => (
                            <div key={`modal-${h.id || h.symbol}`} className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-white shadow-sm">
                              {h.logo_url
                                ? <img src={h.logo_url} alt={h.name} className="h-full w-full object-cover" />
                                : <div className="flex h-full w-full items-center justify-center bg-slate-100 text-[10px] font-bold text-slate-600">{h.symbol?.substring(0, 2)}</div>}
                            </div>
                          ))}
                        </div>
                      ) : null;
                    })()}
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-bold text-slate-900">{selectedCard.fullName || selectedCard.title}</p>
                      {selectedCard.objective && <p className="text-sm text-slate-500">{selectedCard.objective}</p>}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-purple-50 to-white p-4 text-center">
                    <p className="text-2xl font-bold text-slate-900">{selectedCard.currentValue || selectedCard.amount}</p>
                    {selectedCard.changePct != null && isFinite(selectedCard.changePct) && (
                      <p className={`mt-1 text-sm font-semibold ${selectedCard.changePct >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {selectedCard.changePct >= 0 ? "+" : ""}{selectedCard.changePct.toFixed(2)}%
                        {selectedCard.changeAbs != null && (
                          <span className="ml-1 text-xs font-normal text-slate-400">
                            ({selectedCard.changeAbs >= 0 ? "+" : ""}{formatCurrency(selectedCard.changeAbs)})
                          </span>
                        )}
                      </p>
                    )}
                    <p className="mt-0.5 text-xs text-slate-400">Current Value</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedCard.riskLevel    && <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">{selectedCard.riskLevel}</span>}
                    {selectedCard.baseCurrency && <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{selectedCard.baseCurrency}</span>}
                    {selectedCard.holdingsCount > 0 && <span className="rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700">{selectedCard.holdingsCount} Holdings</span>}
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-white">
                    <p className="px-4 pt-3 pb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Performance</p>
                    <div className="divide-y divide-slate-50">
                      {[
                        ["1 Week",    selectedCard.r1w],
                        ["1 Month",   selectedCard.r1m],
                        ["3 Months",  selectedCard.r3m],
                        ["6 Months",  selectedCard.r6m],
                        ["YTD",       selectedCard.rytd],
                        ["1 Year",    selectedCard.r1y],
                      ].filter(([, v]) => v != null).map(([label, val]) => (
                        <div key={label} className="flex items-center justify-between px-4 py-2.5">
                          <span className="text-sm text-slate-600">{label}</span>
                          <span className={`text-sm font-semibold ${Number(val) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                            {Number(val) >= 0 ? "+" : ""}{Number(val).toFixed(2)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ["Min Investment", selectedCard.minInvestment ? formatCurrency(selectedCard.minInvestment) : null],
                      ["Provider",       selectedCard.providerName],
                      ["Mgmt Fee",       selectedCard.managementFeeBps != null ? `${(selectedCard.managementFeeBps / 100).toFixed(2)}%` : null],
                      ["As of",          selectedCard.date],
                    ].filter(([, v]) => v).map(([label, value]) => (
                      <div key={label} className="rounded-2xl border border-slate-100 bg-white p-3.5">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatementsPage;
