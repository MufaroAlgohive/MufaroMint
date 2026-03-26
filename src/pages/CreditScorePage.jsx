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
  const [view, setView] = useState("today");
  const [showScoreHistory, setShowScoreHistory] = useState(false);
  const [scoreSnapshot, setScoreSnapshot] = useState({
    score: null,
    experianScore: null,
    delta: null,
    updatedAt: null,
    breakdown: null,
  });

  useEffect(() => {
    const loadScore = async () => {
      if (!supabase) return;
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) return;

      const { data: scoreRows } = await supabase
        .from("loan_engine_score")
        .select("engine_score,experian_score,engine_result,run_at")
        .eq("user_id", userId)
        .order("run_at", { ascending: false })
        .limit(2);

      if (!Array.isArray(scoreRows) || scoreRows.length === 0) return;

      const [latest, previous] = scoreRows;
      const latestScore = Number(latest?.engine_score);
      const prevScore = Number(previous?.engine_score);
      const experianScore = Number(latest?.experian_score);
      const nextSnapshot = {
        score: Number.isFinite(latestScore) ? latestScore : null,
        experianScore: Number.isFinite(experianScore) ? experianScore : null,
        delta: Number.isFinite(latestScore) && Number.isFinite(prevScore)
          ? latestScore - prevScore
          : null,
        updatedAt: latest?.run_at || null,
        breakdown: latest?.engine_result || null,
      };

      setScoreSnapshot(nextSnapshot);
    };

    loadScore();
  }, []);

  const hasScore = Number.isFinite(scoreSnapshot.score) && scoreSnapshot.score > 0;
  const hasExperian = Number.isFinite(scoreSnapshot.experianScore) && scoreSnapshot.experianScore > 0;
  const scoreChanges = hasScore
    ? view === "today"
      ? scoreChangesToday
      : scoreChangesAllTime
    : [];

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
    if (!hasExperian) {
      // Use engine score on 0-100 scale
      if (!hasScore) return 0;
      return Math.min(Math.max(scoreSnapshot.score, 0), 100);
    }
    // Experian score on 300-850 scale
    const min = 300;
    const max = 850;
    const percent = ((scoreSnapshot.experianScore - min) / (max - min)) * 100;
    return Math.min(Math.max(percent, 0), 100);
  }, [hasScore, hasExperian, scoreSnapshot.score, scoreSnapshot.experianScore]);

  const displayScore = hasExperian ? scoreSnapshot.experianScore : (hasScore ? Math.round(scoreSnapshot.score) : null);

  // Build breakdown items from engine_result
  const breakdownItems = useMemo(() => {
    if (!scoreSnapshot.breakdown) return [];
    return Object.entries(scoreSnapshot.breakdown).map(([key, value]) => {
      const label = key.replace(/([A-Z])/g, " $1").trim();
      const contribution = Number.isFinite(value?.contributionPercent) ? value.contributionPercent : 0;
      const weight = Number.isFinite(value?.weightPercent) ? value.weightPercent : 0;
      return { label, contribution, weight, valuePercent: value?.valuePercent };
    });
  }, [scoreSnapshot.breakdown]);

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
          <div className="w-10" />
        </header>

        <div className="flex items-center justify-center rounded-full bg-slate-100 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setView("today")}
            className={`flex-1 rounded-full px-4 py-2 transition ${
              view === "today" ? "bg-white text-slate-900 shadow" : "text-slate-500"
            }`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setView("all")}
            className={`flex-1 rounded-full px-4 py-2 transition ${
              view === "all" ? "bg-white text-slate-900 shadow" : "text-slate-500"
            }`}
          >
            All time
          </button>
        </div>

        <CreditMetricCard className="flex flex-col items-center gap-4 text-center">
          <div className="flex items-center gap-3">
            <div className="text-[88px] font-light leading-none tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-indigo-400">
              {displayScore ?? "—"}
            </div>
            <span className="rounded-full border border-slate-100 bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
              {scoreDelta}
            </span>
          </div>

          <div className="w-full">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>{hasExperian ? "Experian" : "Mint Engine"}</span>
              <span>{updatedLabel}</span>
            </div>
            <div className="relative mt-3 h-3 w-full rounded-full bg-gradient-to-r from-purple-500 via-indigo-400 to-emerald-300">
              <div
                className="absolute -top-1 h-5 w-1.5 rounded-full bg-white shadow"
                style={{ left: `calc(${markerPosition}% - 3px)` }}
              />
            </div>
            {hasExperian ? (
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                <span>300</span>
                <span>500</span>
                <span>700</span>
                <span>850</span>
              </div>
            ) : (
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                <span>0</span>
                <span>50</span>
                <span>75</span>
                <span>100</span>
              </div>
            )}
          </div>

          {hasExperian && hasScore && (
            <div className="w-full mt-2 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2">
              <span className="text-[10px] uppercase font-bold text-slate-400">Mint Engine Score</span>
              <span className="text-sm font-black text-slate-800">{Math.round(scoreSnapshot.score)}%</span>
            </div>
          )}
        </CreditMetricCard>

        {/* Score Breakdown from engine_result */}
        {breakdownItems.length > 0 && (
          <CreditMetricCard>
            <p className="text-xs font-semibold uppercase text-slate-400 mb-3">Score Breakdown</p>
            <div className="space-y-2">
              {breakdownItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-xs text-slate-600 capitalize">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-400"
                        style={{ width: `${Math.min((item.valuePercent || 0), 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-slate-800 w-12 text-right">
                      {Number.isFinite(item.contribution) ? item.contribution.toFixed(1) : "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CreditMetricCard>
        )}

        <CreditMetricCard>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase text-slate-400">Changes</p>
            <button
              type="button"
              onClick={() => setShowScoreHistory(prev => !prev)}
              disabled={!hasScore}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                hasScore
                  ? "bg-slate-100 text-slate-600"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              {showScoreHistory ? "Hide history" : hasScore ? "Score history" : "Check Mint score standing"}
            </button>
          </div>
          {showScoreHistory && (
            <div className="mt-4 flex flex-col gap-3">
              {scoreChanges.length > 0 ? (
                scoreChanges.map((item, index) => (
                  <div
                    key={`${item.label}-${item.date}-${index}`}
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
          )}
        </CreditMetricCard>
      </div>
    </div>
  );
};

export default CreditScorePage;
