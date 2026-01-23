import React, { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import CreditMetricCard from "../components/credit/CreditMetricCard.jsx";
import CreditActionGrid from "../components/credit/CreditActionGrid.jsx";
import CreditScorePage from "./CreditScorePage.jsx";
import { useProfile } from "../lib/useProfile";
import CreditSkeleton from "../components/CreditSkeleton";

const creditOverview = {
  availableCredit: "R25,000",
  score: 732,
  updatedAt: "Updated today",
  loanBalance: "R8,450",
  nextPaymentDate: "May 30, 2024",
  minDue: "R950",
  utilisationPercent: 62,
};

const CreditPage = () => {
  const [view, setView] = useState(() =>
    window.location.pathname === "/credit/score" ? "score" : "overview"
  );
  const { profile, loading } = useProfile();
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
      setView(window.location.pathname === "/credit/score" ? "score" : "overview");
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = (path) => {
    window.history.pushState({}, "", path);
    setView(path === "/credit/score" ? "score" : "overview");
  };

  if (view === "score") {
    return <CreditScorePage onBack={() => navigate("/credit")} />;
  }

  if (loading) {
    return <CreditSkeleton />;
  }

  const utilisationWidth = `${creditOverview.utilisationPercent}%`;

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
            <button
              aria-label="Notifications"
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white backdrop-blur-md"
            >
              <Bell className="h-5 w-5" />
            </button>
          </header>

          <section className="rounded-3xl bg-white/10 p-5 shadow-sm backdrop-blur">
            <p className="text-xs uppercase tracking-[0.2em] text-white/70">Available Credit</p>
            <p className="mt-3 text-3xl font-semibold">{creditOverview.availableCredit}</p>
            <div className="mt-4 inline-flex items-center rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-semibold text-emerald-100">
              Good standing
            </div>
          </section>
        </div>
      </div>

      <div className="mx-auto -mt-10 flex w-full max-w-sm flex-col gap-5 px-4 pb-10 md:max-w-md md:px-8">
        <CreditMetricCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-700">Credit Score</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{creditOverview.score}</p>
              <p className="mt-1 text-xs text-slate-400">{creditOverview.updatedAt}</p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/credit/score")}
              className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white"
            >
              View score
            </button>
          </div>
        </CreditMetricCard>

        <CreditMetricCard>
          <p className="text-sm font-semibold text-slate-700">Active loan / Utilisation</p>
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-slate-400">Loan balance</p>
              <p className="mt-1 font-semibold text-slate-800">{creditOverview.loanBalance}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Next payment date</p>
              <p className="mt-1 font-semibold text-slate-800">{creditOverview.nextPaymentDate}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Minimum due</p>
              <p className="mt-1 font-semibold text-slate-800">{creditOverview.minDue}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Utilisation</p>
              <p className="mt-1 font-semibold text-slate-800">
                {creditOverview.utilisationPercent}%
              </p>
            </div>
          </div>
          <div className="mt-5">
            <div className="h-2 w-full rounded-full bg-slate-100">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-emerald-300"
                style={{ width: utilisationWidth }}
              />
            </div>
          </div>
        </CreditMetricCard>

        <CreditMetricCard>
          <p className="text-sm font-semibold text-slate-700">Quick Actions</p>
          <p className="mt-1 text-xs text-slate-400">Start your next credit step.</p>
          <div className="mt-4">
            <CreditActionGrid
              actions={[
                {
                  label: "Apply for credit",
                  onClick: () => console.log("Apply for credit"),
                },
                {
                  label: "Upload bank statements",
                  onClick: () => console.log("Upload bank statements"),
                },
                {
                  label: "Verify identity",
                  onClick: () => console.log("Verify identity"),
                },
                {
                  label: "Pay loan",
                  onClick: () => console.log("Pay loan"),
                },
              ]}
            />
          </div>
        </CreditMetricCard>
      </div>
    </div>
  );
};

export default CreditPage;
