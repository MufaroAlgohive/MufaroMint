import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ─── Logo — drawn as styled text (no image dependency) ──────────────────────
const LOGO_ASPECT = 4.0;
const LOGO_H_FOOTER = 4.5;

function drawLogo(doc, x, y, h) {
  const cw = h * 0.82;
  doc.setFillColor(91, 33, 182);
  doc.triangle(x, y + h * 0.5, x + cw * 0.55, y, x + cw * 0.55, y + h, "F");
  doc.setFillColor(59, 27, 122);
  doc.triangle(x + cw * 0.3, y + h * 0.5, x + cw, y, x + cw, y + h, "F");

  const tx = x + cw + h * 0.22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(h * 3.05);
  doc.setTextColor(255, 255, 255);
  doc.text("MINT", tx, y + h * 0.78);
  doc.setFontSize(10);
}

// ─── Palette ──────────────────────────────────────────────────────────────────
const P = [59, 27, 122];
const P_MID = [91, 33, 182];
const P_DIM = [130, 95, 210];
const P_LITE = [237, 233, 254];
const P_PALE = [246, 244, 255];
const P_STRIPE = [228, 222, 250];
const WHITE = [255, 255, 255];
const DARK = [18, 21, 38];
const BODY = [50, 35, 90];
const DIV = [210, 200, 240];
const GREEN = [22, 163, 74];
const RED = [220, 38, 38];
const AMBER = [217, 119, 6];

const PW = 210;
const PH = 297;
const ML = 14;
const MR = 14;
const CW = PW - ML - MR;

const tc = (doc, c) => doc.setTextColor(...c);
const fc = (doc, c) => doc.setFillColor(...c);
const dc = (doc, c) => doc.setDrawColor(...c);

function hl(doc, x1, y, x2, col = DIV, lw = 0.18) {
  dc(doc, col);
  doc.setLineWidth(lw);
  doc.line(x1, y, x2, y);
}

const LEGAL_TAGLINE =
  "MINT (Pty) Ltd · Authorised FSP 55118 · Regulated by the FSCA · Registered Credit Provider NCRCP22892 · © 2026 MINT. All rights reserved.";

const parseAmount = (str) => {
  if (!str) return 0;
  const s = String(str).trim();
  const negative = s.startsWith("-") || s.startsWith("−");
  const cleaned = s.replace(/[^0-9.]/g, "");
  const v = parseFloat(cleaned);
  return isNaN(v) ? 0 : negative ? -v : v;
};

