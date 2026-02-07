import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";

export const useFinancialData = () => {
  const [data, setData] = useState({
    balance: 0,
    investments: 0,
    availableCredit: 0,
    transactions: [],
    holdings: [],
    creditInfo: null,
    bestAssets: [],
    loading: true,
    error: null,
  });

  const fetchData = useCallback(async () => {
    if (!supabase) {
      setData((prev) => ({ ...prev, loading: false, error: "Database not connected" }));
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setData((prev) => ({ ...prev, loading: false }));
        return;
      }

      const userId = session.user.id;

      const [
        balanceResult,
        recentTransactionsResult,
        allTransactionsResult,
        holdingsResult,
        creditResult,
      ] = await Promise.all([
        supabase.from("user_balances").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("transactions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
        supabase.from("transactions").select("type, amount").eq("user_id", userId),
        supabase.from("stock_holdings").select("id, user_id, security_id, quantity, avg_fill, market_value, unrealized_pnl, as_of_date, created_at, updated_at, Status").eq("user_id", userId),
        supabase.from("credit_accounts").select("*").eq("user_id", userId).maybeSingle(),
      ]);

      const transactions = recentTransactionsResult.data || [];
      const allTransactions = allTransactionsResult.data || [];
      const rawHoldingsData = holdingsResult.data || [];
      const creditInfo = creditResult.data;

      const hSecIds = rawHoldingsData.map(h => h.security_id).filter(Boolean);
      let hSecMap = {};
      if (hSecIds.length > 0) {
        const { data: secData } = await supabase.from("securities").select("id, symbol, name, logo_url").in("id", hSecIds);
        if (secData) secData.forEach(s => { hSecMap[s.id] = s; });
      }
      const holdings = rawHoldingsData.map(h => ({
        ...h,
        symbol: hSecMap[h.security_id]?.symbol || "N/A",
        name: hSecMap[h.security_id]?.name || "Unknown",
        logo_url: hSecMap[h.security_id]?.logo_url || null,
      }));

      const sortedHoldings = [...holdings].sort((a, b) => {
        const aGain = (a.unrealized_pnl || 0) / 100;
        const bGain = (b.unrealized_pnl || 0) / 100;
        return bGain - aGain;
      });

      const bestAssets = sortedHoldings.slice(0, 5).map((h) => {
        const currentValue = (h.market_value || 0) / 100;
        const costBasis = ((h.avg_fill || 0) * (h.quantity || 0)) / 100;
        const changePercent = costBasis > 0 ? ((currentValue - costBasis) / costBasis) * 100 : 0;
        return {
          symbol: h.symbol,
          name: h.name,
          value: currentValue,
          change: changePercent,
          logo: h.logo_url,
        };
      });

      const totalInvestments = holdings.reduce((sum, h) => sum + ((h.avg_fill || 0) * (h.quantity || 0)) / 100, 0);
      
      const incomeTypes = ["deposit", "credit", "gain"];
      const expenseTypes = ["withdrawal", "expense"];
      const totalIncome = allTransactions
        .filter((t) => incomeTypes.includes(t.type))
        .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);
      const totalExpenses = allTransactions
        .filter((t) => expenseTypes.includes(t.type))
        .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);
      const availableCredit = Math.max(0, (totalIncome - totalExpenses) * 0.2);
      const totalBalance = totalInvestments + availableCredit;

      setData({
        balance: totalBalance,
        investments: totalInvestments,
        availableCredit,
        transactions,
        holdings,
        creditInfo,
        bestAssets,
        loading: false,
        error: null,
      });
    } catch (err) {
      console.error("Error fetching financial data:", err);
      setData((prev) => ({
        ...prev,
        loading: false,
        error: err.message,
      }));
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { ...data, refetch: fetchData };
};

export const useMintBalance = () => {
  const [data, setData] = useState({
    totalBalance: 0,
    investments: 0,
    availableCredit: 0,
    dailyChange: 0,
    recentChanges: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchBalance = async () => {
      if (!supabase) {
        setData((prev) => ({ ...prev, loading: false }));
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setData((prev) => ({ ...prev, loading: false }));
          return;
        }

        const userId = session.user.id;

        const [balanceResult, holdingsResult, allTransactionsResult, recentTransactionsResult] = await Promise.all([
          supabase.from("user_balances").select("*").eq("user_id", userId).maybeSingle(),
          supabase.from("stock_holdings").select("market_value, avg_fill, quantity, unrealized_pnl").eq("user_id", userId),
          supabase.from("transactions").select("type, amount").eq("user_id", userId),
          supabase.from("transactions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
        ]);

        const holdings = holdingsResult.data || [];
        const allTransactions = allTransactionsResult.data || [];
        const recentTransactions = recentTransactionsResult.data || [];
        
        const totalInvestments = holdings.reduce((sum, h) => sum + ((h.avg_fill || 0) * (h.quantity || 0)) / 100, 0);
        const dailyChange = holdings.reduce((sum, h) => sum + ((h.unrealized_pnl || 0) / 100), 0);
        
        const incomeTypes = ["deposit", "credit", "gain"];
        const expenseTypes = ["withdrawal", "expense"];
        const totalIncome = allTransactions
          .filter((t) => incomeTypes.includes(t.type))
          .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);
        const totalExpenses = allTransactions
          .filter((t) => expenseTypes.includes(t.type))
          .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);
        const availableCredit = Math.max(0, (totalIncome - totalExpenses) * 0.2);
        const totalBalance = totalInvestments + availableCredit;

        const recentChanges = recentTransactions.map((t) => ({
          title: t.description || t.type || "Transaction",
          date: formatTransactionDate(t.created_at),
          amount: formatTransactionAmount(t.amount, t.type),
        }));

        setData({
          totalBalance,
          investments: totalInvestments,
          availableCredit,
          dailyChange,
          recentChanges,
          loading: false,
          error: null,
        });
      } catch (err) {
        console.error("Error fetching mint balance:", err);
        setData((prev) => ({ ...prev, loading: false, error: err.message }));
      }
    };

    fetchBalance();
  }, []);

  return data;
};

