import jsPDF from "jspdf";
import { applyPlugin } from "jspdf-autotable";
import mintLogo from "../../mint-icon-transparent.png";   // ← local white logo
applyPlugin(jsPDF);

// ─── Palette ─────────────────────────────────────────────────────────────────
const P        = [59,  27,  122];   // #3b1b7a  deep brand purple
const P_MID    = [91,  33,  182];   // #5b21b6
const P_DIM    = [130, 95,  210];   // muted labels
const P_LITE   = [237, 233, 254];   // pale lavender
const P_PALE   = [246, 244, 255];   // near-white lavender rows
const P_STRIPE = [228, 222, 250];   // slightly deeper alternating rows
const P_RULE   = [190, 175, 235];   // hairlines
const WHITE    = [255, 255, 255];
const DARK     = [18,  21,  38 ];
const BODY     = [50,  35,  90 ];
const GREEN    = [22,  163, 74 ];
const RED      = [220, 38,  38 ];
const DIV      = [210, 200, 240];

// ─── Page geometry (mm) ──────────────────────────────────────────────────────
const PW   = 210;
const PH   = 297;
const ML   = 13;        // left  margin
const MR   = 13;        // right margin
const HDR  = 30;        // header height (slightly taller for tagline)
const LW   = 117;       // left  column width
const GAP  = 5;         // column gap
const RX   = ML + LW + GAP;   // right col X = 135
const RW   = PW - MR - RX;    // right col W = 62

// ─── Helpers ─────────────────────────────────────────────────────────────────
const tc = (doc, c) => doc.setTextColor(...c);
const fc = (doc, c) => doc.setFillColor(...c);
const dc = (doc, c) => doc.setDrawColor(...c);

function hl(doc, x1, y1, x2, y2, col = DIV, w = 0.18) {
  dc(doc, col); doc.setLineWidth(w); doc.line(x1, y1, x2, y2);
}

