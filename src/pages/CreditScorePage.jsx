import React, { useEffect, useMemo, useState } from "react";
import CreditMetricCard from "../components/credit/CreditMetricCard.jsx";
import { supabase } from "../lib/supabase.js";

const scoreChangesToday = [
  { label: "Credit utilisation", date: "Apr 14", value: "+4" },
  { label: "Cash purchases", date: "Apr 12", value: "-6" },
  { label: "Credit utilisation", date: "Apr 10", value: "+4" },
];

const scoreChangesAllTime = [
  { label: "Credit utilisation", date: "Mar 22", value: "+8" },
  { label: "New credit line", date: "Feb 12", value: "+12" },
  { label: "Cash purchases", date: "Jan 03", value: "-4" },
];

const CreditScorePage = ({ onBack }) => {
  const showScoreHistory = false;
  const [scoreSnapshot, setScoreSnapshot] = useState({
    score: null,
    delta: null,
    updatedAt: null,
  });
  const [scoreBreakdown, setScoreBreakdown] = useState(null);

  useEffect(() => {
    const loadScore = async () => {
      if (!supabase) return;
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) return;

      const { data: scoreRows } = await supabase
        .from("loan_engine_score")
        .select("engine_score,run_at,engine_result")
        .eq("user_id", userId)
        .order("run_at", { ascending: false })
        .limit(2);

      if (!Array.isArray(scoreRows) || scoreRows.length === 0) return;

      const [latest, previous] = scoreRows;
      const latestScore = Number(latest?.engine_score);
      const prevScore = Number(previous?.engine_score);
      const nextSnapshot = {
        score: Number.isFinite(latestScore) ? latestScore : null,
        delta: Number.isFinite(latestScore) && Number.isFinite(prevScore)
          ? latestScore - prevScore
          : null,
        updatedAt: latest?.run_at || null,
      };

      setScoreSnapshot(nextSnapshot);

      const latestBreakdown = scoreRows?.[0]?.engine_result?.breakdown || null;
      setScoreBreakdown(latestBreakdown);
    };

    loadScore();
  }, []);

  const hasScore = Number.isFinite(scoreSnapshot.score) && scoreSnapshot.score > 0;
  const scoreChanges = hasScore ? scoreChangesToday : [];

  const scoreDelta = hasScore && scoreSnapshot.delta !== null
    ? `${scoreSnapshot.delta > 0 ? "+" : ""}${Math.round(scoreSnapshot.delta)} pts`
    : "—";
  const updatedLabel = hasScore && scoreSnapshot.updatedAt
    ? `Updated ${new Date(scoreSnapshot.updatedAt).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })}`
    : "No score data yet";

  const markerPosition = useMemo(() => {
    const min = 300;
    const max = 1000;
    if (!hasScore) return 0;
    const percent = ((scoreSnapshot.score - min) / (max - min)) * 100;
    return Math.min(Math.max(percent, 0), 100);
  }, [hasScore, scoreSnapshot.score]);

  const breakdownEntries = useMemo(() => {
    if (!scoreBreakdown) return [];
    const entries = Object.entries(scoreBreakdown);
    const totalWeight = entries
      .map(([, value]) => Number(value?.weightPercent) || 0)
      .reduce((sum, value) => sum + value, 0);
    const normalizedTotal = totalWeight > 0 ? totalWeight : 100;

    return entries.map(([key, value]) => {
      const contribution = Number(value?.contributionPercent);
      const percent = Number.isFinite(contribution) && normalizedTotal > 0
        ? (contribution / normalizedTotal) * 100
        : null;

      return {
        key,
        label: key.replace(/([A-Z])/g, " $1").trim(),
        percent
      };
    });
  }, [scoreBreakdown]);

  const breakdownTotalPercent = useMemo(() => {
    if (!scoreBreakdown) return null;
    const entries = Object.values(scoreBreakdown);
    const totalWeight = entries
      .map((value) => Number(value?.weightPercent) || 0)
      .reduce((sum, value) => sum + value, 0);
    const normalizedTotal = totalWeight > 0 ? totalWeight : 100;
    const totalContribution = entries
      .map((value) => Number(value?.contributionPercent) || 0)
      .reduce((sum, value) => sum + value, 0);

    if (normalizedTotal <= 0) return null;
    const percent = (totalContribution / normalizedTotal) * 100;
    return Number.isFinite(percent) ? percent : null;
  }, [scoreBreakdown]);

  return (
    <div className="min-h-screen bg-slate-50 px-4 pb-[env(safe-area-inset-bottom)] pt-10 text-slate-900 md:px-8">
      <div className="mx-auto flex w-full max-w-sm flex-col gap-6 md:max-w-md">
        <header className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm"
            aria-label="Back to credit overview"
          >
            ←
          </button>
          <h1 className="text-lg font-semibold">Credit Score</h1>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm"
            aria-label="Calendar"
          >
            <i className="fas fa-calendar-alt" aria-hidden="true" />
          </button>
        </header>

        <div className="flex items-center justify-center rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-600">
          Today
        </div>

        <CreditMetricCard className="flex flex-col items-center gap-4 text-center">
          <div className="flex items-center gap-3">
            <div className="text-[88px] font-light leading-none tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-indigo-400">
              {hasScore ? Math.round(scoreSnapshot.score) : "—"}
            </div>
            <span className="rounded-full border border-slate-100 bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
              {scoreDelta}
            </span>
          </div>

          <div className="w-full">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Experian</span>
              <span>{updatedLabel}</span>
            </div>
          </div>
        </CreditMetricCard>

        <CreditMetricCard>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase text-slate-400">Score breakdown</p>
            <span className="text-[11px] font-semibold text-slate-500">
              {Number.isFinite(breakdownTotalPercent)
                ? `${breakdownTotalPercent.toFixed(1)}%`
                : "100%"}
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {breakdownEntries.length > 0 ? (
              breakdownEntries.map((item) => (
                <div key={item.key} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-700">
                    {item.label}
                  </p>
                  <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                    {Number.isFinite(item.percent)
                      ? `${item.percent.toFixed(1)}%`
                      : "—"}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">
                No score breakdown available yet. Run a Mint score check to view your breakdown.
              </p>
            )}
          </div>
        </CreditMetricCard>

        {showScoreHistory && (
          <CreditMetricCard>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase text-slate-400">Changes</p>
              <button
                type="button"
                disabled={!hasScore}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  hasScore
                    ? "bg-slate-100 text-slate-600"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                }`}
              >
                {hasScore ? "Score history" : "Check Mint score standing"}
              </button>
            </div>
            <div className="mt-4 flex flex-col gap-3">
              {scoreChanges.length > 0 ? (
                scoreChanges.map((item) => (
                  <div
                    key={`${item.label}-${item.date}`}
                    className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{item.label}</p>
                      <p className="text-[11px] text-slate-400">{item.date}</p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        item.value.startsWith("+")
                          ? "bg-emerald-100 text-emerald-600"
                          : "bg-rose-100 text-rose-500"
                      }`}
                    >
                      {item.value}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">
                  No score activity to show yet. Run your Mint score check to unlock insights.
                </p>
              )}
            </div>
          </CreditMetricCard>
        )}
      </div>
    </div>
  );
};

export default CreditScorePage;
