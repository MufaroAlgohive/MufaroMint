import React, { useState } from "react";
import {
  ArrowDownToLine,
  BadgeCheck,
  FileSignature,
  HandCoins,
  Landmark,
  Info,
  UserPlus,
  TrendingUp,
  ShieldCheck,
  Wallet,
  Send,
  MapPin,
  Receipt,
  Users,
  X,
} from "lucide-react";
import { useProfile } from "../lib/useProfile";
import { useRequiredActions } from "../lib/useRequiredActions";
import { useFinancialData } from "../lib/useFinancialData";
import HomeSkeleton from "../components/HomeSkeleton";
import MintBalanceCard from "../components/MintBalanceCard";
import OutstandingActionsSection from "../components/OutstandingActionsSection";
import TransactionHistorySection from "../components/TransactionHistorySection";
import NotificationBell from "../components/NotificationBell";

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
  const { balance, investments, transactions, bestAssets, loading: financialLoading } = useFinancialData();
  const [failedLogos, setFailedLogos] = useState({});
  const [showPayModal, setShowPayModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const displayName = [profile.firstName, profile.lastName].filter(Boolean).join(" ");
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  if (loading || financialLoading) {
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
    {
      id: "investments",
      title: "Review investment allocation",
      description: "Confirm your latest risk profile",
      priority: 3,
      status: "Optional",
      icon: TrendingUp,
      routeName: "investments",
      isComplete: false,
      dueAt: "2025-01-28T12:00:00Z",
      createdAt: "2025-01-21T09:00:00Z",
    },
    {
      id: "invite",
      title: "Invite a friend",
      description: "Share Mint and earn bonus rewards",
      priority: 4,
      status: "Optional",
      icon: UserPlus,
      routeName: "actions",
      isComplete: false,
      dueAt: "2025-02-05T12:00:00Z",
      createdAt: "2025-01-23T09:00:00Z",
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

  const transactionHistory = transactions.slice(0, 3).map((t) => ({
    title: t.title || t.description || "Transaction",
    date: formatDate(t.created_at),
    amount: formatAmount(t.amount, t.type),
  }));

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

  const hasInvestments = bestAssets && bestAssets.length > 0;

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

          <MintBalanceCard
            amount={balance}
            changeText={balance > 0 ? "Updated just now" : ""}
            updatedAt={new Date()}
            onPressMintBalance={handleMintBalancePress}
          />
        </div>
      </div>

      <div className="mx-auto -mt-10 flex w-full max-w-sm flex-col gap-6 px-4 pb-10 md:max-w-md md:px-8">
        <section className="grid grid-cols-4 gap-3 text-[11px] font-medium">
          {[
            { label: "Pay", icon: Wallet, onClick: () => setShowPayModal(true) },
            { label: "Receive", icon: HandCoins, onClick: () => setShowReceiveModal(true) },
            { label: "Markets", icon: TrendingUp, onClick: onOpenInvest },
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
          
          {hasInvestments ? (
            <div className="mt-3 flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {bestAssets.slice(0, 5).map((asset) => (
                <div
                  key={asset.symbol}
                  className="flex min-w-[260px] flex-1 snap-start items-center gap-4 rounded-3xl bg-white p-4 shadow-md"
                >
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
                    {failedLogos[asset.symbol] || !asset.logo ? (
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
                    <p className="text-sm font-semibold text-slate-900">
                      R{typeof asset.value === 'number' ? asset.value.toLocaleString() : asset.value}
                    </p>
                    <p className={`text-xs font-semibold ${asset.change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {asset.change >= 0 ? '+' : ''}{typeof asset.change === 'number' ? asset.change.toFixed(2) : asset.change}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-3 rounded-3xl bg-white p-6 shadow-md text-center">
              <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-violet-50 text-violet-600 mb-4">
                <TrendingUp className="h-8 w-8" />
              </div>
              <p className="text-sm font-semibold text-slate-900 mb-1">No investments yet</p>
              <p className="text-xs text-slate-500 mb-4">Start investing to see your best performing assets here</p>
              <button
                type="button"
                onClick={onOpenInvest}
                className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.15em] text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5"
              >
                Make your first investment
              </button>
            </div>
          )}
        </section>

        {transactionHistory.length > 0 ? (
          <TransactionHistorySection items={transactionHistory} onViewAll={onOpenActivity} />
        ) : (
          <section className="rounded-3xl bg-white p-5 shadow-md">
            <p className="text-sm font-semibold text-slate-900 mb-3">Recent Activity</p>
            <div className="text-center py-4">
              <p className="text-xs text-slate-500">No transactions yet</p>
              <p className="text-xs text-slate-400 mt-1">Your activity will appear here</p>
            </div>
          </section>
        )}

      </div>

      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
          <button
            type="button"
            className="absolute inset-0 h-full w-full cursor-default"
            aria-label="Close modal"
            onClick={() => setShowPayModal(false)}
          />
          <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-[32px] bg-white shadow-2xl">
            <div className="flex items-center justify-center pt-3">
              <div className="h-1.5 w-12 rounded-full bg-slate-200" />
            </div>
            
            <div className="p-6">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Pay</h2>
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  disabled
                  className="flex w-full cursor-not-allowed items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left opacity-60"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-purple-600 text-white">
                    <Send className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">Coming soon</p>
                    <p className="text-xs text-slate-500">Transfers are not available yet</p>
                  </div>
                </button>

                <button
                  type="button"
                  disabled
                  className="flex w-full cursor-not-allowed items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left opacity-60"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-teal-600 text-white">
                    <MapPin className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">Coming soon</p>
                    <p className="text-xs text-slate-500">GeoPay is not available yet</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showReceiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
          <button
            type="button"
            className="absolute inset-0 h-full w-full cursor-default"
            aria-label="Close modal"
            onClick={() => setShowReceiveModal(false)}
          />
          <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-[32px] bg-white shadow-2xl">
            <div className="flex items-center justify-center pt-3">
              <div className="h-1.5 w-12 rounded-full bg-slate-200" />
            </div>
            
            <div className="p-6">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Receive</h2>
                <button
                  type="button"
                  onClick={() => setShowReceiveModal(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  disabled
                  className="flex w-full cursor-not-allowed items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left opacity-60"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
                    <Receipt className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">Coming soon</p>
                    <p className="text-xs text-slate-500">Requests are not available yet</p>
                  </div>
                </button>

                <button
                  type="button"
                  disabled
                  className="flex w-full cursor-not-allowed items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left opacity-60"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-600 to-orange-600 text-white">
                    <Users className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">Coming soon</p>
                    <p className="text-xs text-slate-500">Bill split is not available yet</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
}

function formatAmount(amount, type) {
  if (amount === undefined || amount === null) return "R0";
  const isPositive = type === "deposit" || type === "credit" || type === "gain" || amount > 0;
  const sign = isPositive ? "+" : "-";
  return `${sign}R${Math.abs(amount).toLocaleString()}`;
}

export default HomePage;
