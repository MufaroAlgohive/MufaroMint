import React from "react";
import { Bell } from "lucide-react";
import TransactionSheet from "../components/TransactionSheet";
import { useProfile } from "../lib/useProfile";
import HomeSkeleton from "../components/HomeSkeleton";

const HomePage = () => {
  const { profile, loading } = useProfile();
  const displayName = [profile.firstName, profile.lastName].filter(Boolean).join(" ");
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  if (loading) {
    return <HomeSkeleton />;
  }

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

          <section className="rounded-3xl bg-white/10 p-5 text-center text-white shadow-sm backdrop-blur">
            <p className="text-xs uppercase tracking-[0.2em] text-white/70">Total Balance</p>
            <p className="mt-2 text-3xl font-semibold">$24,806.03</p>
            <div className="mt-5 grid grid-cols-4 gap-3 text-[11px] font-medium">
              {[
                { label: "Transfer", icon: "↗" },
                { label: "Deposit", icon: "↓" },
                { label: "Pay", icon: "▢" },
                { label: "Scan", icon: "⌁" },
              ].map((item) => (
                <button
                  key={item.label}
                  className="flex flex-col items-center gap-2 rounded-2xl bg-white/80 px-2 py-3 text-slate-700 shadow-sm"
                  type="button"
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>

      <div className="mx-auto -mt-10 flex w-full max-w-sm flex-col gap-6 px-4 pb-10 md:max-w-md md:px-8">
        <section className="flex items-center justify-between gap-3 rounded-3xl bg-white px-4 py-3 shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-200 text-lg">
              ✨
            </div>
            <div>
              <p className="text-[11px] text-slate-500">Personal Balance</p>
              <p className="text-sm font-semibold">$206.03</p>
            </div>
          </div>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100"
            type="button"
          >
            →
          </button>
        </section>

        <div className="flex items-center justify-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
          <span className="h-1.5 w-4 rounded-full bg-slate-900/90" />
          <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
        </div>
      </div>
      <TransactionSheet />
    </div>
  );
};

export default HomePage;
