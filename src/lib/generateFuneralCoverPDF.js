import { jsPDF } from "jspdf";

// ─── Brand ────────────────────────────────────────────────────────────────────
const DARK_PURPLE  = [14,  5,  45];   // near-black violet – main banner bg
const MID_PURPLE   = [88, 28, 135];   // mid violet – sub-banners
const LIGHT_PURPLE = [109, 40, 217];  // lighter violet – accents
const TINT         = [245, 243, 255]; // lavender tint – alt row bg
const BLACK        = [20,  20,  20];
const GREY         = [110, 110, 110];
const LGREY        = [210, 210, 210];
const WHITE        = [255, 255, 255];

// ─── Layout ───────────────────────────────────────────────────────────────────
const PW = 210;   // page width mm
const PH = 297;   // page height mm
const L  = 14;    // left text margin
const R  = 196;   // right text margin
const TW = R - L; // text width

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtR(n) {
  return `R ${Number(n).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtCover(n) {
  return `R ${Number(n).toLocaleString("en-ZA")}`;
}
function todayStr() {
  return new Date().toLocaleDateString("en-ZA", { day: "2-digit", month: "long", year: "numeric" }).toUpperCase();
}
function policyRef() {
  return `MNT${Math.floor(100000 + Math.random() * 899999)}`;
}
async function imgToBase64(url) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((res, rej) => {
      const r = new FileReader();
      r.onloadend = () => res(r.result);
      r.onerror = rej;
      r.readAsDataURL(blob);
    });
  } catch { return null; }
}

// ─── Drawing primitives ───────────────────────────────────────────────────────

/** Full-width banner (Capital Legacy-style colored bar across the whole page) */
function banner(doc, y, h, color = DARK_PURPLE) {
  doc.setFillColor(...color);
  doc.rect(0, y, PW, h, "F");
  return y + h;
}

/** Full-width banner with white label left + optional right text */
function sectionBanner(doc, label, y, sub = "", color = DARK_PURPLE) {
  const h = sub ? 13 : 9;
  banner(doc, y, h, color);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(sub ? 10 : 8.5);
  doc.setTextColor(...WHITE);
  doc.text(label, L, y + (sub ? 7 : 6));
  if (sub) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(200, 180, 255);
    doc.text(sub, L, y + 11.5);
  }
  return y + h + 5;
}

/** Sub-section label (smaller inline label, not a full-width banner) */
function subLabel(doc, text, y) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...BLACK);
  doc.text(text, L, y);
  doc.setDrawColor(...LGREY);
  doc.setLineWidth(0.25);
  doc.line(L, y + 1.5, R, y + 1.5);
  return y + 6;
}

/** Horizontal rule */
function hr(doc, y, x1 = L, x2 = R, color = LGREY) {
  doc.setDrawColor(...color);
  doc.setLineWidth(0.25);
  doc.line(x1, y, x2, y);
}

/** Table header row */
function tHead(doc, cols, y) {
  let x = L;
  cols.forEach(({ label, w, align }) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...GREY);
    doc.text(label, align === "right" ? x + w : x, y, { align: align || "left" });
    x += w;
  });
  doc.setDrawColor(...LGREY);
  doc.setLineWidth(0.3);
  doc.line(L, y + 1.5, R, y + 1.5);
  return y + 7;
}

/** Table data row */
function tRow(doc, cols, y, shade = false) {
  if (shade) {
    doc.setFillColor(...TINT);
    doc.rect(0, y - 4.5, PW, 7, "F");
  }
  let x = L;
  cols.forEach(({ text, w, align, bold, color }) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...(color || BLACK));
    doc.text(String(text ?? ""), align === "right" ? x + w : x, y, { align: align || "left" });
    x += w;
  });
  doc.setDrawColor(...LGREY);
  doc.setLineWidth(0.2);
  doc.line(L, y + 2, R, y + 2);
  return y + 8;
}

/** Two-column key-value grid (like Capital Legacy benefit details block) */
function kvGrid(doc, rows, y) {
  const colW = TW / 2;
  rows.forEach((pair, pi) => {
    const rowY = y + pi * 11;
    pair.forEach(({ label, value }, ci) => {
      const x = L + ci * colW;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...GREY);
      doc.text(label, x, rowY);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...BLACK);
      doc.text(String(value ?? ""), x, rowY + 5);
      // thin underline per cell
      doc.setDrawColor(...LGREY);
      doc.setLineWidth(0.2);
      doc.line(x, rowY + 7, x + colW - 4, rowY + 7);
    });
  });
  return y + rows.length * 11 + 2;
}

/** Logo in top-right corner of content pages */
function pageLogoRight(doc, logoB64, y = 6) {
  if (logoB64) {
    try { doc.addImage(logoB64, "PNG", R - 38, y, 38, 4.8); } catch { /* skip */ }
  }
}

/** Full-width footer on every page */
function addFooters(doc, fullName, policyNo, dateStr, logoB64) {
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);

    // Footer banner
    banner(doc, PH - 18, 18, DARK_PURPLE);

    // Logo in footer (white version, left side)
    if (logoB64) {
      try { doc.addImage(logoB64, "PNG", L, PH - 14, 30, 3.8); } catch { /* skip */ }
    }

    // Page info centred
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(180, 160, 220);
    doc.text(
      `Policy Schedule – ${fullName}  ${policyNo}  |  ${dateStr}  |  Page ${i} of ${n}`,
      PW / 2, PH - 10, { align: "center" }
    );
    doc.text(
      "support@mymint.co.za  |  Mint Financial Services (Pty) Ltd  |  FSP No. 55118",
      PW / 2, PH - 5.5, { align: "center" }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════
export async function generateFuneralCoverPDF({
  firstName, lastName, age, ageBand,
  planType, planLabel,
  coverAmount, basePremium,
  addonDetails = [], totalMonthly,
  deductionDate, societySize,
  dependents = [],
}) {
  // Load assets
  const [logoB64, sigB64] = await Promise.all([
    imgToBase64("/assets/mint-logo.png"),
    imgToBase64("/assets/ceo-signature.png"),
  ]);

  // Use the same PNG for both light and dark backgrounds
  const logoWhiteB64 = logoB64;

  const doc      = new jsPDF({ unit: "mm", format: "a4" });
  const policyNo = policyRef();
  const fullName = `${firstName} ${lastName}`.trim();
  const dateStr  = todayStr();
  const planFull = `${planLabel} Funeral Plan${societySize ? ` (${societySize})` : ""}`;

  // ════════════════════════════════════════════════════════════════════════════
  // PAGE 1 – COVER LETTER
  // ════════════════════════════════════════════════════════════════════════════

  // ── Top banner: "PLAN SCHEDULE" row ──
  banner(doc, 0, 22, DARK_PURPLE);

  // White logo on the left inside top banner
  if (logoWhiteB64) {
    try { doc.addImage(logoWhiteB64, "PNG", L, 4, 42, 5.3); } catch { /* skip */ }
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...WHITE);
    doc.text("mint", L, 14);
  }

  // "POLICY SCHEDULE" right + date below
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...WHITE);
  doc.text("POLICY SCHEDULE", R, 10, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(190, 170, 230);
  doc.text(dateStr, R, 16, { align: "right" });

  // ── Policy number / Client name row (purple mid-banner) ──
  banner(doc, 22, 10, MID_PURPLE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...WHITE);
  doc.text(policyNo, L, 29);
  doc.text(fullName.toUpperCase(), R, 29, { align: "right" });

  // ── Referring entity row (lighter tint band) ──
  doc.setFillColor(...TINT);
  doc.rect(0, 32, PW, 9, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...GREY);
  doc.text("PLAN TYPE", L, 37);
  doc.text("FINANCIAL SERVICES PROVIDER", R, 37, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...BLACK);
  doc.text(planFull, L, 40);
  doc.text("Mint Financial Services (Pty) Ltd — FSP No. 55118", R, 40, { align: "right" });

  // ── Letter body ──
  let y = 52;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...BLACK);
  doc.text(`Dear ${fullName},`, L, y);
  y += 9;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text("Welcome to Mint Funeral Cover.", L, y);
  y += 8;

  const paras = [
    `Thank you for choosing the Mint Funeral Plan, underwritten by a licensed South African Life Insurer (FSP No. 55118). Our funeral plan has been designed to give your loved ones immediate financial support to cover all funeral costs without delay.`,
    `Please read the enclosed information carefully and in conjunction with the policy terms and conditions attached to this communication.`,
    `Please advise us within thirty-one (31) days of this letter if any of the information in your Policy Schedule is incorrect or incomplete. This is in your best interest as incorrect or incomplete information could impact your claim.`,
    `Please also advise us at any time when there are changes to your personal information or if you wish to change your beneficiary nominations.`,
    `We thank you for your business and trust in us to deliver.`,
  ];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(40, 40, 60);
  paras.forEach(p => {
    const lines = doc.splitTextToSize(p, TW);
    doc.text(lines, L, y);
    y += lines.length * 5 + 4;
  });

  y += 2;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...BLACK);
  doc.text("Kind regards,", L, y);
  y += 5;

  // CEO signature image
  if (sigB64) {
    try { doc.addImage(sigB64, "PNG", L, y, 32, 32); y += 35; } catch { y += 8; }
  } else { y += 8; }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...BLACK);
  doc.text("Lonwabo", L, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...GREY);
  doc.text("Chief Executive Officer", L, y);
  y += 4;
  doc.text("Mint Financial Services (Pty) Ltd", L, y);
  y += 12;

  // ── "underwritten by" box with logo (like Capital Legacy) ──
  const boxX = R - 58;
  doc.setDrawColor(...LGREY);
  doc.setLineWidth(0.4);
  doc.roundedRect(boxX, y - 4, 58, 20, 2, 2, "D");
  doc.setFillColor(...DARK_PURPLE);
  doc.roundedRect(boxX, y - 4, 58, 8, 2, 2, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...WHITE);
  doc.text("underwritten by", boxX + 29, y + 0.5, { align: "center" });

  // Logo inside box
  if (logoB64) {
    try { doc.addImage(logoB64, "PNG", boxX + 4, y + 6, 50, 6.3); } catch { /* skip */ }
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...MID_PURPLE);
    doc.text("mint", boxX + 29, y + 13, { align: "center" });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PAGE 2 – SUMMARY
  // ════════════════════════════════════════════════════════════════════════════
  doc.addPage();

  // Page header – full width dark banner with logo right
  banner(doc, 0, 14, DARK_PURPLE);
  if (logoWhiteB64) {
    try { doc.addImage(logoWhiteB64, "PNG", R - 38, 2, 38, 4.8); } catch { /* skip */ }
  }

  // Section banner: SUMMARY OF COVER SELECTION
  y = sectionBanner(doc, "SUMMARY OF COVER SELECTION", 14, "", MID_PURPLE);

  // PLAN SUMMARY sub-label
  y = subLabel(doc, "PLAN SUMMARY", y);

  y = tHead(doc, [
    { label: "Product Name",    w: 100 },
    { label: "Monthly Premium", w: 48, align: "right" },
    { label: "Cover Amount",    w: 42, align: "right" },
  ], y);

  y = tRow(doc, [
    { text: planFull,              w: 100 },
    { text: fmtR(basePremium),     w: 48, align: "right" },
    { text: fmtCover(coverAmount), w: 42, align: "right" },
  ], y, false);

  addonDetails.forEach((a, i) => {
    y = tRow(doc, [
      { text: `${a.label}${a.sub ? ` – ${a.sub}` : ""}`, w: 100 },
      { text: fmtR(a.premium), w: 48, align: "right" },
      { text: "Optional benefit", w: 42, align: "right" },
    ], y, i % 2 === 0);
  });

  // Total row
  doc.setFillColor(...DARK_PURPLE);
  doc.rect(0, y - 1, PW, 9, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...WHITE);
  doc.text("Total", L, y + 5);
  doc.text(fmtR(totalMonthly), R, y + 5, { align: "right" });
  y += 14;

  // Image divider between sections – purple banner with logo
  banner(doc, y, 10, MID_PURPLE);
  if (logoWhiteB64) {
    try { doc.addImage(logoWhiteB64, "PNG", R - 36, y + 2, 36, 4.5); } catch { /* skip */ }
  }
  y += 15;

  // PRINCIPAL COVER BENEFITS
  y = subLabel(doc, "PRINCIPAL COVER BENEFITS", y);
  y = tHead(doc, [
    { label: "Benefit Name", w: 140 },
    { label: "Amount",       w: 50, align: "right" },
  ], y);

  const allBenefits = [
    { name: "Funeral Cover – Main Member", value: fmtCover(coverAmount) },
    ...addonDetails.map(a => ({ name: `${a.label}${a.sub ? ` (${a.sub})` : ""}`, value: fmtR(a.premium) + " pm" })),
  ];
  allBenefits.forEach((b, i) => {
    y = tRow(doc, [
      { text: b.name,  w: 140 },
      { text: b.value, w: 50, align: "right", bold: true },
    ], y, i % 2 === 0);
  });

  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...BLACK);
  const debitLine = doc.splitTextToSize(
    `Your total premium of ${fmtR(totalMonthly)} will be debited from your bank account on the ${deductionDate} of every month. The reference on your bank statement will be: MINT-INS ${policyNo}.`,
    TW
  );
  doc.text(debitLine, L, y);

  // ════════════════════════════════════════════════════════════════════════════
  // PAGE 3 – BENEFIT DETAILS
  // ════════════════════════════════════════════════════════════════════════════
  doc.addPage();

  banner(doc, 0, 14, DARK_PURPLE);
  if (logoWhiteB64) {
    try { doc.addImage(logoWhiteB64, "PNG", R - 38, 2, 38, 4.8); } catch { /* skip */ }
  }

  y = sectionBanner(doc, "BENEFIT DETAILS", 14, "", MID_PURPLE);

  // Main plan sub-section
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...MID_PURPLE);
  doc.text(planFull, L, y);
  y += 6;

  y = kvGrid(doc, [
    [
      { label: "Life Assured",      value: fullName },
      { label: "Commencement Date", value: dateStr },
    ],
    [
      { label: "Age",               value: `${age} years` },
      { label: "Policy Term",       value: "Whole of Life" },
    ],
    [
      { label: "Age Band",          value: ageBand },
      { label: "Waiting Period",    value: "6 months (all causes)" },
    ],
    [
      { label: "Premium Increases", value: "Not Guaranteed" },
      { label: "Deduction Date",    value: `${deductionDate} of each month` },
    ],
  ], y);

  y += 2;
  // Mini number row (like Capital Legacy's 5-column monthly premium table)
  const numCols = [
    { label: "Monthly Premium", w: 48 },
    { label: "Cover Amount",    w: 48 },
    { label: "Plan Type",       w: 50 },
    { label: "Society Size",    w: 44 },
  ];
  y = tHead(doc, numCols, y);
  y = tRow(doc, [
    { text: fmtR(basePremium),     w: 48 },
    { text: fmtCover(coverAmount), w: 48 },
    { text: planLabel,             w: 50 },
    { text: societySize || "N/A",  w: 44 },
  ], y);
  y += 6;

  // Add-on sub-sections
  addonDetails.forEach(addon => {
    if (y > 220) { doc.addPage(); banner(doc, 0, 14, DARK_PURPLE); if (logoWhiteB64) { try { doc.addImage(logoWhiteB64, "PNG", R - 38, 2, 38, 4.8); } catch { /* skip */ } } y = 22; }

    // Image divider between add-on sections
    banner(doc, y, 8, MID_PURPLE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...WHITE);
    doc.text(`${addon.label}${addon.sub ? ` – ${addon.sub}` : ""}`, L, y + 5.5);
    y += 13;

    y = kvGrid(doc, [
      [
        { label: "Life Assured",    value: fullName },
        { label: "Policy Term",     value: "Whole of Life" },
      ],
      [
        { label: "Benefit Type",    value: "Once Off Payout" },
        { label: "Monthly Premium", value: fmtR(addon.premium) },
      ],
    ], y);
    y += 4;
  });

  // ── Beneficiary / Dependent Details ──
  if (dependents.length > 0) {
    if (y > 195) { doc.addPage(); banner(doc, 0, 14, DARK_PURPLE); if (logoWhiteB64) { try { doc.addImage(logoWhiteB64, "PNG", R - 38, 2, 38, 4.8); } catch { /* skip */ } } y = 22; }

    banner(doc, y, 10, MID_PURPLE);
    if (logoWhiteB64) { try { doc.addImage(logoWhiteB64, "PNG", R - 36, y + 2, 36, 4.5); } catch { /* skip */ } }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...WHITE);
    doc.text("BENEFICIARY DETAILS", L, y + 7);
    y += 15;

    y = tHead(doc, [
      { label: "Name",          w: 68 },
      { label: "Type",          w: 36 },
      { label: "Date of Birth", w: 38 },
      { label: "Age",           w: 20, align: "right" },
      { label: "Allocation",    w: 28, align: "right" },
    ], y);

    dependents.forEach((dep, i) => {
      if (y > 250) { doc.addPage(); banner(doc, 0, 14, DARK_PURPLE); if (logoWhiteB64) { try { doc.addImage(logoWhiteB64, "PNG", R - 38, 2, 38, 4.8); } catch { /* skip */ } } y = 22; }
      const depName = [dep.firstName, dep.lastName].filter(Boolean).join(" ") || "—";
      const depType = dep.type === "spouse" ? "Spouse" : dep.type === "member" ? "Society Member" : "Child";
      let depAge = "—";
      if (dep.dob) {
        const parts = dep.dob.split("-").map(Number);
        if (parts.length === 3) {
          const now = new Date();
          let a = now.getFullYear() - parts[0];
          if (now.getMonth() + 1 < parts[1] || (now.getMonth() + 1 === parts[1] && now.getDate() < parts[2])) a--;
          depAge = `${a} yrs`;
        }
      }
      y = tRow(doc, [
        { text: depName,  w: 68 },
        { text: depType,  w: 36 },
        { text: dep.dob || "—", w: 38 },
        { text: depAge,   w: 20, align: "right" },
        { text: "100%",   w: 28, align: "right" },
      ], y, i % 2 === 0);
    });
    y += 6;
  }

  // Image divider before policyholder details
  if (y > 205) { doc.addPage(); banner(doc, 0, 14, DARK_PURPLE); if (logoWhiteB64) { try { doc.addImage(logoWhiteB64, "PNG", R - 38, 2, 38, 4.8); } catch { /* skip */ } } y = 22; }

  banner(doc, y, 10, DARK_PURPLE);
  if (logoWhiteB64) {
    try { doc.addImage(logoWhiteB64, "PNG", R - 36, y + 2, 36, 4.5); } catch { /* skip */ }
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...WHITE);
  doc.text("POLICYHOLDER DETAILS", L, y + 7);
  y += 15;

  y = kvGrid(doc, [
    [
      { label: "Full Name",      value: fullName },
      { label: "Age",            value: `${age} years` },
    ],
    [
      { label: "Policy Number",  value: policyNo },
      { label: "Schedule Date",  value: dateStr },
    ],
    [
      { label: "Deduction Date", value: `${deductionDate} of each month` },
      { label: "Bank Reference", value: `MINT-INS ${policyNo}` },
    ],
  ], y);

  // ════════════════════════════════════════════════════════════════════════════
  // PAGE 4 – TERMS & REMUNERATION
  // ════════════════════════════════════════════════════════════════════════════
  doc.addPage();

  banner(doc, 0, 14, DARK_PURPLE);
  if (logoWhiteB64) {
    try { doc.addImage(logoWhiteB64, "PNG", R - 38, 2, 38, 4.8); } catch { /* skip */ }
  }

  y = sectionBanner(doc, "IMPORTANT TERMS & CONDITIONS", 14, "", MID_PURPLE);

  [
    { head: "Waiting Period", body: "A waiting period of six (6) months applies to all claims from the commencement date. No claims will be paid during this period, except for accidental death where the Accidental Death benefit has been selected." },
    { head: "Premium Changes", body: "Benefits and premium rates may change. You will be given thirty-one (31) days' notice. Continued payment of premiums after notice constitutes acceptance of the change." },
    { head: "Claim Submission", body: "All claims must be submitted within six (6) months of the insured event. Required documentation: certified death certificate, ID documents, and completed claim form." },
    { head: "Lapse & Reinstatement", body: "If premiums are not paid within thirty (30) days' grace, this policy lapses. Reinstatement is subject to approval and may require a new waiting period." },
    { head: "Complaints", body: "Contact Mint Financial Services at support@mymint.co.za. Unresolved complaints may be escalated to the FSCA or the Ombud for Financial Services Providers." },
  ].forEach(({ head, body }) => {
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...BLACK);
    doc.text(head, L, y);
    y += 4;
    const lines = doc.splitTextToSize(body, TW);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(50, 50, 70);
    doc.text(lines, L, y);
    y += lines.length * 5 + 5;
  });

  // Image divider before remuneration
  if (y > 220) { doc.addPage(); y = 20; }
  banner(doc, y, 10, MID_PURPLE);
  if (logoWhiteB64) {
    try { doc.addImage(logoWhiteB64, "PNG", R - 36, y + 2, 36, 4.5); } catch { /* skip */ }
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...WHITE);
  doc.text("REMUNERATION STRUCTURE", L, y + 7);
  y += 15;

  y = tHead(doc, [
    { label: "Category", w: 140 },
    { label: "Value",    w: 50, align: "right" },
  ], y);

  [
    { cat: "Intermediary remuneration (first 12 months, payable upfront on inception of the cover and recoverable should the plan lapse).", val: "Per FAIS schedule" },
    { cat: "Ongoing administration fee payable to Mint Financial Services (Pty) Ltd each month.", val: "Included in premium" },
    { cat: "Please take into consideration that these amounts exclude VAT. Future premium increases on your plan may attract commission.", val: "" },
  ].forEach((r, i) => {
    if (y > 260) { doc.addPage(); y = 20; }
    const lines = doc.splitTextToSize(r.cat, 136);
    const rowH = Math.max(9, lines.length * 5 + 5);
    if (i % 2 === 0) {
      doc.setFillColor(...TINT);
      doc.rect(0, y - 4.5, PW, rowH, "F");
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...BLACK);
    doc.text(lines, L, y);
    if (r.val) {
      doc.setFont("helvetica", "bold");
      doc.text(r.val, R, y, { align: "right" });
    }
    hr(doc, y + rowH - 2);
    y += rowH + 2;
  });

  // ─── Footers on all pages ──────────────────────────────────────────────────
  addFooters(doc, fullName, policyNo, dateStr, logoWhiteB64 || logoB64);

  // ─── Save ──────────────────────────────────────────────────────────────────
  const safe = fullName.replace(/\s+/g, "_") || "Client";
  doc.save(`Mint_Policy_Schedule_${safe}_${policyNo}.pdf`);

  return { policyNo, dateStr };
}