export const useTransactions = (limit = 20) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("transactions")
          .select("*")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false })
          .limit(limit);

        if (error) throw error;

        setTransactions(data || []);
      } catch (err) {
        console.error("Error fetching transactions:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [limit]);

  return { transactions, loading };
};

export const useCreditInfo = () => {
  const [data, setData] = useState({
    availableCredit: 0,
    score: 0,
    loanBalance: 0,
    nextPaymentDate: null,
    minDue: 0,
    utilisationPercent: 0,
    scoreChangesToday: [],
    scoreChangesAllTime: [],
    loading: true,
    hasCredit: false,
  });

  useEffect(() => {
    const fetchCredit = async () => {
      if (!supabase) {
        setData((prev) => ({ ...prev, loading: false }));
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setData((prev) => ({ ...prev, loading: false }));
          return;
        }

        const userId = session.user.id;

        const [creditResult, scoreHistoryResult] = await Promise.all([
          supabase.from("credit_accounts").select("*").eq("user_id", userId).maybeSingle(),
          supabase.from("credit_score_history").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
        ]);

        const credit = creditResult.data;
        const allScoreChanges = (scoreHistoryResult.data || []).map((s) => ({
          label: s.reason || "Score update",
          date: formatTransactionDate(s.created_at),
          value: s.change > 0 ? `+${s.change}` : `${s.change}`,
          rawDate: new Date(s.created_at),
        }));

        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const scoreChangesToday = allScoreChanges.filter((s) => s.rawDate >= sevenDaysAgo);
        const scoreChangesAllTime = allScoreChanges;

        if (credit) {
          setData({
            availableCredit: credit.available_credit || 0,
            score: credit.credit_score || 0,
            loanBalance: credit.loan_balance || 0,
            nextPaymentDate: credit.next_payment_date ? formatDate(credit.next_payment_date) : null,
            minDue: credit.minimum_due || 0,
            utilisationPercent: credit.utilisation_percent || 0,
            scoreChangesToday,
            scoreChangesAllTime,
            loading: false,
            hasCredit: true,
          });
        } else {
          setData((prev) => ({ ...prev, loading: false, hasCredit: false }));
        }
      } catch (err) {
        console.error("Error fetching credit info:", err);
        setData((prev) => ({ ...prev, loading: false }));
      }
    };

    fetchCredit();
  }, []);

  return data;
};