function fmtPct(v) {
  if (v == null || isNaN(+v)) return "N/A";
  const n = +v * 100;
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function fmtR(v) {
  if (v == null || isNaN(+v)) return "N/A";
  const n = +v;
  if (n >= 1e9) return `R ${(n / 1e9).toFixed(2)} bn`;
  if (n >= 1e6) return `R ${(n / 1e6).toFixed(2)} m`;
  return `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── Section pill heading ─────────────────────────────────────────────────────
function secHead(doc, label, x, y, w) {
  fc(doc, P);
  doc.rect(x, y - 4, w, 5.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  tc(doc, WHITE);
  doc.text(label.toUpperCase(), x + 3, y);
  return y + 3;
}

// ─── Sub-heading for right-column cards ──────────────────────────────────────
function subHead(doc, label, x, y, w) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  tc(doc, P_MID);
  doc.text(label.toUpperCase(), x, y);
  hl(doc, x, y + 1.2, x + w, y + 1.2, DIV, 0.18);
  return y + 3.5;
}

// ─── Performance line chart ───────────────────────────────────────────────────
function drawChart(doc, data, x, y, w, h) {
  fc(doc, P_LITE);
  doc.roundedRect(x, y, w, h, 1.5, 1.5, "F");

  if (!data || data.length < 2) {
    doc.setFontSize(6); tc(doc, P_DIM);
    doc.text("Chart data unavailable", x + w / 2, y + h / 2 + 1, { align: "center" });
    return;
  }

  const vals  = data.map(p => p.v  ?? p.value ?? 0);
  const dates = data.map(p => p.d  ?? p.date  ?? "");
  const minV  = Math.min(...vals), maxV = Math.max(...vals);
  const rng   = (maxV - minV) || 1, pad = rng * 0.12;
  const yMin  = minV - pad, yMax = maxV + pad, yRng = yMax - yMin;

  const cx = x + 14, cy = y + 5, cw = w - 18, ch = h - 14;

  const STEPS = 4;
  doc.setFontSize(4.8); tc(doc, P_RULE);
  for (let i = 0; i <= STEPS; i++) {
    const v  = yMax - (yRng * i) / STEPS;
    const ly = cy + (ch * i) / STEPS;
    hl(doc, cx, ly, cx + cw, ly, [210, 200, 240], 0.1);
    const lbl = v >= 1000 ? v.toFixed(0) : v >= 100 ? v.toFixed(1) : v.toFixed(2);
    doc.text(lbl, cx - 1, ly + 1.5, { align: "right" });
  }

  const step = Math.max(1, Math.floor((dates.length - 1) / 4));
  doc.setFontSize(4.5); tc(doc, P_DIM);
  for (let i = 0; i < dates.length; i += step) {
    const dx = cx + (cw * i) / (dates.length - 1);
    const d  = new Date(dates[i]);
    if (!isNaN(d))
      doc.text(
        `${d.toLocaleString("en-US", { month: "short" })} ${String(d.getDate()).padStart(2, "0")}`,
        dx, cy + ch + 4, { align: "center" }
      );
  }

  const pts = vals.map((v, i) => ({
    px: cx + (cw * i) / (vals.length - 1),
    py: cy + ch - ((v - yMin) / yRng) * ch,
  }));
  dc(doc, P_MID); doc.setLineWidth(0.5);
  for (let i = 1; i < pts.length; i++)
    doc.line(pts[i-1].px, pts[i-1].py, pts[i].px, pts[i].py);

  if (pts.length) { fc(doc, P); doc.circle(pts[pts.length-1].px, pts[pts.length-1].py, 0.8, "F"); }
}

// ─── Horizontal allocation bars ───────────────────────────────────────────────
function drawBars(doc, items, x, y, w) {
  if (!items?.length) return y;
  const BAR_H  = 4.2, GAP_B = 2.2, LBL_W = 27, PCT_W = 9;
  const barX   = x + LBL_W + 1;
  const barMax = w - LBL_W - PCT_W - 2;
  const maxVal = Math.max(...items.map(s => Math.abs(s.weight)));

  items.forEach(s => {
    const lines = doc.splitTextToSize(s.name, LBL_W);
    const baseY = y + BAR_H / 2 + 1.5 - ((lines.length - 1) * 2.0);
    doc.setFontSize(5.2); tc(doc, BODY); doc.setFont("helvetica", "normal");
    lines.forEach((ln, i) => doc.text(ln, x, baseY + i * 2.0));

    const bw = (Math.abs(s.weight) / maxVal) * barMax;
    fc(doc, P_PALE);
    doc.roundedRect(barX, y, barMax, BAR_H, 0.8, 0.8, "F");
    fc(doc, s.weight >= 0 ? P_MID : RED);
    doc.roundedRect(barX, y, Math.max(bw, 0.5), BAR_H, 0.8, 0.8, "F");
    doc.setFontSize(5.2); tc(doc, DARK); doc.setFont("helvetica", "bold");
    doc.text(`${s.weight.toFixed(1)}%`, barX + barMax + 1.5, y + BAR_H / 2 + 1.5);

    y += BAR_H + GAP_B + Math.max(0, lines.length - 1) * 2.0;
  });
  return y;
}

// ─── pct colour hook for autoTable ───────────────────────────────────────────
function pctHook(d, col) {
  if (d.section === "body" && d.column.index === col) {
    const t = d.cell.text[0] || "";
    d.cell.styles.textColor = t.startsWith("+") ? GREEN : t.startsWith("-") ? RED : DARK;
    d.cell.styles.fontStyle = "bold";
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  MAIN EXPORT
// ═════════════════════════════════════════════════════════════════════════════
export default function generateFactsheetPdf({
  strategy,
  analytics,
  holdingsWithMetrics,
  holdingsSecurities,
  userPosition,
  calculatedMinInvestment,
}) {
  const doc      = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const name     = strategy?.name || "Strategy";
  const now      = new Date();
  const dateStr  = now.toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
  const monthStr = now.toLocaleDateString("en-ZA", { month: "long", year: "numeric" });
  const isoDate  = now.toISOString().split("T")[0];

  // ═══════════════════════════════════════════════════════════════════════════
  //  HEADER
  // ═══════════════════════════════════════════════════════════════════════════
  fc(doc, P);     doc.rect(0, 0, PW, HDR, "F");
  fc(doc, P_MID); doc.rect(0, 0, PW, 1.8, "F");   // top accent stripe
  fc(doc, P_MID); doc.rect(0, HDR, PW, 0.7, "F"); // bottom accent stripe

  // ── Logo — right-aligned, vertically centred in header ───────────────────
  // Icon aspect ratio: 2000×791 → 2.529:1
  const ICON_H = 9;
  const ICON_W = ICON_H * (2000 / 791);
  const ICON_X = PW - MR - ICON_W;
  const ICON_Y = (HDR - ICON_H) / 2;
  doc.addImage(mintLogo, "PNG", ICON_X, ICON_Y, ICON_W, ICON_H);

  // ── Left side: MINT name + tagline + strategy name ────────────────────────
  // Row 1 — "MINT" wordmark
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  tc(doc, WHITE);
  doc.text("MINT", ML, 10);

  // Row 2 — tagline "Money in Transit"
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  tc(doc, [185, 155, 230]);
  doc.text("Money in Transit", ML, 15.5);

  // Thin separator line between tagline and strategy name
  hl(doc, ML, 18, ML + 60, 18, [120, 90, 180], 0.25);

  // Row 3 — strategy name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  tc(doc, WHITE);
  const sn = name.length > 52 ? name.slice(0, 52) + "…" : name;
  const maxNameW = ICON_X - 4 - ML;
  doc.text(sn, ML, 23, { maxWidth: maxNameW });

  // Row 4 — "STRATEGY FACTSHEET · date" sub-line
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  tc(doc, [160, 130, 210]);
  doc.text(`STRATEGY FACTSHEET  ·  ${dateStr}`, ML, 27.5);

  // ═══════════════════════════════════════════════════════════════════════════
  //  CONTENT AREA
  // ═══════════════════════════════════════════════════════════════════════════
  let ly = HDR + 6;
  let ry = HDR + 6;

  // ─────────────────────────────────────────────────────────────────────────
  //  LEFT COLUMN
  // ─────────────────────────────────────────────────────────────────────────

  // Investment Objective
  ly = secHead(doc, "Investment Objective", ML, ly, LW) + 2;

  const objective  = strategy?.objective || strategy?.description || "Investment objective not available.";
  const hasProfile = !!(strategy?.description && strategy?.objective && strategy.description !== strategy.objective);

  doc.setFont("helvetica", "normal"); doc.setFontSize(6.8); tc(doc, BODY);
  const objLines = doc.splitTextToSize(objective.substring(0, hasProfile ? 200 : 300), LW);
  doc.text(objLines, ML, ly);
  ly += objLines.length * 3.0 + 3;

  if (hasProfile) {
    doc.setFont("helvetica", "bold"); doc.setFontSize(6.8); tc(doc, P_MID);
    doc.text("Strategy Profile", ML, ly); ly += 3.5;
    doc.setFont("helvetica", "normal"); tc(doc, BODY);
    const dl = doc.splitTextToSize(strategy.description.substring(0, 250), LW);
    doc.text(dl, ML, ly);
    ly += dl.length * 3.0 + 3;
  }

  // Cumulative Performance
  ly = secHead(doc, "Cumulative Performance", ML, ly, LW) + 2;

  const curves     = analytics?.curves || {};
  const longestKey = ["YTD","6M","3M","1M","1W"].find(k => Array.isArray(curves[k]) && curves[k].length > 1);
  const CHART_H    = 46;
  drawChart(doc, longestKey ? curves[longestKey] : [], ML, ly, LW, CHART_H);
  ly += CHART_H + 3;

  if (longestKey) {
    doc.setFont("helvetica", "italic"); doc.setFontSize(5.2); tc(doc, P_DIM);
    doc.text(`Showing ${longestKey} performance curve`, ML, ly);
    ly += 4;
  }

  // Return Analysis
  ly = secHead(doc, "Return Analysis", ML, ly, LW) + 1;

  const summary = analytics?.summary || {};
  const ytdVal  = summary.ytd_return ?? analytics?.ytd_return;
  const latestV = analytics?.latest_value != null ? +analytics.latest_value / 100 - 1 : null;

  const retRows = [
    ["7 Days",   curves["1W"]],
    ["30 Days",  curves["1M"]],
    ["90 Days",  curves["3M"]],
    ["6 Months", curves["6M"]],
  ].map(([label, curve]) => {
    if (Array.isArray(curve) && curve.length > 1) {
      const f = curve[0]?.v ?? 0, l = curve[curve.length-1]?.v ?? 0;
      return [label, fmtPct(f ? (l - f) / f : 0)];
    }
    return [label, "N/A"];
  });
  retRows.push(["YTD",      fmtPct(ytdVal)]);
  retRows.push(["All-time", latestV != null ? fmtPct(latestV) : "N/A"]);

  doc.autoTable({
    startY: ly,
    margin: { left: ML, right: PW - ML - LW },
    head: [["Period", "Return"]],
    body: retRows,
    theme: "plain",
    styles:             { fontSize: 7, cellPadding: 2, textColor: DARK, lineColor: DIV, lineWidth: 0.15 },
    headStyles:         { fillColor: P, textColor: WHITE, fontStyle: "bold", fontSize: 6.5, cellPadding: 2.2 },
    alternateRowStyles: { fillColor: P_PALE },
    columnStyles: {
      0: { cellWidth: 33, fontStyle: "bold" },
      1: { cellWidth: 33, halign: "right" },
    },
    tableWidth: 67,
    didParseCell: d => pctHook(d, 1),
  });
  ly = doc.lastAutoTable.finalY + 4;

  // Risk Analysis
  ly = secHead(doc, "Risk Analysis", ML, ly, LW) + 1;

  const riskRows = [
    ["Best Day",         fmtPct(summary.best_day)],
    ["Worst Day",        fmtPct(summary.worst_day)],
    ["Avg Daily Return", fmtPct(summary.avg_day)],
    ["YTD Return",       fmtPct(ytdVal)],
  ];
  if (summary.max_drawdown        != null) riskRows.push(["Max Drawdown",      fmtPct(summary.max_drawdown)]);
  if (summary.volatility          != null) riskRows.push(["Volatility (Ann.)", fmtPct(summary.volatility)]);
  if (summary.sharpe_ratio        != null) riskRows.push(["Sharpe Ratio",      (+summary.sharpe_ratio).toFixed(2)]);
  if (summary.pct_positive_months != null) riskRows.push(["% +ve Months",      `${(+summary.pct_positive_months*100).toFixed(1)}%`]);

  doc.autoTable({
    startY: ly,
    margin: { left: ML, right: PW - ML - LW },
    head: [["Metric", "Value"]],
    body: riskRows,
    theme: "plain",
    styles:             { fontSize: 7, cellPadding: 2, textColor: DARK, lineColor: DIV, lineWidth: 0.15 },
    headStyles:         { fillColor: P, textColor: WHITE, fontStyle: "bold", fontSize: 6.5, cellPadding: 2.2 },
    alternateRowStyles: { fillColor: P_PALE },
    columnStyles: {
      0: { cellWidth: 37, fontStyle: "bold" },
      1: { cellWidth: 29, halign: "right" },
    },
    tableWidth: 67,
    didParseCell: d => pctHook(d, 1),
  });

  const leftBottomY = doc.lastAutoTable.finalY;

  // ─────────────────────────────────────────────────────────────────────────
  //  RIGHT COLUMN
  // ─────────────────────────────────────────────────────────────────────────
  const LX  = RX + 3;
  const VX  = RX + RW - 3;
  const ROW = 6;

  // Strategy Details card
  const detailData = [
    ["Risk Profile",   strategy?.risk_level || "—"],
    ["Manager",        strategy?.provider_name || "Mint Investments"],
    ["NAV Index",      analytics?.latest_value != null ? (+analytics.latest_value / 100).toFixed(4) : "—"],
    ["Inception",      strategy?.created_at ? new Date(strategy.created_at).toLocaleDateString("en-ZA",{month:"short",year:"numeric"}) : "—"],
    ["Benchmark",      strategy?.benchmark_name || "JSE All Share"],
    ["Min Investment", calculatedMinInvestment ? fmtR(calculatedMinInvestment) : (strategy?.min_investment ? fmtR(strategy.min_investment) : "—")],
    ["Currency",       strategy?.base_currency || "ZAR"],
  ];
  const detailCardH = 4.5 + 5 + detailData.length * ROW + 3;
  fc(doc, P_LITE); doc.roundedRect(RX, ry,       RW, detailCardH, 2, 2, "F");
  fc(doc, P);      doc.roundedRect(RX, ry,       RW, 4.5,         2, 2, "F");
  ry = subHead(doc, "Strategy Details", LX, ry + 7, RW - 6) + 1;

  detailData.forEach(([label, value], i) => {
    if (i % 2 === 0) { fc(doc, P_STRIPE); doc.rect(LX - 1, ry - 1.5, RW - 4, ROW, "F"); }
    doc.setFontSize(6); doc.setFont("helvetica", "normal"); tc(doc, P_DIM);
    doc.text(label, LX, ry + 2.2);
    doc.setFont("helvetica", "bold"); tc(doc, DARK);
    const v = String(value ?? "—");
    doc.text(v.length > 16 ? v.slice(0, 16) + "…" : v, VX, ry + 2.2, { align: "right" });
    ry += ROW;
  });
  ry += 6;

  // Fees card
  const feesData = [
    ["Performance Fee",    "20% of profits"],
    ["Transaction Fee",    "0.25% / trade"],
    ["Management Fee",     "None"],
    ["Custody (per ISIN)", "R62 / asset"],
  ];
  const feesCardH = 4.5 + 5 + feesData.length * ROW + 2;
  fc(doc, P_LITE); doc.roundedRect(RX, ry, RW, feesCardH, 2, 2, "F");
  fc(doc, P_MID);  doc.roundedRect(RX, ry, RW, 4.5,       2, 2, "F");
  ry = subHead(doc, "Fees & Charges", LX, ry + 7, RW - 6) + 1;

  feesData.forEach(([label, value], i) => {
    if (i % 2 === 0) { fc(doc, P_STRIPE); doc.rect(LX - 1, ry - 1.5, RW - 4, ROW, "F"); }
    doc.setFontSize(6); doc.setFont("helvetica", "normal"); tc(doc, P_DIM);
    doc.text(label, LX, ry + 2.2);
    doc.setFont("helvetica", "bold"); tc(doc, DARK);
    doc.text(value, VX, ry + 2.2, { align: "right" });
    ry += ROW;
  });
  ry += 6;

  // Asset Allocation
  ry = subHead(doc, "Asset Allocation", LX, ry, RW - 6) + 1;

  const holdings  = Array.isArray(strategy?.holdings) ? strategy.holdings : [];
  const totalWt   = holdings.reduce((s, h) => s + (+h.weight || 0), 0) || 1;
  const assetBars = holdings
    .map(h => ({ name: h.name || h.ticker || h.symbol || String(h), weight: ((+h.weight || 0) / totalWt) * 100 }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 8);

  if (assetBars.length) {
    ry = drawBars(doc, assetBars, LX, ry, RW - 6) + 4;
  } else {
    doc.setFontSize(6); tc(doc, P_DIM);
    doc.text("Allocation data unavailable", LX, ry + 3);
    ry += 8;
  }

  // Portfolio Holdings table
  ry = subHead(doc, "Portfolio Holdings", LX, ry, RW - 6) + 1;

  const holdRows = (holdingsWithMetrics || [])
    .filter(h => String(h.symbol || "").toUpperCase() !== "CASH")
    .slice(0, 10)
    .map(h => {
      const wt  = h.weightNorm != null ? (h.weightNorm * 100).toFixed(1) : (+h.weight || 0).toFixed(1);
      const chg = h.change_pct != null ? fmtPct(+h.change_pct / 100) : "—";
      return [h.symbol || "—", `${wt}%`, chg];
    });

  if (holdRows.length) {
    doc.autoTable({
      startY: ry,
      margin: { left: RX, right: MR },
      head: [["Ticker", "Wt", "Chg"]],
      body: holdRows,
      theme: "plain",
      styles:             { fontSize: 5.8, cellPadding: 1.5, textColor: DARK, lineColor: DIV, lineWidth: 0.1 },
      headStyles:         { fillColor: P,  textColor: WHITE, fontStyle: "bold", fontSize: 5.5, cellPadding: 1.8 },
      alternateRowStyles: { fillColor: P_PALE },
      columnStyles: {
        0: { cellWidth: RW * 0.40, fontStyle: "bold" },
        1: { cellWidth: RW * 0.28, halign: "right" },
        2: { cellWidth: RW * 0.28, halign: "right" },
      },
      tableWidth: RW - 2,
      didParseCell: d => pctHook(d, 2),
    });
    ry = doc.lastAutoTable.finalY + 4;
  }

  // Your Investment card (conditional)
  if (userPosition?.invested > 0) {
    const posData = [
      ["Amount Invested", fmtR(userPosition.invested)],
      ["Current Value",   fmtR(userPosition.currentValue)],
      ["Return",          userPosition.returnPct != null ? fmtPct(userPosition.returnPct / 100) : "N/A"],
    ];
    const posCardH = 4.5 + 5 + posData.length * ROW + 2;
    fc(doc, P_LITE); doc.roundedRect(RX, ry, RW, posCardH, 2, 2, "F");
    fc(doc, P);      doc.roundedRect(RX, ry, RW, 4.5,      2, 2, "F");
    ry = subHead(doc, "Your Investment", LX, ry + 7, RW - 6) + 1;

    posData.forEach(([label, value]) => {
      const isPos = label === "Return" && value.startsWith("+");
      const isNeg = label === "Return" && value.startsWith("-");
      doc.setFontSize(6); doc.setFont("helvetica", "normal"); tc(doc, P_DIM);
      doc.text(label + ":", LX, ry + 2.2);
      doc.setFont("helvetica", "bold"); tc(doc, isPos ? GREEN : isNeg ? RED : DARK);
      doc.text(value, VX, ry + 2.2, { align: "right" });
      ry += ROW;
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  DISCLOSURES
  // ═══════════════════════════════════════════════════════════════════════════
  const DISC_TOP  = Math.max(leftBottomY, ry) + 8;
  const DISC_COLW = (PW - ML - MR - 8) / 2;
  const DISC_RX   = ML + DISC_COLW + 8;

  const discItems = [
    {
      title: "Regulatory Status",
      body: "Mint Platforms (Pty) Ltd (Reg. 2024/644796/07) trading as MINT, 3 Gwen Lane, Sandown, Sandton. Strategies on the MINT platform are not collective investment schemes unless explicitly stated. This document does not constitute financial advice under the Financial Advisory and Intermediary Services Act No. 37 of 2002 (FAIS). Seek independent financial advice prior to investing.",
    },
    {
      title: "Custody & Asset Segregation",
      body: "Client assets are held in custody through Computershare Investor Services (Pty) Ltd (CSDP), via its nominee Computershare Nominees (Pty) Ltd (Reg. 1999/008543/07). Client assets are fully segregated from MINT's own assets at all times.",
    },
    {
      title: "Performance Disclosure",
      body: "Performance may include historical realised results and/or back-tested simulations. Back-tested performance does not represent actual trading, is constructed with hindsight, and may not reflect real-world liquidity or transaction costs. Performance is gross of fees unless stated. Individual returns may differ based on timing, deposits, withdrawals, and taxes.",
    },
    {
      title: "Risk Warning",
      body: "Past performance does not guarantee future results. Market values fluctuate and capital is not guaranteed. Strategies are subject to Market, Equity, Volatility, Leverage, Liquidity, Counterparty, Concentration, Correlation, and Foreign Market risks. Investors may lose part or all of their invested capital.",
    },
    {
      title: "Fees & Charges",
      body: "A performance fee of 20% of profits applies. No management or AUM-based fee is charged. A transaction fee of 0.25% per trade applies. Custody fees are charged per ISIN and displayed transparently at checkout prior to investment.",
    },
  ];

  doc.setFontSize(5.8);
  const measured = discItems.map(d => ({
    ...d,
    lines: doc.splitTextToSize(d.body, DISC_COLW),
  }));
  const leftH  = measured.slice(0, 3).reduce((s, m) => s + 3 + m.lines.length * 2.5 + 3.5, 0);
  const rightH = measured.slice(3).reduce((s, m)    => s + 3 + m.lines.length * 2.5 + 3.5, 0);
  const DISC_H = Math.max(leftH, rightH) + 14;

  fc(doc, P_PALE); doc.rect(0, DISC_TOP,     PW, DISC_H, "F");
  fc(doc, P);      doc.rect(0, DISC_TOP,     PW, 3,      "F");
  hl(doc, 0, DISC_TOP + DISC_H - 0.5, PW, DISC_TOP + DISC_H - 0.5, DIV, 0.2);

  doc.setFont("helvetica", "bold"); doc.setFontSize(7); tc(doc, P);
  doc.text("IMPORTANT DISCLOSURES & RISK FACTORS", ML, DISC_TOP + 8);

  let dly = DISC_TOP + 12;
  let dry = DISC_TOP + 12;

  measured.forEach((item, i) => {
    const isRight = i >= 3;
    const x = isRight ? DISC_RX : ML;
    let   y = isRight ? dry      : dly;

    doc.setFont("helvetica", "bold");   doc.setFontSize(5.8); tc(doc, P_MID);
    doc.text(item.title, x, y);
    y += 3;

    doc.setFont("helvetica", "normal"); tc(doc, BODY);
    doc.text(item.lines, x, y);
    y += item.lines.length * 2.5 + 3.5;

    if (isRight) dry = y; else dly = y;
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  FOOTER
  // ═══════════════════════════════════════════════════════════════════════════
  const FY = PH - 12;
  fc(doc, P);     doc.rect(0, FY,   PW, 12,  "F");
  fc(doc, P_MID); doc.rect(0, FY,   PW, 1.2, "F");

  doc.setFont("helvetica", "bold");   doc.setFontSize(7);   tc(doc, WHITE);
  doc.text("MINT", ML, FY + 4);

  doc.setFont("helvetica", "normal"); doc.setFontSize(5); tc(doc, [160, 130, 205]);
  doc.text("Money in Transit", ML, FY + 7.5);

  doc.setFont("helvetica", "normal"); doc.setFontSize(5.5); tc(doc, [185, 160, 225]);
  doc.text(`${name}  ·  Strategy Factsheet  ·  ${monthStr}`, ML + 28, FY + 5.5);
  doc.text(
    "3 Gwen Ln, Sandown, Sandton  ·  www.mymint.co.za  ·  info@mymint.co.za  ·  +27 10 276 0531",
    ML, FY + 9.5
  );

  tc(doc, [160, 140, 200]);
  doc.text("Page 1 of 1",         PW - MR, FY + 4,   { align: "right" });
  doc.text(`Generated ${isoDate}`, PW - MR, FY + 9.5, { align: "right" });

  // ─── Output ──────────────────────────────────────────────────────────────
  try {
    const blob = doc.output("blob");
    const url  = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 12000);
  } catch (e) {
    console.error("PDF open failed:", e);
    doc.save(`${name.replace(/[^a-zA-Z0-9]/g, "_")}_Factsheet_${isoDate}.pdf`);
  }
}
