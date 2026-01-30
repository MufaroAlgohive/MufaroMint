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
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        setData((prev) => ({ ...prev, loading: false }));
        return;
      }

      const userId = userData.user.id;

      const [
        balanceResult,
        transactionsResult,
        holdingsResult,
        creditResult,
      ] = await Promise.all([
        supabase.from("user_balances").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("transactions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
        supabase.from("user_holdings").select("*, securities(symbol, name, logo_url)").eq("user_id", userId),
        supabase.from("credit_accounts").select("*").eq("user_id", userId).maybeSingle(),
      ]);

      const balanceData = balanceResult.data || { total_balance: 0, investments: 0, available_credit: 0 };
      const transactions = transactionsResult.data || [];
      const holdings = holdingsResult.data || [];
      const creditInfo = creditResult.data;

      const sortedHoldings = [...holdings].sort((a, b) => {
        const aGain = (a.current_value || 0) - (a.cost_basis || 0);
        const bGain = (b.current_value || 0) - (b.cost_basis || 0);
        return bGain - aGain;
      });

      const bestAssets = sortedHoldings.slice(0, 5).map((h) => ({
        symbol: h.securities?.symbol || h.symbol || "N/A",
        name: h.securities?.name || h.name || "Unknown",
        value: h.current_value || 0,
        change: h.change_percent || 0,
        logo: h.securities?.logo_url || null,
      }));

      const totalInvestments = holdings.reduce((sum, h) => sum + (h.current_value || 0), 0);
      const totalBalance = totalInvestments + (creditInfo?.available_credit || 0);

      setData({
        balance: balanceData.total_balance || totalBalance,
        investments: balanceData.investments || totalInvestments,
        availableCredit: balanceData.available_credit || creditInfo?.available_credit || 0,
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
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user) {
          setData((prev) => ({ ...prev, loading: false }));
          return;
        }

        const userId = userData.user.id;

        const [balanceResult, holdingsResult, creditResult, transactionsResult] = await Promise.all([
          supabase.from("user_balances").select("*").eq("user_id", userId).maybeSingle(),
          supabase.from("user_holdings").select("current_value, cost_basis, daily_change").eq("user_id", userId),
          supabase.from("credit_accounts").select("available_credit").eq("user_id", userId).maybeSingle(),
          supabase.from("transactions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
        ]);

        const holdings = holdingsResult.data || [];
        const totalInvestments = holdings.reduce((sum, h) => sum + (h.current_value || 0), 0);
        const dailyChange = holdings.reduce((sum, h) => sum + (h.daily_change || 0), 0);
        const availableCredit = creditResult.data?.available_credit || 0;
        const totalBalance = totalInvestments + availableCredit;

        const recentChanges = (transactionsResult.data || []).map((t) => ({
          title: t.description || t.type || "Transaction",
          date: formatTransactionDate(t.created_at),
          amount: formatTransactionAmount(t.amount, t.type),
        }));

        setData({
          totalBalance: balanceResult.data?.total_balance || totalBalance,
          investments: balanceResult.data?.investments || totalInvestments,
          availableCredit: balanceResult.data?.available_credit || availableCredit,
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
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("transactions")
          .select("*")
          .eq("user_id", userData.user.id)
          .order("created_at", { ascending: false })
          .limit(limit);

        if (error) throw error;

        setTransactions(
          (data || []).map((t) => ({
            id: t.id,
            title: t.description || t.type || "Transaction",
            subtitle: formatTransactionDate(t.created_at),
            amount: t.amount || 0,
            type: t.type,
          }))
        );
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
    scoreChanges: [],
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
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user) {
          setData((prev) => ({ ...prev, loading: false }));
          return;
        }

        const userId = userData.user.id;

        const [creditResult, scoreHistoryResult] = await Promise.all([
          supabase.from("credit_accounts").select("*").eq("user_id", userId).maybeSingle(),
          supabase.from("credit_score_history").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
        ]);

        const credit = creditResult.data;
        const scoreChanges = (scoreHistoryResult.data || []).map((s) => ({
          label: s.reason || "Score update",
          date: formatTransactionDate(s.created_at),
          value: s.change > 0 ? `+${s.change}` : `${s.change}`,
        }));

        if (credit) {
          setData({
            availableCredit: credit.available_credit || 0,
            score: credit.credit_score || 0,
            loanBalance: credit.loan_balance || 0,
            nextPaymentDate: credit.next_payment_date ? formatDate(credit.next_payment_date) : null,
            minDue: credit.minimum_due || 0,
            utilisationPercent: credit.utilisation_percent || 0,
            scoreChanges,
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
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user) {
          setData((prev) => ({ ...prev, loading: false }));
          return;
        }

        const userId = userData.user.id;

        const [holdingsResult, goalsResult] = await Promise.all([
          supabase.from("user_holdings").select("*, securities(symbol, name, asset_class)").eq("user_id", userId),
          supabase.from("investment_goals").select("*").eq("user_id", userId),
        ]);

        const holdings = holdingsResult.data || [];
        const goals = goalsResult.data || [];

        const totalInvestments = holdings.reduce((sum, h) => sum + (h.current_value || 0), 0);
        const totalCost = holdings.reduce((sum, h) => sum + (h.cost_basis || 0), 0);
        const monthlyChange = holdings.reduce((sum, h) => sum + (h.monthly_change || 0), 0);
        const monthlyChangePercent = totalCost > 0 ? (monthlyChange / totalCost) * 100 : 0;

        const assetClasses = {};
        holdings.forEach((h) => {
          const assetClass = h.securities?.asset_class || h.asset_class || "Other";
          assetClasses[assetClass] = (assetClasses[assetClass] || 0) + (h.current_value || 0);
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
