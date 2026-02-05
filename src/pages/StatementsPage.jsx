import React, { useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, MoreHorizontal, X } from "lucide-react";
import { useProfile } from "../lib/useProfile";
import NotificationBell from "../components/NotificationBell";

const sampleRows = [
  {
    type: "Strategy",
    icon: "📊",
    title: "Q1 2026 Strategy",
    desc: "Quarterly investment planning",
    date: "Jan 15, 2026",
    amount: "$250,000",
    meta: "Allocated",
    flow: "out",
  },
  {
    type: "Holdings",
    icon: "📈",
    title: "Tech Stock Holdings",
    desc: "Technology sector investments",
    date: "Feb 01, 2026",
    amount: "$485,200",
    meta: "Market value",
    flow: "in",
  },
  {
    type: "Reports",
    icon: "📄",
    title: "2025 Annual Report",
    desc: "Year-end financial summary",
    date: "Dec 31, 2025",
    amount: "$1.2M",
    meta: "Total assets",
    flow: "in",
  },
  {
    type: "Strategy",
    icon: "⚠️",
    title: "Portfolio Risk Analysis",
    desc: "Volatility and exposure review",
    date: "Jan 28, 2026",
    amount: "Medium",
    meta: "Risk level",
    flow: "out",
  },
  {
    type: "Holdings",
    icon: "💰",
    title: "Bond Portfolio",
    desc: "Government and corporate bonds",
    date: "Jan 20, 2026",
    amount: "$320,000",
    meta: "Par value",
    flow: "in",
  },
  {
    type: "Reports",
    icon: "📋",
    title: "Form 1099-DIV",
    desc: "Dividend income statement",
    date: "Jan 31, 2026",
    amount: "$12,450",
    meta: "Total dividends",
    flow: "in",
  },
];

