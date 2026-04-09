import { jsPDF } from "jspdf";
import {
  getChildCoverAmount,
  getChildAgeBracket,
  FSP_NUMBER,
  WAITING_PERIOD_MONTHS,
} from "./funeralCoverRates";

// ─── Brand colours ────────────────────────────────────────────────────────────
const PURPLE_DARK   = [59,  11, 122];   // #3b0b7a – primary banner / footer
const PURPLE_MID    = [91,  33, 182];   // #5b21b6 – sub-banners / section bars
const PURPLE_LIGHT  = [237, 233, 254];  // #ede9fe – alt row tint
const PURPLE_ACCENT = [139,  92, 246];  // #8b5cf6 – highlight text
const GOLD          = [251, 191,  36];  // amber – GuardRisk accent
const BLACK         = [20,  20,  20];
const GREY          = [110, 110, 110];
const LGREY         = [210, 210, 210];
const WHITE         = [255, 255, 255];

// ─── Layout ───────────────────────────────────────────────────────────────────
const PW  = 210;   // A4 width mm
const PH  = 297;   // A4 height mm
const L   = 14;    // left margin
const R   = 196;   // right margin
const TW  = R - L; // text width

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
    const res  = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result);
      r.onerror   = reject;
      r.readAsDataURL(blob);
    });
  } catch { return null; }
}

/**
 * Center-crop a base64 image to exactly (pxW × pxH) pixels — no squashing.
 * Works like CSS object-fit:cover. Returns a JPEG data-URL or null.
 */
async function cropToFit(b64, pxW, pxH) {
  if (!b64) return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const iw = img.naturalWidth, ih = img.naturalHeight;
        const targetRatio = pxW / pxH;
        const naturalRatio = iw / ih;
        let sx, sy, sw, sh;
        if (naturalRatio > targetRatio) {
          // Image wider than target — crop sides, keep full height
          sh = ih; sw = ih * targetRatio;
          sx = (iw - sw) / 2; sy = 0;
        } else {
          // Image taller than target — crop bottom, keep full width, bias top
          sw = iw; sh = iw / targetRatio;
          sx = 0; sy = Math.max(0, (ih - sh) * 0.35); // 35% from top keeps faces visible
        }
        const canvas = document.createElement("canvas");
        canvas.width = pxW; canvas.height = pxH;
        canvas.getContext("2d").drawImage(img, sx, sy, sw, sh, 0, 0, pxW, pxH);
        resolve(canvas.toDataURL("image/jpeg", 0.88));
      } catch { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = b64;
  });
}

// ─── Primitives ───────────────────────────────────────────────────────────────

/** Full-width filled rectangle */
function fillRect(doc, y, h, color) {
  doc.setFillColor(...color);
  doc.rect(0, y, PW, h, "F");
}

/**
 * Purple section-header bar — matches Capital Legacy yellow bars but in purple.
 * Returns y after the bar + gap.
 */
function sectionBar(doc, label, y, color = PURPLE_MID) {
  const h = 8;
  fillRect(doc, y, h, color);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...WHITE);
  doc.text(label.toUpperCase(), L, y + 5.5);
  return y + h + 1;
}

/** Thin horizontal rule */
function hr(doc, y, x1 = L, x2 = R) {
  doc.setDrawColor(...LGREY);
  doc.setLineWidth(0.2);
  doc.line(x1, y, x2, y);
}

/** Table header row — grey labels, bottom rule */
function tHead(doc, cols, y) {
  let x = L;
  cols.forEach(({ label, w, align }) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...GREY);
    const tx = align === "right" ? x + w : x;
    doc.text(label, tx, y, { align: align || "left" });
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
    doc.setFillColor(...PURPLE_LIGHT);
    doc.rect(0, y - 4.5, PW, 7, "F");
  }
  let x = L;
  cols.forEach(({ text, w, align, bold, color }) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...(color || BLACK));
    const tx = align === "right" ? x + w : x;
    doc.text(String(text ?? "—"), tx, y, { align: align || "left" });
    x += w;
  });
  hr(doc, y + 2);
  return y + 8;
}

/**
 * Two-column key/value grid — matches Capital Legacy's benefit detail blocks.
 * Each pair: [{ label, value }, { label, value }]
 */
