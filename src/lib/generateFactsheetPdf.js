import jsPDF from "jspdf";
import { applyPlugin } from "jspdf-autotable";
applyPlugin(jsPDF);

const PURPLE = [91, 33, 182];
const DARK = [18, 21, 38];
const GRAY = [123, 129, 148];
const LIGHT_BG = [246, 247, 251];
const WHITE = [255, 255, 255];
const GREEN = [22, 163, 74];
const RED = [220, 38, 38];
const DIVIDER = [224, 228, 235];

const PAGE_W = 210;
const PAGE_H = 297;
const ML = 12;
const MR = 12;
const COL_GAP = 10;
const LEFT_W = 122;
const RIGHT_X = ML + LEFT_W + COL_GAP;
const RIGHT_W = PAGE_W - MR - RIGHT_X;

function fmtPct(v) {
  if (v == null || isNaN(v)) return "N/A";
  const n = Number(v) * 100;
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function fmtRands(v) {
  if (v == null || isNaN(v)) return "N/A";
  const n = Number(v);
  if (n >= 1e9) return `R ${(n / 1e9).toFixed(2)} bn`;
  if (n >= 1e6) return `R ${(n / 1e6).toFixed(2)} m`;
  return `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function drawLine(doc, x1, y1, x2, y2, color = DIVIDER, width = 0.3) {
  doc.setDrawColor(...color);
  doc.setLineWidth(width);
  doc.line(x1, y1, x2, y2);
}

function drawChart(doc, curveData, x, y, w, h, label) {
  if (!curveData || curveData.length < 2) {
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text("Chart data unavailable", x + w / 2, y + h / 2, { align: "center" });
    return;
  }

  doc.setFillColor(...LIGHT_BG);
  doc.roundedRect(x, y, w, h, 2, 2, "F");

  const values = curveData.map((p) => p.v ?? p.value ?? 0);
  const dates = curveData.map((p) => p.d ?? p.date ?? "");
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;
  const padding = range * 0.1;
  const yMin = minVal - padding;
  const yMax = maxVal + padding;
  const yRange = yMax - yMin;

  const chartX = x + 14;
  const chartY = y + 6;
  const chartW = w - 20;
  const chartH = h - 18;

  const steps = 4;
  doc.setFontSize(6);
  doc.setTextColor(...GRAY);
  for (let i = 0; i <= steps; i++) {
    const val = yMax - (yRange * i) / steps;
    const ly = chartY + (chartH * i) / steps;
    drawLine(doc, chartX, ly, chartX + chartW, ly, [230, 232, 238], 0.15);
    const displayVal = val.toFixed(val >= 1000 ? 0 : val >= 100 ? 1 : 2);
    doc.text(displayVal, chartX - 1, ly + 1.5, { align: "right" });
  }

  const totalDates = dates.length;
  const labelCount = Math.min(6, totalDates);
  const step = Math.max(1, Math.floor((totalDates - 1) / (labelCount - 1)));
  doc.setFontSize(5.5);
  for (let i = 0; i < totalDates; i += step) {
    const dx = chartX + (chartW * i) / (totalDates - 1);
    const rawDate = dates[i];
    if (rawDate) {
      const d = new Date(rawDate);
      const lbl = `${d.toLocaleString("en-US", { month: "short" })} ${String(d.getDate()).padStart(2, "0")}`;
      doc.text(lbl, dx, chartY + chartH + 4, { align: "center" });
    }
  }

  doc.setDrawColor(...PURPLE);
  doc.setLineWidth(0.5);
  const points = values.map((v, i) => ({
    px: chartX + (chartW * i) / (values.length - 1),
    py: chartY + chartH - ((v - yMin) / yRange) * chartH,
  }));

  for (let i = 1; i < points.length; i++) {
    doc.line(points[i - 1].px, points[i - 1].py, points[i].px, points[i].py);
  }

  if (label) {
    doc.setFontSize(6);
    doc.setTextColor(...PURPLE);
    doc.text(label, chartX + chartW, chartY + chartH + 10, { align: "right" });
  }
}

function drawSectorBars(doc, sectors, x, y, w) {
  if (!sectors || sectors.length === 0) return y;

  const barH = 5;
  const gap = 2.5;
  const maxLabelW = 30;
  const barStartX = x + maxLabelW + 2;
  const barMaxW = w - maxLabelW - 4;
  const maxVal = Math.max(...sectors.map((s) => Math.abs(s.weight)));

  let cy = y;
  sectors.forEach((s) => {
    doc.setFontSize(6);
    doc.setTextColor(...DARK);
    doc.text(s.name.length > 18 ? s.name.substring(0, 18) + "…" : s.name, x, cy + barH / 2 + 1.5);

    const barW = (Math.abs(s.weight) / maxVal) * barMaxW;
    const color = s.weight >= 0 ? PURPLE : RED;
    doc.setFillColor(...color);
    doc.roundedRect(barStartX, cy, barW, barH, 1, 1, "F");

    doc.setFontSize(5.5);
    doc.setTextColor(...DARK);
    doc.text(`${s.weight.toFixed(1)}%`, barStartX + barW + 1.5, cy + barH / 2 + 1.5);

    cy += barH + gap;
  });

  return cy;
}

export default function generateFactsheetPdf({
  strategy,
  analytics,
  holdingsWithMetrics,
  holdingsSecurities,
  userPosition,
}) {
  console.log("[PDF] Starting generation...", { strategyName: strategy?.name, hasAnalytics: !!analytics });
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  console.log("[PDF] jsPDF instance created");

  const name = strategy?.name || "Strategy";
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
  const monthStr = now.toLocaleDateString("en-ZA", { month: "long", year: "numeric" });

  doc.setFillColor(...PURPLE);
  doc.rect(0, 0, PAGE_W, 3, "F");

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text(name, ML, 14);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY);
  doc.text("Strategy Factsheet", ML, 20);

  doc.setFontSize(8);
  doc.text(dateStr, ML, 25);

  doc.setFontSize(7);
  doc.setTextColor(...PURPLE);
  doc.setFont("helvetica", "bold");
  doc.text("MINT", PAGE_W - MR, 14, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...GRAY);
  doc.text("www.mymint.co.za", PAGE_W - MR, 18, { align: "right" });

  drawLine(doc, ML, 28, PAGE_W - MR, 28, PURPLE, 0.5);

  let ly = 34;

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text("Investment Objective", ML, ly);
  ly += 5;

  const hasProfile = strategy?.description && strategy?.objective && strategy.description !== strategy.objective;
  const objCharLimit = hasProfile ? 200 : 300;
  const objective = strategy?.objective || strategy?.description || "Investment objective not available.";
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY);
  const objLines = doc.splitTextToSize(objective.substring(0, objCharLimit), LEFT_W);
  doc.text(objLines, ML, ly);
  ly += objLines.length * 3.2 + 4;

  if (hasProfile) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK);
    doc.text("Strategy Profile", ML, ly);
    ly += 5;

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY);
    const descLines = doc.splitTextToSize(strategy.description.substring(0, 250), LEFT_W);
    doc.text(descLines, ML, ly);
    ly += descLines.length * 3.2 + 4;
  }

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text("Cumulative Performance", ML, ly);
  ly += 2;

  const curves = analytics?.curves || {};
  const longestKey = ["YTD", "6M", "3M", "1M", "1W"].find(
    (k) => Array.isArray(curves[k]) && curves[k].length > 1
  );
  const chartData = longestKey ? curves[longestKey] : [];

  console.log("[PDF] Drawing chart, key:", longestKey, "points:", chartData.length);
  drawChart(doc, chartData, ML, ly, LEFT_W, 52, longestKey ? `${longestKey} Performance` : "");
  ly += 56;
  console.log("[PDF] Chart done, ly:", ly);

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text("Return Analysis", ML, ly);
  ly += 2;

  const summary = analytics?.summary || {};
  const latestValue = analytics?.latest_value != null ? Number(analytics.latest_value) / 100 - 1 : null;

  const returnRows = [];
  const periodKeys = [
    { key: "1W", label: "7 Days" },
    { key: "1M", label: "30 Days" },
    { key: "3M", label: "90 Days" },
  ];
  periodKeys.forEach(({ key, label }) => {
    const curve = curves[key];
    if (Array.isArray(curve) && curve.length > 1) {
      const first = curve[0]?.v ?? 0;
      const last = curve[curve.length - 1]?.v ?? 0;
      const ret = first ? (last - first) / first : 0;
      returnRows.push([label, fmtPct(ret)]);
    } else {
      returnRows.push([label, "N/A"]);
    }
  });

  const ytdVal = summary.ytd_return ?? analytics?.ytd_return;
  returnRows.push(["YTD", fmtPct(ytdVal)]);
  returnRows.push(["All-time", latestValue != null ? fmtPct(latestValue) : "N/A"]);

  console.log("[PDF] Return rows:", returnRows);
  doc.autoTable({
    startY: ly,
    margin: { left: ML, right: PAGE_W - ML - LEFT_W },
    head: [["Period", "Return"]],
    body: returnRows,
    theme: "plain",
    styles: {
      fontSize: 7,
      cellPadding: 1.5,
      textColor: DARK,
      lineColor: DIVIDER,
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: LIGHT_BG,
      textColor: DARK,
      fontStyle: "bold",
      fontSize: 6.5,
    },
    columnStyles: {
      0: { cellWidth: 30, fontStyle: "bold" },
      1: { cellWidth: 30, halign: "right" },
    },
    tableWidth: 65,
  });

  ly = doc.lastAutoTable.finalY + 5;

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text("Risk Analysis", ML, ly);
  ly += 2;

  const riskRows = [
    ["Best Day", fmtPct(summary.best_day)],
    ["Worst Day", fmtPct(summary.worst_day)],
    ["Avg Daily Return", fmtPct(summary.avg_day)],
    ["YTD Return", fmtPct(ytdVal)],
  ];

  if (summary.max_drawdown != null) {
    riskRows.push(["Max Drawdown", fmtPct(summary.max_drawdown)]);
  }
  if (summary.volatility != null) {
    riskRows.push(["Volatility", fmtPct(summary.volatility)]);
  }
  if (summary.pct_positive_months != null) {
    riskRows.push(["% Positive Months", `${(Number(summary.pct_positive_months) * 100).toFixed(1)}%`]);
  }

  doc.autoTable({
    startY: ly,
    margin: { left: ML, right: PAGE_W - ML - LEFT_W },
    head: [["Metric", "Value"]],
    body: riskRows,
    theme: "plain",
    styles: {
      fontSize: 7,
      cellPadding: 1.5,
      textColor: DARK,
      lineColor: DIVIDER,
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: LIGHT_BG,
      textColor: DARK,
      fontStyle: "bold",
      fontSize: 6.5,
    },
    columnStyles: {
      0: { cellWidth: 35, fontStyle: "bold" },
      1: { cellWidth: 30, halign: "right" },
    },
    tableWidth: 65,
  });

  console.log("[PDF] Left column done, starting right column");
  let ry = 34;

  doc.setFillColor(...LIGHT_BG);
  doc.roundedRect(RIGHT_X, ry - 4, RIGHT_W, 82, 2, 2, "F");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PURPLE);
  doc.text("Strategy Details", RIGHT_X + 4, ry);
  ry += 5;

  const detailGap = 6;
  const detailLabelX = RIGHT_X + 4;
  const detailValX = RIGHT_X + RIGHT_W - 4;

  const details = [
    ["Risk Profile", strategy?.risk_level || "—"],
    ["Manager", strategy?.provider_name || "Mint Investments"],
    ["NAV Index", analytics?.latest_value != null ? Number(analytics.latest_value / 100).toFixed(2) : "—"],
    ["Inception Date", strategy?.created_at ? new Date(strategy.created_at).toLocaleDateString("en-ZA", { month: "short", year: "numeric" }) : "—"],
    ["Benchmark", strategy?.benchmark_name || "JSE All Share"],
    ["Min Investment", strategy?.min_investment ? fmtRands(strategy.min_investment) : "—"],
    ["Currency", strategy?.base_currency || "ZAR"],
  ];

  details.forEach(([label, rawValue]) => {
    const value = String(rawValue ?? "—");
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY);
    doc.text(label + ":", detailLabelX, ry);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK);
    const truncVal = value.length > 18 ? value.substring(0, 18) + "…" : value;
    doc.text(truncVal, detailValX, ry, { align: "right" });
    ry += detailGap;
  });

  drawLine(doc, RIGHT_X + 4, ry - 2, RIGHT_X + RIGHT_W - 4, ry - 2, DIVIDER, 0.2);
  ry += 3;

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PURPLE);
  doc.text("Fees", detailLabelX, ry);
  ry += 5;

  const mgmtFee = strategy?.management_fee_bps != null
    ? `${(Number(strategy.management_fee_bps) / 100).toFixed(2)}% p.a.`
    : "0.00% p.a.";

  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY);
  doc.text("Management Fee:", detailLabelX, ry);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text(mgmtFee, detailValX, ry, { align: "right" });

  ry = 34 + 82 + 6;

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text("Sector Allocation", RIGHT_X, ry);
  ry += 5;

  const sectorMap = {};
  const holdings = Array.isArray(strategy?.holdings) ? strategy.holdings : [];
  holdings.forEach((h) => {
    const sym = h.ticker || h.symbol || h;
    const sec = (holdingsSecurities || []).find((s) => s.symbol === sym);
    const sector = sec?.sector || "Other";
    const weight = Number(h.weight) || 0;
    sectorMap[sector] = (sectorMap[sector] || 0) + weight;
  });

  const totalWeight = Object.values(sectorMap).reduce((a, b) => a + b, 0) || 1;
  const sectors = Object.entries(sectorMap)
    .map(([name, weight]) => ({ name, weight: (weight / totalWeight) * 100 }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 7);

  if (sectors.length > 0) {
    ry = drawSectorBars(doc, sectors, RIGHT_X, ry, RIGHT_W);
    ry += 4;
  } else {
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text("Sector data unavailable", RIGHT_X, ry);
    ry += 6;
  }

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text("Portfolio Holdings", RIGHT_X, ry);
  ry += 5;

  const holdingRows = (holdingsWithMetrics || [])
    .filter((h) => String(h.symbol || "").toUpperCase() !== "CASH")
    .slice(0, 8)
    .map((h) => {
      const displayWeight = h.weightNorm != null ? (h.weightNorm * 100).toFixed(1) : Number(h.weight || 0).toFixed(1);
      return [h.symbol || "—", `${displayWeight}%`];
    });

  if (holdingRows.length > 0) {
    doc.autoTable({
      startY: ry,
      margin: { left: RIGHT_X, right: MR },
      head: [["Ticker", "Weight"]],
      body: holdingRows,
      theme: "plain",
      styles: {
        fontSize: 6.5,
        cellPadding: 1.2,
        textColor: DARK,
        lineColor: DIVIDER,
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: LIGHT_BG,
        textColor: DARK,
        fontStyle: "bold",
        fontSize: 6,
      },
      columnStyles: {
        0: { cellWidth: RIGHT_W * 0.6 },
        1: { cellWidth: RIGHT_W * 0.35, halign: "right" },
      },
      tableWidth: RIGHT_W - 2,
    });
    ry = doc.lastAutoTable.finalY + 4;
  }

  if (userPosition && userPosition.invested > 0) {
    doc.setFillColor(245, 243, 255);
    doc.roundedRect(RIGHT_X, ry, RIGHT_W, 30, 2, 2, "F");

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PURPLE);
    doc.text("Your Investment", RIGHT_X + 4, ry + 5);

    const posDetails = [
      ["Invested", fmtRands(userPosition.invested)],
      ["Current Value", fmtRands(userPosition.currentValue)],
      ["Return", userPosition.returnPct != null ? fmtPct(userPosition.returnPct / 100) : "N/A"],
    ];

    let py = ry + 10;
    posDetails.forEach(([label, value]) => {
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...GRAY);
      doc.text(label + ":", RIGHT_X + 4, py);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...DARK);
      doc.text(value, RIGHT_X + RIGHT_W - 4, py, { align: "right" });
      py += 6;
    });
  }

  const footerY = PAGE_H - 10;
  drawLine(doc, ML, footerY - 3, PAGE_W - MR, footerY - 3, DIVIDER, 0.3);

  doc.setFontSize(5.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY);
  doc.text(`${name} | Strategy Factsheet as at ${monthStr}`, ML, footerY);
  doc.text("Page 1 of 1", PAGE_W - MR, footerY, { align: "right" });

  doc.setFontSize(5);
  doc.text("Past performance does not guarantee future results. All data is for informational purposes only.", ML, footerY + 3);

  const fileName = `${name.replace(/[^a-zA-Z0-9]/g, "_")}_Factsheet_${now.toISOString().split("T")[0]}.pdf`;

  try {
    const pdfBlob = doc.output("blob");
    const blobUrl = URL.createObjectURL(pdfBlob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = fileName;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    }, 500);
  } catch (saveErr) {
    console.error("PDF save fallback:", saveErr);
    doc.save(fileName);
  }
}
