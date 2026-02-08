import React, { useEffect, useState, useMemo } from "react";
import { ArrowDownRight, ArrowUpRight, MoreHorizontal, X } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useProfile } from "../lib/useProfile";
import NotificationBell from "../components/NotificationBell";
import Skeleton from "../components/Skeleton";
import { supabase } from "../lib/supabase";
import { formatCurrency } from "../lib/formatCurrency";
import { normalizeSymbol, getHoldingsArray, buildHoldingsBySymbol, getStrategyHoldingsSnapshot } from "../lib/strategyUtils";

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
  const [financialsRows, setFinancialsRows] = useState([]);
  const [rawStrategies, setRawStrategies] = useState([]);
  const [holdingsSecurities, setHoldingsSecurities] = useState([]);
  const [strategiesLoading, setStrategiesLoading] = useState(true);
  const [holdingsLoading, setHoldingsLoading] = useState(true);
  const [financialsLoading, setFinancialsLoading] = useState(true);

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
    let isMounted = true;

    const loadFinancials = async () => {
      if (!supabase || !profile?.id) {
        return;
      }
      if (isMounted) setFinancialsLoading(true);

      try {
        const { data: allocations, error } = await supabase
          .from("allocations")
          .select("*")
          .eq("user_id", profile.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        const mapped = (allocations || []).map((alloc) => {
          const createdAt = alloc.created_at ? new Date(alloc.created_at) : null;
          const dateLabel = createdAt
            ? createdAt.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
            : "—";
          const timeLabel = createdAt
            ? createdAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
            : "—";

          return {
            type: "Reports",
            icon: "📄",
            title: alloc.type || alloc.description || "Allocation",
            desc: alloc.description || alloc.type || "—",
            date: dateLabel,
            amount: alloc.amount != null ? formatCurrency(Number(alloc.amount)) : "—",
            meta: alloc.type || "Allocation",
            time: timeLabel,
            flow: alloc.type === "Withdrawal" ? "out" : "in",
          };
        });

        if (isMounted) {
          setFinancialsRows(mapped);
          setFinancialsLoading(false);
        }
      } catch (error) {
        console.error("Failed to load financials", error);
        if (isMounted) setFinancialsLoading(false);
      }
    };

    loadFinancials();

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

  const combinedRows = [...strategyRows, ...holdingsRows, ...financialsRows];

  const filtered = combinedRows.filter((row) => {
    if (activeTab === "strategy") return row.type === "Strategy";
    if (activeTab === "holdings") return row.type === "Holdings";
    if (activeTab === "financials") return row.type === "Reports";
    return true;
  });

  const searchFiltered = searchQuery.trim()
    ? filtered.filter((row) => row.title.toLowerCase().includes(searchQuery.trim().toLowerCase()))
    : filtered;

  const isLoading =
    (activeTab === "strategy" && strategiesLoading) ||
    (activeTab === "holdings" && holdingsLoading) ||
    (activeTab === "financials" && financialsLoading);

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
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-xs font-semibold text-slate-700">
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
                  { id: "financials", label: "Financials" },
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
            </div>
          </div>
        </div>
      </div>

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
