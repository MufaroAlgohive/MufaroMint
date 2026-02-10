import React, { useEffect, useState, useMemo, useRef } from "react";
import { ArrowDownRight, ArrowDownLeft, ArrowUpRight, MoreHorizontal, X, Search, CalendarDays, TrendingUp, CreditCard, Wallet, RefreshCw, Gift, Filter } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useProfile } from "../lib/useProfile";
import NotificationBell from "../components/NotificationBell";
import Skeleton from "../components/Skeleton";
import { supabase } from "../lib/supabase";
import { formatCurrency } from "../lib/formatCurrency";
import { normalizeSymbol, getHoldingsArray, buildHoldingsBySymbol, getStrategyHoldingsSnapshot } from "../lib/strategyUtils";
import { useTransactions } from "../lib/useFinancialData";
import ActivitySkeleton from "../components/ActivitySkeleton";

const activityFilters = ["All", "Investments", "Deposits", "Withdrawals"];

const getTransactionIcon = (name, direction) => {
  const lower = (name || "").toLowerCase();
  if (lower.includes("dividend") || lower.includes("interest")) return Gift;
  if (lower.includes("credit") || lower.includes("loan")) return CreditCard;
  if (lower.includes("withdraw") || lower.includes("repay")) return Wallet;
  if (lower.includes("recurring") || lower.includes("auto")) return RefreshCw;
  if (lower.includes("invest") || lower.includes("strategy") || lower.includes("purchas") || lower.includes("buy") || lower.includes("bought")) return TrendingUp;
  if (direction === "credit") return ArrowDownLeft;
  return ArrowUpRight;
};

const getIconColors = (direction, name) => {
  const lower = (name || "").toLowerCase();
  if (lower.includes("invest") || lower.includes("strategy") || lower.includes("purchas") || lower.includes("buy") || lower.includes("bought")) return { bg: "bg-blue-50", text: "text-blue-600" };
  if (direction === "credit") return { bg: "bg-emerald-50", text: "text-emerald-600" };
  return { bg: "bg-red-50", text: "text-red-500" };
};

const getFilterCategory = (direction, name) => {
  const lower = (name || "").toLowerCase();
  if (lower.includes("withdraw") || lower.includes("repay")) return "Withdrawals";
  if (lower.includes("deposit") || direction === "credit") return "Deposits";
  if (lower.includes("invest") || lower.includes("buy") || lower.includes("strategy") || direction === "debit") return "Investments";
  return "Other";
};

const formatRelativeDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((today - itemDate) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return "This Week";
  if (diffDays < 30) return "This Month";
  return date.toLocaleDateString("en-ZA", { month: "long", year: "numeric" });
};

const formatTime = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" });
};

const formatShortDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
};