function kvGrid(doc, rows, y) {
  const colW = TW / 2;
  rows.forEach((pair, pi) => {
    const rowY = y + pi * 11;
    pair.forEach(({ label, value }, ci) => {
      const x = L + ci * colW;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...GREY);
      doc.text(label, x, rowY);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...BLACK);
      doc.text(String(value ?? "—"), x, rowY + 5);
      doc.setDrawColor(...LGREY);
      doc.setLineWidth(0.2);
      doc.line(x, rowY + 7, x + colW - 4, rowY + 7);
    });
  });
  return y + rows.length * 11 + 2;
}

/**
 * Place Mint logo top-left of a body page (the "=CL" equivalent).
 * On white background — uses the colored logo PNG.
 */
function pageLogoLeft(doc, logoB64, y = 6) {
  if (logoB64) {
    try { doc.addImage(logoB64, "PNG", L, y, 40, 5.1); } catch { /* skip */ }
  }
}

/**
 * "Mint" text monogram — fallback when logo not available.
 */
function mintMonogram(doc, y) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...PURPLE_MID);
  doc.text("mint", L, y + 8);
}

/** Footer bar on every page with policy info */
function addFooters(doc, fullName, policyNo, dateStr, logoB64) {
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);

    // Purple footer bar
    fillRect(doc, PH - 18, 18, PURPLE_DARK);

    // Logo left in footer — white text on dark background
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...WHITE);
    doc.text("mint", L, PH - 9);

    // Page info centred
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(180, 160, 220);
    doc.text(
      `Policy Schedule  –  ${fullName}  |  ${policyNo}  |  ${dateStr}  |  Page ${i} of ${n}`,
      PW / 2, PH - 11.5, { align: "center" }
    );
    doc.text(
      `support@mymint.co.za  |  Mint Financial Services (Pty) Ltd  |  FSP No. ${FSP_NUMBER}`,
      PW / 2, PH - 6.5, { align: "center" }
    );
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═════════════════════════════════════════════════════════════════════════════
export async function generateFuneralCoverPDF({
  firstName, lastName, age, ageBand,
  planType, planLabel,
  coverAmount, basePremium,
  addonDetails = [], totalMonthly,
  deductionDate, societySize,
  dependents = [],
}) {
  // Load assets (non-blocking — fails gracefully)
  // ── Load raw images ──────────────────────────────────────────────────────────
  const [logoB64, sigB64, rawFamily, rawChildren, rawHands, rawSunset, rawForest] = await Promise.all([
    imgToBase64("/assets/mint-logo.png"),
    imgToBase64("/assets/ceo-signature.png"),
    imgToBase64("/assets/images/family-hero.jpeg"),
    imgToBase64("/assets/images/children-hero.jpeg"),
    imgToBase64("/assets/images/hands-hero.jpeg"),
    imgToBase64("/assets/images/sunset-family.jpeg"),
    imgToBase64("/assets/images/forest-family.jpeg"),
  ]);

  // ── Pre-crop all photos to strip dimensions (210mm × 52mm ≈ 2480×614 px)
  // cropToFit gives CSS object-fit:cover — no squashing, no distortion.
  const STRIP_PX_W = 2480, STRIP_PX_H = 614;
  const [handsStrip, familyStrip, childrenStrip, sunsetStrip, forestStrip] = await Promise.all([
    cropToFit(rawHands,    STRIP_PX_W, STRIP_PX_H),
    cropToFit(rawFamily,   STRIP_PX_W, STRIP_PX_H),
    cropToFit(rawChildren, STRIP_PX_W, STRIP_PX_H),
    cropToFit(rawSunset,   STRIP_PX_W, STRIP_PX_H),
    cropToFit(rawForest,   STRIP_PX_W, STRIP_PX_H),
  ]);

  const doc       = new jsPDF({ unit: "mm", format: "a4" });
  const policyNo  = policyRef();
  const fullName  = `${firstName} ${lastName}`.trim();
  const dateStr   = todayStr();
  const planFull  = `${planLabel} Funeral Plan${societySize ? ` (${societySize})` : ""}`;
  const spouseBen = dependents.find(d => d.type === "spouse");
  const children  = dependents.filter(d => d.type === "child");

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 1 — COVER LETTER  (mirrors Capital Legacy p.1 structure)
  // ═══════════════════════════════════════════════════════════════════════════

  // ── White header zone (logo left / POLICY SCHEDULE right) ──────────────────
  const logoZoneH = 24;
  fillRect(doc, 0, logoZoneH, WHITE);
  // Thin purple top rule
  doc.setFillColor(...PURPLE_MID);
  doc.rect(0, 0, PW, 1.5, "F");

  if (logoB64) {
    try { doc.addImage(logoB64, "PNG", L, 8, 45, 5.7); } catch { /* skip */ }
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(...PURPLE_MID);
    doc.text("mint", L, 18);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...PURPLE_DARK);
  doc.text("POLICY SCHEDULE", R, 13, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...GREY);
  doc.text(dateStr, R, 19, { align: "right" });

  // ── Primary purple band: policy number / client name ───────────────────────
  fillRect(doc, logoZoneH, 10, PURPLE_MID);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...WHITE);
  doc.text(policyNo, L, logoZoneH + 7);
  doc.text(fullName.toUpperCase(), R, logoZoneH + 7, { align: "right" });

  // ── Secondary band: plan type / FSP ────────────────────────────────────────
  fillRect(doc, logoZoneH + 10, 9, PURPLE_LIGHT);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...GREY);
  doc.text("PLAN TYPE", L, logoZoneH + 14.5);
  doc.text("AUTHORISED FINANCIAL SERVICES PROVIDER", R, logoZoneH + 14.5, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...BLACK);
  doc.text(planFull, L, logoZoneH + 18);
  doc.text(`Mint Financial Services (Pty) Ltd  —  FSP No. ${FSP_NUMBER}`, R, logoZoneH + 18, { align: "right" });

  // ── Cover letter body ───────────────────────────────────────────────────────
  let y = logoZoneH + 29;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...BLACK);
  doc.text(`Dear ${fullName},`, L, y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...PURPLE_DARK);
  doc.text("Welcome to Mint.", L, y);
  y += 8;

  const paras = [
    `Thank you for choosing the Mint Funeral Plan. We are honoured to be your trusted financial services partner, and we are committed to ensuring that your loved ones are taken care of at their most vulnerable time.`,
    `Your Mint Funeral Plan has been designed to provide your family with an immediate lump-sum payout upon a valid claim — covering funeral costs, associated expenses, and providing financial relief when it matters most. Your policy is underwritten by a licensed South African Life Insurer in terms of the Long-term Insurance Act and the Financial Advisory and Intermediary Services Act (FAIS).`,
    `Please read the enclosed Policy Schedule and the attached terms and conditions carefully. Should any information in this Policy Schedule be incorrect or incomplete, please notify us in writing within thirty-one (31) days from the date of this letter. Providing accurate information is in your best interest, as incorrect or incomplete details may affect the processing of a claim.`,
    `Please also advise us, at any time, of any changes to your personal information or beneficiary nominations. Keeping your information up to date ensures that your cover remains valid and your claim can be processed without delay.`,
    `A waiting period of ${WAITING_PERIOD_MONTHS} months applies from the commencement date. During this period, no benefits will be paid for natural causes of death. The Accidental Death benefit (where selected) is not subject to the waiting period.`,
    `We thank you for placing your trust in Mint. Should you have any questions, please contact our client support team at support@mymint.co.za.`,
  ];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 20, 50);

  paras.forEach(p => {
    if (y > 215) return; // safety — don't overflow page 1
    const lines = doc.splitTextToSize(p, TW);
    doc.text(lines, L, y);
    y += lines.length * 5.2 + 3.5;
  });

  y += 3;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...BLACK);
  doc.text("Kind regards,", L, y);
  y += 5;

  // Signature image
  if (sigB64) {
    try { doc.addImage(sigB64, "PNG", L, y, 28, 28); y += 31; } catch { y += 6; }
  } else {
    y += 6;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...BLACK);
  doc.text("Lonwabo", L, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...GREY);
  doc.text("Chief Executive Officer", L, y);
  y += 4.5;
  doc.text("Mint Financial Services (Pty) Ltd", L, y);

  // ── Full-width hands photo strip — GuardRisk box overlaid on top ─────────
  {
    const sY = 222, sH = 52;
    if (handsStrip) {
      try { doc.addImage(handsStrip, "JPEG", 0, sY, PW, sH); } catch { /* skip */ }
    } else {
      fillRect(doc, sY, sH, PURPLE_DARK);
    }
  }

  // ── "underwritten by GuardRisk" box (bottom-right, like Capital Legacy) ────
  const boxW = 60, boxH = 22;
  const boxX = R - boxW;
  const boxY = PH - 18 - boxH - 6; // just above footer

  doc.setDrawColor(...LGREY);
  doc.setLineWidth(0.4);
  doc.roundedRect(boxX, boxY, boxW, boxH, 2, 2, "D");

  // Header strip inside box
  fillRect(doc, boxY, 8, PURPLE_DARK);
  // Re-apply rounded clip is not possible in jsPDF, just overlay text
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...WHITE);
  doc.text("underwritten by", boxX + boxW / 2, boxY + 5.5, { align: "center" });

  // GuardRisk name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...GOLD);
  doc.text("GuardRisk", boxX + boxW / 2, boxY + 16, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...GREY);
  doc.text("Life Ltd — FSP 76", boxX + boxW / 2, boxY + 20.5, { align: "center" });

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 2 — SUMMARY  (mirrors Capital Legacy p.2 "=CL" layout)
  // ═══════════════════════════════════════════════════════════════════════════
  doc.addPage();

  // Logo zone (white)
  fillRect(doc, 0, 14, WHITE);
  doc.setFillColor(...PURPLE_MID);
  doc.rect(0, 0, PW, 1.2, "F");
  pageLogoLeft(doc, logoB64, 4);

  // Section title
  y = 16;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...BLACK);
  doc.text("SUMMARY OF PRODUCT AND SERVICE SELECTION", L, y + 5);
  y += 12;

  // ── PLAN SUMMARY ──────────────────────────────────────────────────────────
  y = sectionBar(doc, "Plan Summary", y);

  y = tHead(doc, [
    { label: "Product Name",     w: 104 },
    { label: "Monthly Premium",  w: 46, align: "right" },
    { label: "Plan Value",       w: 42, align: "right" },
  ], y);

  y = tRow(doc, [
    { text: planFull,                w: 104 },
    { text: `${fmtR(basePremium)} pm`, w: 46, align: "right" },
    { text: fmtCover(coverAmount),   w: 42, align: "right" },
  ], y, false);

  addonDetails.forEach((a, i) => {
    y = tRow(doc, [
      { text: `${a.label}${a.sub ? ` – ${a.sub}` : ""}`, w: 104 },
      { text: `${fmtR(a.premium)} pm`, w: 46, align: "right" },
      { text: "Optional benefit",     w: 42, align: "right" },
    ], y, i % 2 === 0);
  });

  // Total row
  fillRect(doc, y - 1, 9, PURPLE_MID);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...WHITE);
  doc.text("Total", L, y + 5);
  doc.text(`${fmtR(totalMonthly)} pm`, R, y + 5, { align: "right" });
  y += 14;

  // ── PRINCIPAL LIFE PLAN BENEFITS ──────────────────────────────────────────
  y = sectionBar(doc, "Principal Life Plan Benefits", y);

  const allBenefits = [
    { name: `Funeral Cover – Main Member (${planLabel})`, value: fmtCover(coverAmount) },
  ];
  if (spouseBen) {
    allBenefits.push({ name: "Spouse Funeral Cover", value: fmtCover(coverAmount) });
  }
  if (children.length > 0) {
    allBenefits.push({ name: `Children Funeral Cover (${children.length} child${children.length > 1 ? "ren" : ""})`, value: "Per age bracket" });
  }
  addonDetails.forEach(a => {
    allBenefits.push({ name: `${a.label}${a.sub ? ` (${a.sub})` : ""}`, value: `${fmtR(a.premium)} pm` });
  });

  y = tHead(doc, [
    { label: "Benefit Name", w: 148 },
    { label: "Plan Value",   w: 44, align: "right" },
  ], y);

  allBenefits.forEach((b, i) => {
    y = tRow(doc, [
      { text: b.name,  w: 148 },
      { text: b.value, w: 44, align: "right", bold: true },
    ], y, i % 2 === 0);
  });

  y += 8;

  // Deduction notice
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 20, 50);
  const debitLines = doc.splitTextToSize(
    `Your total premium of ${fmtR(totalMonthly)} per month will be debited from your bank account on the ${deductionDate} of every month. The reference on your bank statement will be: MINT-INS ${policyNo}.`,
    TW
  );
  doc.text(debitLines, L, y);
  y += debitLines.length * 5 + 5;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(...GREY);
  const waitLines = doc.splitTextToSize(
    `Please note that a waiting period of ${WAITING_PERIOD_MONTHS} months applies from the commencement date. Please read this plan schedule in conjunction with the plan terms and conditions included with this communication.`,
    TW
  );
  doc.text(waitLines, L, y);

  // ── Full-width family photo strip ────────────────────────────────────────
  if (familyStrip) {
    try { doc.addImage(familyStrip, "JPEG", 0, 231, PW, 46); } catch { /* skip */ }
  } else { fillRect(doc, 231, 46, PURPLE_DARK); }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 3 — BENEFIT DETAILS
  // ═══════════════════════════════════════════════════════════════════════════
  doc.addPage();

  fillRect(doc, 0, 14, WHITE);
  doc.setFillColor(...PURPLE_MID);
  doc.rect(0, 0, PW, 1.2, "F");
  pageLogoLeft(doc, logoB64, 4);

  y = 16;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...BLACK);
  doc.text("BENEFIT DETAILS", L, y + 5);
  y += 12;

  // ── Main plan detail block ─────────────────────────────────────────────────
  y = sectionBar(doc, planFull, y, PURPLE_MID);

  y = kvGrid(doc, [
    [
      { label: "Life Assured",      value: fullName },
      { label: "Commencement Date", value: dateStr },
    ],
    [
      { label: "Date of Birth / Age", value: `${age} years` },
      { label: "Policy Term",       value: "Whole of Life" },
    ],
    [
      { label: "Age Band",          value: ageBand },
      { label: "Premium Increases", value: "Not Guaranteed" },
    ],
    [
      { label: "Waiting Period",    value: `${WAITING_PERIOD_MONTHS} months (all causes)` },
      { label: "Capitalisation",    value: "Not Applicable" },
    ],
  ], y);

  y += 4;

  // Highlight row — monthly premium / cover amount (like CL's icon bar)
  fillRect(doc, y, 16, PURPLE_LIGHT);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...GREY);
  doc.text("Monthly Premium", L + 2, y + 5);
  doc.text("Cover Amount", L + 48, y + 5);
  doc.text("Plan Type", L + 96, y + 5);
  doc.text("Deduction Date", L + 136, y + 5);
  doc.setFontSize(9.5);
  doc.setTextColor(...PURPLE_DARK);
  doc.text(fmtR(basePremium), L + 2, y + 12);
  doc.text(fmtCover(coverAmount), L + 48, y + 12);
  doc.text(planLabel, L + 96, y + 12);
  doc.text(deductionDate, L + 136, y + 12);
  y += 22;

  // ── Optional add-on sub-sections ──────────────────────────────────────────
  addonDetails.forEach(addon => {
    if (y > 225) {
      doc.addPage();
      fillRect(doc, 0, 14, WHITE);
      doc.setFillColor(...PURPLE_MID);
      doc.rect(0, 0, PW, 1.2, "F");
      pageLogoLeft(doc, logoB64, 4);
      y = 22;
    }

    y = sectionBar(doc, `${addon.label}${addon.sub ? ` – ${addon.sub}` : ""}`, y, PURPLE_DARK);

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
    y += 5;
  });

  // ── Beneficiary / Dependent Details ───────────────────────────────────────
  if (dependents.length > 0) {
    if (y > 200) {
      doc.addPage();
      fillRect(doc, 0, 14, WHITE);
      doc.setFillColor(...PURPLE_MID);
      doc.rect(0, 0, PW, 1.2, "F");
      pageLogoLeft(doc, logoB64, 4);
      y = 22;
    }

    y = sectionBar(doc, "Beneficiary Details", y + 4);

    y = tHead(doc, [
      { label: "Name",          w: 55 },
      { label: "Relationship",  w: 30 },
      { label: "Date of Birth", w: 32 },
      { label: "Age",           w: 18, align: "right" },
      { label: "Cover Benefit", w: 47, align: "right" },
    ], y);

    dependents.forEach((dep, i) => {
      if (y > 255) {
        doc.addPage();
        fillRect(doc, 0, 14, WHITE);
        pageLogoLeft(doc, logoB64, 4);
        y = 22;
      }

      const depName = [dep.firstName, dep.lastName].filter(Boolean).join(" ") || "—";
      const depType = dep.type === "spouse" ? "Spouse"
        : dep.type === "member" ? "Soc. Member"
        : "Child";

      let depAgeYears = null;
      let depAgeStr   = "—";
      if (dep.dob) {
        const [fy, fm, fd] = dep.dob.split("-").map(Number);
        const now = new Date();
        let a = now.getFullYear() - fy;
        if (now.getMonth() + 1 < fm || (now.getMonth() + 1 === fm && now.getDate() < fd)) a--;
        depAgeYears = a;
        depAgeStr   = `${a} yrs`;
      }

      let benefitStr = "Full cover";
      if (dep.type === "child" && depAgeYears !== null && coverAmount) {
        const childBen = getChildCoverAmount(coverAmount, depAgeYears);
        benefitStr = childBen > 0
          ? `${fmtCover(childBen)} (${getChildAgeBracket(depAgeYears)})`
          : "Not eligible";
      } else if (dep.type === "spouse") {
        benefitStr = fmtCover(coverAmount);
      } else if (dep.type === "member") {
        benefitStr = fmtCover(coverAmount);
      }

      y = tRow(doc, [
        { text: depName,         w: 55 },
        { text: depType,         w: 30 },
        { text: dep.dob || "—", w: 32 },
        { text: depAgeStr,       w: 18, align: "right" },
        { text: benefitStr,      w: 47, align: "right", bold: true },
      ], y, i % 2 === 0);
    });
    y += 4;
  }

  // ── Policyholder Details ───────────────────────────────────────────────────
  if (y > 210) {
    doc.addPage();
    fillRect(doc, 0, 14, WHITE);
    doc.setFillColor(...PURPLE_MID);
    doc.rect(0, 0, PW, 1.2, "F");
    pageLogoLeft(doc, logoB64, 4);
    y = 22;
  }

  y = sectionBar(doc, "Policyholder Details", y + 4);
  y = kvGrid(doc, [
    [
      { label: "Full Name",      value: fullName },
      { label: "Age at Inception", value: `${age} years` },
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

  // ── Full-width children photo strip ─────────────────────────────────────
  if (childrenStrip) {
    try { doc.addImage(childrenStrip, "JPEG", 0, 231, PW, 46); } catch { /* skip */ }
  } else { fillRect(doc, 231, 46, PURPLE_DARK); }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 4 — TERMS & REMUNERATION
  // ═══════════════════════════════════════════════════════════════════════════
  doc.addPage();

  fillRect(doc, 0, 14, WHITE);
  doc.setFillColor(...PURPLE_MID);
  doc.rect(0, 0, PW, 1.2, "F");
  pageLogoLeft(doc, logoB64, 4);

  y = 16;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...BLACK);
  doc.text("IMPORTANT TERMS & CONDITIONS", L, y + 5);
  y += 13;

  const terms = [
    {
      head: "Waiting Period",
      body: `A waiting period of ${WAITING_PERIOD_MONTHS} months applies from the commencement date of this policy. No benefits will be payable for natural causes of death during this period. Where the Accidental Death benefit has been selected, that benefit is not subject to the waiting period.`,
    },
    {
      head: "Premium Changes",
      body: "Your monthly premium may increase in line with inflation or as a result of adverse claims experience. Mint Financial Services will give you thirty-one (31) days' written notice of any premium or benefit change. Continued payment after notice constitutes acceptance.",
    },
    {
      head: "Claim Submission",
      body: "All claims must be submitted within six (6) months of the date of the insured event. Required documentation includes a certified copy of the death certificate, the ID documents of the deceased and the claimant, the completed Mint claim form, and any other documents requested by the insurer.",
    },
    {
      head: "Non-Disclosure",
      body: "Do not sign any blank or partially completed claim forms. Failure to disclose any material information — including pre-existing health conditions — may result in a claim being repudiated. All information you provide must be complete, accurate, and truthful.",
    },
    {
      head: "Lapse & Reinstatement",
      body: "Should premiums not be received within the thirty (30) day grace period, this policy will lapse and no benefits will be payable. Reinstatement of a lapsed policy is subject to Mint's underwriting approval and may result in a new waiting period being applied.",
    },
    {
      head: "Cancellation",
      body: "You may cancel this policy at any time by providing written notice to Mint Financial Services. No refund of premiums will be made. If you wish to cancel your policy, please contact us at support@mymint.co.za.",
    },
    {
      head: "Complaints",
      body: "If you are dissatisfied with any aspect of our service, please contact us at support@mymint.co.za. If your complaint is not resolved to your satisfaction, you may escalate it to the FSCA (fsca.co.za) or the Ombud for Financial Services Providers: 0860 663 274.",
    },
  ];

  terms.forEach(({ head, body }) => {
    if (y > 245) {
      doc.addPage();
      fillRect(doc, 0, 14, WHITE);
      doc.setFillColor(...PURPLE_MID);
      doc.rect(0, 0, PW, 1.2, "F");
      pageLogoLeft(doc, logoB64, 4);
      y = 22;
    }

    // Yellow-style section label (purple bar)
    y = sectionBar(doc, head, y, PURPLE_MID);

    const lines = doc.splitTextToSize(body, TW);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(30, 20, 50);
    doc.text(lines, L, y);
    y += lines.length * 5 + 5;
  });

  // ── Remuneration Structure (like Capital Legacy p.4) ───────────────────────
  if (y > 220) {
    doc.addPage();
    fillRect(doc, 0, 14, WHITE);
    doc.setFillColor(...PURPLE_MID);
    doc.rect(0, 0, PW, 1.2, "F");
    pageLogoLeft(doc, logoB64, 4);
    y = 22;
  }

  y = sectionBar(doc, "Remuneration Structure", y + 4, PURPLE_DARK);

  y = tHead(doc, [
    { label: "Category", w: 148 },
    { label: "Value",    w: 44, align: "right" },
  ], y);

  const remuRows = [
    {
      cat: "Your referring intermediary will receive initial remuneration for the first twelve months, payable upfront on inception of the cover and recoverable should the plan lapse.",
      val: "Per FAIS schedule",
    },
    {
      cat: "Ongoing administration and intermediary fees payable to Mint Financial Services (Pty) Ltd each month from the plan.",
      val: "Included in premium",
    },
    {
      cat: "Please note that these amounts exclude VAT. Future premium increases on your plan may attract additional commission.",
      val: "",
    },
  ];

  remuRows.forEach((r, i) => {
    if (y > 265) { doc.addPage(); y = 20; }
    const lines  = doc.splitTextToSize(r.cat, 144);
    const rowH   = Math.max(9, lines.length * 5 + 5);
    if (i % 2 === 0) {
      fillRect(doc, y - 4.5, rowH, PURPLE_LIGHT);
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...BLACK);
    doc.text(lines, L, y);
    if (r.val) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text(r.val, R, y, { align: "right" });
    }
    hr(doc, y + rowH - 2);
    y += rowH + 2;
  });

  // ── Full-width sunset photo strip ────────────────────────────────────────
  if (sunsetStrip) {
    try { doc.addImage(sunsetStrip, "JPEG", 0, 231, PW, 46); } catch { /* skip */ }
  } else { fillRect(doc, 231, 46, PURPLE_DARK); }

  // ── FAIS Disclosure ────────────────────────────────────────────────────────
  doc.addPage();
  fillRect(doc, 0, 14, WHITE);
  doc.setFillColor(...PURPLE_MID);
  doc.rect(0, 0, PW, 1.2, "F");
  pageLogoLeft(doc, logoB64, 4);

  y = 16;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...BLACK);
  doc.text("FAIS DISCLOSURE NOTICE", L, y + 5);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(...GREY);
  doc.text("Disclosures required in terms of the Financial Advisory and Intermediary Services Act 37 of 2002", L, y + 11);
  y += 18;

  const faisBlocks = [
    {
      head: "The Administrator / Binder Holder",
      body: `Name: Mint Financial Services (Pty) Ltd\nPhysical Address: Sandton, Johannesburg, 2196\nPostal Address: PO Box 786015, Sandton, 2146\nTelephone: support@mymint.co.za\nWebsite: www.mymint.co.za\nFSP Licence Number: ${FSP_NUMBER}  |  Category: Long-term Insurance: Category A, B1, B1-A, B2, B2-A, C`,
    },
    {
      head: "The Financial Services Provider Rendering Advice",
      body: `Name: Mint Financial Services (Pty) Ltd\nFSP Licence: ${FSP_NUMBER}\nMint Financial Services is an Authorised Financial Services Provider. Products are offered subject to the FAIS Act and the Long-term Insurance Act.`,
    },
    {
      head: "Information About the Insurer",
      body: `Name: GuardRisk Life Limited ("GuardRisk")\nRegistration Number: 1999/013922/06\nFAIS Number: FSP 76\nPhysical Address: The MARC, Tower 2, 129 Rivonia Road, Sandton, 2196\nPostal Address: PO Box 786015, Sandton, 2146\nWebsite: www.guardrisk.co.za\nGuardRisk is an Authorised Financial Services Provider in terms of FAIS (FSP 76). GuardRisk Life Limited has a Professional Indemnity Cover and a Fidelity Guarantee Cover in place. Conflict of Interest: GuardRisk Life Limited has a conflict of interest management policy in place and is available to clients on the website.`,
    },
    {
      head: "Conflict of Interest Policy",
      body: `You can request a copy of our Conflict of Interest Policy on our website www.mymint.co.za.`,
    },
    {
      head: "Guarantees and Undertakings",
      body: `Both the Administrator and Insurer carry Professional Indemnity and Fidelity Guarantee Insurance. Without in any way limiting and subject to the other provisions of the services agreement/mandate, the Financial Service Providers accept responsibility for the lawful actions of their Representatives (as defined in FAIS) in rendering Financial Services within the course and scope of their employment.`,
    },
    {
      head: "Warnings",
      body: "Do not sign any blank or partially completed claim forms. Complete all forms in ink or electronically. Keep notes of what is said to you and all documents handed to you. Do not be pressured to purchase this product. If you fail to disclose facts relevant to your insurance, this may influence the assessment of a claim by the Insurer.",
    },
    {
      head: "Other Matters of Importance",
      body: `• You will be informed of any material changes to information about the Administrator and/or Insurer.\n• If any information in this Policy Schedule is incorrect and was given to you orally, this disclosure notice serves to provide you with the information in writing.\n• You have a thirty-one (31) day cooling-off period from the date of receipt of the plan within which you may cancel your plan in writing at no cost.\n• Cover will cease upon cancellation of the plan.\n• If we fail to resolve your complaint satisfactorily, you may submit it to the Ombud for Long-term Insurance.\n• You will always be given a reason for the repudiation of a claim.\n• Please read this plan schedule in conjunction with the plan terms and conditions included with this communication.`,
    },
    {
      head: "National Financial Ombud Scheme",
      body: `For claims/service-related matters:\nAddress: Claremont Central Building, 6th Floor, 6 Vineyard Road, Claremont, 7708\nEmail: info@nfosa.co.za  |  Website: www.nfosa.co.za`,
    },
    {
      head: "Financial Sector Conduct Authority (FSCA)",
      body: `PO Box 35655, Menlo Park, 0102\nTelephone: +27 12 428 8000\nEmail: info@fsca.co.za`,
    },
    {
      head: "Registrar of Long-term Insurance",
      body: `PO Box 35655, Menlo Park, 0102\nTelephone: +27 12 428 8000\nEmail: info@fsca.co.za`,
    },
  ];

  faisBlocks.forEach(({ head, body }) => {
    if (y > 250) {
      doc.addPage();
      fillRect(doc, 0, 14, WHITE);
      doc.setFillColor(...PURPLE_MID);
      doc.rect(0, 0, PW, 1.2, "F");
      pageLogoLeft(doc, logoB64, 4);
      y = 22;
    }
    y = sectionBar(doc, head, y, PURPLE_MID);
    const lines = doc.splitTextToSize(body, TW);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(30, 20, 50);
    doc.text(lines, L, y);
    y += lines.length * 5 + 4;
  });

  // ── Full-width forest photo strip (last FAIS page, if space) ────────────
  if (y < 230 && forestStrip) {
    try { doc.addImage(forestStrip, "JPEG", 0, 231, PW, 46); } catch { /* skip */ }
  } else if (y < 230) {
    fillRect(doc, 231, 46, PURPLE_DARK);
  }

  // ── Footers on all pages ───────────────────────────────────────────────────
  addFooters(doc, fullName, policyNo, dateStr, logoB64);

  // ── Save ──────────────────────────────────────────────────────────────────
  const safe = fullName.replace(/\s+/g, "_") || "Client";
  doc.save(`Mint_Policy_Schedule_${safe}_${policyNo}.pdf`);

  return { policyNo, dateStr };
}
