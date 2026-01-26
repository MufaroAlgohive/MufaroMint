import React, { useState } from "react";
import {
  ArrowDownToLine,
  BadgeCheck,
  Bell,
  FileSignature,
  HandCoins,
  Landmark,
  Info,
  UserPlus,
  TrendingUp,
  ShieldCheck,
} from "lucide-react";
import { useProfile } from "../lib/useProfile";
import { useRequiredActions } from "../lib/useRequiredActions";
import HomeSkeleton from "../components/HomeSkeleton";
import MintBalanceCard from "../components/MintBalanceCard";
import OutstandingActionsSection from "../components/OutstandingActionsSection";
import TransactionHistorySection from "../components/TransactionHistorySection";

const HomePage = ({
  onOpenNotifications,
  onOpenMintBalance,
  onOpenActivity,
  onOpenActions,
  onOpenInvestments,
  onOpenCredit,
  onOpenCreditApply,
  onOpenCreditRepay,
  onOpenInvest,
  onOpenWithdraw,
  onOpenSettings,
}) => {
  const { profile, loading } = useProfile();
  const { kycVerified, bankLinked, loading: actionsLoading } = useRequiredActions();
  const [failedLogos, setFailedLogos] = useState({});
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

  const handleMintBalancePress = () => {
    if (onOpenMintBalance) {
      onOpenMintBalance();
    }
  };

  const actionsData = [
    {
      id: "identity",
      title: "Complete KYC verification",
      description: "Verify your identity to unlock all features",
      priority: 1,
      status: kycVerified ? "Verified" : "Not Verified",
      icon: ShieldCheck,
      routeName: "actions",
      isComplete: kycVerified,
      dueAt: "2025-01-20T12:00:00Z",
      createdAt: "2025-01-18T09:00:00Z",
    },
    {
      id: "bank-link",
      title: "Link your bank account",
      description: "Connect to enable instant transfers",
      priority: 2,
      status: bankLinked ? "Linked" : "Not Linked",
      icon: Landmark,
      routeName: "actions",
      isComplete: bankLinked,
      dueAt: "2025-01-22T12:00:00Z",
      createdAt: "2025-01-19T09:00:00Z",
    },
  ];

  const isActionsAvailable = true;
  const outstandingActions = isActionsAvailable
    ? actionsData
        .filter((action) => !action.isComplete)
        .sort((a, b) => {
          if (a.priority !== b.priority) {
            return a.priority - b.priority;
          }
          const dueA = a.dueAt ? new Date(a.dueAt).getTime() : Number.POSITIVE_INFINITY;
          const dueB = b.dueAt ? new Date(b.dueAt).getTime() : Number.POSITIVE_INFINITY;
          if (dueA !== dueB) {
            return dueA - dueB;
          }
          const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return createdA - createdB;
        })
    : [];

  const transactionHistory = [
    { title: "Investment deposit", date: "Today", amount: "+R500" },
    { title: "Loan repayment", date: "Yesterday", amount: "-R300" },
    { title: "Investment gain", date: "18 Apr", amount: "+R120" },
  ];
  const bestAssets = [
    {
      symbol: "CPI",
      name: "Capitec",
      value: "R2,857.86",
      change: "+0.05%",
      logo: "https://s3-symbol-logo.tradingview.com/capitec-bank-hldgs-ltd--big.svg",
    },
    {
      symbol: "NPN",
      name: "Naspers",
      value: "R1,942.12",
      change: "+0.12%",
      logo: "https://s3-symbol-logo.tradingview.com/naspers--big.svg",
    },
    {
      symbol: "FSR",
      name: "First Rand",
      value: "R3,120.48",
      change: "+0.31%",
      logo: "https://s3-symbol-logo.tradingview.com/firstrand-ltd--big.svg",
    },
    {
      symbol: "ABG",
      name: "ABSA Group",
      value: "R1,284.33",
      change: "+0.09%",
      logo: "https://s3-symbol-logo.tradingview.com/absa-bank-ltd-pref--big.svg",
    },
  ];

  const handleActionNavigation = (action) => {
    const routes = {
      investments: onOpenInvestments,
      credit: onOpenCredit,
      settings: onOpenSettings,
      actions: onOpenActions,
    };

    const handler = routes[action.routeName];
    if (handler) {
      handler();
    }
  };

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

          <MintBalanceCard
            amount={24806.03}
            changeText="+R320 today"
            updatedAt={new Date()}
            onPressMintBalance={handleMintBalancePress}
          />
        </div>
      </div>

      <div className="mx-auto -mt-10 flex w-full max-w-sm flex-col gap-6 px-4 pb-10 md:max-w-md md:px-8">
        <section className="grid grid-cols-4 gap-3 text-[11px] font-medium">
          {[
            { label: "Apply", icon: FileSignature, onClick: onOpenCreditApply },
            { label: "Repay", icon: HandCoins, onClick: onOpenCreditRepay },
            { label: "Invest", icon: TrendingUp, onClick: onOpenInvest },
            { label: "Withdraw", icon: ArrowDownToLine, onClick: onOpenWithdraw },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                className="flex flex-col items-center gap-2 rounded-2xl bg-white px-2 py-3 text-slate-700 shadow-md"
                type="button"
                onClick={item.onClick}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-50 text-violet-700">
                  <Icon className="h-4 w-4" />
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </section>

        {outstandingActions.length > 0 ? (
          <OutstandingActionsSection
            actions={outstandingActions}
            onViewAll={onOpenActions}
            onSelectAction={handleActionNavigation}
          />
        ) : null}

        <section>
          <div className="space-y-1 pl-5">
            <p className="text-sm font-semibold text-slate-900">
              Your best performing assets
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 text-slate-500">
                <Info className="h-3 w-3" />
              </span>
              <span>Based on your investment portfolio</span>
            </div>
          </div>
          <div className="mt-3 flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {bestAssets.slice(0, 5).map((asset) => (
              <div
                key={asset.symbol}
                className="flex min-w-[260px] flex-1 snap-start items-center gap-4 rounded-3xl bg-white p-4 shadow-md"
              >
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
                  {failedLogos[asset.symbol] ? (
                    <span className="text-sm font-semibold text-slate-600">
                      {asset.symbol}
                    </span>
                  ) : (
                    <img
                      src={asset.logo}
                      alt={asset.name}
                      className="h-10 w-10 object-contain"
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                      onError={() =>
                        setFailedLogos((prev) => ({ ...prev, [asset.symbol]: true }))
                      }
                    />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">{asset.symbol}</p>
                  <p className="text-xs text-slate-500">{asset.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">{asset.value}</p>
                  <p className="text-xs font-semibold text-emerald-500">{asset.change}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <TransactionHistorySection items={transactionHistory} onViewAll={onOpenActivity} />

      </div>
    </div>
  );
};

export default HomePage;