const StatementsPage = ({ onOpenNotifications }) => {
  const { profile } = useProfile();
  const [activeTab, setActiveTab] = useState("strategy");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(9);
  const [selectedCard, setSelectedCard] = useState(null);

  const displayName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ");
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  useEffect(() => {
    const calculatePerPage = () => {
      const viewportHeight = window.innerHeight;
      const availableHeight = viewportHeight - 380;
      const cardHeight = 50;
      const calculatedPerPage = Math.max(4, Math.floor(availableHeight / cardHeight));
      setPerPage(calculatedPerPage);
    };

    calculatePerPage();
    window.addEventListener("resize", calculatePerPage);
    return () => window.removeEventListener("resize", calculatePerPage);
  }, []);

  const filtered = sampleRows.filter((row) => {
    if (activeTab === "strategy") return row.type === "Strategy" || row.type === "Holdings";
    if (activeTab === "holdings") return row.type === "Holdings";
    if (activeTab === "reports") return row.type === "Reports";
    return true;
  });

  const pages = Math.max(1, Math.ceil(filtered.length / perPage));
  const start = (page - 1) * perPage;
  const pageRows = filtered.slice(start, start + perPage);

  return (
    <div className="min-h-screen bg-slate-50 pb-[env(safe-area-inset-bottom)] text-slate-900">
      <div className="rounded-b-[36px] bg-gradient-to-b from-[#111111] via-[#3b1b7a] to-[#5b21b6] px-4 pb-10 pt-8 text-white">
        <div className="mx-auto flex w-full max-w-md flex-col gap-6">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {profile?.avatarUrl ? (
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
            <h1 className="absolute left-1/2 -translate-x-1/2 text-xl font-semibold">Statements</h1>
            <NotificationBell onClick={onOpenNotifications} />
          </header>
          <div className="flex items-center justify-center">
            <div className="inline-flex items-center rounded-full bg-white/10 p-1 backdrop-blur-md">
              {[
                { id: "strategy", label: "Strategy" },
                { id: "holdings", label: "Holdings" },
                { id: "reports", label: "Reports" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={
                    activeTab === tab.id
                      ? "rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-sm"
                      : "rounded-full px-3 py-1.5 text-xs font-semibold text-white/70 transition-all hover:bg-white/10 hover:text-white"
                  }
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto -mt-6 w-full max-w-md px-4 pb-16">
        <div className="rounded-2xl bg-white p-4 shadow-md">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Recent items</p>
            <p className="text-xs text-slate-400">Showing {pageRows.length} of {filtered.length}</p>
          </div>

          <div className="mt-4 space-y-2">
            {pageRows.map((row, idx) => {
              const isIncoming = row.flow === "in";
              return (
                <div
                  key={idx}
                  onClick={() => setSelectedCard(row)}
                  className="group relative cursor-pointer overflow-hidden rounded-xl bg-white px-3 py-2.5 transition-all hover:bg-slate-50"
                >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 text-lg">
                    {row.icon}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="text-[13px] leading-tight text-slate-900">{row.title}</h3>
                    <p className="text-[11px] leading-tight text-slate-500">{row.desc}</p>
                  </div>

                  <div className="flex-shrink-0 text-right">
                    <div className="flex items-center justify-end gap-1 text-sm text-slate-900">
                      <span className={isIncoming ? "text-emerald-600" : "text-rose-500"}>
                        {isIncoming ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                      </span>
                      <span>{row.amount}</span>
                    </div>
                    <div className="text-[10px] text-slate-400">{row.meta}</div>
                  </div>

                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                    }}
                    className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>
                </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex items-center justify-center gap-2">
            <button
              className={`rounded px-3 py-2 ${page === 1 ? "cursor-not-allowed opacity-40" : "bg-slate-100 hover:bg-slate-200"}`}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1}
            >
              ‹
            </button>
            {Array.from({ length: pages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className={`rounded px-3 py-2 ${
                  page === i + 1 ? "bg-violet-600 text-white" : "bg-transparent text-slate-600 hover:bg-slate-100"
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              className={`rounded px-3 py-2 ${page === pages ? "cursor-not-allowed opacity-40" : "bg-slate-100 hover:bg-slate-200"}`}
              onClick={() => setPage((prev) => Math.min(pages, prev + 1))}
              disabled={page === pages}
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {selectedCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
          <button
            type="button"
            className="absolute inset-0 h-full w-full cursor-default"
            aria-label="Close modal"
            onClick={() => setSelectedCard(null)}
          />
          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-center pt-3">
              <div className="h-1.5 w-12 rounded-full bg-slate-200" />
            </div>

            <div className="p-6">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Statement Details</h2>
                <button
                  type="button"
                  onClick={() => setSelectedCard(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 text-4xl shadow-sm">
                    {selectedCard.icon}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="mb-1 text-xs uppercase text-slate-400">Type</p>
                    <p className="text-sm font-medium text-slate-900">{selectedCard.type}</p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="mb-1 text-xs uppercase text-slate-400">Title</p>
                    <p className="text-sm font-medium text-slate-900">{selectedCard.title}</p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="mb-1 text-xs uppercase text-slate-400">Description</p>
                    <p className="text-sm text-slate-700">{selectedCard.desc}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="mb-1 text-xs uppercase text-slate-400">Date</p>
                      <p className="text-sm font-medium text-slate-900">{selectedCard.date}</p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="mb-1 text-xs uppercase text-slate-400">Amount</p>
                      <div className="flex items-center gap-2">
                        <span className={selectedCard.flow === "in" ? "text-emerald-600" : "text-rose-500"}>
                          {selectedCard.flow === "in" ? (
                            <ArrowUpRight className="h-4 w-4" />
                          ) : (
                            <ArrowDownRight className="h-4 w-4" />
                          )}
                        </span>
                        <p className="text-base font-semibold text-slate-900">{selectedCard.amount}</p>
                      </div>
                      <p className="text-[10px] text-slate-400">{selectedCard.meta}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatementsPage;
