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
import { createPortal } from "react-dom";

const HomePage = ({
  onOpenNotifications,
  onOpenMintBalance,
  onOpenActivity,
  onOpenActions,
  onOpenInvestments,
  onOpenCredit,
  onOpenInvest,
  onOpenSettings,
  onOpenStrategies,
  onOpenMarkets,
  onOpenNews,
}) => {
  // --- 1. HOOKS & STATE (Must come first) ---
  const { profile, loading } = useProfile();
  
  // Note: We destructure 'refetch' as fetchFinancialData/fetchRequiredActions
  // so the real-time listeners actually have a function to call.
  const { 
    balance, 
    investments, 
    transactions, 
    bestAssets, 
    loading: financialLoading, 
    refetch: fetchFinancialData 
  } = useFinancialData();

  const { 
    bankLinked, 
    loading: actionsLoading, 
    refetch: fetchRequiredActions 
  } = useRequiredActions();

  const { kycVerified, kycPending, kycNeedsResubmission } = useSumsubStatus();
  const { monthlyChangePercent } = useInvestments();

  const [bestStrategies, setBestStrategies] = useState([]);
  const [failedLogos, setFailedLogos] = useState({});
  const [showPayModal, setShowPayModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [news, setNews] = useState([]);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [loadingNews, setLoadingNews] = useState(false);
  const [localBestAssets, setLocalBestAssets] = useState([]);
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const [goals, setGoals] = useState([]);
  const [loadingGoals, setLoadingGoals] = useState(false);
  const [isCreatingGoal, setIsCreatingGoal] = useState(false);
  const [newGoal, setNewGoal] = useState({ name: "", target_amount: "", target_date: "" });
  const [editingGoalId, setEditingGoalId] = useState(null);

  // Derived Values
  const assetsToDisplay = localBestAssets.length > 0 ? localBestAssets : (bestAssets || []);
  const displayName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ");
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  // --- 2. CALLBACKS (Logic definitions) ---
  const fetchBestAssets = React.useCallback(async () => {
    if (!profile?.id) return;
    try {
      const { data, error } = await supabase
        .from('allocations')
        .select(`
          value,
          securities!inner ( symbol, name, logo_url ),
          security_metrics!inner ( change_pct )
        `)
        .eq('user_id', profile.id)
        .order('value', { ascending: false })
        .limit(5);

      if (error) throw error;

      const formatted = data.map(item => ({
        symbol: item.securities.symbol,
        name: item.securities.name,
        logo: item.securities.logo_url,
        value: item.value,
        change: item.security_metrics?.change_pct || 0
      }));

      setLocalBestAssets(formatted); 
    } catch (e) { 
      console.error("Asset fetch error:", e.message); 
    }
  }, [profile?.id]);

  const fetchGoals = React.useCallback(async () => {
    if (!profile?.id) return;
    setLoadingGoals(true);
    try {
      const { data, error } = await supabase
        .from('investment_goals')
        .select('id, name, target_amount, current_amount, progress_percent') 
        .eq('user_id', profile.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGoals(data || []);
    } catch (e) { 
      console.error("Goal fetch error:", e.message); 
    } finally { 
      setLoadingGoals(false); 
    }
  }, [profile?.id]);

  // --- 3. EFFECTS (Side effects using the callbacks above) ---
  
  // Unified Real-time Subscription
  useEffect(() => {
    if (!profile?.id) return;

    const homeSubscription = supabase
      .channel('home_realtime_updates')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'investment_goals', 
        filter: `user_id=eq.${profile.id}` 
      }, () => fetchGoals()) 
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'transactions', 
        filter: `user_id=eq.${profile.id}` 
      }, () => {
        fetchBestAssets(); 
        if (typeof fetchFinancialData === 'function') fetchFinancialData(); 
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'required_actions', 
        filter: `user_id=eq.${profile.id}` 
      }, () => {
        if (typeof fetchRequiredActions === 'function') fetchRequiredActions();
      })
      .subscribe();

    // Initial loads
    fetchBestAssets();
    fetchGoals();

    return () => {
      supabase.removeChannel(homeSubscription);
    };
  }, [profile?.id, fetchBestAssets, fetchGoals, fetchFinancialData, fetchRequiredActions]);

  // Specific check when Goals Modal opens
  useEffect(() => {
    if (showGoalsModal && profile?.id) {
      fetchGoals();
    }
  }, [showGoalsModal, profile?.id, fetchGoals]);

  // Strategies & News
  useEffect(() => {
    const fetchStrategies = async () => {
      try {
        const data = await getStrategiesWithMetrics();
        setBestStrategies(data.sort((a, b) => (b.change_pct || 0) - (a.change_pct || 0)).slice(0, 5));
      } catch (e) { console.error("Strategies error:", e); }
    };
    fetchStrategies();
  }, []);

  useEffect(() => {
    const fetchNews = async () => {
      setLoadingNews(true);
      try {
        const { data, error } = await supabase
          .from('News_articles') 
          .select('id, title, source, published_at, body_text')
          .order('published_at', { ascending: false })
          .limit(3);
        if (error) throw error;
        setNews(data || []);
      } catch (err) { console.error("News error:", err.message); }
      finally { setLoadingNews(false); }
    };
    fetchNews();
  }, []);

  // --- 4. ACTION HANDLERS ---
  const handleEditClick = (goal) => {
    setNewGoal({ 
      name: goal.name, 
      target_amount: goal.target_amount, 
      target_date: goal.target_date || "" 
    });
    setEditingGoalId(goal.id);
    setIsCreatingGoal(true);
  };

  const handleUpdateGoal = async (e) => {
    e.preventDefault();
    setLoadingGoals(true);
    try {
      const { error } = await supabase
        .from('investment_goals')
        .update({
          name: newGoal.name,
          target_amount: parseFloat(newGoal.target_amount),
        })
        .eq('id', editingGoalId);
      if (error) throw error;
      setEditingGoalId(null);
      setIsCreatingGoal(false);
      fetchGoals();
    } catch (error) { console.error("Update error:", error.message); }
    finally { setLoadingGoals(false); }
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
        current_amount: 0,
        progress_percent: 0
      });
      if (error) throw error;
      setNewGoal({ name: "", target_amount: "", target_date: "" });
      setIsCreatingGoal(false);
      fetchGoals();
    } catch (error) { console.error("Create error:", error); }
    finally { setLoadingGoals(false); }
  };

  const handleDeleteGoal = async (goalId) => {
    if (!window.confirm("Are you sure you want to delete this goal?")) return;
    setLoadingGoals(true);
    try {
      const { error } = await supabase.from('investment_goals').delete().eq('id', goalId);
      if (error) throw error;
      setEditingGoalId(null);
      setIsCreatingGoal(false);
      setNewGoal({ name: "", target_amount: "", target_date: "" });
      fetchGoals();
    } catch (error) { console.error("Delete error:", error.message); }
    finally { setLoadingGoals(false); }
  };

  // --- 5. DATA FORMATTING FOR RENDER ---
  if (loading || financialLoading) return <HomeSkeleton />;

  const kycStatus = (() => {
    if (kycVerified) return { text: "Verified", style: "bg-green-100 text-green-600" };
    if (kycNeedsResubmission) return { text: "Needs Attention", style: "bg-amber-100 text-amber-700" };
    if (kycPending) return { text: "Pending", style: "bg-blue-100 text-blue-600" };
    return { text: "Not Verified", style: "bg-slate-100 text-slate-500" };
  })();

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
      isRequired: true,
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
      isRequired: false,
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
    },
  ];

  const outstandingActions = actionsData.filter(action => action.id === "identity" && !action.isComplete);

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
    if (handler) handler();
  };

  const handleMintBalancePress = () => onOpenMintBalance?.();

  const hasInvestments = assetsToDisplay.length > 0;
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
                  onClick={() => onOpenInvest("transact")}
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
            { 
              label: <>Open<br />Strategies</>, 
              icon: LayoutGrid, 
              onClick: () => (onOpenStrategies ? onOpenStrategies("openstrategies") : onOpenInvest("openstrategies")) 
            },
            { 
              label: "Markets", 
              icon: TrendingUp, 
              onClick: () => (onOpenMarkets ? onOpenMarkets("invest") : onOpenInvest("invest")) 
            },
            { 
              label: "News", 
              icon: Newspaper, 
              onClick: () => (onOpenNews ? onOpenNews("news") : onOpenInvest("news")) 
            },
            { 
              label: "Goals", 
              icon: Target, 
              onClick: () => setShowGoalsModal(true) 
            },
          ].map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={index}
                className="flex flex-col items-center gap-2 rounded-2xl bg-white px-2 py-3 text-slate-700 shadow-md transition-all active:scale-95 active:shadow-sm"
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
              {assetsToDisplay.length > 0 && (
                <button 
                  onClick={() => onOpenInvest("invest")}
                  className="mb-1 text-xs font-semibold text-violet-600 active:opacity-70"
                >
                  View all
                </button>
              )}
            </div>
            
            {assetsToDisplay.length > 0 ? (
              <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {assetsToDisplay.slice(0, 5).map((asset) => (
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
                        R{typeof asset.value === 'number' ? asset.value.toLocaleString() : (asset.value || 0)}
                      </p>
                      <p className={`text-xs font-semibold ${asset.change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {asset.change >= 0 ? '+' : ''}{typeof asset.change === 'number' ? asset.change.toFixed(2) : (asset.change || '0.00')}%
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
                  onClick={() => onOpenInvest("invest")}
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
              onClick={() => onOpenStrategies("openstrategies")}  
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
                onClick={() => onOpenStrategies("openstrategies")}
                className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.15em] text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5"
              >
                Browse Strategies
              </button>
            </div>
          )}
        </section>
        {/* Market Insights Section */}
        <section>
          <div className="flex items-end justify-between px-5 mb-3">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-900">
                Market Insights
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 text-slate-500">
                  <Newspaper className="h-3 w-3" />
                </span>
                <span>Latest updates for your portfolio</span>
              </div>
            </div>
            <button 
              onClick={() => onOpenNews("news")}
              className="mb-1 text-xs font-semibold text-violet-600 active:opacity-70"
            >
              View all
            </button>
          </div>

          <div className="space-y-3">
            {news.length > 0 ? (
              news.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onOpenNews(item)} // This will now pass the real news object
                  className="flex w-full items-center gap-4 rounded-3xl bg-white p-3 shadow-md transition-active active:scale-[0.98]"
                >
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2 mb-1">
                      {/* Using 'source' from News_articles table schema */}
                      <span className="text-[10px] font-bold uppercase tracking-wider text-violet-600 bg-violet-50 px-2 py-0.5 rounded-md">
                        {item.source || 'Market'}
                      </span>
                      {/* Using 'published_at' from News_articles table schema */}
                      <span className="text-[10px] text-slate-400">
                        {formatDate(item.published_at)}
                      </span>
                    </div>
                    {/* Using 'title' from News_articles table schema */}
                    <p className="text-sm font-semibold text-slate-900 line-clamp-2 leading-snug">
                      {item.title}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </button>
              ))
            ) : !loadingNews && (
              <div className="rounded-3xl bg-white p-6 text-center shadow-md">
                <p className="text-xs text-slate-400">No recent insights available.</p>
              </div>
            )}
            
            {loadingNews && (
              <div className="flex justify-center py-4">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-100 border-t-violet-600" />
              </div>
            )}
          </div>
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

      {/* --- GOALS MODAL --- */}
      {showGoalsModal && (
        <div className="fixed inset-0 z-[950] flex items-end justify-center bg-slate-900/60 px-4 pb-20 sm:items-center sm:pb-0">
          <button
            type="button"
            className="absolute inset-0 h-full w-full cursor-default backdrop-blur-sm"
            onClick={() => {
              setShowGoalsModal(false);
              setIsCreatingGoal(false);
              setEditingGoalId(null);
            }}
          />
          
          <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-[32px] bg-white shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-center pt-3">
              <div className="h-1.5 w-12 rounded-full bg-slate-200" />
            </div>
            
            <div className="p-6">
              <header className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">
                  {editingGoalId ? "Edit Goal" : isCreatingGoal ? "New Goal" : "Your Goals"}
                </h2>
                <button
                  onClick={() => {
                    setShowGoalsModal(false);
                    setIsCreatingGoal(false);
                    setEditingGoalId(null);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-400"
                >
                  <X size={20} />
                </button>
              </header>

              <div className="max-h-[60vh] overflow-y-auto pr-1">
                {loadingGoals ? (
                  <div className="flex h-40 flex-col items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-100 border-t-violet-600" />
                  </div>
                ) : isCreatingGoal || editingGoalId ? (
                  /* --- SHARED FORM FOR CREATE & EDIT --- */
                  <form onSubmit={editingGoalId ? handleUpdateGoal : handleCreateGoal} className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400">Goal Name</label>
                      <input
                        placeholder="e.g. Porsche 911"
                        value={newGoal.name}
                        onChange={(e) => setNewGoal({...newGoal, name: e.target.value})}
                        className="w-full rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400">Target Amount (R)</label>
                      <input
                        type="number"
                        value={newGoal.target_amount}
                        onChange={(e) => setNewGoal({...newGoal, target_amount: e.target.value})}
                        className="w-full rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                        required
                      />
                    </div>
                    
                    <div className="flex flex-col gap-3 pt-2">
                      <button
                        type="submit"
                        className="w-full rounded-2xl bg-[#31005e] py-4 font-bold uppercase tracking-widest text-white shadow-lg transition-active active:scale-95"
                      >
                        {editingGoalId ? "Update Goal" : "Save Goal"}
                      </button>
                      
                      {editingGoalId && (
                        <button
                          type="button"
                          onClick={() => handleDeleteGoal(editingGoalId)} // FIX: Link the function here
                          className="w-full rounded-2xl bg-rose-50 py-4 text-xs font-bold uppercase tracking-widest text-rose-600 transition-active active:scale-95"
                        >
                          Delete Goal
                        </button>
                      )}
                    </div>
                  </form>
                ) : (
                  /* --- GOALS LIST --- */
                  <div className="space-y-4">
                    {goals.map((goal) => (
                      <div key={goal.id} className="group relative rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:shadow-md">
                        <div className="mb-3 flex items-start justify-between">
                          <div>
                            <h3 className="font-bold text-slate-900">{goal.name}</h3>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Target: R{Number(goal.target_amount).toLocaleString()}
                            </p>
                          </div>
                          <button 
                            onClick={() => handleEditClick(goal)}
                            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 hover:bg-violet-50 hover:text-violet-600"
                          >
                            <FileSignature size={18} />
                          </button>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                            <span className="text-violet-600">{Math.round(goal.progress_percent || 0)}% Complete</span>
                            <span className="text-slate-300">R{(goal.target_amount - (goal.current_amount || 0)).toLocaleString()} Left</span>
                          </div>
                          <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-violet-600 to-purple-500 rounded-full transition-all duration-1000"
                              style={{ width: `${goal.progress_percent || 0}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    <button
                      onClick={() => setIsCreatingGoal(true)}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 py-4 text-sm font-bold text-slate-400 transition-all hover:border-violet-300 hover:bg-violet-50 active:scale-95"
                    >
                      <Plus size={18} />
                      <span>Add New Goal</span>
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

/* --- HELPER FUNCTIONS --- */

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