const fmtR = (v) => {
  if (v == null || isNaN(v)) return "—";
  const abs = Math.abs(v);
  let s;
  if (abs >= 1e9) s = "R " + (abs / 1e9).toFixed(2) + "bn";
  else if (abs >= 1e6) s = "R " + (abs / 1e6).toFixed(2) + "m";
  else
    s =
      "R " +
      abs.toLocaleString("en-ZA", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
  return v < 0 ? "-" + s : s;
};

const fmtPct = (v) => {
  if (v == null || !isFinite(v)) return "—";
  return (v >= 0 ? "+" : "") + v.toFixed(2) + "%";
};

const getMintAccountNumber = (profile) =>
  profile?.mintNumber ||
  profile?.accountNumber ||
  (profile?.id
    ? "MINT-" + String(profile.id).slice(0, 8).toUpperCase()
    : "MINT-XXXXXXXX");

function secHead(doc, num, label, y) {
  const H = 7.5;
  fc(doc, P);
  doc.rect(ML, y, CW, H, "F");
  fc(doc, P_MID);
  doc.rect(ML, y, 3, H, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  tc(doc, [185, 155, 230]);
  doc.text(num + ".", ML + 5.5, y + 5.1);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  tc(doc, WHITE);
  doc.text(label.toUpperCase(), ML + 14, y + 5.1);
  return y + H + 4;
}

function kpiCard(doc, label, value, x, y, w, h, valCol = DARK) {
  fc(doc, P_LITE);
  doc.roundedRect(x, y, w, h, 2, 2, "F");
  fc(doc, P_MID);
  doc.rect(x, y, w, 2, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.2);
  tc(doc, P_DIM);
  doc.text(label.toUpperCase(), x + 3.5, y + 7);
  let fs = 9;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(fs);
  tc(doc, valCol);
  while (doc.getTextWidth(value) > w - 7 && fs > 5.5) {
    fs -= 0.5;
    doc.setFontSize(fs);
  }
  doc.text(value, x + 3.5, y + 14.5);
}

// carryHeader always receives totalPages so "Page X of Y" renders correctly.
function carryHeader(doc, clientName, accountNo, pageNum, totalPages) {
  const HDR_H = 13;
  const LOGO_H = 5;
  fc(doc, P);
  doc.rect(0, 0, PW, HDR_H, "F");
  fc(doc, P_MID);
  doc.rect(0, 0, PW, 1.8, "F");
  drawLogo(doc, ML, (HDR_H - LOGO_H) / 2, LOGO_H);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.8);
  tc(doc, [185, 155, 230]);
  doc.text(clientName + "  ·  " + accountNo, PW / 2, 8.2, { align: "center" });
  tc(doc, [160, 130, 210]);
  doc.text("Page " + pageNum + " of " + totalPages, PW - MR, 8.2, {
    align: "right",
  });
}

// pageFooter logo X offset uses the module-level LOGO_H_FOOTER constant.
function pageFooter(doc, accountNo, isoDate, pageNum, totalPages) {
  const FY = PH - 12;
  fc(doc, P);
  doc.rect(0, FY, PW, 12, "F");
  fc(doc, P_MID);
  doc.rect(0, FY, PW, 1.2, "F");
  drawLogo(doc, ML, FY + 2.8, LOGO_H_FOOTER);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  tc(doc, [185, 160, 225]);
  doc.text(
    "Investment Statement  ·  " + accountNo,
    ML + LOGO_H_FOOTER * LOGO_ASPECT + 4,
    FY + 5.8
  );
  doc.setFont("helvetica", "normal");
  doc.setFontSize(4.5);
  tc(doc, [160, 130, 205]);
  doc.text(LEGAL_TAGLINE, ML, FY + 9.5, {
    maxWidth: PW - ML - MR - 30,
  });
  tc(doc, [160, 140, 200]);
  doc.text("Page " + pageNum + " of " + totalPages, PW - MR, FY + 5, {
    align: "right",
  });
  doc.text("Generated " + isoDate, PW - MR, FY + 9.5, { align: "right" });
}

const FOOTER_SAFE = 20;

// guard accepts totalPages and passes it to carryHeader.
function guard(doc, y, need, clientName, accountNo, totalPages) {
  if (y + need > PH - FOOTER_SAFE) {
    doc.addPage();
    carryHeader(
      doc,
      clientName,
      accountNo,
      doc.internal.getNumberOfPages(),
      totalPages
    );
    return 18;
  }
  return y;
}

// onNewPage closes over totalPages so carry header always shows correct count.
function onNewPage(doc, clientName, accountNo, totalPages) {
  return (data) => {
    if (data.pageNumber > 1) {
      carryHeader(
        doc,
        clientName,
        accountNo,
        doc.internal.getNumberOfPages(),
        totalPages
      );
    }
  };
}

export const generateMintStatement = async (
  profile,
  displayName,
  holdingsRows = [],
  strategyRows = [],
  activityItems = [],
  dateFrom = null,
  dateTo = null
) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const clientName = displayName || profile?.firstName || "Client";
  const accountNo = getMintAccountNumber(profile);
  const now = new Date();
  const isoDate = now.toISOString().split("T")[0];
  const genStr = now.toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const fromStr = dateFrom
    ? new Date(dateFrom).toLocaleDateString("en-ZA", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";
  const toStr = dateTo
    ? new Date(dateTo).toLocaleDateString("en-ZA", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : now.toLocaleDateString("en-ZA", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

  const holdingsForPdf = holdingsRows.filter((r) => r.type === "Holdings");
  const strategyForPdf = strategyRows;
  const txForPdf = activityItems;

  const totalValue = holdingsForPdf.reduce(
    (s, r) => s + parseAmount(r.marketValue),
    0
  );
  const totalPL = holdingsForPdf.reduce(
    (s, r) => s + parseAmount(r.unrealizedPL),
    0
  );

  // ── Two-pass approach: lay out all content first, then stamp footers at the end
  // so totalPages is known and "Page X of Y" is always correct.

  // Page 1 header
  const HDR_H = 46;
  fc(doc, P);
  doc.rect(0, 0, PW, HDR_H, "F");
  fc(doc, P_MID);
  doc.rect(0, 0, PW, 2, "F");
  fc(doc, P_MID);
  doc.rect(0, HDR_H, PW, 0.8, "F");

  const HDR_LOGO_H = 9;
  const HDR_LOGO_W = HDR_LOGO_H * LOGO_ASPECT;
  drawLogo(doc, PW - MR - HDR_LOGO_W, (HDR_H / 2 - HDR_LOGO_H) / 2 + 3, HDR_LOGO_H);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  tc(doc, WHITE);
  doc.text("INVESTMENT STATEMENT", ML, 14);
  hl(doc, ML, 17, ML + 95, [130, 100, 200], 0.3);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  tc(doc, [185, 160, 230]);
  doc.text(
    "Period: " + fromStr + "  –  " + toStr + "  ·  Generated: " + genStr,
    ML,
    22
  );
  doc.text("Currency: ZAR  ·  Platform: MINT", ML, 26.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(4.8);
  tc(doc, [170, 145, 215]);
  doc.text(LEGAL_TAGLINE, ML, 32, {
    maxWidth: PW - MR - HDR_LOGO_W - ML - 6,
  });

  hl(doc, ML, 36, PW - MR, [100, 75, 165], 0.2);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  tc(doc, WHITE);
  doc.text(clientName, ML, 41.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  tc(doc, [185, 160, 230]);
  doc.text(accountNo, PW - MR, 41.5, { align: "right" });

  // Client / Statement info card
  let y = HDR_H + 7;
  const CARD_H = 30;
  fc(doc, P_PALE);
  doc.roundedRect(ML, y, CW, CARD_H, 2, 2, "F");
  dc(doc, DIV);
  doc.setLineWidth(0.22);
  doc.roundedRect(ML, y, CW, CARD_H, 2, 2, "S");

  const HALF = (CW - 4) / 2;
  const INFO_C2 = ML + HALF + 4;

  fc(doc, P);
  doc.rect(ML + 2, y + 2, HALF - 2, 6, "F");
  fc(doc, P);
  doc.rect(INFO_C2, y + 2, HALF - 2, 6, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  tc(doc, WHITE);
  doc.text("CLIENT DETAILS", ML + 4, y + 6.3);
  doc.text("STATEMENT INFO", INFO_C2 + 2, y + 6.3);

  dc(doc, DIV);
  doc.setLineWidth(0.2);
  doc.line(ML + HALF + 2, y + 3, ML + HALF + 2, y + CARD_H - 3);

  const truncate = (s, n) => {
    s = String(s || "—");
    return s.length > n ? s.slice(0, n) + "…" : s;
  };

  const clientFields = [
    ["Name", clientName],
    ["Client ID", profile?.idNumber || "—"],
    ["Account", accountNo],
    ["Email", profile?.email || "—"],
  ];
  const stmtFields = [
    ["Period", fromStr + " – " + toStr],
    ["Generated", genStr],
    ["Currency", "ZAR"],
    ["Platform", "MINT"],
  ];

  const ROW_H = 4.2;
  clientFields.forEach((pair, i) => {
    const fy = y + 12 + i * ROW_H;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    tc(doc, P_DIM);
    doc.text(pair[0] + ":", ML + 4, fy);
    doc.setFont("helvetica", "bold");
    tc(doc, DARK);
    doc.text(truncate(pair[1], 34), ML + 22, fy);
  });
  stmtFields.forEach((pair, i) => {
    const fy = y + 12 + i * ROW_H;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    tc(doc, P_DIM);
    doc.text(pair[0] + ":", INFO_C2 + 2, fy);
    doc.setFont("helvetica", "bold");
    tc(doc, DARK);
    doc.text(truncate(pair[1], 34), INFO_C2 + 22, fy);
  });

  y += CARD_H + 7;

  // Placeholder for totalPages during layout — overwritten in the final pass.
  const TOTAL_PAGES_PLACEHOLDER = 999;

  // ── Section 1: Portfolio Summary ──────────────────────────────────────────
  y = guard(doc, y, 36, clientName, accountNo, TOTAL_PAGES_PLACEHOLDER);
  y = secHead(doc, "1", "Portfolio Summary", y);

  const KPI_COUNT = 5;
  const KPI_GAP = 3;
  const KPI_W = (CW - KPI_GAP * (KPI_COUNT - 1)) / KPI_COUNT;
  const KPI_H = 18;

  const kpis = [
    { label: "Total Market Value", value: fmtR(totalValue), col: DARK },
    { label: "Total Unrealised P/L", value: fmtR(totalPL), col: totalPL >= 0 ? GREEN : RED },
    { label: "Holdings", value: String(holdingsForPdf.length), col: DARK },
    { label: "Active Strategies", value: String(strategyForPdf.length), col: DARK },
    { label: "Transactions (Period)", value: String(txForPdf.length), col: DARK },
  ];
  kpis.forEach((k, i) => {
    kpiCard(doc, k.label, k.value, ML + i * (KPI_W + KPI_GAP), y, KPI_W, KPI_H, k.col);
  });
  y += KPI_H + 7;

  // ── Section 2: Strategy Allocation & Performance ──────────────────────────
  y = guard(doc, y, 24, clientName, accountNo, TOTAL_PAGES_PLACEHOLDER);
  y = secHead(doc, "2", "Strategy Allocation & Performance", y);

  if (!strategyForPdf.length) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    tc(doc, P_DIM);
    doc.text("No strategies subscribed.", ML + 4, y + 5);
    y += 14;
  } else {
    autoTable(doc, {
      startY: y,
      margin: { left: ML, right: MR },
      tableWidth: CW,
      head: [["Strategy", "Risk Level", "Current Value", "Day Chg", "1W", "1M", "3M", "YTD"]],
      body: strategyForPdf.map((s) => [
        s.fullName || s.title || "—",
        s.riskLevel || "—",
        s.amount || "—",
        fmtPct(s.changePct),
        fmtPct(s.r1w),
        fmtPct(s.r1m),
        fmtPct(s.r3m),
        fmtPct(s.rytd),
      ]),
      styles: {
        fontSize: 6.5,
        cellPadding: 2.2,
        textColor: DARK,
        lineColor: DIV,
        lineWidth: 0.15,
      },
      headStyles: {
        fillColor: P,
        textColor: WHITE,
        fontStyle: "bold",
        fontSize: 6.2,
        cellPadding: 2.5,
      },
      alternateRowStyles: { fillColor: P_PALE },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 44 },
        1: { cellWidth: 20 },
        2: { halign: "right", cellWidth: 26 },
        3: { halign: "right", cellWidth: 18 },
        4: { halign: "right", cellWidth: 14 },
        5: { halign: "right", cellWidth: 14 },
        6: { halign: "right", cellWidth: 14 },
        7: { halign: "right" },
      },
      didParseCell: (d) => {
        if (d.section === "body" && d.column.index >= 3) {
          const t = (d.cell.text[0] || "").trim();
          if (t !== "—") {
            const v = parseFloat(t);
            d.cell.styles.textColor = isNaN(v) ? DARK : v >= 0 ? GREEN : RED;
            d.cell.styles.fontStyle = "bold";
          }
        }
      },
      didDrawPage: onNewPage(doc, clientName, accountNo, TOTAL_PAGES_PLACEHOLDER),
    });
    y = doc.lastAutoTable.finalY + 7;
  }

  // ── Section 3: Holdings Detail ────────────────────────────────────────────
  y = guard(doc, y, 24, clientName, accountNo, TOTAL_PAGES_PLACEHOLDER);
  y = secHead(doc, "3", "Holdings Detail", y);

  if (!holdingsForPdf.length) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    tc(doc, P_DIM);
    doc.text("No holdings found.", ML + 4, y + 5);
    y += 14;
  } else {
    autoTable(doc, {
      startY: y,
      margin: { left: ML, right: MR },
      tableWidth: CW,
      head: [["Ticker", "Instrument", "Qty", "Avg Cost", "Mkt Price", "Mkt Value", "Unreal. P/L"]],
      body: holdingsForPdf.map((r) => [
        r.ticker || "—",
        r.instrument || r.title || "—",
        r.quantity || "—",
        r.avgCost || "—",
        r.marketPrice || "—",
        r.marketValue || "—",
        r.unrealizedPL || "—",
      ]),
      styles: {
        fontSize: 6.5,
        cellPadding: 2.2,
        textColor: DARK,
        lineColor: DIV,
        lineWidth: 0.15,
      },
      headStyles: {
        fillColor: P,
        textColor: WHITE,
        fontStyle: "bold",
        fontSize: 6.2,
        cellPadding: 2.5,
      },
      alternateRowStyles: { fillColor: P_PALE },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 16 },
        1: { cellWidth: 46 },
        2: { halign: "right", cellWidth: 16 },
        3: { halign: "right", cellWidth: 24 },
        4: { halign: "right", cellWidth: 24 },
        5: { halign: "right", fontStyle: "bold", cellWidth: 26 },
        6: { halign: "right", fontStyle: "bold" },
      },
      didParseCell: (d) => {
        if (d.section === "body" && d.column.index === 6) {
          const raw = (d.cell.text[0] || "").trim();
          if (raw !== "—") {
            const neg = raw.startsWith("-") || raw.startsWith("−");
            const v = parseAmount(raw);
            d.cell.styles.textColor = neg ? RED : v !== 0 ? GREEN : DARK;
            d.cell.styles.fontStyle = "bold";
          }
        }
      },
      didDrawPage: onNewPage(doc, clientName, accountNo, TOTAL_PAGES_PLACEHOLDER),
    });

    const totalsY = doc.lastAutoTable.finalY;
    const TOT_H = 7;
    fc(doc, P_STRIPE);
    doc.rect(ML, totalsY, CW, TOT_H, "F");
    dc(doc, P_MID);
    doc.setLineWidth(0.35);
    doc.line(ML, totalsY, ML + CW, totalsY);
    doc.line(ML, totalsY + TOT_H, ML + CW, totalsY + TOT_H);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    tc(doc, P);
    doc.text("PORTFOLIO TOTAL", ML + 4, totalsY + 4.8);
    tc(doc, DARK);
    doc.text(fmtR(totalValue), ML + 152, totalsY + 4.8, { align: "right" });
    // FIX: use "-" prefix for negative P/L (not empty string)
    const unrStr = (totalPL >= 0 ? "+" : "-") + fmtR(Math.abs(totalPL));
    tc(doc, totalPL >= 0 ? GREEN : RED);
    doc.text(unrStr, ML + CW - 2, totalsY + 4.8, { align: "right" });
    y = totalsY + TOT_H + 7;
  }

  // ── Section 4: Transaction History ────────────────────────────────────────
  y = guard(doc, y, 24, clientName, accountNo, TOTAL_PAGES_PLACEHOLDER);
  y = secHead(doc, "4", "Transaction History", y);

  if (!txForPdf.length) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    tc(doc, P_DIM);
    doc.text("No transactions in period.", ML + 4, y + 5);
    y += 14;
  } else {
    autoTable(doc, {
      startY: y,
      margin: { left: ML, right: MR },
      tableWidth: CW,
      head: [["Date", "Description", "Category", "Type", "Status", "Amount"]],
      body: txForPdf.map((t) => {
        let status = "—";
        if (t.status) {
          if (["successful", "completed", "posted"].includes(t.status))
            status = "Completed";
          else if (t.status === "pending") status = "Pending";
          else if (t.status === "failed") status = "Failed";
          else status = t.status.charAt(0).toUpperCase() + t.status.slice(1);
        }
        return [
          t.displayDate || t.date || "—",
          t.title || t.description || "—",
          t.filterCategory || "—",
          t.direction === "credit" ? "IN" : "OUT",
          status,
          t.amount || "—",
        ];
      }),
      styles: {
        fontSize: 6.5,
        cellPadding: 2.2,
        textColor: DARK,
        lineColor: DIV,
        lineWidth: 0.15,
      },
      headStyles: {
        fillColor: P,
        textColor: WHITE,
        fontStyle: "bold",
        fontSize: 6.2,
        cellPadding: 2.5,
      },
      alternateRowStyles: { fillColor: P_PALE },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 52 },
        2: { cellWidth: 26 },
        3: { cellWidth: 14, halign: "center", fontStyle: "bold" },
        4: { cellWidth: 22, halign: "center" },
        5: { halign: "right", fontStyle: "bold" },
      },
      didParseCell: (d) => {
        if (d.section !== "body") return;
        if (d.column.index === 3) {
          d.cell.styles.textColor = d.cell.text[0] === "IN" ? GREEN : RED;
          d.cell.styles.fontStyle = "bold";
        }
        if (d.column.index === 4) {
          const s = d.cell.text[0];
          d.cell.styles.textColor =
            s === "Completed" ? GREEN
            : s === "Pending" ? AMBER
            : s === "Failed" ? RED
            : DARK;
        }
      },
      didDrawPage: onNewPage(doc, clientName, accountNo, TOTAL_PAGES_PLACEHOLDER),
    });
    y = doc.lastAutoTable.finalY + 7;
  }

  // ── Section 5: Disclosures ────────────────────────────────────────────────
  y = guard(doc, y, 30, clientName, accountNo, TOTAL_PAGES_PLACEHOLDER);
  y = secHead(doc, "5", "Important Disclosures & Legal Notice", y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  tc(doc, BODY);
  doc.text(
    "Performance is shown gross of fees. Past performance is not indicative of future results. All investments carry risk.",
    ML + 4,
    y + 8,
    { maxWidth: CW - 8 }
  );
  y += 20;

  // ── Two-pass footer stamp ─────────────────────────────────────────────────
  // Now that all content is laid out we know the true total page count.
  // Stamp correct headers and footers on every page.
  const totalPages = doc.internal.getNumberOfPages();

  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    // Page 1 uses the large cover header; pages 2+ use the compact carryHeader.
    if (p > 1) {
      carryHeader(doc, clientName, accountNo, p, totalPages);
    }
    pageFooter(doc, accountNo, isoDate, p, totalPages);
  }

  // ── Output ────────────────────────────────────────────────────────────────
  const safeName = clientName.replace(/[^a-zA-Z0-9]/g, "_");
  const safeAcct = accountNo.replace(/[^A-Z0-9\-]/gi, "");
  const timeStr = now
    .toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })
    .replace(/:/g, "");
  const filename = `MINT_Statement_${safeName}_${safeAcct}_${isoDate}_${timeStr}.pdf`;

  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);

  const newTab = window.open(url, "_blank");
  if (!newTab || newTab.closed) {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
  }

  setTimeout(() => URL.revokeObjectURL(url), 60000);
};