export const useInvestments = () => {
  const [data, setData] = useState({
    totalInvestments: 0,
    monthlyChange: 0,
    monthlyChangePercent: 0,
    portfolioMix: [],
    goals: [],
    holdings: [],
    loading: true,
    hasInvestments: false,
  });

  useEffect(() => {
    const fetchInvestments = async () => {
      if (!supabase) {
        setData((prev) => ({ ...prev, loading: false }));
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setData((prev) => ({ ...prev, loading: false }));
          return;
        }

        const userId = session.user.id;

        const [holdingsResult, goalsResult] = await Promise.all([
          supabase.from("stock_holdings").select("id, user_id, security_id, quantity, avg_fill, market_value, unrealized_pnl, as_of_date, created_at, updated_at, Status").eq("user_id", userId),
          supabase.from("investment_goals").select("*").eq("user_id", userId),
        ]);

        const rawHoldings = holdingsResult.data || [];
        const goals = goalsResult.data || [];

        const securityIds = rawHoldings.map(h => h.security_id).filter(Boolean);
        let securitiesMap = {};
        if (securityIds.length > 0) {
          const { data: secData } = await supabase
            .from("securities")
            .select("id, symbol, name, asset_class, logo_url")
            .in("id", securityIds);
          if (secData) {
            secData.forEach(s => { securitiesMap[s.id] = s; });
          }
        }

        const holdings = rawHoldings.map(h => ({
          ...h,
          symbol: securitiesMap[h.security_id]?.symbol || "N/A",
          name: securitiesMap[h.security_id]?.name || "Unknown",
          asset_class: securitiesMap[h.security_id]?.asset_class || "Other",
          logo_url: securitiesMap[h.security_id]?.logo_url || null,
        }));

        const totalInvestments = holdings.reduce((sum, h) => sum + ((h.avg_fill || 0) * (h.quantity || 0)) / 100, 0);
        const monthlyChange = holdings.reduce((sum, h) => sum + ((h.unrealized_pnl || 0) / 100), 0);
        const monthlyChangePercent = totalInvestments > 0 ? (monthlyChange / totalInvestments) * 100 : 0;

        const assetClasses = {};
        holdings.forEach((h) => {
          const assetClass = h.asset_class || "Other";
          const costBasis = ((h.avg_fill || 0) * (h.quantity || 0)) / 100;
          assetClasses[assetClass] = (assetClasses[assetClass] || 0) + costBasis;
        });

        const portfolioMix = Object.entries(assetClasses).map(([label, value]) => ({
          label,
          value: totalInvestments > 0 ? Math.round((value / totalInvestments) * 100) + "%" : "0%",
        }));

        const formattedGoals = goals.map((g) => ({
          label: g.name || "Goal",
          value: `R${(g.target_amount || 0).toLocaleString()}`,
          progress: g.target_amount > 0 ? Math.round((g.current_amount / g.target_amount) * 100) + "%" : "0%",
          currentAmount: g.current_amount || 0,
          targetAmount: g.target_amount || 0,
        }));

        setData({
          totalInvestments,
          monthlyChange,
          monthlyChangePercent,
          portfolioMix: portfolioMix.length > 0 ? portfolioMix : [],
          goals: formattedGoals,
          holdings,
          loading: false,
          hasInvestments: holdings.length > 0,
        });
      } catch (err) {
        console.error("Error fetching investments:", err);
        setData((prev) => ({ ...prev, loading: false }));
      }
    };

    fetchInvestments();
  }, []);

  return data;
};

function formatTransactionDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
}

function formatTransactionAmount(amount, type) {
  if (amount === undefined || amount === null) return "R0";
  const isPositive = type === "deposit" || type === "credit" || type === "gain" || amount > 0;
  const sign = isPositive ? "+" : "-";
  return `${sign}R${Math.abs(amount).toLocaleString()}`;
}

function formatDate(dateString) {
  if (!dateString) return null;
  const date = new Date(dateString);
  return date.toLocaleDateString("en-ZA", { month: "long", day: "numeric", year: "numeric" });
}
