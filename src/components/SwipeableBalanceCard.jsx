import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import {
  Eye,
  EyeOff,
  TrendingUp,
  LayoutGrid,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  Area,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { supabase } from "../lib/supabase";
import { getStrategyPriceHistory } from "../lib/strategyData";
import { useRealtimePrices } from "../lib/useRealtimePrices";
import Skeleton from "./Skeleton";
import SettlementBadge from "./PendingBadge";
import {
  useSettlementConfig,
  getSettlementStatusForHolding,
} from "../lib/useSettlementStatus";

const VISIBILITY_STORAGE_KEY = "mintBalanceVisible";

const formatFull = (value) => {
  const num = Number(value);
  return `R${num.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatKMB = (value) => {
  const num = Number(value);
  const sign = num < 0 ? "-" : "";
  const absNum = Math.abs(num);
  let formatted = absNum;
  if (absNum >= 1e9) formatted = (absNum / 1e9).toFixed(1) + "b";
  else if (absNum >= 1e6) formatted = (absNum / 1e6).toFixed(1) + "m";
  else if (absNum >= 1e3) formatted = (absNum / 1e3).toFixed(1) + "k";
  else formatted = absNum.toFixed(2);
  return `${sign}R${formatted}`;
};

const TIMEFRAME_DAYS = { d: 5, w: 7, m: 30 };

/**
 * Recharts maps x from data values onto the axis domain. With domain [startTime, now],
 * points only between first/last sample timestamps occupy a fraction of the width.
 * Pad to window edges so the stroke uses the full chart width (flat carry of first/last value).
 */
function padChartSeriesPoints(points, windowStart, windowEnd) {
  if (!points?.length) return [];
  const sorted = [...points].sort((a, b) => a.d - b.d);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const out = [];
  if (first.d > windowStart) {
    out.push({ d: windowStart, v: first.v });
  }
  out.push(...sorted);
  if (last.d < windowEnd) {
    out.push({ d: windowEnd, v: last.v });
  }
  return out;
}

const SwipeableBalanceCard = ({
  userId,
  isBackFacing = true,
  forceVisible,
  mintNumber: mintNumberProp,
}) => {
  const [activeTab, setActiveTab] = useState("m");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { lastUpdated, isConnected } = useRealtimePrices();
  const settlementCfg = useSettlementConfig();
  const holdingSettlementStatus = getSettlementStatusForHolding(settlementCfg);
  const [showUpdatedText, setShowUpdatedText] = useState(false);
  const updatedTimerRef = useRef(null);

  // ── FIX 1: Wallet balance state ──────────────────────────────────────────
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletLoading, setWalletLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const fetchWallet = async () => {
      setWalletLoading(true);
      const { data, error } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", userId)
        .maybeSingle();
      if (!error && data?.balance !== undefined) {
        setWalletBalance(Number(data.balance));
      }
      setWalletLoading(false);
    };
    fetchWallet();

    window.addEventListener("profile-updated", fetchWallet);
    window.addEventListener("wallet-updated", fetchWallet);
    return () => {
      window.removeEventListener("profile-updated", fetchWallet);
      window.removeEventListener("wallet-updated", fetchWallet);
    };
  }, [userId]);

  // ── FIX 2: Mint number — fetch from DB if prop not provided ──────────────
  const [mintNumber, setMintNumber] = useState(mintNumberProp || null);

  useEffect(() => {
    // If parent already passed it in as a prop, use that
    if (mintNumberProp) {
      setMintNumber(mintNumberProp);
      return;
    }
    if (!userId) return;
    const fetchMintNumber = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("mint_number")
        .eq("id", userId)
        .single();
      if (!error && data?.mint_number) {
        setMintNumber(data.mint_number);
      }
    };
    fetchMintNumber();
  }, [userId, mintNumberProp]);

  useEffect(() => {
    if (lastUpdated) {
      setShowUpdatedText(true);
      if (updatedTimerRef.current) clearTimeout(updatedTimerRef.current);
      updatedTimerRef.current = setTimeout(
        () => setShowUpdatedText(false),
        3000,
      );
    }
    return () => {
      if (updatedTimerRef.current) clearTimeout(updatedTimerRef.current);
    };
  }, [lastUpdated]);

  useEffect(() => {
    if (!isBackFacing) setIsOpen(false);
  }, [isBackFacing]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  const [selectedAsset, setSelectedAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState([]);
  const [chartLoading, setChartLoading] = useState(false);
  const holdingsScrollRef = useRef(null);
  const scrollTimerRef = useRef(null);
  const chartWrapRef = useRef(null);
  const [chartWidth, setChartWidth] = useState(0);

  const scrollToHoldingIndex = (index) => {
    const container = holdingsScrollRef.current;
    if (!container) return;
    const item = container.querySelector(`[data-holding-index="${index}"]`);
    if (item) {
      const containerRect = container.getBoundingClientRect();
      const itemRect = item.getBoundingClientRect();
      const scrollLeft =
        container.scrollLeft +
        (itemRect.left - containerRect.left) -
        containerRect.width / 2 +
        itemRect.width / 2;
      container.scrollTo({ left: scrollLeft, behavior: "smooth" });
    }
  };

  const handleHoldingsScroll = () => {
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      const container = holdingsScrollRef.current;
      if (!container) return;
      const items = container.querySelectorAll("[data-holding-index]");
      const containerRect = container.getBoundingClientRect();
      const containerCenter = containerRect.left + containerRect.width / 2;
      let closestItem = null;
      let closestDist = Infinity;
      items.forEach((item) => {
        const rect = item.getBoundingClientRect();
        const itemCenter = rect.left + rect.width / 2;
        const dist = Math.abs(itemCenter - containerCenter);
        if (dist < closestDist) {
          closestDist = dist;
          closestItem = item;
        }
      });
      if (closestItem) {
        const idx = parseInt(
          closestItem.getAttribute("data-holding-index"),
          10,
        );
        if (idx === -1) {
          setSelectedAsset(null);
        } else if (idx >= 0 && idx < dbData.holdings.length) {
          setSelectedAsset(dbData.holdings[idx]);
        }
      }
    }, 150);
  };

  const [dbData, setDbData] = useState({
    holdings: [],
    totalMarketValue: 0,
    totalInvested: 0,
    totalInvestedAmount: 0,
    holdingsCount: 0,
  });

  const isVisible = true;

  const loadDataRef = React.useRef(null);

  useEffect(() => {
    const loadData = async () => {
      if (!userId) return;
      setLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      const [holdingsRes, strategiesRes] = token
        ? await Promise.all([
          fetch("/api/user/holdings", {
            headers: { Authorization: `Bearer ${token}` },
          }).then((r) => (r.ok ? r.json() : { holdings: [] })),
          fetch("/api/user/strategies", {
            headers: { Authorization: `Bearer ${token}` },
          }).then((r) => (r.ok ? r.json() : { strategies: [] })),
        ])
        : [{ holdings: [] }, { strategies: [] }];

      const stockHoldings = (holdingsRes.holdings || []).filter(h => !h.strategy_id);
      const strategyItems = await Promise.all((strategiesRes.strategies || []).map(async (s) => {
        const holdingsArr = s.holdings || [];
        const topLogos = holdingsArr
          .sort((a, b) => (b.weight || 0) - (a.weight || 0))
          .slice(0, 3)
          .map((h) => h.logo_url || null)
          .filter(Boolean);
        const investedRands = s.investedAmount || 0;
        const liveRands = s.currentMarketValue != null ? s.currentMarketValue : investedRands;
        const purchaseDate = s.firstInvestedDate;
        let changePct = investedRands > 0 ? ((liveRands - investedRands) / investedRands) * 100 : 0;

        const investedCents = Math.round(investedRands * 100);
        const currentCents = Math.round(liveRands * 100);
        return {
          symbol: s.shortName || s.name || "Strategy",
          name: s.name || "Strategy",
          market_value: currentCents,
          invested_amount: investedCents,
          avg_fill: investedCents,
          quantity: 1,
          logo_url: null,
          security_id: null,
          isStrategy: true,
          strategyId: s.id,
          topLogos: topLogos,
          changePct: changePct,
          holdings: holdingsArr,
          firstInvestedDate: purchaseDate,
        };
      }));
      const enrichedHoldings = [...stockHoldings, ...strategyItems];

      const mValue = enrichedHoldings.reduce(
        (acc, h) => acc + Number(h.market_value || 0) / 100,
        0,
      );
      const invested = enrichedHoldings.reduce(
        (acc, h) =>
          acc + (Number(h.avg_fill || 0) * Number(h.quantity || 0)) / 100,
        0,
      );
      const investedAmount = enrichedHoldings.reduce(
        (acc, h) => acc + Number(h.invested_amount || h.market_value || 0) / 100,
        0,
      );

      setDbData({
        holdings: enrichedHoldings,
        totalMarketValue: mValue,
        totalInvested: invested,
        totalInvestedAmount: investedAmount,
        holdingsCount: enrichedHoldings.length,
      });
      setLoading(false);
    };

    loadDataRef.current = loadData;
    loadData();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") loadDataRef.current?.();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [userId, lastUpdated]);

  useEffect(() => {
    const fetchChartPrices = async () => {
      if (!userId) return;

      // ── FIX 3: Don't wipe chart while holdings are still loading ──────────
      if (dbData.holdings.length === 0) {
        if (!loading) setChartData([]);
        return;
      }

      setChartLoading(true);

      const holdingsToChart = selectedAsset ? [selectedAsset] : dbData.holdings;
      const days = TIMEFRAME_DAYS[activeTab] || 30;
      const cutoff = new Date();
      cutoff.setHours(0, 0, 0, 0); // Start of today
      cutoff.setDate(cutoff.getDate() - days);
      const startTime = cutoff.getTime();
      const startDateStr = cutoff.toISOString().split("T")[0];

      if (selectedAsset?.isStrategy && selectedAsset?.strategyId) {
        const timeframeMap = { d: "1D", w: "1W", m: "1M" };
        const tf = timeframeMap[activeTab] || "1M";
        let priceHistory = await getStrategyPriceHistory(
          selectedAsset.strategyId,
          tf,
        );
        const purchaseDateStr = selectedAsset.firstInvestedDate ? selectedAsset.firstInvestedDate.slice(0, 10) : null;
        if (purchaseDateStr && priceHistory && priceHistory.length > 0) {
          const afterPurchase = priceHistory.filter(p => p.ts.split("T")[0] >= purchaseDateStr);
          if (afterPurchase.length >= 1) {
            priceHistory = afterPurchase;
          } else {
            const beforePurchase = priceHistory.filter(p => p.ts.split("T")[0] < purchaseDateStr);
            if (beforePurchase.length > 0) {
              const lastKnown = beforePurchase[beforePurchase.length - 1];
              priceHistory = [lastKnown, { ...lastKnown, ts: purchaseDateStr + "T00:00:00Z" }];
            }
          }
        }
        if (priceHistory && priceHistory.length > 0) {
          const latestNav = priceHistory[priceHistory.length - 1].nav;
          const currentMarketValue = Number(selectedAsset.market_value || 0) / 100;
          const costBasis = (Number(selectedAsset.avg_fill || 0) * Number(selectedAsset.quantity || 1)) / 100;
          if (latestNav > 0) {
            const points = [];
            const firstTs = priceHistory[0].ts.split("T")[0];
            const anchorDate = new Date(firstTs);
            anchorDate.setDate(anchorDate.getDate() - 1);
            points.push({ d: anchorDate.toISOString().split("T")[0], v: 0 });
            priceHistory.forEach((p) => {
              const valueAtDate = currentMarketValue * (p.nav / latestNav);
              const pnl = valueAtDate - costBasis;
                const pTime = new Date(p.ts).getTime();
                points.push({
                  d: pTime,
                  v: Number(pnl.toFixed(2)),
                });
            });
            setChartData(points);
          } else {
            setChartData([]);
          }
        } else {
          setChartData([]);
        }
        setChartLoading(false);
        return;
      }

      const stockHoldings = holdingsToChart.filter(
        (h) => h.security_id && !h.isStrategy,
      );
      const strategyHoldings = holdingsToChart.filter(
        (h) => h.isStrategy && h.strategyId,
      );

      const strategyPnlByDate = {};
      const timeframeMap = { d: "1D", w: "1W", m: "1M" };
      const tf = timeframeMap[activeTab] || "1M";
      for (const sh of strategyHoldings) {
        try {
          let priceHistory = await getStrategyPriceHistory(sh.strategyId, tf);
          const pDateStr = sh.firstInvestedDate ? sh.firstInvestedDate.slice(0, 10) : null;
          if (pDateStr && priceHistory && priceHistory.length > 0) {
            const afterP = priceHistory.filter(p => p.ts.split("T")[0] >= pDateStr);
            if (afterP.length >= 1) {
              priceHistory = afterP;
            } else {
              const beforeP = priceHistory.filter(p => p.ts.split("T")[0] < pDateStr);
              if (beforeP.length > 0) {
                const lastKnown = beforeP[beforeP.length - 1];
                priceHistory = [lastKnown, { ...lastKnown, ts: pDateStr + "T00:00:00Z" }];
              }
            }
          }
          if (priceHistory && priceHistory.length > 0) {
            const latestNav = priceHistory[priceHistory.length - 1].nav;
            const currentMV = Number(sh.market_value || 0) / 100;
            const cost = (Number(sh.avg_fill || 0) * Number(sh.quantity || 1)) / 100;
            if (latestNav > 0) {
              priceHistory.forEach((p) => {
                const dateKey = p.ts.split("T")[0];
                const valueAtDate = currentMV * (p.nav / latestNav);
                const pnl = valueAtDate - cost;
                strategyPnlByDate[dateKey] = (strategyPnlByDate[dateKey] || 0) + pnl;
              });
            }
          }
        } catch (e) { }
      }

      const pricePromises = stockHoldings.map(async (h) => {
        let { data, error } = await supabase
          .from("security_prices")
          .select("ts, close_price")
          .eq("security_id", h.security_id)
          .gte("ts", startDateStr)
          .order("ts", { ascending: true });

        if (error || !data || data.length < 2) {
          const fallback = await supabase
            .from("security_prices")
            .select("ts, close_price")
            .eq("security_id", h.security_id)
            .order("ts", { ascending: false })
            .limit(30);
          if (!fallback.error && fallback.data && fallback.data.length >= 2) {
            data = fallback.data.reverse();
          } else if (!data || data.length === 0) {
            return null;
          }
        }

        const pDateStr = (h.created_at || h.as_of_date || "").split("T")[0];
        const avgFillPrice = Number(h.avg_fill || 0) / 100;
        const livePrice = Number(h.last_price || 0) / 100;
        const allMapped = data.map((p) => ({
          ts: p.ts.split("T")[0],
          close: Number(p.close_price) / 100,
        }));
        let filteredPrices = allMapped.filter((p) => p.ts >= pDateStr);
        if (filteredPrices.length === 0) {
          filteredPrices = [{ ts: pDateStr, close: avgFillPrice }];
        }
        const today = new Date().toISOString().split("T")[0];
        const lastDate = filteredPrices[filteredPrices.length - 1]?.ts;
        if (livePrice > 0 && lastDate && lastDate < today) {
          filteredPrices.push({ ts: today, close: livePrice });
        }
        return {
          securityId: h.security_id,
          quantity: Number(h.quantity || 1),
          avgFill: avgFillPrice,
          fillDate: pDateStr,
          prices: filteredPrices,
        };
      });

      const allPriceData = (await Promise.all(pricePromises)).filter(Boolean);
      const hasStrategyData = Object.keys(strategyPnlByDate).length > 0;

      if (allPriceData.length === 0 && !hasStrategyData) {
        setChartData([]);
        setChartLoading(false);
        return;
      }

      const dateSet = new Set();
      allPriceData.forEach(({ prices }) =>
        prices.forEach((p) => dateSet.add(p.ts)),
      );
      Object.keys(strategyPnlByDate).forEach((d) => dateSet.add(d));
      const sortedDates = Array.from(dateSet).sort();

      const rawPriceByDate = {};
      allPriceData.forEach(({ securityId, prices }) => {
        rawPriceByDate[securityId] = {};
        prices.forEach((p) => {
          rawPriceByDate[securityId][p.ts] = p.close;
        });
      });

      const filledPriceByDate = {};
      allPriceData.forEach(({ securityId }) => {
        filledPriceByDate[securityId] = {};
        let lastKnown = 0;
        for (const dateKey of sortedDates) {
          if (rawPriceByDate[securityId]?.[dateKey] !== undefined) {
            lastKnown = rawPriceByDate[securityId][dateKey];
          }
          if (lastKnown > 0) {
            filledPriceByDate[securityId][dateKey] = lastKnown;
          }
        }
      });

      // Start with the calculated startTime to define the chart window bounds
      const points = [];
      const now = Date.now();

      for (const dateKey of sortedDates) {
        let totalPnl = 0;
        let hasData = false;

        for (const { securityId, quantity, avgFill } of allPriceData) {
          const price = filledPriceByDate[securityId]?.[dateKey];
          if (price && avgFill > 0) {
            totalPnl += quantity * (price - avgFill);
            hasData = true;
          }
        }

        if (strategyPnlByDate[dateKey] !== undefined) {
          totalPnl += strategyPnlByDate[dateKey];
          hasData = true;
        }

        if (hasData) {
          const pointTime = new Date(dateKey).getTime();
          // Avoid duplicate or very close points at the start
          if (pointTime > startTime) {
            points.push({ d: pointTime, v: Number(totalPnl.toFixed(2)) });
          }
        }
      }

      setChartData(points);
      setChartLoading(false);
    };

    fetchChartPrices();
  }, [userId, dbData.holdings, activeTab, selectedAsset, lastUpdated, loading]);

  useLayoutEffect(() => {
    const el = chartWrapRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.getBoundingClientRect().width;
      if (w >= 1) setChartWidth(Math.round(w));
    };
    measure();
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => measure())
        : null;
    ro?.observe(el);
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
    };
  }, []);

  const displayMarketValue = selectedAsset
    ? Number(selectedAsset.market_value || 0) / 100
    : dbData.totalMarketValue;
  const displayInvested = selectedAsset
    ? (Number(selectedAsset.avg_fill || 0) *
      Number(selectedAsset.quantity || 0)) /
    100
    : dbData.totalInvested;
  const displayInvestedAmount = selectedAsset
    ? Number(selectedAsset.invested_amount || selectedAsset.market_value || 0) / 100
    : dbData.totalInvestedAmount;
  const displayReturn = displayMarketValue - displayInvested;
  const displayBalance = displayInvestedAmount + displayReturn;
  const isLoss = displayReturn < 0;
  const returnPct =
    displayInvested > 0
      ? ((displayReturn / displayInvested) * 100).toFixed(1)
      : "0.0";
  const chartColor = isLoss ? "#FB7185" : "#10B981";
  const now = Date.now();
  const startTime = (() => {
    const d = TIMEFRAME_DAYS[activeTab] || 30;
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - d);
    return cutoff.getTime();
  })();

  const paddedChartData = padChartSeriesPoints(chartData, startTime, now);

  const masked = "••••";

  if (loading && userId)
    return (
      <div className="w-full h-full rounded-[28px] bg-slate-50 p-4 flex flex-col">
        <div className="flex flex-1">
          <div className="w-[50%] flex flex-col justify-between border-r border-slate-200 pr-4">
            <div className="space-y-3">
              <div>
                <Skeleton className="h-2.5 w-20 bg-slate-200 mb-2" />
                <Skeleton className="h-5 w-24 bg-slate-200 mb-2" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-16 bg-slate-200" />
                  <Skeleton className="h-4 w-10 rounded-full bg-slate-200" />
                </div>
              </div>
              <div>
                <Skeleton className="h-2.5 w-16 bg-slate-200 mb-2" />
                <div className="flex gap-1">
                  <Skeleton className="h-5 w-14 rounded-full bg-slate-200" />
                  <Skeleton className="h-5 w-14 rounded-full bg-slate-200" />
                  <Skeleton className="h-5 w-10 rounded-full bg-slate-200" />
                </div>
              </div>
            </div>
          </div>
          <div className="w-[50%] flex flex-col justify-between pl-4">
            <div className="flex gap-1.5">
              <Skeleton className="h-5 w-8 rounded-full bg-slate-200" />
              <Skeleton className="h-5 w-8 rounded-full bg-slate-200" />
              <Skeleton className="h-5 w-8 rounded-full bg-slate-200" />
            </div>
            <div className="flex-1 flex items-end gap-1 py-3">
              {[40, 55, 35, 65, 50, 70, 45, 60, 75, 55].map((h, i) => (
                <Skeleton
                  key={i}
                  className="flex-1 rounded-sm bg-slate-200"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
            <Skeleton className="h-8 w-full rounded-xl bg-slate-200" />
          </div>
        </div>
        <div className="mt-2 flex justify-start">
          <Skeleton className="h-3 w-32 bg-slate-200" />
        </div>
      </div>
    );

  const getUpdatedAgoText = () => {
    if (!lastUpdated) return "";
    const seconds = Math.round((Date.now() - lastUpdated) / 1000);
    if (seconds < 5) return "Updated just now";
    if (seconds < 60) return `Updated ${seconds}s ago`;
    return `Updated ${Math.round(seconds / 60)}m ago`;
  };

  return (
    <div className="relative w-full z-10 rounded-[26px] overflow-hidden">
      {isConnected && (
        <div className="absolute top-2 right-3 z-20 flex items-center gap-1.5">
          {showUpdatedText && (
            <span
              className="text-[8px] text-slate-500 font-medium transition-opacity duration-500"
              style={{ animation: "fadeInOut 3s ease-in-out" }}
            >
              {getUpdatedAgoText()}
            </span>
          )}
          <span
            className="block w-1.5 h-1.5 rounded-full bg-emerald-400"
            style={{ animation: "pulse-dot 2s ease-in-out infinite" }}
          />
          <style>{`
            @keyframes pulse-dot {
              0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.4); }
              50% { opacity: 0.7; box-shadow: 0 0 0 3px rgba(52, 211, 153, 0); }
            }
            @keyframes fadeInOut {
              0% { opacity: 0; }
              10% { opacity: 1; }
              80% { opacity: 1; }
              100% { opacity: 0; }
            }
          `}</style>
        </div>
      )}
      <div className="absolute inset-0 rounded-[26px] bg-[radial-gradient(circle_at_78%_18%,rgba(88,62,186,0.45),rgba(8,8,48,0.95)_46%,rgba(5,5,33,0.98)_100%)]" />
      <div className="relative z-10 flex flex-col p-4 text-slate-100">
        <div className="mb-2 flex items-start justify-between gap-3">
          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-medium">
            {selectedAsset ? selectedAsset.symbol : "portfolio value"}
          </p>
          <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/15 shrink-0">
            {["d", "w", "m"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 text-[10px] font-semibold rounded-md ${activeTab === tab ? "bg-white/10 text-white shadow-sm" : "text-slate-300"}`}
              >
                {tab.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <p className="text-[36px] leading-none font-bold text-white mb-3 w-full overflow-visible whitespace-nowrap">
          {isVisible ? (selectedAsset ? formatKMB(displayBalance) : formatFull(displayBalance)) : masked}
        </p>

        <div className="mb-2 flex items-center gap-2 flex-wrap">
          <span className={`px-2 py-0.5 rounded-xl border text-sm font-semibold shrink-0 ${isLoss ? "border-rose-700/70 bg-rose-600/15 text-rose-300" : "border-emerald-700/70 bg-emerald-600/15 text-emerald-300"}`}>
            {isLoss ? "▼" : "▲"} {isVisible ? formatKMB(Math.abs(displayReturn)) : masked}
          </span>
          <span className={`text-[12px] font-medium shrink-0 ${isLoss ? "text-rose-300/80" : "text-emerald-300/80"}`}>
            {isVisible ? `${isLoss ? "-" : "+"}${returnPct}% all time` : masked}
          </span>
        </div>

        <div ref={dropdownRef} className="relative mb-2 self-end">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/15 min-w-[180px]"
          >
            <div className="flex items-center gap-2">
              <LayoutGrid size={12} className="text-violet-400" />
              <span className="text-[12px] leading-none font-medium text-slate-200 whitespace-nowrap">
                {selectedAsset ? selectedAsset.symbol : "All Investments"}
              </span>
            </div>
            {isOpen ? (
              <ChevronUp size={14} className="text-slate-300" />
            ) : (
              <ChevronDown size={14} className="text-slate-300" />
            )}
          </button>
          {isOpen && (
            <div className="absolute bottom-full mb-1 right-0 w-full bg-white rounded-xl z-[120] overflow-hidden border border-slate-200 shadow-lg">
              <div className="py-1 overflow-y-auto max-h-[140px]">
                <button
                  onClick={() => {
                    setSelectedAsset(null);
                    setIsOpen(false);
                    scrollToHoldingIndex(-1);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-left ${!selectedAsset ? "bg-slate-100" : "hover:bg-slate-50"}`}
                >
                  <LayoutGrid size={10} className="text-violet-400 shrink-0" />
                  <span className="text-[9px] font-medium text-slate-700 truncate">
                    All Investments
                  </span>
                </button>
                {dbData.holdings.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedAsset(item);
                      setIsOpen(false);
                      scrollToHoldingIndex(idx);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-left ${selectedAsset?.symbol === item.symbol ? "bg-slate-100" : "hover:bg-slate-50"}`}
                  >
                    <div className="w-4 h-4 rounded-full overflow-hidden bg-slate-100 shrink-0">
                      {item.isStrategy && item.topLogos?.length > 0 ? (
                        <div className="flex -space-x-1 h-full items-center justify-center">
                          {item.topLogos.slice(0, 2).map((logo, li) => (
                            <img
                              key={li}
                              src={logo}
                              className="w-3 h-3 rounded-full object-cover border border-white/25"
                            />
                          ))}
                        </div>
                      ) : item.logo_url ? (
                        <img
                          src={item.logo_url}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="flex items-center justify-center w-full h-full text-[6px] text-slate-500">
                          {item.symbol?.substring(0, 2)}
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] font-medium text-slate-700 truncate">
                      {item.symbol}
                    </span>
                    {(() => {
                      if (item.isStrategy && Number(item.avg_fill || 0) === 0) {
                        return <SettlementBadge status="pending" size="xs" />;
                      }
                      if (item.settlement_status && item.settlement_status !== "confirmed") {
                        return <SettlementBadge status={item.settlement_status} size="xs" />;
                      }
                      const isSettlementActive = settlementCfg.brokerEnabled || settlementCfg.fullyIntegrated;
                      if (!isSettlementActive) return null;
                      const s = holdingSettlementStatus;
                      return s && s !== "confirmed" ? (
                        <SettlementBadge status={s} size="xs" />
                      ) : null;
                    })()}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div
          ref={chartWrapRef}
          className="mb-3 w-full min-w-0 overflow-hidden"
          style={{ minHeight: 100, height: 100 }}
        >
              {chartData.length > 0 ? (
                chartWidth > 0 ? (
                <ResponsiveContainer width={chartWidth} height={100}>
                  <ComposedChart
                    data={paddedChartData}
                    margin={{ top: 2, right: 0, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="d" 
                      type="number" 
                      domain={[startTime, now]} 
                      hide 
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const dateObj = new Date(payload[0]?.payload?.d);
                        const dateFormatted = dateObj.toLocaleDateString("en-ZA", {
                          day: "numeric",
                          month: "short",
                        });
                        return (
                          <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg px-2 py-1 shadow-md">
                            <p className="text-[9px] text-slate-500">{dateFormatted}</p>
                            <p className="text-[10px] font-semibold text-slate-800">
                              R{Number(payload[0]?.value).toFixed(2)}
                            </p>
                          </div>
                        );
                      }}
                    />
                    <ReferenceLine
                      y={0}
                      stroke="rgba(148,163,184,0.5)"
                      strokeDasharray="3 3"
                      strokeWidth={1}
                    />
                    <Area
                      type="monotone"
                      dataKey="v"
                      stroke="none"
                      fill="url(#colorValue)"
                      fillOpacity={1}
                    />
                    <Line
                      type="monotone"
                      dataKey="v"
                      stroke={chartColor}
                      strokeWidth={3}
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
                ) : (
                  <div className="flex h-full w-full items-end gap-1 py-2">
                    {[40, 55, 35, 65, 50, 70, 45, 60, 75, 55].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-sm bg-white/10"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                )
              ) : (
                <div className="flex items-center justify-center h-full">
                  {chartLoading ? (
                    <div className="flex items-end gap-1 w-full h-full py-2">
                      {[40, 55, 35, 65, 50, 70, 45, 60, 75, 55, 65, 50].map(
                        (h, i) => (
                          <Skeleton
                            key={i}
                            className="flex-1 rounded-sm bg-white/10"
                            style={{ height: `${h}%` }}
                          />
                        ),
                      )}
                    </div>
                  ) : (
                    <p className="text-[9px] text-slate-500">No chart data</p>
                  )}
                </div>
              )}
            </div>
        <div className="mt-auto pt-3 pb-5 border-t border-white/10 flex items-start">
          <div className="flex-1 min-w-0 pr-3">
            <p className="text-[8px] uppercase tracking-[0.2em] text-slate-400 font-medium mb-0.5">
              ACCOUNT BALANCE
            </p>
            <p className="text-[11px] font-semibold text-slate-100 truncate">
              {isVisible ? (walletLoading ? "Loading..." : formatFull(walletBalance)) : masked}
            </p>
          </div>
          <div className="w-px self-stretch bg-white/10" />
          <div className="flex-1 min-w-0 pl-3">
            <p className="text-[8px] uppercase tracking-[0.2em] text-slate-400 font-medium mb-0.5" style={{ fontFamily: "'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif" }}>
              MINT NUMBER
            </p>
            <p className="text-[11px] tracking-[0.1em] text-slate-300 font-mono font-bold truncate">
              {mintNumber ?? "GENERATING..."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SwipeableBalanceCard;
