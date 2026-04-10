import React, { useMemo, useState, useRef } from "react";
import { ArrowDownLeft, ArrowLeft, ArrowUpRight, CalendarDays, Search, X, TrendingUp, CreditCard, Wallet, RefreshCw, Gift, Filter, ChevronDown } from "lucide-react";
import ActivitySkeleton from "../components/ActivitySkeleton";
import { useTransactions } from "../lib/useFinancialData";

const filters = ["All", "Investments", "Fees", "Withdrawals"];

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
  if (lower.includes("fee") || lower.includes("commission") || lower.includes("brokerage") || lower.includes("charge") || lower.includes("levy")) return "Fees";
  if (lower.includes("invest") || lower.includes("buy") || lower.includes("purchas") || lower.includes("strategy") || direction === "debit") return "Investments";
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

const formatAmount = (amount, direction) => {
  if (amount === undefined || amount === null) return "R0.00";
  const val = Math.abs(amount) / 100;
  return `R${val.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const ActivityPage = ({ onBack }) => {
  const { transactions, loading } = useTransactions(100);
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const searchRef = useRef(null);

  const activityItems = useMemo(() => {
    return transactions.map((t) => {
      const isPositive = t.direction === "credit";
      return {
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
        filterCategory: getFilterCategory(t.direction, t.name),
        isPositive,
        groupLabel: formatRelativeDate(t.transaction_date || t.created_at),
        logo_url: t.logo_url,
        holding_logos: t.holding_logos || [],
      };
    });
  }, [transactions]);

  const summaryStats = useMemo(() => {
    const totalIn = activityItems.filter(i => {
      const lower = (i.title || "").toLowerCase();
      const isWithdrawal = lower.includes("withdraw") || lower.includes("repay");
      return !isWithdrawal;
    }).reduce((sum, i) => sum + Math.abs(i.rawAmount), 0);
    const totalOut = activityItems.filter(i => {
      const lower = (i.title || "").toLowerCase();
      return lower.includes("withdraw") || lower.includes("repay");
    }).reduce((sum, i) => sum + Math.abs(i.rawAmount), 0);
    return { totalIn, totalOut, count: activityItems.length };
  }, [activityItems]);

  const visibleItems = useMemo(() => {
    let filtered = activeFilter === "All"
      ? activityItems
      : activityItems.filter((item) => item.filterCategory === activeFilter);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((item) =>
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.amount.toLowerCase().includes(q)
      );
    }

    if (fromDate || toDate) {
      const fromTime = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : null;
      const toTime = toDate ? new Date(`${toDate}T23:59:59`).getTime() : null;
      filtered = filtered.filter((item) => {
        const itemTime = new Date(item.date).getTime();
        if (isNaN(itemTime)) return false;
        if (fromTime && itemTime < fromTime) return false;
        if (toTime && itemTime > toTime) return false;
        return true;
      });
    }

    return filtered;
  }, [activeFilter, searchQuery, fromDate, toDate, activityItems]);

  const groupedItems = useMemo(() => {
    const groups = {};
    visibleItems.forEach((item) => {
      const label = item.groupLabel;
      if (!groups[label]) groups[label] = [];
      groups[label].push(item);
    });
    const groupOrder = ["Today", "Yesterday", "This Week", "This Month"];
    return Object.entries(groups)
      .sort(([a, aItems], [b, bItems]) => {
        const aIdx = groupOrder.indexOf(a);
        const bIdx = groupOrder.indexOf(b);
        if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
        if (aIdx !== -1) return -1;
        if (bIdx !== -1) return 1;
        const dateA = new Date(aItems[0].date).getTime();
        const dateB = new Date(bItems[0].date).getTime();
        return dateB - dateA;
      })
      .map(([label, items]) => ({ label, items }));
  }, [visibleItems]);

  if (loading) return <ActivitySkeleton />;

  return (
    <div className="min-h-screen bg-slate-50 pb-[env(safe-area-inset-bottom)] text-slate-900">
      <div className="mx-auto flex w-full max-w-sm flex-col px-4 pb-10 pt-12 md:max-w-md md:px-8">
        <header className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold">Activity</h1>
          <button
            type="button"
            aria-label="Filter by date"
            onClick={() => setShowDateFilter((prev) => !prev)}
            className={`flex h-10 w-10 items-center justify-center rounded-full shadow-sm transition ${showDateFilter || fromDate || toDate ? "bg-blue-50 text-blue-600" : "bg-white text-slate-700"}`}
          >
            <CalendarDays className="h-5 w-5" />
          </button>
        </header>

        <div className="mt-5 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-10 py-3 text-sm text-slate-700 placeholder-slate-400 focus:border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-50 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded-full bg-slate-200 text-slate-500 hover:bg-slate-300 transition"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {showDateFilter && (
          <div className="mt-3 rounded-2xl bg-white p-4 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-500">Date Range</p>
              {(fromDate || toDate) && (
                <button onClick={() => { setFromDate(""); setToDate(""); }} className="text-[11px] font-semibold text-blue-600">
                  Clear
                </button>
              )}
            </div>
            <div className="grid gap-3 grid-cols-2">
              <label className="flex flex-col gap-1.5 text-[11px] font-semibold text-slate-400">
                From
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-200 focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-[11px] font-semibold text-slate-400">
                To
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-200 focus:outline-none"
                />
              </label>
            </div>
          </div>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100/80">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="h-6 w-6 rounded-full bg-emerald-50 flex items-center justify-center">
                <ArrowDownLeft className="h-3 w-3 text-emerald-600" />
              </div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Money In</p>
            </div>
            <p className="text-lg font-bold text-slate-900">R{summaryStats.totalIn.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100/80">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="h-6 w-6 rounded-full bg-red-50 flex items-center justify-center">
                <ArrowUpRight className="h-3 w-3 text-red-500" />
              </div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Money Out</p>
            </div>
            <p className="text-lg font-bold text-slate-900">R{summaryStats.totalOut.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
        </div>

        <div className="mt-5 flex gap-2 overflow-x-auto scrollbar-none">
          {filters.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className={`flex-shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition ${
                activeFilter === filter
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-white text-slate-500 hover:text-slate-700 shadow-sm border border-slate-100"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            {visibleItems.length} transaction{visibleItems.length !== 1 ? "s" : ""}
          </p>
        </div>

        {groupedItems.length === 0 ? (
          <div className="mt-12 flex flex-col items-center justify-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-4">
              {searchQuery ? <Search className="h-7 w-7" /> : <TrendingUp className="h-7 w-7" />}
            </div>
            <p className="text-sm font-semibold text-slate-900 mb-1">
              {searchQuery ? "No results found" : "No activity yet"}
            </p>
            <p className="text-xs text-slate-500">
              {searchQuery ? `No transactions matching "${searchQuery}"` : "Your transactions will appear here"}
            </p>
          </div>
        ) : (
          <section className="mt-4 space-y-5">
            {groupedItems.map((group, groupIndex) => (
              <div key={`${group.label}-${groupIndex}`}>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3 px-1">
                  {group.label}
                </p>
                <div className="space-y-2">
                  {group.items.map((item, itemIndex) => {
                    const Icon = getTransactionIcon(item.title, item.direction);
                    const colors = getIconColors(item.direction, item.title);
                    return (
                      <div
                        key={`${item.id || itemIndex}`}
                        className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm border border-slate-100/50"
                      >
                        {item.holding_logos && item.holding_logos.length > 0 ? (
                          <div className="flex -space-x-2 flex-shrink-0">
                            {item.holding_logos.slice(0, 3).map((hl, hlIdx) => (
                              <img
                                key={`${hl.symbol}-${hlIdx}`}
                                src={hl.logo_url}
                                alt={hl.name || hl.symbol}
                                className="h-9 w-9 rounded-full object-cover bg-white border-2 border-white shadow-sm"
                                onError={(e) => { e.target.style.display = 'none'; }}
                              />
                            ))}
                          </div>
                        ) : item.logo_url ? (
                          <img
                            src={item.logo_url}
                            alt=""
                            className="h-11 w-11 flex-shrink-0 rounded-full object-cover bg-slate-50 border border-slate-100"
                            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                          />
                        ) : null}
                        <div className={`${item.holding_logos?.length > 0 || item.logo_url ? 'hidden' : 'flex'} h-11 w-11 flex-shrink-0 items-center justify-center rounded-full ${colors.bg}`}>
                          <Icon className={`h-5 w-5 ${colors.text}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{item.title}</p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <p className="text-[11px] text-slate-400">{item.displayDate}</p>
                            {item.time && (
                              <>
                                <span className="text-slate-300">·</span>
                                <p className="text-[11px] text-slate-400">{item.time}</p>
                              </>
                            )}
                            {item.status && (
                              <>
                                <span className="text-slate-300">·</span>
                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                                  item.status === "successful" || item.status === "completed" || item.status === "posted"
                                    ? "bg-emerald-50 text-emerald-600"
                                    : item.status === "pending"
                                    ? "bg-amber-50 text-amber-600"
                                    : item.status === "failed"
                                    ? "bg-rose-50 text-rose-500"
                                    : "bg-slate-100 text-slate-500"
                                }`}>
                                  {item.status === "successful" || item.status === "completed" || item.status === "posted" ? "Completed" : item.status === "pending" ? "Awaiting payment confirmation" : item.status === "failed" ? "Failed" : item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <p className="text-sm font-bold tabular-nums flex-shrink-0 text-slate-900">
                          {item.amount}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
};

export default ActivityPage;
