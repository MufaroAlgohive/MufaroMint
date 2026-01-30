import React, { useMemo, useState } from "react";
import CreditMetricCard from "../components/credit/CreditMetricCard.jsx";

const CreditScorePage = ({ onBack, scoreChangesToday = [], scoreChangesAllTime = [], currentScore = 0 }) => {
  const [view, setView] = useState("today");

  const displayScoreChanges = view === "today" ? scoreChangesToday : scoreChangesAllTime;

  const scoreDelta = useMemo(() => {
    const changes = view === "today" ? scoreChangesToday : scoreChangesAllTime;
    if (changes.length === 0) return "+0 pts";
    const total = changes.reduce((sum, item) => {
      const val = parseInt(item.value, 10) || 0;
      return sum + val;
    }, 0);
    return `${total >= 0 ? '+' : ''}${total} pts`;
  }, [view, scoreChangesToday, scoreChangesAllTime]);

  const markerPosition = useMemo(() => {
    const min = 300;
    const max = 1000;
    const score = currentScore || 0;
    const percent = ((score - min) / (max - min)) * 100;
    return Math.min(Math.max(percent, 0), 100);
  }, [currentScore]);

  const hasScore = currentScore > 0;

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
            📅
          </button>
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
          {hasScore ? (
            <>
              <div className="flex items-center gap-3">
                <div className="text-[88px] font-light leading-none tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-indigo-400">
                  {currentScore}
                </div>
                <span className="rounded-full border border-slate-100 bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                  {scoreDelta}
                </span>
              </div>

              <div className="w-full">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>TransUnion</span>
                  <span>Updated today</span>
                </div>
                <div className="relative mt-3 h-3 w-full rounded-full bg-gradient-to-r from-purple-500 via-indigo-400 to-emerald-300">
                  <div
                    className="absolute -top-1 h-5 w-1.5 rounded-full bg-white shadow"
                    style={{ left: `calc(${markerPosition}% - 3px)` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                  <span>300</span>
                  <span>630</span>
                  <span>690</span>
                  <span>1000</span>
                </div>
              </div>
            </>
          ) : (
            <div className="py-6 text-center">
              <div className="text-[64px] font-light leading-none text-slate-300">
                ---
              </div>
              <p className="mt-4 text-sm text-slate-500">No credit score available yet</p>
              <p className="text-xs text-slate-400 mt-1">Your score will appear once you have credit activity</p>
            </div>
          )}
        </CreditMetricCard>

        <CreditMetricCard>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase text-slate-400">Changes</p>
            <button
              type="button"
              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
            >
              Score history
            </button>
          </div>
          <div className="mt-4 flex flex-col gap-3">
            {displayScoreChanges.length > 0 ? (
              displayScoreChanges.map((item, index) => (
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
              <div className="text-center py-6">
                <p className="text-xs text-slate-500">No score changes yet</p>
                <p className="text-xs text-slate-400 mt-1">Changes to your credit score will appear here</p>
              </div>
            )}
          </div>
        </CreditMetricCard>
      </div>
    </div>
  );
};

export default CreditScorePage;
