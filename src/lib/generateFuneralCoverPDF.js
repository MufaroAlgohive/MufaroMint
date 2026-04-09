import { jsPDF } from "jspdf";

// ─── Brand colours ────────────────────────────────────────────────────────────
const VIOLET   = [87,  28, 165];   // #571CA5  – primary
const DARK     = [15,  10,  60];   // #0F0A3C  – headings
const MID      = [100, 90, 140];   // slate-violet mid
const LIGHT_BG = [248, 247, 255];  // near-white tint
const WHITE    = [255, 255, 255];
const LINE     = [220, 215, 240];  // subtle rule

function fmtR(n) {
  return `R ${Number(n).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtCover(n) {
  return `R ${Number(n).toLocaleString("en-ZA")}`;
}
function today() {
  return new Date().toLocaleDateString("en-ZA", { day: "2-digit", month: "long", year: "numeric" });
}
function policyRef() {
  const rand = Math.floor(10000000 + Math.random() * 89999999);
  return `MNT${rand}`;
}

// ─── Layout helpers ───────────────────────────────────────────────────────────

function rule(doc, y, x1 = 20, x2 = 190, color = LINE) {
  doc.setDrawColor(...color);
  doc.setLineWidth(0.3);
  doc.line(x1, y, x2, y);
}

function badge(doc, text, x, y, bg = VIOLET) {
  doc.setFillColor(...bg);
  doc.roundedRect(x, y - 4.5, doc.getTextWidth(text) + 8, 6.5, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...WHITE);
  doc.text(text, x + 4, y);
}

function sectionHeader(doc, text, y) {
  doc.setFillColor(...LIGHT_BG);
  doc.rect(20, y - 5, 170, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...VIOLET);
  doc.text(text.toUpperCase(), 24, y);
  return y + 8;
}

function kv(doc, label, value, y, indent = 24, bold = false) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...MID);
  doc.text(label, indent, y);
  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setTextColor(...DARK);
  doc.text(String(value), 115, y);
  return y + 6;
}

function tableRow(doc, cols, y, widths, isHeader = false, shade = false) {
  const startX = 20;
  if (shade) {
    doc.setFillColor(...LIGHT_BG);
    doc.rect(startX, y - 4.5, 170, 6.5, "F");
  }
  let x = startX + 3;
  cols.forEach((cell, i) => {
    doc.setFont("helvetica", isHeader ? "bold" : "normal");
    doc.setFontSize(isHeader ? 7.5 : 8);
    if (isHeader) {
      doc.setTextColor(...VIOLET);
    } else {
      doc.setTextColor(...DARK);
    }
    const align = i > 0 ? "right" : "left";
    const cellX = i === 0 ? x : x + widths[i] - 3;
    doc.text(String(cell), cellX, y, { align });
    x += widths[i];
  });
  return y + 7;
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function generateFuneralCoverPDF({
  firstName,
  lastName,
  age,
  ageBand,
  planType,
  planLabel,
  coverAmount,
  basePremium,
  addonDetails = [],
  totalMonthly,
  deductionDate,
  societySize,
}) {
  const doc     = new jsPDF({ unit: "mm", format: "a4" });
  const policyNo = policyRef();
  const fullName = `${firstName} ${lastName}`.trim();
  const dateStr  = today();
  const pageW    = 210;
  const pageH    = 297;

  // ── PAGE 1 ──────────────────────────────────────────────────────────────────

  // Top violet band
  doc.setFillColor(...VIOLET);
  doc.rect(0, 0, pageW, 38, "F");

  // Mint wordmark
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...WHITE);
  doc.text("mint", 20, 18);

  // Tagline
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(200, 190, 255);
  doc.text("Invest. Protect. Grow.", 20, 25);

  // Policy title – right
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...WHITE);
  doc.text("POLICY SCHEDULE", pageW - 20, 17, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(200, 190, 255);
  doc.text(dateStr, pageW - 20, 24, { align: "right" });

  // Policy ref + name block below band
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...VIOLET);
  doc.text(policyNo, 20, 46);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...DARK);
  doc.text(fullName.toUpperCase(), pageW - 20, 46, { align: "right" });

  rule(doc, 50);

  // Greeting
  let y = 58;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  doc.text(`Dear ${fullName},`, 20, y);
  y += 7;
  const intro = doc.splitTextToSize(
    "Welcome to Mint Funeral Cover. Thank you for choosing our funeral plan, underwritten by a licensed South African life insurer. " +
    "This policy schedule sets out the details of your selected plan. Please read the enclosed information carefully. " +
    "Advise us within 31 days if any information is incorrect or incomplete — this protects your right to claim.",
    170
  );
  doc.setTextColor(60, 55, 90);
  doc.text(intro, 20, y);
  y += intro.length * 5.5 + 4;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8.5);
  doc.text("Warm regards,", 20, y);
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("The Mint Team", 20, y);
  y += 12;

  // ── PLAN SUMMARY TABLE ──
  y = sectionHeader(doc, "Plan Summary", y);
  y = tableRow(doc, ["Benefit", "Monthly Premium", "Cover Amount"], y, [90, 45, 35], true);
  rule(doc, y - 2, 20, 190, VIOLET);
  y += 2;

  const planRow = [
    `${planLabel} Funeral Plan${societySize ? ` (${societySize})` : ""}`,
    fmtR(basePremium),
    fmtCover(coverAmount),
  ];
  y = tableRow(doc, planRow, y, [90, 45, 35], false, false);

  addonDetails.forEach((a, i) => {
    y = tableRow(doc, [`  + ${a.label}${a.sub ? ` (${a.sub})` : ""}`, `+${fmtR(a.premium)}`, "–"], y, [90, 45, 35], false, i % 2 === 0);
  });

  rule(doc, y - 1);
  y += 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  doc.text("Total Monthly Premium", 24, y);
  doc.setTextColor(...VIOLET);
  doc.text(fmtR(totalMonthly), 115 + 45, y, { align: "right" });
  y += 12;

  // ── POLICYHOLDER DETAILS ──
  y = sectionHeader(doc, "Policyholder Details", y);
  y = kv(doc, "Full Name",         fullName,       y);
  y = kv(doc, "Age",               `${age} years`, y);
  y = kv(doc, "Age Band",          ageBand,        y);
  y = kv(doc, "Plan Type",         planLabel,      y);
  y = kv(doc, "Cover Amount",      fmtCover(coverAmount), y, 24, true);
  y = kv(doc, "Waiting Period",    "6 months",     y);
  y = kv(doc, "Policy Term",       "Whole of Life", y);
  y = kv(doc, "Deduction Date",    `${deductionDate} of each month`, y);
  y = kv(doc, "Reference on bank statement", `MINT-INS ${policyNo}`, y);
  y += 6;

  // ── BENEFIT DETAILS ──
  y = sectionHeader(doc, "Benefit Details", y);
  y += 2;

  // Base benefit card
  doc.setFillColor(...WHITE);
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.3);
  doc.roundedRect(20, y, 170, 28, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  doc.text(`${planLabel} Funeral Plan`, 26, y + 7);
  badge(doc, "ACTIVE", 170, y + 7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MID);

  const cols2 = [
    ["Life Assured",         fullName],
    ["Cover Amount",         fmtCover(coverAmount)],
    ["Monthly Premium",      fmtR(basePremium)],
    ["Commencement Date",    dateStr],
    ["Policy Term",          "Whole of Life"],
    ["Waiting Period",       "6 months (all causes)"],
  ];
  let cx = 26, cy = y + 14;
  cols2.forEach(([l, v], i) => {
    doc.setTextColor(...MID);
    doc.text(l, cx + (i % 2) * 87, cy + Math.floor(i / 2) * 5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK);
    doc.text(v, cx + (i % 2) * 87 + 40, cy + Math.floor(i / 2) * 5);
    doc.setFont("helvetica", "normal");
  });
  y += 34;

  // Add-on cards
  addonDetails.forEach(a => {
    if (y > 255) { doc.addPage(); y = 20; }
    doc.setDrawColor(...LINE);
    doc.roundedRect(20, y, 170, 16, 2, 2, "D");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...DARK);
    doc.text(a.label, 26, y + 7);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MID);
    if (a.sub) doc.text(a.sub, 26, y + 12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...VIOLET);
    doc.text(`+${fmtR(a.premium)}/mo`, pageW - 26, y + 7, { align: "right" });
    y += 20;
  });

  y += 4;

  // ── DEDUCTION NOTICE ──
  if (y > 245) { doc.addPage(); y = 20; }
  doc.setFillColor(...LIGHT_BG);
  doc.roundedRect(20, y, 170, 16, 2, 2, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MID);
  doc.text(
    `Your total premium of ${fmtR(totalMonthly)} will be debited on the ${deductionDate} of every month.`,
    25, y + 6
  );
  doc.text(`Bank statement reference: MINT-INS ${policyNo}`, 25, y + 12);
  y += 22;

  // ── IMPORTANT TERMS ──
  if (y > 240) { doc.addPage(); y = 20; }
  y = sectionHeader(doc, "Important Terms & Conditions", y);
  const terms = [
    "• A 6-month waiting period applies to all claims from the commencement date.",
    "• Benefits and premium rates may change. You will be notified 31 days in advance.",
    "• Claims must be submitted within 6 months of the insured event.",
    "• This policy is underwritten in terms of applicable South African insurance legislation.",
    "• Mint Financial Services (Pty) Ltd — FSP No. 55118.",
  ];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(60, 55, 90);
  terms.forEach(t => {
    doc.text(t, 24, y);
    y += 5.5;
  });

  // ── FOOTER (every page) ──────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(...VIOLET);
    doc.rect(0, pageH - 14, pageW, 14, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(200, 190, 255);
    doc.text(
      `Policy Schedule – ${fullName} ${policyNo}  |  ${dateStr}  |  Page ${i} of ${pageCount}`,
      pageW / 2, pageH - 8, { align: "center" }
    );
    doc.text("Mint Financial Services (Pty) Ltd  |  FSP No. 55118  |  support@mintapp.co.za", pageW / 2, pageH - 3.5, { align: "center" });
  }

  // ── DOWNLOAD ─────────────────────────────────────────────────────────────────
  const safeName = fullName.replace(/\s+/g, "_") || "Policyholder";
  doc.save(`Mint_Funeral_Cover_${safeName}_${policyNo}.pdf`);
}
