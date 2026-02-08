import React, { useEffect, useState } from "react";
import { CreditCard } from "lucide-react";
import CreditMetricCard from "../components/credit/CreditMetricCard.jsx";
import CreditActionGrid from "../components/credit/CreditActionGrid.jsx";
import CreditScorePage from "./CreditScorePage.jsx";
import { supabase } from "../lib/supabase.js";
import { formatZar } from "../lib/formatCurrency";
import { useProfile } from "../lib/useProfile";
import { useCreditInfo } from "../lib/useFinancialData";
import CreditSkeleton from "../components/CreditSkeleton";
import NotificationBell from "../components/NotificationBell";

const defaultCreditOverview = {
  availableCredit: null,
  score: null,
  updatedAt: "Please run your credit check",
  loanBalance: null,
  nextPaymentDate: null,
  minDue: null,
  utilisationPercent: 62,
};

const CreditPage = ({ onOpenNotifications, onOpenTruID, onOpenCreditStep2 }) => {
  const [view, setView] = useState(() =>
    window.location.pathname === "/credit/score" ? "score" : "overview"
  );
  const [creditOverview, setCreditOverview] = useState(defaultCreditOverview);
  const [hasSubmittedLoan, setHasSubmittedLoan] = useState(false);
  const { profile, loading } = useProfile();
  const {
    availableCredit,
    score,
    loanBalance,
    nextPaymentDate,
    minDue,
    utilisationPercent,
    scoreChangesToday,
    scoreChangesAllTime,
    loading: creditLoading,
    hasCredit,
  } = useCreditInfo();

  const displayName = [profile.firstName, profile.lastName].filter(Boolean).join(" ");
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  useEffect(() => {
    const handlePopState = () => {
      setView("overview");
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    const loadScoreAndLoan = async () => {
      if (!supabase) return;
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) return;

      const { data: scoreData } = await supabase
        .from("loan_engine_score")
        .select("engine_score,run_at")
        .eq("user_id", userId)
        .order("run_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: snapshotData } = await supabase
        .from("truid_bank_snapshots")
        .select("net_monthly_income,avg_monthly_income,avg_monthly_expenses")
        .eq("user_id", userId)
        .order("captured_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: loanData } = await supabase
        .from("loan_application")
        .select("principal_amount,amount_repayable,monthly_repayable,first_repayment_date,status")
        .eq("user_id", userId)
        .in("status", ["submitted", "Submitted"])
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setCreditOverview((prev) => {
        const next = { ...prev };
        if (Number.isFinite(scoreData?.engine_score)) {
          next.score = scoreData.engine_score;
          next.updatedAt = "Updated today";
        }

        const netIncome = Number(snapshotData?.net_monthly_income)
          || (Number(snapshotData?.avg_monthly_income) - Number(snapshotData?.avg_monthly_expenses))
          || 0;
        if (Number.isFinite(netIncome) && netIncome > 0) {
          const maxLimit = Math.max(1000, Math.floor(netIncome * 0.2));
          next.availableCredit = formatZar(maxLimit);
        }

        if (loanData?.principal_amount || loanData?.amount_repayable || loanData?.monthly_repayable) {
          next.loanBalance = formatZar(Number(loanData.principal_amount) || 0);
          next.nextPaymentDate = loanData.first_repayment_date
            ? new Date(loanData.first_repayment_date).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric"
              })
            : "—";
          next.minDue = formatZar(Number(loanData.monthly_repayable) || 0);
          next.utilisationPercent = prev.utilisationPercent;
          next.loanStatus = loanData.status || "submitted";
          next.amountRepayable = formatZar(Number(loanData.amount_repayable) || 0);
        } else {
          next.loanStatus = null;
          next.amountRepayable = null;
          next.loanBalance = null;
          next.nextPaymentDate = null;
          next.minDue = null;
        }

        return next;
      });
    };

    loadScoreAndLoan();
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadSubmittedLoan = async () => {
      if (!supabase) return;
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) return;

      const { data, error } = await supabase
        .from("loan_application")
        .select("id, status")
        .eq("user_id", userId)
        .in("status", ["submitted", "Submitted"])
        .order("updated_at", { ascending: false })
        .limit(1);

      if (isMounted) {
        setHasSubmittedLoan(!error && (data?.length ?? 0) > 0);
      }
    };

    loadSubmittedLoan();

    return () => {
      isMounted = false;
    };
  }, []);

  const navigate = (viewName) => {
    const path = viewName === "score" ? "/credit/score" : "/credit";
    window.history.pushState({}, "", path);
    setView(viewName);
  };

  if (view === "score") {
    return <CreditScorePage onBack={() => navigate("overview")} scoreChangesToday={scoreChangesToday} scoreChangesAllTime={scoreChangesAllTime} currentScore={score} />;
  }

  if (loading || creditLoading) {
    return <CreditSkeleton />;
  }

  const utilisationWidth = `${creditOverview.utilisationPercent}%`;
  const hasScore = Number.isFinite(creditOverview.score) && creditOverview.score > 0;
  const hasAvailableCredit = Boolean(creditOverview.availableCredit);
  const hasLoanDetails = Boolean(
    creditOverview.loanStatus
    || creditOverview.loanBalance
    || creditOverview.nextPaymentDate
    || creditOverview.minDue
    || creditOverview.amountRepayable
  );
  const standingInfo = hasScore
    ? creditOverview.score >= 80
      ? { label: "Good standing", className: "bg-emerald-400/20 text-emerald-100" }
      : creditOverview.score >= 60
        ? { label: "Moderate standing", className: "bg-amber-400/20 text-amber-100" }
        : { label: "Bad standing", className: "bg-rose-400/20 text-rose-100" }
    : null;

  return (
    <div className="min-h-screen bg-slate-50 pb-[env(safe-area-inset-bottom)] text-slate-900">
      <div className="rounded-b-[36px] bg-gradient-to-b from-[#111111] via-[#3b1b7a] to-[#5b21b6] px-4 pb-12 pt-12 text-white md:px-8">
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

          <section className="rounded-3xl bg-white/10 p-5 shadow-sm backdrop-blur">
            <p className="text-xs uppercase tracking-[0.2em] text-white/70">Available Credit</p>
            <p className="mt-3 text-3xl font-semibold">
              {hasAvailableCredit ? creditOverview.availableCredit : "Engine score not initiated"}
            </p>
            {standingInfo && (
              <div
                className={`mt-4 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${standingInfo.className}`}
              >
                {standingInfo.label}
              </div>
            )}
          </section>
        </div>
      </div>

      <div className="mx-auto -mt-10 flex w-full max-w-sm flex-col gap-5 px-4 pb-10 md:max-w-md md:px-8">
        <CreditMetricCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-700">Credit Score</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {hasScore ? creditOverview.score : "—"}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {hasScore ? creditOverview.updatedAt : "Please run your credit check"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("score")}
              disabled={!hasScore}
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] ${
                hasScore
                  ? "bg-slate-900 text-white"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              View Mint score
            </button>
          </div>
        </CreditMetricCard>

        <CreditMetricCard>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Active loan / Utilisation</p>
            {creditOverview.loanStatus && (
              <span className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-widest ${
                creditOverview.loanStatus.toLowerCase() === "submitted"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-emerald-100 text-emerald-700"
              }`}>
                {creditOverview.loanStatus.toLowerCase() === "submitted" ? "In review" : creditOverview.loanStatus}
              </span>
            )}
          </div>

          {hasLoanDetails ? (
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              {creditOverview.loanBalance && (
                <div>
                  <p className="text-xs text-slate-400">Principal amount</p>
                  <p className="mt-1 font-semibold text-slate-800">{creditOverview.loanBalance}</p>
                </div>
              )}
              {creditOverview.nextPaymentDate && (
                <div>
                  <p className="text-xs text-slate-400">First repayment date</p>
                  <p className="mt-1 font-semibold text-slate-800">{creditOverview.nextPaymentDate}</p>
                </div>
              )}
              {creditOverview.minDue && (
                <div>
                  <p className="text-xs text-slate-400">Monthly repayable</p>
                  <p className="mt-1 font-semibold text-slate-800">{creditOverview.minDue}</p>
                </div>
              )}
              {creditOverview.amountRepayable && (
                <div>
                  <p className="text-xs text-slate-400">Amount repayable</p>
                  <p className="mt-1 font-semibold text-slate-800">{creditOverview.amountRepayable}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="mt-5 text-sm text-slate-500">
              To view detailed loan information, please submit a credit application so we can verify
              your eligibility and calculate your repayment schedule.
            </p>
          )}

          {!creditOverview.loanStatus && (
            <div className="mt-5">
              <div className="h-2 w-full rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-slate-200"
                  style={{ width: utilisationWidth }}
                />
              </div>
            </div>
          )}
        </CreditMetricCard>

        <CreditMetricCard>
          <p className="text-sm font-semibold text-slate-700">Quick Actions</p>
          <p className="mt-1 text-xs text-slate-400">Start your next credit step.</p>
          <div className="mt-4">
            <CreditActionGrid
              actions={[
                {
                  label: hasSubmittedLoan ? "Application submitted" : "Apply for credit",
                  onClick: () => onOpenTruID ? onOpenTruID() : console.log("Apply for credit"),
                  disabled: hasSubmittedLoan,
                },
                {
                  label: "Pay loan",
                  onClick: () => console.log("Pay loan"),
                },
              ]}
            />
          </div>
        </CreditMetricCard>

        <div className="pt-2 text-xs text-slate-400">
          <details className="rounded-2xl bg-white px-4 py-3 shadow-sm">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-slate-500">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 text-[11px] font-semibold">
                i
              </span>
              <span>Important information about credit limits and scores</span>
            </summary>
            <div className="mt-3 space-y-2 text-slate-500">
              <p>
                Your loan limit is based on affordability and cash‑flow stability. We calculate net income as income
                minus expenses, then use 20% of that net income as a starting point for a responsible limit. We also
                review recurring income patterns, essential spend, existing obligations, and repayment behavior to
                avoid over‑extension.
              </p>
              <p>
                The Mint score is produced by our loan engine and looks at multiple factors, including repayment
                history, credit utilization, account age and stability, recent credit activity, income consistency,
                cash‑flow volatility, and debt‑to‑income signals. These checks help us understand risk and ensure the
                score reflects your current financial position.
              </p>
              <p>
                Experian and TruID provide the data sources used to generate these insights.
              </p>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
};

export default CreditPage;
