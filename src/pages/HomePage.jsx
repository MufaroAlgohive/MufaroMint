import React from "react";
import { ArrowDownLeft, ArrowUpRight, Bell, CreditCard, QrCode } from "lucide-react";
import TransactionSheet from "../components/TransactionSheet";
import { useProfile } from "../lib/useProfile";
import HomeSkeleton from "../components/HomeSkeleton";

const HomePage = ({ onOpenNotifications }) => {
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
              onClick={onOpenNotifications}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white backdrop-blur-md"
            >
              <Bell className="h-5 w-5" />
            </button>
          </header>

          <section className="rounded-3xl bg-white/10 p-5 text-center text-white shadow-sm backdrop-blur">
            <p className="text-xs uppercase tracking-[0.2em] text-white/70">Mint Balance</p>
            <p className="mt-2 text-3xl font-semibold">$24,806.03</p>
          </section>
        </div>
      </div>

      <div className="mx-auto -mt-10 flex w-full max-w-sm flex-col gap-6 px-4 pb-10 md:max-w-md md:px-8">
        <section className="grid grid-cols-4 gap-3 text-[11px] font-medium">
          {[
            { label: "Transfer", icon: ArrowUpRight },
            { label: "Deposit", icon: ArrowDownLeft },
            { label: "Pay", icon: CreditCard },
            { label: "Scan", icon: QrCode },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                className="flex flex-col items-center gap-2 rounded-2xl bg-white px-2 py-3 text-slate-700 shadow-md"
                type="button"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-50 text-violet-700">
                  <Icon className="h-4 w-4" />
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
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
