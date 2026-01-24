import React, { useMemo, useState } from "react";
import { ArrowDownLeft, ArrowLeft, ArrowUpRight, CalendarDays } from "lucide-react";
import ActivitySkeleton from "../components/ActivitySkeleton";

const filters = ["All", "Investments", "Loans"];
const activityItems = [
  { title: "Investment gain", date: "2026-01-21", amount: "+R120", type: "Investments" },
  { title: "Loan repayment", date: "2026-01-21", amount: "-R300", type: "Loans" },
  { title: "Investment deposit", date: "2026-01-18", amount: "+R500", type: "Investments" },
  { title: "Loan repayment", date: "2026-01-16", amount: "-R250", type: "Loans" },
  { title: "Investment gain", date: "2026-01-14", amount: "+R80", type: "Investments" },
  { title: "Loan repayment", date: "2026-01-12", amount: "-R200", type: "Loans" },
];
const iconGradientId = "activity-icon-gradient";
const getActivityIcon = (item) =>
  item.amount?.startsWith("+") ? ArrowDownLeft : ArrowUpRight;
const formatGroupLabel = (dateString) => {
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return dateString;
  }
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
};

const ActivityPage = ({ onBack, isLoading = false }) => {
  if (isLoading) {
    return <ActivitySkeleton />;
  }
  const [activeFilter, setActiveFilter] = useState("All");
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const visibleItems = useMemo(() => {
    const typeFiltered =
      activeFilter === "All"
        ? activityItems
        : activityItems.filter((item) => item.type === activeFilter);
    const hasDateFilter = fromDate || toDate;
    if (!hasDateFilter) {
      return typeFiltered;
    }
    const fromTime = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : null;
    const toTime = toDate ? new Date(`${toDate}T23:59:59`).getTime() : null;
    return typeFiltered.filter((item) => {
      const itemTime = new Date(`${item.date}T00:00:00`).getTime();
      if (Number.isNaN(itemTime)) {
        return false;
      }
      if (fromTime && itemTime < fromTime) {
        return false;
      }
      if (toTime && itemTime > toTime) {
        return false;
      }
      return true;
    });
  }, [activeFilter, fromDate, toDate]);

  const groupedItems = useMemo(() => {
    const groups = visibleItems.reduce((acc, item) => {
      const label = formatGroupLabel(item.date);
      if (!acc[label]) {
        acc[label] = [];
      }
      acc[label].push(item);
      return acc;
    }, {});
    return Object.entries(groups)
      .map(([label, items]) => ({ label, items }))
      .sort((a, b) => {
        const dateA = new Date(`${a.items[0].date}T00:00:00`).getTime();
        const dateB = new Date(`${b.items[0].date}T00:00:00`).getTime();
        return dateB - dateA;
      });
  }, [visibleItems]);

  return (
    <div className="min-h-screen bg-slate-50 pb-[env(safe-area-inset-bottom)] text-slate-900">
      <div className="mx-auto flex w-full max-w-sm flex-col px-4 pb-10 pt-12 md:max-w-md md:px-8">
        <svg aria-hidden="true" className="absolute h-0 w-0">
          <defs>
            <linearGradient id={iconGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#000000" />
            </linearGradient>
          </defs>
        </svg>
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
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm"
          >
            <CalendarDays className="h-5 w-5" />
          </button>
        </header>

        {showDateFilter && (
          <div className="mt-4 rounded-3xl bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Date range
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-xs font-semibold text-slate-500">
                From
                <input
                  type="date"
                  value={fromDate}
                  onChange={(event) => setFromDate(event.target.value)}
                  className="rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
                />
              </label>
              <label className="flex flex-col gap-2 text-xs font-semibold text-slate-500">
                To
                <input
                  type="date"
                  value={toDate}
                  onChange={(event) => setToDate(event.target.value)}
                  className="rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
                />
              </label>
            </div>
          </div>
        )}

        <div className="mt-6 flex gap-2 rounded-full bg-white p-1 shadow-sm">
          {filters.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className={`flex-1 rounded-full px-3 py-1.5 text-xs font-semibold ${
                activeFilter === filter
                  ? "bg-slate-900 text-white"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        <section className="mt-6 space-y-6">
          {groupedItems.map((group, groupIndex) => (
            <div key={`${group.label}-${groupIndex}`} className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                {group.label}
              </p>
              {group.items.map((item, itemIndex) => {
                const Icon = getActivityIcon(item);
                return (
                  <div
                    key={`${item.title}-${item.date}-${item.amount}`}
                    className="flex gap-3 rounded-3xl bg-white p-4 shadow-sm"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm">
                      {Icon && (
                        <Icon
                          className="h-5 w-5"
                          style={{ stroke: `url(#${iconGradientId})` }}
                        />
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                        <div className="text-xs text-slate-400">{formatGroupLabel(item.date)}</div>
                      </div>
                      <p className="text-xs text-slate-500">{item.type}</p>
                    </div>
                    <p className="text-sm font-semibold text-slate-600">{item.amount}</p>
                  </div>
                );
              })}
            </div>
          ))}
        </section>
      </div>
    </div>
  );
};

export default ActivityPage;
