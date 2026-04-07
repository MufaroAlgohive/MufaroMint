import React, { useState, useEffect } from "react";
import {
  ArrowDown, Plus, FileText, Layers, ChevronRight,
  Check, AlertTriangle, Circle, Bell, Lock
} from "lucide-react";
import { formatZar } from "../../lib/formatCurrency";
import NavigationPill from "../../components/NavigationPill";
import NotificationBell from "../../components/NotificationBell";
import { supabase } from "../../lib/supabase";

// ─── Sparkline SVG ──────────────────────────────────────────────────────────
const Spark = ({ points = "0,20 10,18 20,22 30,12 40,14 50,8 60,10 70,6", color = "#7c3aed" }) => (
  <svg viewBox="0 0 70 28" className="w-14 h-7">
    <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ─── Payment row ─────────────────────────────────────────────────────────────
const TxnRow = ({ icon: Icon, iconBg, iconColor, title, date, amount, amountColor, isLast }) => (
  <div className={`flex items-center gap-3 px-4 py-3.5 ${!isLast ? "border-b border-slate-100" : ""}`}>
    <div className={`h-9 w-9 rounded-[14px] flex items-center justify-center shrink-0 ${iconBg}`}>
      <Icon size={15} className={iconColor} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[13px] font-medium text-slate-900 leading-tight">{title}</p>
      <p className="text-[11px] text-slate-400 mt-0.5">{date}</p>
    </div>
    <span className={`text-[13px] font-medium ${amountColor}`}>{amount}</span>
    <ChevronRight size={14} className="text-slate-300 shrink-0" />
  </div>
);

// ─── Offer row ────────────────────────────────────────────────────────────────
const OfferRow = ({ icon: Icon, title, desc, onClick, disabled = false }) => (
  <button
    onClick={!disabled ? onClick : undefined}
    disabled={disabled}
    className={`flex items-center gap-3 w-full bg-white border border-slate-100 rounded-[20px] px-4 py-3.5 mb-2.5 transition-all text-left ${disabled ? "opacity-50 cursor-not-allowed" : "active:scale-[0.98]"}`}
  >
    <div className="h-10 w-10 rounded-2xl bg-violet-50 flex items-center justify-center shrink-0">
      <Icon size={16} className="text-violet-600" />
    </div>
    <div className="flex-1">
      <p className="text-[13px] font-medium text-slate-900">{title}</p>
      <p className="text-[11px] text-slate-400 mt-0.5">{desc}</p>
    </div>
    {disabled ? (
      <Lock size={14} className="text-slate-400 shrink-0" />
    ) : (
      <ChevronRight size={14} className="text-slate-300 shrink-0" />
    )}
  </button>
);

// ─── Main component ───────────────────────────────────────────────────────────
const UnsecuredCreditDashboard = ({ profile, onTabChange, onOpenNotifications }) => {
  const [loan, setLoan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [historyRows, setHistoryRows] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const displayName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ");
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase() || "—";

  // ── fetch most-recent active unsecured loan ────────────────────────────────
  useEffect(() => {
    async function fetchLoan() {
      if (!profile?.id || !supabase) {
        setLoading(false);
        setHistoryLoading(false);
        return;
      }

      const { data } = await supabase
        .from("loan_application")
        .select(
          "id, principal_amount, amount_repayable, interest_rate, " +
          "number_of_months, monthly_repayable, first_repayment_date, " +
          "salary_date, status, repayment_schedule, created_at, updated_at, application_id, Secured_Unsecured"
        )
        .eq("user_id", profile.id)
        .eq("Secured_Unsecured", "unsecured")
        .in("status", ["active", "in_progress"])
        .gt("principal_amount", 0)
        .gt("amount_repayable", 0)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: historyData, error: historyErr } = await supabase
        .from("credit_transactions_history")
        .select("id, transaction_type, direction, amount, occurred_at, description")
        .eq("user_id", profile.id)
        .eq("loan_type", "unsecured")
        .order("occurred_at", { ascending: false })
        .limit(20);

      if (historyErr) {
        console.warn("Failed to fetch unsecured credit history:", historyErr.message || historyErr);
        setHistoryRows([]);
      } else {
        setHistoryRows(historyData || []);
      }

      setLoan(data || null);
      setLoading(false);
      setHistoryLoading(false);
    }
    fetchLoan();
  }, [profile?.id]);

  // ── derived values ────────────────────────────────────────────────────────
  const principal     = loan?.principal_amount  ?? 0;
  const totalRepay    = loan?.amount_repayable  ?? 0;
  const months        = loan?.number_of_months  ?? 0;
  // Prefer DB-generated monthly_repayable; fallback to schedule or arithmetic
  const monthlyPay    = parseFloat(loan?.monthly_repayable ?? 0) ||
                        parseFloat(loan?.repayment_schedule?.monthly_payment ?? 0) ||
                        (months > 0 ? totalRepay / months : 0);
  // Count paid installments from repayment_schedule.schedule
  const schedule      = loan?.repayment_schedule?.schedule ?? [];
  const paidCount     = schedule.filter(s => s.status === "paid").length;
  const totalPaid     = paidCount * monthlyPay;
  const loanBalance   = Math.max(0, totalRepay - totalPaid);
  const facilityLimit = totalRepay;
  const available     = Math.max(0, facilityLimit - loanBalance);
  const usedPct       = facilityLimit > 0 ? (loanBalance / facilityLimit) * 100 : 0;

  const nextDueDate = (() => {
    if (!loan?.first_repayment_date) return null;
    const d = new Date(loan.first_repayment_date);
    const now = new Date();
    while (d < now) d.setMonth(d.getMonth() + 1);
    return d;
  })();
  const daysUntilDue = nextDueDate
    ? Math.ceil((nextDueDate - new Date()) / (1000 * 60 * 60 * 24))
    : null;
  const dueLabelColor =
    daysUntilDue === null ? "" :
    daysUntilDue <= 3  ? "bg-red-50 text-red-700" :
    daysUntilDue <= 14 ? "bg-amber-50 text-amber-700" :
                         "bg-emerald-50 text-emerald-700";
  const dueLabel =
    daysUntilDue === null ? "—" :
    daysUntilDue <= 0  ? "Due today" :
    daysUntilDue === 1 ? "Tomorrow" :
    `In ${daysUntilDue} days`;

  // ─── Display rate strings ────────────────────────────────────────────────
  const annualRate  = "60%";
  const monthlyRate = "5%";
  const canStartNewLoan = !loan || loanBalance <= 0;

  // ─── helpers ─────────────────────────────────────────────────────────────
  const fmtDate = (d) => d
    ? new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "short", year: "numeric" }).format(d)
    : "—";

  return (
    <div className="min-h-screen bg-white text-slate-900">

      {/* ── HERO ── */}
      <div
        className="rounded-b-[32px] pb-10 pt-0"
        style={{ background: "linear-gradient(170deg, #0d0d12 0%, #25173e 20%, #7a4aa7 60%, #c68edc 85%, #f4e7f5 100%)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-12 mb-6">
          <div className="h-[38px] w-[38px] rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-[11px] font-semibold text-white uppercase">
            {initials}
          </div>
          <div className="w-[38px]" />
          <NotificationBell onClick={onOpenNotifications} />
        </div>

        {/* Balance card */}
        <div className="mx-5 bg-white/30 backdrop-blur-xl rounded-[28px] p-5 border border-white/60 shadow-xl">
          {/* Inner dark card */}
          <div className="rounded-[22px] p-5" style={{ background: "linear-gradient(135deg, #4c2e75, #2a1a46)" }}>

            {loading ? (
              <div className="h-24 animate-pulse rounded-xl bg-white/10" />
            ) : (
              <>
                <p className="text-[9px] font-bold text-white/50 uppercase tracking-[0.18em] mb-1">Outstanding loan balance</p>
                <div className="flex items-baseline text-white">
                  <span className="text-[30px] font-light leading-none">
                    {formatZar(loanBalance)}
                  </span>
                </div>
                <p className="text-[11px] text-white/45 mt-1.5">of {formatZar(facilityLimit)} credit facility</p>

                <div className="flex items-center gap-1.5 mt-2.5 w-fit bg-white/10 border border-white/15 rounded-full px-3 py-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[10px] text-white/80">
                    {loan ? "Active · Good standing" : "No active loan"}
                  </span>
                </div>

                {/* Progress */}
                <div className="mt-3.5 h-[5px] bg-white/15 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white/70 rounded-full transition-all"
                    style={{ width: `${Math.min(usedPct, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-[10px] text-white/45">{formatZar(loanBalance)} used</span>
                  <span className="text-[10px] text-white/45">{formatZar(available)} available</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="mt-4 flex justify-center">
          <NavigationPill
            activeTab="credit"
            onTabChange={onTabChange}
            className="!static !left-auto !top-auto !translate-x-0 !translate-y-0 scale-90 sm:scale-100"
          />
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="px-5 -mt-1 pb-36">

        {/* Metrics 2×2 */}
        <div className="grid grid-cols-2 gap-2.5 mt-5 mb-2.5">
          {/* Next repayment */}
          <div className="bg-white border border-slate-100 rounded-[20px] p-4 shadow-sm">
            <p className="text-[10px] text-slate-400 mb-1">Next repayment</p>
            <p className="text-[18px] font-medium text-slate-900">{formatZar(monthlyPay)}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {nextDueDate ? `Due ${fmtDate(nextDueDate)}` : "—"}
            </p>
            {daysUntilDue !== null && (
              <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full mt-1.5 ${dueLabelColor}`}>
                {dueLabel}
              </span>
            )}
          </div>

          {/* Interest rate */}
          <div className="bg-white border border-slate-100 rounded-[20px] p-4 shadow-sm">
            <p className="text-[10px] text-slate-400 mb-1">Interest rate</p>
            <p className="text-[18px] font-medium text-slate-900">{monthlyRate} p.m.</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{annualRate} p.a. — NCR max</p>
            <span className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-full mt-1.5 bg-emerald-50 text-emerald-700">
              Unsecured
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 mb-5">
          {/* Loan term */}
          <div className="bg-white border border-slate-100 rounded-[20px] p-4 shadow-sm">
            <p className="text-[10px] text-slate-400 mb-1">Loan term</p>
            <p className="text-[18px] font-medium text-slate-900">{months > 0 ? `${months} month${months > 1 ? "s" : ""}` : "—"}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Short-term credit</p>
            <span className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-full mt-1.5 bg-violet-50 text-violet-700">
              NCA regulated
            </span>
          </div>

          {/* Total paid */}
          <div className="bg-white border border-slate-100 rounded-[20px] p-4 shadow-sm">
            <p className="text-[10px] text-slate-400 mb-1">Total paid</p>
            <p className="text-[18px] font-medium text-slate-900">{formatZar(totalPaid)}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">since inception</p>
          </div>
        </div>

        {/* Quick actions */}
        <p className="text-[14px] font-medium text-slate-900 mb-3">Quick actions</p>
        <div className="grid grid-cols-3 gap-2.5 mb-7">
          {[
            { label: "Repay", icon: ArrowDown,   onClick: () => onTabChange?.("creditRepay") },
            {
              label: "New loan",
              icon: Plus,
              onClick: () => onTabChange?.("creditApply"),
              disabled: !canStartNewLoan,
            },
            { label: "Statement", icon: FileText,  onClick: () => {} },
          ].map(({ label, icon: Icon, onClick, disabled }) => (
            <button
              key={label}
              onClick={!disabled ? onClick : undefined}
              disabled={disabled}
              className={`flex flex-col items-center gap-1.5 bg-white border border-slate-100 rounded-[18px] py-3 px-1.5 text-slate-700 shadow-sm transition-all ${disabled ? "opacity-50 cursor-not-allowed" : "active:scale-95"}`}
            >
              <div className="h-8 w-8 rounded-full bg-violet-50 flex items-center justify-center">
                <Icon size={15} className="text-violet-600" />
              </div>
              <span className="text-[11px] font-medium text-center leading-tight flex items-center gap-1">
                {label}
                {disabled ? <Lock size={11} className="text-slate-400" /> : null}
              </span>
            </button>
          ))}
        </div>

        {/* Payment history */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-[14px] font-medium text-slate-900">Payment history</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Recent repayments</p>
          </div>
          <button className="text-[12px] font-medium text-violet-600 mt-0.5">View all</button>
        </div>

        <div className="bg-white border border-slate-100 rounded-[20px] overflow-hidden shadow-sm mb-7">
          {historyLoading ? (
            <div className="py-8 text-center text-[12px] text-slate-400">Loading history…</div>
          ) : historyRows.length > 0 ? (
            historyRows.slice(0, 4).map((entry, i) => {
              const direction = String(entry?.direction || "").toLowerCase();
              const isCredit = direction === "credit";
              const rawType = String(entry?.transaction_type || "transaction");
              const title = entry?.description || rawType.replace(/_/g, " ");
              const txDate = entry?.occurred_at ? fmtDate(new Date(entry.occurred_at)) : "—";
              return (
                <TxnRow
                  key={entry.id || i}
                  icon={isCredit ? Check : Circle}
                  iconBg={isCredit ? "bg-emerald-50" : "bg-slate-100"}
                  iconColor={isCredit ? "text-emerald-600" : "text-slate-400"}
                  title={title}
                  date={txDate}
                  amount={`${isCredit ? "+" : "−"}${formatZar(Number(entry?.amount || 0))}`}
                  amountColor={isCredit ? "text-emerald-600" : "text-slate-900"}
                  isLast={i === Math.min(historyRows.length, 4) - 1}
                />
              );
            })
          ) : loan ? (
            <>
              <TxnRow
                icon={Check}
                iconBg="bg-emerald-50"
                iconColor="text-emerald-600"
                title={`Loan disbursed${loan.application_id ? ` · ${loan.application_id}` : ""}`}
                date={loan.created_at ? fmtDate(new Date(loan.created_at)) + " · Activated" : "—"}
                amount={`+${formatZar(principal)}`}
                amountColor="text-emerald-600"
              />
              {/* Render up to 3 schedule entries */}
              {schedule.slice(0, 3).map((entry, i) => (
                <TxnRow
                  key={i}
                  icon={entry.status === "paid" ? Check : Circle}
                  iconBg={entry.status === "paid" ? "bg-emerald-50" : "bg-slate-100"}
                  iconColor={entry.status === "paid" ? "text-emerald-600" : "text-slate-400"}
                  title={`Repayment ${entry.month}`}
                  date={entry.due_date ? fmtDate(new Date(entry.due_date)) : "—"}
                  amount={`−${formatZar(entry.amount)}`}
                  amountColor={entry.status === "paid" ? "text-slate-900" : "text-slate-400"}
                  isLast={i === Math.min(schedule.length, 3) - 1}
                />
              ))}
              {schedule.length === 0 && (
                <TxnRow
                  icon={Circle}
                  iconBg="bg-slate-100"
                  iconColor="text-slate-400"
                  title="First repayment due"
                  date={nextDueDate ? fmtDate(nextDueDate) : "—"}
                  amount={`−${formatZar(monthlyPay)}`}
                  amountColor="text-slate-400"
                  isLast
                />
              )}
            </>
          ) : (
            <div className="py-8 text-center text-[12px] text-slate-400">
              No credit history found.
            </div>
          )}
        </div>

        {/* More credit options */}
        <p className="text-[14px] font-medium text-slate-900 mb-3">More credit options</p>
        <OfferRow
          icon={Plus}
          title="New loan"
          desc={canStartNewLoan ? "Start a fresh unsecured loan application" : "Available once your current loan is fully paid"}
          onClick={() => onTabChange?.("creditApply")}
          disabled={!canStartNewLoan}
        />
        <OfferRow
          icon={Layers}
          title="Portfolio-backed credit"
          desc="Use your investments as collateral for lower rates"
          onClick={() => onTabChange?.("instantLiquidity")}
        />
      </div>
    </div>
  );
};

export default UnsecuredCreditDashboard;