const formatAmount = (amount, direction) => {
  if (amount === undefined || amount === null) return "R0.00";
  const val = Math.abs(amount) / 100;
  return `R${val.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const StatementsPage = ({ onOpenNotifications }) => {
  const { profile } = useProfile();
  const [activeTab, setActiveTab] = useState("strategy");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(9);
  const [selectedCard, setSelectedCard] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [holdingsRows, setHoldingsRows] = useState([]);
  const [holdingsRaw, setHoldingsRaw] = useState([]);
  const [strategyRows, setStrategyRows] = useState([]);
  const [rawStrategies, setRawStrategies] = useState([]);
  const [holdingsSecurities, setHoldingsSecurities] = useState([]);
  const [strategiesLoading, setStrategiesLoading] = useState(true);
  const [holdingsLoading, setHoldingsLoading] = useState(true);

  const { transactions: activityTransactions, loading: activityLoading } = useTransactions(100);
  const [activityFilter, setActivityFilter] = useState("All");
  const [activitySearchQuery, setActivitySearchQuery] = useState("");
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const activitySearchRef = useRef(null);

  const displayName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ");
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  useEffect(() => {
    const calculatePerPage = () => {
      const viewportHeight = window.innerHeight;
      const availableHeight = viewportHeight - 380;
      const cardHeight = 80;
      const calculatedPerPage = Math.max(4, Math.floor(availableHeight / cardHeight));
      setPerPage(calculatedPerPage);
    };

    calculatePerPage();
    window.addEventListener("resize", calculatePerPage);
    return () => window.removeEventListener("resize", calculatePerPage);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadStrategies = async () => {
      if (!supabase || !profile?.id) {
        return;
      }
      if (isMounted) setStrategiesLoading(true);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) {
          if (isMounted) setStrategiesLoading(false);
          return;
        }

        const res = await fetch("/api/user/strategies", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          console.error("[StatementsPage] Failed to fetch strategies:", res.status);
          if (isMounted) setStrategiesLoading(false);
          return;
        }
        const json = await res.json();
        const userStrategies = json.strategies || [];

        if (userStrategies.length === 0) {
          if (isMounted) {
            setStrategyRows([]);
            setRawStrategies([]);
            setStrategiesLoading(false);
          }
          return;
        }

        const subscribedIds = userStrategies.map(s => s.id);

        const { data: strategies, error } = await supabase
          .from("strategies")
          .select("id, name, short_name, description, risk_level, holdings, strategy_metrics(as_of_date, last_close, change_pct, r_1m)")
          .in("id", subscribedIds)
          .eq("status", "active");

        if (error) throw error;

        const mapped = (strategies || []).map((strategy) => {
          const metrics = strategy.strategy_metrics;
          const latestMetric = Array.isArray(metrics) ? metrics[0] : metrics;
          const asOfDate = latestMetric?.as_of_date ? new Date(latestMetric.as_of_date) : null;
          const dateLabel = asOfDate
            ? asOfDate.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
            : "—";
          const desc = strategy.description
            ? strategy.description.length > 40
              ? strategy.description.slice(0, 40) + "…"
              : strategy.description
            : "—";

          const changePct = latestMetric?.change_pct != null ? Number(latestMetric.change_pct) : null;

          const holdingsCount = Array.isArray(strategy.holdings) ? strategy.holdings.length : 0;

          return {
            type: "Strategy",
            title: strategy.short_name || strategy.name || "—",
            shortName: strategy.short_name || null,
            fullName: strategy.name || "—",
            desc,
            date: dateLabel,
            amount: formatCurrency(latestMetric?.last_close || 0),
            meta: strategy.risk_level || "—",
            riskLevel: strategy.risk_level || null,
            changePct,
            tags: strategy.tags || [],
            flow: "out",
            strategyName: strategy.name || "—",
            objective: strategy.objective || null,
            currentValue: latestMetric?.last_close ? formatCurrency(latestMetric.last_close) : null,
            lastClose: latestMetric?.last_close || null,
            prevClose: latestMetric?.prev_close || null,
            changeAbs: latestMetric?.change_abs || null,
            r1w: latestMetric?.r_1w || null,
            r1m: latestMetric?.r_1m || null,
            r3m: latestMetric?.r_3m || null,
            r6m: latestMetric?.r_6m || null,
            rytd: latestMetric?.r_ytd || null,
            r1y: latestMetric?.r_1y || null,
            baseCurrency: strategy.base_currency || "ZAR",
            minInvestment: strategy.min_investment || null,
            providerName: strategy.provider_name || null,
            managementFeeBps: strategy.management_fee_bps || null,
            holdingsCount,
          };
        });

        if (isMounted) {
          setStrategyRows(mapped);
          setRawStrategies(strategies || []);
          setStrategiesLoading(false);
        }
      } catch (error) {
        console.error("Failed to load strategies", error);
        if (isMounted) setStrategiesLoading(false);
      }
    };

    loadStrategies();

    return () => {
      isMounted = false;
    };
  }, [profile?.id]);

  useEffect(() => {
    if (!supabase || rawStrategies.length === 0) return;

    const fetchHoldingsSecurities = async () => {
      try {
        const allTickers = [...new Set(
          rawStrategies.flatMap((strategy) =>
            getHoldingsArray(strategy).flatMap((h) => {
              const rawSymbol = h.ticker || h.symbol || h;
              const normalized = normalizeSymbol(rawSymbol);
              return normalized && normalized !== rawSymbol ? [rawSymbol, normalized] : [rawSymbol];
            })
          )
        )];

        if (allTickers.length === 0) return;

        const chunkSize = 50;
        const results = await Promise.all(
          Array.from({ length: Math.ceil(allTickers.length / chunkSize) }, (_, i) =>
            supabase
              .from("securities")
              .select("id, symbol, logo_url, name, last_price")
              .in("symbol", allTickers.slice(i * chunkSize, (i + 1) * chunkSize))
          )
        );

        const merged = [];
        results.forEach(({ data, error }) => {
          if (!error && data?.length) merged.push(...data);
        });

        if (merged.length) setHoldingsSecurities(merged);
      } catch (error) {
        console.error("Failed to fetch holdings securities", error);
      }
    };

    fetchHoldingsSecurities();
  }, [rawStrategies]);

  useEffect(() => {
    let isMounted = true;

    const loadHoldings = async () => {
      if (!supabase || !profile?.id) {
        return;
      }
      if (isMounted) setHoldingsLoading(true);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          if (isMounted) setHoldingsLoading(false);
          return;
        }

        const res = await fetch("/api/user/holdings", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (!res.ok) {
          console.error("Failed to fetch holdings from server:", res.status);
          if (isMounted) setHoldingsLoading(false);
          return;
        }

        const json = await res.json();
        const holdings = json.holdings || [];

        if (holdings.length === 0) {
          if (isMounted) {
            setHoldingsRows([]);
            setHoldingsLoading(false);
          }
          return;
        }

        const mappedHoldings = holdings.map((holding) => {
          const symbol = holding.symbol || "—";
          const exchange = holding.exchange || "";
          const title = holding.name || symbol;
          const asOfValue = holding.as_of_date || holding.updated_at || holding.created_at;
          const asOfDate = asOfValue ? new Date(asOfValue) : null;
          const dateLabel = asOfDate
            ? asOfDate.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
            : "—";
          const timeLabel = asOfDate
            ? asOfDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
            : "—";
          const quantity = Number(holding.quantity);
          const avgFill = Number(holding.avg_fill);
          const lastPriceCents = Number(holding.last_price);
          const marketPriceValue = Number.isFinite(lastPriceCents) ? lastPriceCents : NaN;
          const marketValue = Number.isFinite(marketPriceValue) && Number.isFinite(quantity)
            ? marketPriceValue * quantity
            : NaN;
          const formattedQty = Number.isFinite(quantity)
            ? quantity.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 6 })
            : "—";
          const formattedAvg = Number.isFinite(avgFill) ? formatCurrency(avgFill / 100) : "—";
          const formattedPrice = Number.isFinite(marketPriceValue) ? formatCurrency(marketPriceValue / 100) : "—";
          const formattedValue = Number.isFinite(marketValue) ? formatCurrency(marketValue / 100) : "—";
          const computedUnrealized = Number.isFinite(marketPriceValue) && Number.isFinite(avgFill) && Number.isFinite(quantity)
            ? (marketPriceValue - avgFill) * quantity
            : NaN;
          const formattedPnl = Number.isFinite(computedUnrealized)
            ? `${computedUnrealized < 0 ? "-" : "+"}${formatCurrency(Math.abs(computedUnrealized) / 100)}`
            : "—";

          return {
            type: "Holdings",
            icon: null,
            logoUrl: holding.logo_url || null,
            title,
            desc: exchange ? `${symbol} · ${exchange}` : symbol,
            instrument: title,
            ticker: symbol,
            quantity: formattedQty,
            avgCost: formattedAvg,
            marketPrice: formattedPrice,
            marketValue: formattedValue,
            unrealizedPL: formattedPnl,
            date: dateLabel,
            amount: formattedValue,
            meta: "Market value",
            time: timeLabel,
            flow: "in",
            status: holding.Status || null,
          };
        });

        if (isMounted) {
          setHoldingsRows(mappedHoldings);
          setHoldingsRaw(
            holdings.map((holding) => ({
              id: holding.id,
              quantity: Number(holding.quantity),
              marketValue: Number(holding.market_value),
              lastPrice: Number(holding.last_price),
            })),
          );
          setHoldingsLoading(false);
        }
      } catch (error) {
        console.error("Failed to load stock holdings", error);
        if (isMounted) setHoldingsLoading(false);
      }
    };

    loadHoldings();

    return () => {
      isMounted = false;
    };
  }, [profile?.id]);

  useEffect(() => {
    const updateMarketValues = async () => {
      if (!supabase || activeTab !== "holdings" || holdingsRaw.length === 0) return;

      const updates = holdingsRaw
        .map((holding) => {
          if (!Number.isFinite(holding.quantity) || !Number.isFinite(holding.lastPrice)) return null;
          const computedValue = holding.lastPrice * holding.quantity;
          if (!Number.isFinite(computedValue)) return null;
          const existingValue = Number.isFinite(holding.marketValue) ? holding.marketValue : null;
          const needsUpdate = existingValue == null || Math.abs(existingValue - computedValue) > 0.01;
          if (!needsUpdate) return null;
          return { id: holding.id, market_value: computedValue };
        })
        .filter(Boolean);

      if (updates.length === 0) return;

      try {
        await Promise.all(
          updates.map((update) =>
            supabase.from("stock_holdings").update({ market_value: update.market_value }).eq("id", update.id),
          ),
        );
      } catch (error) {
        console.error("Failed to update market values", error);
      }
    };

    updateMarketValues();
  }, [activeTab, holdingsRaw]);

  const holdingsBySymbol = useMemo(() => buildHoldingsBySymbol(holdingsSecurities), [holdingsSecurities]);

  const strategySnapshotsMap = useMemo(() => {
    const map = new Map();
    rawStrategies.forEach((strategy) => {
      const snapshot = getStrategyHoldingsSnapshot(strategy, holdingsBySymbol);
      map.set(strategy.short_name || strategy.name, snapshot);
    });
    return map;
  }, [rawStrategies, holdingsBySymbol]);

  const combinedRows = [...strategyRows, ...holdingsRows];

  const filtered = combinedRows.filter((row) => {
    if (activeTab === "strategy") return row.type === "Strategy";
    if (activeTab === "holdings") return row.type === "Holdings";
    if (activeTab === "activity") return false;
    return true;
  });

  const searchFiltered = searchQuery.trim()
    ? filtered.filter((row) => row.title.toLowerCase().includes(searchQuery.trim().toLowerCase()))
    : filtered;

  const isLoading =
    (activeTab === "strategy" && strategiesLoading) ||
    (activeTab === "holdings" && holdingsLoading);

  const activityItems = useMemo(() => {
    return activityTransactions.map((t) => {
      const isPositive = t.direction === "credit";
      return {
        id: t.id,
        title: t.name || t.description || "Transaction",
        description: t.description || t.store_reference || "",
        date: t.transaction_date || t.created_at || "",
        displayDate: formatShortDate(t.transaction_date || t.created_at),
        time: formatTime(t.transaction_date || t.created_at),
        amount: formatAmount(t.amount, t.direction),
        rawAmount: (t.amount || 0) / 100,
        direction: t.direction,
        status: t.status,
        filterCategory: getFilterCategory(t.direction, t.name),
        isPositive,
        groupLabel: formatRelativeDate(t.transaction_date || t.created_at),
        logo_url: t.logo_url,
        holding_logos: t.holding_logos || [],
      };
    });
  }, [activityTransactions]);

  const activitySummaryStats = useMemo(() => {
    const totalIn = activityItems.filter(i => {
      const lower = (i.title || "").toLowerCase();
      const isWithdrawal = lower.includes("withdraw") || lower.includes("repay");
      return !isWithdrawal;
    }).reduce((sum, i) => sum + Math.abs(i.rawAmount), 0);
    const totalOut = activityItems.filter(i => {
      const lower = (i.title || "").toLowerCase();
      return lower.includes("withdraw") || lower.includes("repay");
    }).reduce((sum, i) => sum + Math.abs(i.rawAmount), 0);
    return { totalIn, totalOut, count: activityItems.length };
  }, [activityItems]);

  const activityVisibleItems = useMemo(() => {
    let items = activityFilter === "All"
      ? activityItems
      : activityItems.filter((item) => item.filterCategory === activityFilter);

    if (activitySearchQuery.trim()) {
      const q = activitySearchQuery.toLowerCase();
      items = items.filter((item) =>
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.amount.toLowerCase().includes(q)
      );
    }

    if (fromDate || toDate) {
      const fromTime = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : null;
      const toTime = toDate ? new Date(`${toDate}T23:59:59`).getTime() : null;
      items = items.filter((item) => {
        const itemTime = new Date(item.date).getTime();
        if (isNaN(itemTime)) return false;
        if (fromTime && itemTime < fromTime) return false;
        if (toTime && itemTime > toTime) return false;
        return true;
      });
    }

    return items;
  }, [activityFilter, activitySearchQuery, fromDate, toDate, activityItems]);

  const activityGroupedItems = useMemo(() => {
    const groups = {};
    activityVisibleItems.forEach((item) => {
      const label = item.groupLabel;
      if (!groups[label]) groups[label] = [];
      groups[label].push(item);
    });
    const groupOrder = ["Today", "Yesterday", "This Week", "This Month"];
    return Object.entries(groups)
      .sort(([a, aItems], [b, bItems]) => {
        const aIdx = groupOrder.indexOf(a);
        const bIdx = groupOrder.indexOf(b);
        if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
        if (aIdx !== -1) return -1;
        if (bIdx !== -1) return 1;
        const dateA = new Date(aItems[0].date).getTime();
        const dateB = new Date(bItems[0].date).getTime();
        return dateB - dateA;
      })
      .map(([label, items]) => ({ label, items }));
  }, [activityVisibleItems]);

  const pages = Math.max(1, Math.ceil(searchFiltered.length / perPage));
  const start = (page - 1) * perPage;
  const pageRows = searchFiltered.slice(start, start + perPage);

  useEffect(() => {
    setPage(1);
  }, [activeTab, searchQuery]);

  const handleDownloadPdf = async () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    const rows = searchFiltered.map((row) => [row.title, row.date, row.amount, row.time]);
    const pageHeight = doc.internal.pageSize.getHeight();
    const ensurePageSpace = (startY, minSpace = 120) => {
      if (startY + minSpace > pageHeight - 40) {
        doc.addPage();
        return 40;
      }
      return startY;
    };

    try {
      const response = await fetch("/assets/mint-logo.svg");
      if (response.ok) {
        const svgText = await response.text();
        const svgBlob = new Blob([svgText], { type: "image/svg+xml" });
        const url = URL.createObjectURL(svgBlob);
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
          img.src = url;
        });
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL("image/png");
          doc.addImage(dataUrl, "PNG", 32, 24, 60, 28);
        }
        URL.revokeObjectURL(url);
      }
    } catch (error) {
    }

    doc.setFont("times", "normal");
    doc.setFontSize(18);
    doc.text("MINT CLIENT ACCOUNT STATEMENT", 32, 86, { align: "left" });

    doc.setFontSize(12);
    doc.text("Statement Period: [Start Date] – [End Date]", 32, 112, { align: "left" });
    doc.text(`Client Name: ${displayName || "[Full Legal Name]"}`, 32, 130, { align: "left" });
    doc.text(`Client ID: ${profile?.idNumber || "[Internal ID]"}`, 32, 148, { align: "left" });
    doc.text("Account Number: [Platform Account Reference]", 32, 166, { align: "left" });
    doc.text("Custodian: [Bank X]", 32, 184, { align: "left" });
    doc.text(`Statement Date: ${new Date().toLocaleDateString("en-GB")}`, 32, 202, { align: "left" });
    doc.text("Base Currency: ZAR", 32, 220, { align: "left" });

    doc.setFontSize(18);
    doc.text("SECTION 1: ACCOUNT SUMMARY (TOP OF STATEMENT)", 32, 264, { align: "left" });

    autoTable(doc, {
      head: [["Metric", "Amount (ZAR)"]],
      body: [
        ["Opening Balance", "xxx,xxx.xx"],
        ["Total Contributions", "xxx,xxx.xx"],
        ["Total Withdrawals", "(xx,xxx.xx)"],
        ["Net Cash Flow", "xxx,xxx.xx"],
        ["Investment Market Value", "xxx,xxx.xx"],
        ["Cash Balance", "xx,xxx.xx"],
        ["Total Account Value", "xxx,xxx.xx"],
        ["Total Platform P/L", "+ / – xx,xxx.xx"],
        ["Total Platform P/L (%)", "+ / – x.xx%"],
      ],
      styles: { fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [59, 27, 122], textColor: 255 },
      columnStyles: {
        0: { cellWidth: 300 },
        1: { cellWidth: 200, halign: "right" },
      },
      margin: { top: 288, left: 32, right: 32 },
      tableWidth: "wrap",
    });

    const notesStartY = (doc.lastAutoTable?.finalY || 320) + 20;
    doc.setFontSize(12);
    doc.text("Notes:", 32, notesStartY, { align: "left" });
    const notesLines = [
      "• \"Total Platform P/L\" reflects aggregate realised and unrealised performance across all strategies and self-directed activity on the platform.",
      "• Cash balances may be allocated or temporarily unallocated depending on strategy rebalancing cycles.",
    ];
    doc.text(notesLines, 32, notesStartY + 16, {
      align: "left",
      maxWidth: 530,
    });

    const section2StartY = ensurePageSpace(notesStartY + 100, 140);
    doc.setFontSize(18);
    doc.text("SECTION 2: STRATEGY EXPOSURE & PERFORMANCE", 32, section2StartY, { align: "left" });

    autoTable(doc, {
      head: [["Strategy Name", "Allocation (%)", "Capital Invested", "Current Value", "Unrealised P/L", "Realised P/L", "Total P/L"]],
      body: [
        ["MINT SA\nDefensive Income\nCompounders", "xx%", "xxx,xxx.xx", "xxx,xxx.xx", "xx,xxx.xx", "x,xxx.xx", "xx,xxx.xx"],
        ["MINT Cash\nAllocation", "xx%", "xx,xxx.xx", "xx,xxx.xx", "–", "–", "–"],
        ["Self-Directed\nPortfolio", "xx%", "xx,xxx.xx", "xx,xxx.xx", "x,xxx.xx", "x,xxx.xx", "xx,xxx.xx"],
        ["Total", "100%", "xxx,xxx.xx", "xxx,xxx.xx", "xx,xxx.xx", "x,xxx.xx", "xx,xxx.xx"],
      ],
      styles: { fontSize: 10, cellPadding: 6, overflow: "linebreak" },
      headStyles: { fillColor: [59, 27, 122], textColor: 255 },
      pageBreak: "auto",
      rowPageBreak: "auto",
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 65, halign: "right" },
        2: { cellWidth: 80, halign: "right" },
        3: { cellWidth: 80, halign: "right" },
        4: { cellWidth: 80, halign: "right" },
        5: { cellWidth: 70, halign: "right" },
        6: { cellWidth: 70, halign: "right" },
      },
      startY: section2StartY + 24,
      margin: { left: 32, right: 32 },
      tableWidth: "wrap",
    });

    const section2NotesY = (doc.lastAutoTable?.finalY || section2StartY + 100) + 20;
    doc.setFontSize(12);
    doc.text("Notes:", 32, section2NotesY, { align: "left" });
    const section2Notes = [
      "• Strategies may temporarily hold cash as part of portfolio construction, rebalancing, or risk management.",
      "• Strategy allocations are indicative as at statement date and may change without prior notice.",
    ];
    doc.text(section2Notes, 32, section2NotesY + 16, {
      align: "left",
      maxWidth: 530,
    });

    const section3StartY = ensurePageSpace(section2NotesY + 70, 120);
    doc.setFontSize(18);
    doc.text("SECTION 3: HOLDINGS SUMMARY", 32, section3StartY, { align: "left" });

    const holdingsForPdf = holdingsRows.filter((row) => row.type === "Holdings");
    const holdingsTableRows = holdingsForPdf.map((row) => [
      row.instrument || row.title || "—",
      row.ticker || "—",
      row.quantity || "—",
      row.avgCost || "—",
      row.marketPrice || "—",
      row.marketValue || "—",
      row.unrealizedPL || "—",
    ]);

    autoTable(doc, {
      head: [["Instrument", "Ticker", "Quantity", "Avg Cost", "Market Price", "Market Value", "Unrealised P/L"]],
      body: holdingsTableRows.length > 0 ? holdingsTableRows : [],
      styles: { fontSize: 10, cellPadding: 6, overflow: "linebreak" },
      headStyles: { fillColor: [59, 27, 122], textColor: 255 },
      pageBreak: "auto",
      rowPageBreak: "auto",
      columnStyles: {
        0: { cellWidth: 120 },
        1: { cellWidth: 50, halign: "center" },
        2: { cellWidth: 60, halign: "right" },
        3: { cellWidth: 60, halign: "right" },
        4: { cellWidth: 70, halign: "right" },
        5: { cellWidth: 85, halign: "right" },
        6: { cellWidth: 85, halign: "right" },
      },
      startY: section3StartY + 24,
      margin: { left: 32, right: 32 },
      tableWidth: "wrap",
    });

    const section4StartY = ensurePageSpace((doc.lastAutoTable?.finalY || section3StartY + 120) + 40, 140);
    doc.setFontSize(18);
    doc.text("SECTION 4: FULL TRANSACTION HISTORY", 32, section4StartY, { align: "left" });
    doc.setFontSize(12);
    doc.text("(ALL activity: strategy trades + self-directed trades + cash movements)", 32, section4StartY + 18, {
      align: "left",
    });

    autoTable(doc, {
      head: [[
        "Date",
        "Transaction Type",
        "Strategy / Source",
        "Instrument",
        "Buy / Sell",
        "Quantity",
        "Price",
        "Gross Amount",
        "Fees",
        "Net Amount",
      ]],
      body: [
        ["dd/mm/yyyy", "Strategy Trade", "MINT SA Defensive Income", "SBK", "Buy", "xxx", "xx.xx", "xx,xxx.xx", "xxx.xx", "xx,xxx.xx"],
        ["dd/mm/yyyy", "Self Trade", "Client Initiated", "VOD", "Sell", "xxx", "xx.xx", "xx,xxx.xx", "xxx.xx", "xx,xxx.xx"],
        ["dd/mm/yyyy", "Dividend", "Strategy Allocation", "SBK", "–", "–", "–", "x,xxx.xx", "–", "x,xxx.xx"],
        ["dd/mm/yyyy", "Fee", "Platform Fee", "–", "–", "–", "–", "(xxx.xx)", "–", "(xxx.xx)"],
      ],
      styles: { fontSize: 8, cellPadding: 4, overflow: "linebreak" },
      headStyles: { fillColor: [59, 27, 122], textColor: 255 },
      pageBreak: "auto",
      rowPageBreak: "auto",
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 70 },
        2: { cellWidth: 85 },
        3: { cellWidth: 45 },
        4: { cellWidth: 45 },
        5: { cellWidth: 40, halign: "right" },
        6: { cellWidth: 40, halign: "right" },
        7: { cellWidth: 55, halign: "right" },
        8: { cellWidth: 45, halign: "right" },
        9: { cellWidth: 55, halign: "right" },
      },
      startY: section4StartY + 32,
      margin: { left: 32, right: 32 },
      tableWidth: "wrap",
    });

    const section4NotesY = (doc.lastAutoTable?.finalY || section4StartY + 160) + 20;
    doc.setFontSize(12);
    doc.text("Notes:", 32, section4NotesY, { align: "left" });
    const section4Notes = [
      "• Transaction source distinguishes between strategy-driven activity and client-initiated trades.",
      "• All fees are disclosed on a gross and net basis.",
    ];
    doc.text(section4Notes, 32, section4NotesY + 16, {
      align: "left",
      maxWidth: 530,
    });

    const section5StartY = ensurePageSpace(section4NotesY + 70, 120);
    doc.setFontSize(18);
    doc.text("SECTION 5: FEES & CHARGES SUMMARY", 32, section5StartY, { align: "left" });

    autoTable(doc, {
      head: [["Fee Type", "Amount (ZAR)"]],
      body: [
        ["Platform Fees", "x,xxx.xx"],
        ["Strategy Fees", "x,xxx.xx"],
        ["Brokerage & Execution", "xxx.xx"],
        ["Custody Fees", "xxx.xx"],
        ["Total Fees", "x,xxx.xx"],
      ],
      styles: { fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [59, 27, 122], textColor: 255 },
      columnStyles: {
        0: { cellWidth: 300 },
        1: { cellWidth: 200, halign: "right" },
      },
      startY: section5StartY + 24,
      margin: { left: 32, right: 32 },
      tableWidth: "wrap",
    });

    const disclosuresStartY = ensurePageSpace((doc.lastAutoTable?.finalY || section5StartY + 120) + 40, 220);
    doc.setFontSize(16);
    doc.text("IMPORTANT DISCLOSURES & DISCLAIMERS", 32, disclosuresStartY, { align: "left" });
    doc.setFontSize(11);
    const disclosuresText = [
      "This statement is issued by MINT and is provided for information purposes only. It does not constitute investment advice, a recommendation, or an offer to buy or sell any financial instrument.",
      "MINT operates as a regulated financial services platform. Certain representatives and portfolio management functions may operate under supervision in accordance with the Financial Advisory and Intermediary Services Act, 2002 (FAIS). Where applicable, supervised representatives act under the oversight of approved key individuals and management structures.",
      "Client assets are held in custody with an approved third-party custodian, currently [Bank X], and are segregated from MINT's own assets in accordance with applicable regulatory and custodial requirements. MINT does not commingle client funds with its own operating accounts.",
      "Investment strategies available on the platform are model-based and discretionary in nature. Strategy allocations, holdings, and rebalancing decisions are implemented in accordance with predefined investment mandates but may be adjusted from time to time based on market conditions, risk considerations, liquidity constraints, or operational requirements. Strategies may hold cash temporarily as part of portfolio construction, rebalancing processes, defensive positioning, or pending deployment. Cash balances reflected in this statement may therefore relate to both unallocated funds and strategy-level cash positions.",
      "Rebalancing is performed at intervals determined by the investment team and may not occur simultaneously across all client accounts. As a result, timing differences, cash drag, and execution variances may occur between accounts following the same strategy.",
      "Performance figures shown include both realised and unrealised gains and losses and are based on valuations available as at the statement date. Past performance is not indicative of future results. Market values may fluctuate and capital invested is not guaranteed.",
      "Transaction records include both strategy-driven trades and client-initiated self-directed trades. MINT does not warrant the completeness or accuracy of third-party market data and pricing sources used in compiling this statement.",
      "Tax treatment depends on individual circumstances and may change. Clients are responsible for obtaining independent tax advice.",
      "This statement should be read in conjunction with the platform terms and conditions, strategy disclosures, and risk warnings available on the MINT platform.",
    ];
    let disclosuresY = disclosuresStartY + 18;
    disclosuresText.forEach((paragraph) => {
      const lines = doc.splitTextToSize(paragraph, 530);
      const blockHeight = lines.length * 14;
      disclosuresY = ensurePageSpace(disclosuresY, blockHeight + 10);
      doc.text(lines, 32, disclosuresY, { align: "left" });
      disclosuresY += blockHeight + 8;
    });

    doc.save("statements.pdf");
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-[env(safe-area-inset-bottom)] text-slate-900">
      <div className="rounded-b-[36px] bg-gradient-to-b from-[#111111] via-[#3b1b7a] to-[#5b21b6] px-4 pb-10 pt-8 text-white">
        <div className="mx-auto flex w-full max-w-md flex-col gap-6">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {profile?.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={displayName || "Profile"}
                  className="h-10 w-10 rounded-full border border-white/40 object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 border border-white/30 text-xs font-semibold text-white">
                  {initials || "—"}
                </div>
              )}
            </div>
            <h1 className="absolute left-1/2 -translate-x-1/2 text-xl font-semibold">Statements</h1>
            <NotificationBell onClick={onOpenNotifications} />
          </header>
          <div className="flex w-full items-center justify-center">
            <div className="w-full max-w-md">
              <div className="grid w-full grid-cols-3 rounded-full bg-white/10 p-1 backdrop-blur-md">
                {[
                  { id: "strategy", label: "Strategy" },
                  { id: "holdings", label: "Individual Stocks" },
                  { id: "activity", label: "Transaction History" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={
                      activeTab === tab.id
                        ? "w-full rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-sm"
                        : "w-full rounded-full px-3 py-1.5 text-xs font-semibold text-white/70 transition-all hover:bg-white/10 hover:text-white"
                    }
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeTab !== "activity" && (
                <div className="mt-3 grid w-full grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <input
                      type="text"
                      placeholder="Search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs text-white placeholder:text-white/70 shadow-sm backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-white/40"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    className="col-span-1 rounded-full bg-white/90 px-3 py-2 text-xs font-semibold text-slate-900 shadow-sm transition hover:bg-white"
                  >
                    Download PDF
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {activeTab === "activity" ? (
        <div className="mx-auto -mt-6 w-full max-w-md px-4 pb-16">
          {activityLoading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[0, 1].map((i) => (
                  <div key={i} className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100/80">
                    <div className="flex items-center gap-2 mb-2">
                      <Skeleton className="h-6 w-6 rounded-full" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-5 w-24" />
                  </div>
                ))}
              </div>
              <div className="relative">
                <Skeleton className="h-11 w-full rounded-2xl" />
              </div>
              <div className="flex gap-2">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-9 w-24 rounded-full" />
                ))}
              </div>
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-16 mt-2" />
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm border border-slate-100/50">
                  <Skeleton className="h-11 w-11 rounded-full flex-shrink-0" />
                  <div className="flex-1 min-w-0 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <div className="flex items-center gap-1.5">
                      <Skeleton className="h-3 w-14" />
                      <Skeleton className="h-3 w-10" />
                      <Skeleton className="h-4 w-16 rounded-full" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-14 flex-shrink-0" />
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100/80">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="h-6 w-6 rounded-full bg-emerald-50 flex items-center justify-center">
                      <ArrowDownLeft className="h-3 w-3 text-emerald-600" />
                    </div>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Money In</p>
                  </div>
                  <p className="text-lg font-bold text-slate-900">R{activitySummaryStats.totalIn.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100/80">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="h-6 w-6 rounded-full bg-red-50 flex items-center justify-center">
                      <ArrowUpRight className="h-3 w-3 text-red-500" />
                    </div>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Money Out</p>
                  </div>
                  <p className="text-lg font-bold text-slate-900">R{activitySummaryStats.totalOut.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
              </div>

              <div className="mt-4 relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  ref={activitySearchRef}
                  type="text"
                  placeholder="Search transactions..."
                  value={activitySearchQuery}
                  onChange={(e) => setActivitySearchQuery(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-10 py-3 text-sm text-slate-700 placeholder-slate-400 focus:border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-50 transition"
                />
                {activitySearchQuery && (
                  <button
                    onClick={() => setActivitySearchQuery("")}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded-full bg-slate-200 text-slate-500 hover:bg-slate-300 transition"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {showDateFilter && (
                <div className="mt-3 rounded-2xl bg-white p-4 shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-slate-500">Date Range</p>
                    {(fromDate || toDate) && (
                      <button onClick={() => { setFromDate(""); setToDate(""); }} className="text-[11px] font-semibold text-blue-600">Clear</button>
                    )}
                  </div>
                  <div className="grid gap-3 grid-cols-2">
                    <label className="flex flex-col gap-1.5 text-[11px] font-semibold text-slate-400">
                      From
                      <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-200 focus:outline-none" />
                    </label>
                    <label className="flex flex-col gap-1.5 text-[11px] font-semibold text-slate-400">
                      To
                      <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-200 focus:outline-none" />
                    </label>
                  </div>
                </div>
              )}

              <div className="mt-4 flex gap-2 overflow-x-auto scrollbar-none">
                <button
                  type="button"
                  aria-label="Filter by date"
                  onClick={() => setShowDateFilter((prev) => !prev)}
                  className={`flex-shrink-0 flex items-center justify-center h-9 w-9 rounded-full shadow-sm transition ${showDateFilter || fromDate || toDate ? "bg-blue-50 text-blue-600 border border-blue-200" : "bg-white text-slate-500 border border-slate-100"}`}
                >
                  <CalendarDays className="h-4 w-4" />
                </button>
                {activityFilters.map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setActivityFilter(filter)}
                    className={`flex-shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition ${
                      activityFilter === filter
                        ? "bg-slate-900 text-white shadow-sm"
                        : "bg-white text-slate-500 hover:text-slate-700 shadow-sm border border-slate-100"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  {activityVisibleItems.length} transaction{activityVisibleItems.length !== 1 ? "s" : ""}
                </p>
              </div>

              {activityGroupedItems.length === 0 ? (
                <div className="mt-8 flex flex-col items-center justify-center text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-4">
                    {activitySearchQuery ? <Search className="h-7 w-7" /> : <TrendingUp className="h-7 w-7" />}
                  </div>
                  <p className="text-sm font-semibold text-slate-900 mb-1">
                    {activitySearchQuery ? "No results found" : "No activity yet"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {activitySearchQuery ? `No transactions matching "${activitySearchQuery}"` : "Your transactions will appear here"}
                  </p>
                </div>
              ) : (
                <section className="mt-3 space-y-5">
                  {activityGroupedItems.map((group, groupIndex) => (
                    <div key={`${group.label}-${groupIndex}`}>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3 px-1">
                        {group.label}
                      </p>
                      <div className="space-y-2">
                        {group.items.map((item, itemIndex) => {
                          const Icon = getTransactionIcon(item.title, item.direction);
                          const colors = getIconColors(item.direction, item.title);
                          return (
                            <div
                              key={`${item.id || itemIndex}`}
                              className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm border border-slate-100/50"
                            >
                              {item.holding_logos && item.holding_logos.length > 0 ? (
                                <div className="flex -space-x-2 flex-shrink-0">
                                  {item.holding_logos.slice(0, 3).map((hl, hlIdx) => (
                                    <img
                                      key={`${hl.symbol}-${hlIdx}`}
                                      src={hl.logo_url}
                                      alt={hl.name || hl.symbol}
                                      className="h-9 w-9 rounded-full object-cover bg-white border-2 border-white shadow-sm"
                                      onError={(e) => { e.target.style.display = 'none'; }}
                                    />
                                  ))}
                                </div>
                              ) : item.logo_url ? (
                                <img
                                  src={item.logo_url}
                                  alt=""
                                  className="h-11 w-11 flex-shrink-0 rounded-full object-cover bg-slate-50 border border-slate-100"
                                  onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                />
                              ) : null}
                              <div className={`${item.holding_logos?.length > 0 || item.logo_url ? 'hidden' : 'flex'} h-11 w-11 flex-shrink-0 items-center justify-center rounded-full ${colors.bg}`}>
                                <Icon className={`h-5 w-5 ${colors.text}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-800 truncate">{item.title}</p>
                                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                  <p className="text-[11px] text-slate-400">{item.displayDate}</p>
                                  {item.time && (
                                    <>
                                      <span className="text-slate-300">&middot;</span>
                                      <p className="text-[11px] text-slate-400">{item.time}</p>
                                    </>
                                  )}
                                  {item.status && (
                                    <>
                                      <span className="text-slate-300">&middot;</span>
                                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                                        item.status === "successful" || item.status === "completed" || item.status === "posted"
                                          ? "bg-emerald-50 text-emerald-600"
                                          : item.status === "pending"
                                          ? "bg-amber-50 text-amber-600"
                                          : item.status === "failed"
                                          ? "bg-rose-50 text-rose-500"
                                          : "bg-slate-100 text-slate-500"
                                      }`}>
                                        {item.status === "successful" || item.status === "completed" || item.status === "posted" ? "Completed" : item.status === "pending" ? "Pending" : item.status === "failed" ? "Failed" : item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <p className="text-sm font-bold tabular-nums flex-shrink-0 text-slate-900">
                                {item.amount}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </section>
              )}
            </>
          )}
        </div>
      ) : (
      <div className="mx-auto -mt-6 w-full max-w-md px-4 pb-16">
        <div className="rounded-3xl border border-slate-100/80 bg-white/90 backdrop-blur-sm p-4 shadow-[0_2px_16px_-2px_rgba(0,0,0,0.08)]">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Recent items</p>
            <p className="text-xs text-slate-500">Showing {pageRows.length} of {searchFiltered.length}</p>
          </div>

          {isLoading ? (
            <div className="mt-4 space-y-3">
              {activeTab === "holdings" ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="w-full rounded-3xl border border-slate-100/80 bg-white/90 p-4">
                    <div className="flex items-start gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                          <div className="space-y-2 text-right">
                            <Skeleton className="h-4 w-20 ml-auto" />
                            <Skeleton className="h-3 w-14 ml-auto" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : activeTab === "strategy" ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="w-full rounded-3xl border border-slate-100/80 bg-white/90 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-36" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                      <div className="space-y-2 text-right">
                        <Skeleton className="h-4 w-20 ml-auto" />
                        <Skeleton className="h-3 w-14 ml-auto" />
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <Skeleton className="h-6 w-20 rounded-full" />
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                          <Skeleton className="h-7 w-7 rounded-full" />
                          <Skeleton className="h-7 w-7 rounded-full" />
                          <Skeleton className="h-7 w-7 rounded-full" />
                        </div>
                        <Skeleton className="h-3 w-12" />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="w-full rounded-3xl border border-slate-100/80 bg-white/90 p-4">
                    <div className="flex items-start gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="h-3 w-20" />
                          </div>
                          <div className="space-y-2 text-right">
                            <Skeleton className="h-4 w-20 ml-auto" />
                            <Skeleton className="h-3 w-16 ml-auto" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : pageRows.length === 0 ? (
            <div className="rounded-3xl bg-white px-6 py-12 text-center shadow-md">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <MoreHorizontal className="h-7 w-7 text-slate-400" />
              </div>
              <p className="mt-4 text-sm font-semibold text-slate-700">
                {activeTab === "strategy" ? "No strategies subscribed" : "No data available"}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {activeTab === "strategy"
                  ? "You haven't subscribed to any strategies yet."
                  : "There are no items to display for this view."}
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {pageRows.map((row, idx) => {
                if (row.type === "Strategy") {
                  const pct = row.changePct;
                  const hasPct = pct != null && Number.isFinite(pct);
                  const snapshot = strategySnapshotsMap.get(row.title) || [];
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedCard(row)}
                      className="w-full rounded-3xl border border-slate-100/80 bg-white/90 backdrop-blur-sm p-4 text-left shadow-[0_2px_16px_-2px_rgba(0,0,0,0.08)] transition-all hover:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.12)] active:scale-[0.97]"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 flex items-start justify-between gap-4">
                          <div className="text-left space-y-1 min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">{row.title}</p>
                            <p className="text-xs text-slate-600 line-clamp-1">{row.riskLevel || row.meta} • {row.desc}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-semibold text-slate-900">{row.amount}</p>
                            {hasPct && (
                              <p className={`text-xs font-semibold ${pct >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                                {pct >= 0 ? "+" : ""}{pct.toFixed(2)}%
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        {row.riskLevel && (
                          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">{row.riskLevel}</span>
                        )}
                        {snapshot.length > 0 && (
                          <div className="flex items-center gap-2">
                            <div className="flex -space-x-2">
                              {snapshot.slice(0, 3).map((holding) => (
                                <div
                                  key={`${row.title}-${holding.id || holding.symbol}-snap`}
                                  className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-white bg-white shadow-sm"
                                >
                                  {holding.logo_url ? (
                                    <img src={holding.logo_url} alt={holding.name} className="h-full w-full object-cover" />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center bg-slate-100 text-[8px] font-bold text-slate-600">
                                      {holding.symbol?.substring(0, 2)}
                                    </div>
                                  )}
                                </div>
                              ))}
                              {snapshot.length > 3 && (
                                <div className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-[10px] font-semibold text-slate-500">
                                  +{snapshot.length - 3}
                                </div>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400">Holdings</span>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                }

                if (row.type === "Holdings") {
                  const pnlText = row.unrealizedPL || "—";
                  const isPositive = pnlText.startsWith("+");
                  const isNegative = pnlText.startsWith("-");
                  const pnlColor = isPositive ? "text-emerald-600" : isNegative ? "text-red-600" : "text-slate-400";
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedCard(row)}
                      className="w-full rounded-3xl border border-slate-100/80 bg-white/90 backdrop-blur-sm p-4 text-left shadow-[0_2px_16px_-2px_rgba(0,0,0,0.08)] transition-all hover:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.12)] active:scale-[0.97]"
                    >
                      <div className="flex items-start gap-3">
                        {row.logoUrl ? (
                          <img src={row.logoUrl} alt={row.ticker} className="h-10 w-10 rounded-full border border-slate-100 object-cover" />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-purple-600 text-sm font-bold text-white">
                            {row.ticker?.substring(0, 2) || "—"}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900">{row.title}</p>
                              <p className="text-xs text-slate-500">{row.desc}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm font-semibold text-slate-900">{row.amount}</p>
                              <p className={`text-xs font-semibold ${pnlColor}`}>{pnlText}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                }

                const isIncoming = row.flow === "in";
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedCard(row)}
                    className="w-full rounded-3xl border border-slate-100/80 bg-white/90 backdrop-blur-sm p-4 text-left shadow-[0_2px_16px_-2px_rgba(0,0,0,0.08)] transition-all hover:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.12)] active:scale-[0.97]"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                        {isIncoming ? (
                          <ArrowUpRight className="h-5 w-5 text-emerald-600" />
                        ) : (
                          <ArrowDownRight className="h-5 w-5 text-rose-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">{row.title}</p>
                            <p className="text-xs text-slate-500">{row.desc}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-semibold text-slate-900">{row.amount}</p>
                            <p className={`text-xs font-semibold ${isIncoming ? "text-emerald-600" : "text-red-600"}`}>
                              {row.date}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-center gap-2 pt-4">
            <button
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1}
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-slate-600">
              Page {page} of {pages}
            </span>
            <button
              onClick={() => setPage((prev) => Math.min(pages, prev + 1))}
              disabled={page === pages}
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>
      )}

      {selectedCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
          <button
            type="button"
            className="absolute inset-0 h-full w-full cursor-default"
            aria-label="Close modal"
            onClick={() => setSelectedCard(null)}
          />
          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-center pt-3 pb-1">
              <div className="h-1.5 w-12 rounded-full bg-slate-200" />
            </div>

            <div className="max-h-[75vh] overflow-y-auto px-6 pb-6 pt-2">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">
                  {selectedCard.type === "Holdings" ? "Stock Details" : selectedCard.type === "Strategy" ? "Strategy Details" : "Transaction Details"}
                </h2>
                <button
                  type="button"
                  onClick={() => setSelectedCard(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {selectedCard.type === "Holdings" ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                      {selectedCard.logoUrl ? (
                        <img src={selectedCard.logoUrl} alt={selectedCard.title} className="h-full w-full object-contain" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 text-lg font-bold text-white">
                          {selectedCard.ticker?.substring(0, 2) || "—"}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-base font-bold text-slate-900">{selectedCard.title}</p>
                      <p className="text-sm text-slate-500">{selectedCard.desc}</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-slate-900">{selectedCard.amount}</p>
                      <p className={`mt-1 text-sm font-semibold ${
                        selectedCard.unrealizedPL?.startsWith("+") ? "text-emerald-600" : selectedCard.unrealizedPL?.startsWith("-") ? "text-red-600" : "text-slate-400"
                      }`}>{selectedCard.unrealizedPL || "—"}</p>
                      <p className="mt-0.5 text-xs text-slate-400">Unrealised P/L</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Quantity", value: selectedCard.quantity },
                      { label: "Avg Cost", value: selectedCard.avgCost },
                      { label: "Market Price", value: selectedCard.marketPrice },
                      { label: "Market Value", value: selectedCard.marketValue },
                    ].map((item) => (
                      <div key={item.label} className="rounded-2xl border border-slate-100 bg-white p-3.5">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{item.label}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{item.value || "—"}</p>
                      </div>
                    ))}
                  </div>

                  {selectedCard.date && (
                    <p className="text-center text-xs text-slate-400">As of {selectedCard.date}</p>
                  )}
                </div>
              ) : selectedCard.type === "Strategy" ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const snapshot = strategySnapshotsMap.get(selectedCard.title) || [];
                      return snapshot.length > 0 ? (
                        <div className="flex -space-x-2">
                          {snapshot.slice(0, 3).map((h) => (
                            <div key={`modal-${h.id || h.symbol}`} className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-white shadow-sm">
                              {h.logo_url ? (
                                <img src={h.logo_url} alt={h.name} className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center bg-slate-100 text-[10px] font-bold text-slate-600">{h.symbol?.substring(0, 2)}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : null;
                    })()}
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-bold text-slate-900">{selectedCard.fullName || selectedCard.title}</p>
                      {selectedCard.objective && <p className="text-sm text-slate-500">{selectedCard.objective}</p>}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-purple-50 to-white p-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-slate-900">{selectedCard.currentValue || selectedCard.amount}</p>
                      {selectedCard.changePct != null && Number.isFinite(selectedCard.changePct) && (
                        <p className={`mt-1 text-sm font-semibold ${selectedCard.changePct >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                          {selectedCard.changePct >= 0 ? "+" : ""}{selectedCard.changePct.toFixed(2)}%
                          {selectedCard.changeAbs != null && (
                            <span className="ml-1 text-xs font-normal text-slate-400">
                              ({selectedCard.changeAbs >= 0 ? "+" : ""}{formatCurrency(selectedCard.changeAbs)})
                            </span>
                          )}
                        </p>
                      )}
                      <p className="mt-0.5 text-xs text-slate-400">Current Value</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {selectedCard.riskLevel && (
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">{selectedCard.riskLevel}</span>
                    )}
                    {selectedCard.baseCurrency && (
                      <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{selectedCard.baseCurrency}</span>
                    )}
                    {selectedCard.holdingsCount > 0 && (
                      <span className="rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700">{selectedCard.holdingsCount} Holdings</span>
                    )}
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-white">
                    <p className="px-4 pt-3 pb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Performance</p>
                    <div className="divide-y divide-slate-50">
                      {[
                        { label: "1 Week", value: selectedCard.r1w },
                        { label: "1 Month", value: selectedCard.r1m },
                        { label: "3 Months", value: selectedCard.r3m },
                        { label: "6 Months", value: selectedCard.r6m },
                        { label: "YTD", value: selectedCard.rytd },
                        { label: "1 Year", value: selectedCard.r1y },
                      ].filter((p) => p.value != null).map((p) => (
                        <div key={p.label} className="flex items-center justify-between px-4 py-2.5">
                          <span className="text-sm text-slate-600">{p.label}</span>
                          <span className={`text-sm font-semibold ${Number(p.value) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                            {Number(p.value) >= 0 ? "+" : ""}{Number(p.value).toFixed(2)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Min Investment", value: selectedCard.minInvestment ? formatCurrency(selectedCard.minInvestment) : null },
                      { label: "Provider", value: selectedCard.providerName },
                      { label: "Mgmt Fee", value: selectedCard.managementFeeBps != null ? `${(selectedCard.managementFeeBps / 100).toFixed(2)}%` : null },
                      { label: "As of", value: selectedCard.date },
                    ].filter((item) => item.value).map((item) => (
                      <div key={item.label} className="rounded-2xl border border-slate-100 bg-white p-3.5">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{item.label}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${selectedCard.flow === "in" ? "bg-emerald-50" : "bg-red-50"}`}>
                      {selectedCard.flow === "in" ? (
                        <ArrowUpRight className="h-7 w-7 text-emerald-600" />
                      ) : (
                        <ArrowDownRight className="h-7 w-7 text-rose-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-base font-bold text-slate-900">{selectedCard.title}</p>
                      <p className="text-sm text-slate-500">{selectedCard.desc}</p>
                    </div>
                  </div>

                  <div className={`rounded-2xl border p-4 text-center ${selectedCard.flow === "in" ? "border-emerald-100 bg-emerald-50/50" : "border-red-100 bg-red-50/50"}`}>
                    <p className={`text-2xl font-bold ${selectedCard.flow === "in" ? "text-emerald-700" : "text-red-700"}`}>{selectedCard.amount}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{selectedCard.meta}</p>
                  </div>

                  {selectedCard.date && (
                    <div className="rounded-2xl border border-slate-100 bg-white p-3.5">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Date</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{selectedCard.date}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatementsPage;
