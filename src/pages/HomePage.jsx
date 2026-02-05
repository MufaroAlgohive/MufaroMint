import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
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
  LayoutGrid,
  Newspaper,
  Target,
  Plus,
  Calendar,
  ChevronRight,
} from "lucide-react";
import { useProfile } from "../lib/useProfile";
import { useRequiredActions } from "../lib/useRequiredActions";
import { useSumsubStatus } from "../lib/useSumsubStatus";
import { useFinancialData, useInvestments } from "../lib/useFinancialData";
import { getStrategiesWithMetrics } from "../lib/strategyData";
import HomeSkeleton from "../components/HomeSkeleton";
import SwipeableBalanceCard from "../components/SwipeableBalanceCard";
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
  onOpenInvest, // Keeping this for backward compatibility if needed
  onOpenWithdraw,
  onOpenSettings,
  // New specific navigation props
  onOpenStrategies,
  onOpenMarkets,
  onOpenNews,
}) => {
  const { profile, loading } = useProfile();
  const { bankLinked, loading: actionsLoading } = useRequiredActions();
  const { kycVerified, kycPending, kycNeedsResubmission } = useSumsubStatus();
  const { balance, investments, transactions, bestAssets, loading: financialLoading } = useFinancialData();
  const { monthlyChangePercent } = useInvestments();
  const [bestStrategies, setBestStrategies] = useState([]);
  const [failedLogos, setFailedLogos] = useState({});
  const [showPayModal, setShowPayModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  
  // Goals State
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const [goals, setGoals] = useState([]);
  const [loadingGoals, setLoadingGoals] = useState(false);
  const [isCreatingGoal, setIsCreatingGoal] = useState(false);
  const [newGoal, setNewGoal] = useState({ name: "", target_amount: "", target_date: "" });
  
  const displayName = [profile.firstName, profile.lastName].filter(Boolean).join(" ");
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  // Fetch best performing strategies
  useEffect(() => {
    const fetchStrategies = async () => {
      try {
        const data = await getStrategiesWithMetrics();
        const sorted = data
          .sort((a, b) => (b.change_pct || 0) - (a.change_pct || 0))
          .slice(0, 5);
        setBestStrategies(sorted);
      } catch (error) {
        console.error("Failed to load strategies", error);
      }
    };
    fetchStrategies();
  }, []);

  // Fetch Goals when modal opens
  useEffect(() => {
    if (showGoalsModal && profile?.id) {
      fetchGoals();
    }
  }, [showGoalsModal, profile?.id]);

  const fetchGoals = async () => {
    setLoadingGoals(true);
    try {
      const { data, error } = await supabase
        .from('investment_goals')
        .select('*')
        .eq('user_id', profile.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGoals(data || []);
      // If no goals, automatically switch to create mode
      if (!data || data.length === 0) {
        setIsCreatingGoal(true);
      }
    } catch (error) {
      console.error("Error fetching goals:", error);
    } finally {
      setLoadingGoals(false);
    }
  };

  const handleCreateGoal = async (e) => {
    e.preventDefault();
    if (!newGoal.name || !newGoal.target_amount) return;

    setLoadingGoals(true);
    try {
      const { error } = await supabase.from('investment_goals').insert({
        user_id: profile.id,
        name: newGoal.name,
        target_amount: parseFloat(newGoal.target_amount),
        target_date: newGoal.target_date || null,
        current_amount: 0,
        progress_percent: 0
      });

      if (error) throw error;
      
      // Reset and reload
      setNewGoal({ name: "", target_amount: "", target_date: "" });
      setIsCreatingGoal(false);
      fetchGoals();
    } catch (error) {
      console.error("Error creating goal:", error);
    } finally {
      setLoadingGoals(false);
    }
  };

  if (loading || financialLoading) {
    return <HomeSkeleton />;
  }

  const handleMintBalancePress = () => {
    if (onOpenMintBalance) {
      onOpenMintBalance();
    }
  };

  const getKycStatus = () => {
    if (kycVerified) return { text: "Verified", style: "bg-green-100 text-green-600" };
    if (kycNeedsResubmission) return { text: "Needs Attention", style: "bg-amber-100 text-amber-700" };
    if (kycPending) return { text: "Pending", style: "bg-blue-100 text-blue-600" };
    return { text: "Not Verified", style: "bg-slate-100 text-slate-500" };
  };

  const kycStatus = getKycStatus();

  const actionsData = [
    {
      id: "identity",
      title: "Complete KYC verification",
      description: kycNeedsResubmission ? "Some documents need resubmission" : "Verify your identity to unlock all features",
      priority: 1,
      status: kycStatus.text,
      statusStyle: kycStatus.style,
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
        .filter((action) => !action.isComplete && action.status !== "Optional")
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
  const hasStrategies = bestStrategies && bestStrategies.length > 0;

  return (
    <div className="min-h-screen bg-slate-50 pb-[env(safe-area-inset-bottom)] text-slate-900">
      <div className="rounded-b-[36px] bg-gradient-to-b from-[#111111] via-[#3b1b7a] to-[#5b21b6] px-4 pb-12 pt-12 text-white md:px-8">
        <div className="mx-auto flex w-full max-w-sm flex-col gap-6 md:max-w-md">
          <header className="relative flex items-center justify-between text-white">
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

            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="flex items-center rounded-full bg-white/10 p-1 backdrop-blur-md">
                <button
                  type="button"
                  onClick={onOpenInvest}
                  className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-sm"
                >
                  Invest
                </button>
                <button
                  type="button"
                  onClick={onOpenCredit}
                  className="rounded-full px-3 py-1.5 text-xs font-semibold text-white/70 transition-all hover:bg-white/10 hover:text-white"
                >
                  Credit
                </button>
                <button
                  type="button"
                  className="rounded-full px-3 py-1.5 text-xs font-semibold text-white/70 transition-all hover:bg-white/10 hover:text-white"
                >
                  Transact
                </button>
              </div>
            </div>

            <NotificationBell onClick={onOpenNotifications} />
          </header>

          <SwipeableBalanceCard
            amount={balance}
            totalInvestments={investments}
            investmentChange={monthlyChangePercent || 0}
            bestPerformingAssets={bestAssets}
            userName={displayName}
            onPressMintBalance={handleMintBalancePress}
          />
        </div>
      </div>

      <div className="mx-auto -mt-10 flex w-full max-w-sm flex-col gap-6 px-4 pb-10 md:max-w-md md:px-8">
        <section className="grid grid-cols-4 gap-3 text-[11px] font-medium">
          {[
            { label: <>Open<br />Strategies</>, icon: LayoutGrid, onClick: onOpenStrategies || onOpenInvest },
            { label: "Markets", icon: TrendingUp, onClick: onOpenMarkets || onOpenInvest },
            { label: "News", icon: Newspaper, onClick: onOpenNews || onOpenInvest },
            { label: "Goals", icon: Target, onClick: () => setShowGoalsModal(true) },
          ].map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={index}
                className="flex flex-col items-center gap-2 rounded-2xl bg-white px-2 py-3 text-slate-700 shadow-md"
                type="button"
                onClick={item.onClick}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-50 text-violet-700">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-center leading-tight">{item.label}</span>
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

        {/* Best Performing Assets */}
        <section>
          <div className="flex items-end justify-between px-5 mb-3">
            <div className="space-y-1">
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
            {hasInvestments && (
              <button 
                onClick={onOpenInvest} 
                className="mb-1 text-xs font-semibold text-violet-600 active:opacity-70"
              >
                View all
              </button>
            )}
          </div>
          
          {hasInvestments ? (
            <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                    <p className="text-xs text-slate-500 line-clamp-1">{asset.name}</p>
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
            <div className="rounded-3xl bg-white p-6 shadow-md text-center">
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

        {/* Best Performing Strategies */}
        <section>
          <div className="flex items-end justify-between px-5 mb-3">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-900">
                Your best performing strategies
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 text-slate-500">
                  <LayoutGrid className="h-3 w-3" />
                </span>
                <span>Top performing curated portfolios</span>
              </div>
            </div>
            {hasStrategies && (
              <button 
                onClick={onOpenInvest} 
                className="mb-1 text-xs font-semibold text-violet-600 active:opacity-70"
              >
                View all
              </button>
            )}
          </div>
          
          {hasStrategies ? (
            <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {bestStrategies.slice(0, 5).map((strategy) => (
                <div
                  key={strategy.id}
                  className="flex min-w-[260px] flex-1 snap-start items-center gap-4 rounded-3xl bg-white p-4 shadow-md"
                >
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-slate-50 shadow-sm ring-1 ring-slate-100">
                    <span className="text-xs font-bold text-slate-700">
                      {strategy.name?.substring(0, 2).toUpperCase() || "ST"}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900 line-clamp-1">{strategy.name}</p>
                    <p className="text-xs text-slate-500 line-clamp-1">{strategy.provider_name || strategy.risk_level}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">
                      {strategy.last_close ? `R${strategy.last_close.toFixed(2)}` : "—"}
                    </p>
                    <p className={`text-xs font-semibold ${strategy.change_pct >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {strategy.change_pct >= 0 ? '+' : ''}{strategy.change_pct ? strategy.change_pct.toFixed(2) : '0.00'}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl bg-white p-6 shadow-md text-center">
              <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-slate-50 text-slate-400 mb-4">
                <LayoutGrid className="h-8 w-8" />
              </div>
              <p className="text-sm font-semibold text-slate-900 mb-1">Invest in your first strategy</p>
              <p className="text-xs text-slate-500 mb-4">Explore our curated investment portfolios</p>
              <button
                type="button"
                onClick={onOpenInvest}
                className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.15em] text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5"
              >
                Browse Strategies
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

      {showGoalsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
          <button
            type="button"
            className="absolute inset-0 h-full w-full cursor-default"
            aria-label="Close modal"
            onClick={() => setShowGoalsModal(false)}
          />
          <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-[32px] bg-white shadow-2xl">
            <div className="flex items-center justify-center pt-3">
              <div className="h-1.5 w-12 rounded-full bg-slate-200" />
            </div>
            
            <div className="p-6">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">
                  {isCreatingGoal ? "Create Goal" : "Your Goals"}
                </h2>
                <button
                  type="button"
                  onClick={() => setShowGoalsModal(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="min-h-[300px]">
                {loadingGoals ? (
                  <div className="flex h-64 items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-100 border-t-violet-600" />
                  </div>
                ) : isCreatingGoal ? (
                  <form onSubmit={handleCreateGoal} className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">Goal Name</label>
                      <input
                        type="text"
                        placeholder="e.g. New Car, Holiday"
                        value={newGoal.name}
                        onChange={(e) => setNewGoal(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-violet-500 focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">Target Amount</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">R</span>
                        <input
                          type="number"
                          placeholder="0.00"
                          value={newGoal.target_amount}
                          onChange={(e) => setNewGoal(prev => ({ ...prev, target_amount: e.target.value }))}
                          className="w-full rounded-2xl border border-slate-200 pl-8 pr-4 py-3 text-sm focus:border-violet-500 focus:outline-none"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">Target Date (Optional)</label>
                      <input
                        type="date"
                        value={newGoal.target_date}
                        onChange={(e) => setNewGoal(prev => ({ ...prev, target_date: e.target.value }))}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-violet-500 focus:outline-none"
                      />
                    </div>
                    
                    <div className="pt-4 flex gap-3">
                      {goals.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setIsCreatingGoal(false)}
                          className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-semibold text-slate-600"
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={loadingGoals}
                        className="flex-1 rounded-2xl bg-violet-600 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-200"
                      >
                        Create Goal
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    {goals.map((goal) => (
                      <div key={goal.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <div className="mb-2 flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-slate-900">{goal.name}</h3>
                            <p className="text-xs text-slate-500">
                              Target: R{Number(goal.target_amount).toLocaleString()}
                            </p>
                          </div>
                          <div className="rounded-full bg-white p-2 shadow-sm">
                            <Target className="h-5 w-5 text-violet-600" />
                          </div>
                        </div>
                        <div className="mb-1 flex items-end justify-between text-xs">
                          <span className="font-medium text-slate-700">
                            {Number(goal.progress_percent || 0).toFixed(0)}%
                          </span>
                          <span className="text-slate-500">
                            R{Number(goal.current_amount || 0).toLocaleString()} saved
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-white">
                          <div 
                            className="h-full rounded-full bg-violet-500 transition-all duration-500"
                            style={{ width: `${Math.min(100, goal.progress_percent || 0)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    
                    <button
                      onClick={() => setIsCreatingGoal(true)}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 py-4 text-sm font-semibold text-slate-500 transition-all hover:border-violet-300 hover:bg-violet-50 hover:text-violet-600"
                    >
                      <Plus className="h-4 w-4" />
                      Add New Goal
                    </button>
                  </div>
                )}
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