import React from "react";
import { ArrowDownLeft, ArrowUpRight, TrendingUp, CreditCard, Wallet, RefreshCw, Gift } from "lucide-react";
import SettlementBadge from "./PendingBadge";

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

const TransactionHistorySection = ({ items, onViewAll }) => {
  return (
    <section className="rounded-3xl bg-white px-5 py-5 shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-900">Transaction history</h2>
        <button
          type="button"
          onClick={onViewAll}
          className="text-xs font-semibold text-violet-600 active:opacity-70 transition-colors"
        >
          View all
        </button>
      </div>
      <div className="flex flex-col gap-3">
        {items && items.length > 0 ? (
          items.slice(0, 3).map((item, idx) => {
            const Icon = getTransactionIcon(item.title, item.direction);
            const colors = getIconColors(item.direction, item.title);
            const settlementStatus = item.settlement_status;
            const showSettlement = settlementStatus && settlementStatus !== "confirmed";
            return (
              <div
                key={`${item.title}-${item.date}-${idx}`}
                className="flex items-center gap-3 rounded-2xl border border-slate-100/80 bg-slate-50/50 px-4 py-3"
              >
                {item.holding_logos && item.holding_logos.length > 0 ? (
                  <div className="flex -space-x-2 flex-shrink-0">
                    {item.holding_logos.slice(0, 3).map((hl, hlIdx) => (
                      <img
                        key={`${hl.symbol}-${hlIdx}`}
                        src={hl.logo_url}
                        alt={hl.name || hl.symbol}
                        className="h-8 w-8 rounded-full object-cover bg-white border-2 border-white shadow-sm"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ))}
                  </div>
                ) : item.logo_url ? (
                  <img
                    src={item.logo_url}
                    alt=""
                    className="h-10 w-10 flex-shrink-0 rounded-full object-cover bg-slate-50 border border-slate-100"
                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                  />
                ) : null}
                <div className={`${item.holding_logos?.length > 0 || item.logo_url ? 'hidden' : 'flex'} h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${colors.bg}`}>
                  <Icon className={`h-4.5 w-4.5 ${colors.text}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{item.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-[11px] text-slate-400">{item.date}</p>
                    {showSettlement ? (
                      <>
                        <span className="text-slate-300">·</span>
                        <SettlementBadge status={settlementStatus} size="xs" />
                      </>
                    ) : item.status && !showSettlement ? (
                      <>
                        <span className="text-slate-300">·</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                          item.status === "successful" || item.status === "completed" || item.status === "posted"
                            ? "bg-emerald-50 text-emerald-600"
                            : item.status === "pending"
                            ? "bg-amber-50 text-amber-600"
                            : "bg-slate-100 text-slate-500"
                        }`}>
                          {item.status === "successful" || item.status === "completed" || item.status === "posted" ? "Completed" : item.status === "pending" ? "Pending" : item.status}
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>
                <p className="text-sm font-bold tabular-nums flex-shrink-0 text-slate-900">
                  {item.amount}
                </p>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 mb-3">
              <TrendingUp className="h-5 w-5 text-slate-400" />
            </div>
            <p className="text-xs font-semibold text-slate-600">No transactions yet</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Your activity will appear here</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default TransactionHistorySection;
