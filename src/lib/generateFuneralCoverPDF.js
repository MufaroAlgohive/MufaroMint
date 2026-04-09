import { jsPDF } from "jspdf";

// ─── Colours ─────────────────────────────────────────────────────────────────
const VIOLET  = [107, 33, 168];
const BLACK   = [20, 20, 20];
const GREY    = [120, 120, 120];
const LGREY   = [200, 200, 200];
const WHITE   = [255, 255, 255];

// ─── Layout ──────────────────────────────────────────────────────────────────
const L  = 20;
const R  = 190;
const PW = 210;
const PH = 297;
const TW = R - L;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtR(n) {
  return `R ${Number(n).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtCover(n) {
  return `R ${Number(n).toLocaleString("en-ZA")}`;
}
function todayStr() {
  return new Date().toLocaleDateString("en-ZA", { day: "2-digit", month: "long", year: "numeric" });
}
function policyRef() {
  return `MNT${Math.floor(100000 + Math.random() * 899999)}`;
}

async function imgToBase64(url) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror  = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// ─── Drawing helpers ─────────────────────────────────────────────────────────
function hRule(doc, y, x1 = L, x2 = R, lw = 0.25) {
  doc.setDrawColor(...LGREY);
  doc.setLineWidth(lw);
  doc.line(x1, y, x2, y);
}
function violetRule(doc, y) {
  doc.setDrawColor(...VIOLET);
  doc.setLineWidth(0.6);
  doc.line(L, y, R, y);
}

function secHead(doc, text, y) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...VIOLET);
  doc.text(text, L, y);
  violetRule(doc, y + 1.5);
  return y + 7;
}

function subHead(doc, text, y) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...BLACK);
  doc.text(text, L, y);
  hRule(doc, y + 1.5);
  return y + 6;
}

function tHead(doc, cols, y) {
  let x = L;
  cols.forEach(({ label, w, align }) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...VIOLET);
    doc.text(label, align === "right" ? x + w : x, y, { align: align || "left" });
    x += w;
  });
  hRule(doc, y + 1.5);
  return y + 7;
}

function tRow(doc, cols, y, shade = false) {
  if (shade) {
    doc.setFillColor(248, 246, 255);
    doc.rect(L, y - 4, TW, 6, "F");
  }
  let x = L;
  cols.forEach(({ text, w, align, bold }) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...BLACK);
    doc.text(String(text ?? ""), align === "right" ? x + w : x, y, { align: align || "left" });
    x += w;
  });
  hRule(doc, y + 2);
  return y + 8;
}

function detailGrid(doc, rows, y) {
  const colW = TW / 2;
  rows.forEach((pair, pi) => {
    const rowY = y + pi * 10;
    pair.forEach(({ label, value }, ci) => {
      const x = L + ci * colW;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...GREY);
      doc.text(label, x, rowY);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...BLACK);
      doc.text(String(value ?? ""), x, rowY + 4.5);
    });
  });
  return y + rows.length * 10 + 2;
}

function addFooters(doc, fullName, policyNo, dateStr, logoB64) {
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    hRule(doc, PH - 20, L, R, 0.4);

    // Small logo in footer if available
    if (logoB64) {
      try {
        doc.addImage(logoB64, "PNG", L, PH - 18, 22, 2.8);
      } catch { /* skip */ }
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...GREY);
    doc.text(
      `Policy Schedule – ${fullName}  |  ${policyNo}  |  ${dateStr}  |  Page ${i} of ${n}`,
      PW / 2, PH - 13, { align: "center" }
    );
    doc.text(
      "support@mintapp.co.za  |  Mint Financial Services (Pty) Ltd  |  FSP No. 55118",
      PW / 2, PH - 8, { align: "center" }
    );
  }
}

// ─── Main (async) ─────────────────────────────────────────────────────────────
export async function generateFuneralCoverPDF({
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
  // Load assets in parallel
  const [logoB64, sigB64] = await Promise.all([
    imgToBase64("/assets/mint-logo.png"),
    imgToBase64("/assets/ceo-signature.png"),
  ]);

  const doc      = new jsPDF({ unit: "mm", format: "a4" });
  const policyNo = policyRef();
  const fullName = `${firstName} ${lastName}`.trim();
  const dateStr  = todayStr();
  const planFull = `${planLabel} Funeral Plan${societySize ? ` (${societySize})` : ""}`;

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 1 – COVER LETTER
  // ═══════════════════════════════════════════════════════════════════════════

  // Mint logo – top left
  if (logoB64) {
    try {
      // PNG is 9357×1188 → ratio 7.87:1 → at 55mm wide → ~7mm tall
      doc.addImage(logoB64, "PNG", L, 10, 55, 7);
    } catch { /* fallback to text */ }
  }
  // Wordmark fallback if image fails
  if (!logoB64) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(26);
    doc.setTextColor(...VIOLET);
    doc.text("mint", L, 22);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...GREY);
    doc.text("Invest. Protect. Grow.", L, 27);
  }

  // Policy number – left below logo
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...BLACK);
  doc.text(policyNo, L, 24);

  // Date + policyholder – right
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...BLACK);
  doc.text(dateStr.toUpperCase(), R, 13, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(fullName.toUpperCase(), R, 21, { align: "right" });

  hRule(doc, 30, L, R, 0.4);

  // Dear block
  let y = 40;
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
    `Thank you for choosing the Mint Funeral Plan, underwritten by a licensed South African Life Insurer (FSP No. 55118). ` +
    `Our funeral plan is designed to give your loved ones immediate financial support to cover all the costs associated with your funeral, ` +
    `without delay and without the burden of out-of-pocket expenses at an already difficult time.`,

    `Please read the enclosed information carefully and in conjunction with the policy terms and conditions that will have been ` +
    `attached to this communication.`,

    `Please advise us within thirty-one (31) days of this letter if any of the information in your Policy Schedule is incorrect or ` +
    `incomplete. This is in your best interest as incorrect or incomplete information could impact your claim against the plan benefits.`,

    `Please also advise us, at any time, when there are changes to your personal information or if you wish to change your ` +
    `beneficiary nominations.`,

    `We thank you for your business and trust in us to deliver.`,
  ];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);
  paras.forEach(p => {
    const lines = doc.splitTextToSize(p, TW);
    doc.text(lines, L, y);
    y += lines.length * 5.2 + 5;
  });

  y += 2;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...BLACK);
  doc.text("Kind regards,", L, y);
  y += 6;

  // CEO signature image
  if (sigB64) {
    try {
      // 640×640 square → show at 35×35mm
      doc.addImage(sigB64, "PNG", L, y, 35, 35);
      y += 38;
    } catch { y += 6; }
  } else {
    y += 6;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BLACK);
  doc.text("Lonwabo", L, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...GREY);
  doc.text("Chief Executive Officer", L, y);
  y += 4;
  doc.text("Mint Financial Services (Pty) Ltd", L, y);
  y += 10;

  // "underwritten by" box
  doc.setDrawColor(...LGREY);
  doc.setLineWidth(0.4);
  doc.roundedRect(R - 60, y - 6, 60, 18, 2, 2, "D");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...GREY);
  doc.text("underwritten by", R - 30, y, { align: "center" });
  if (logoB64) {
    try { doc.addImage(logoB64, "PNG", R - 52, y + 3, 44, 5.6); } catch { /* skip */ }
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...VIOLET);
    doc.text("mint", R - 30, y + 8, { align: "center" });
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...GREY);
  doc.text("FSP No. 55118", R - 30, y + 13, { align: "center" });

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 2 – PLAN SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════
  doc.addPage();
  y = 20;

  // Page logo top-right
  if (logoB64) {
    try { doc.addImage(logoB64, "PNG", R - 40, 10, 40, 5.1); } catch { /* skip */ }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...BLACK);
  doc.text("SUMMARY OF COVER SELECTION", L, y);
  y += 10;

  y = subHead(doc, "PLAN SUMMARY", y);
  const sumCols = [
    { label: "Product Name",     w: 100 },
    { label: "Monthly Premium",  w: 45, align: "right" },
    { label: "Cover Amount",     w: 45, align: "right" },
  ];
  y = tHead(doc, sumCols, y);
  y = tRow(doc, [
    { text: planFull,               w: 100 },
    { text: fmtR(basePremium),      w: 45, align: "right" },
    { text: fmtCover(coverAmount),  w: 45, align: "right" },
  ], y, false);
  addonDetails.forEach((a, i) => {
    y = tRow(doc, [
      { text: `${a.label}${a.sub ? ` – ${a.sub}` : ""}`, w: 100 },
      { text: fmtR(a.premium),   w: 45, align: "right" },
      { text: "Included",        w: 45, align: "right" },
    ], y, i % 2 === 0);
  });

  // Total
  doc.setDrawColor(...VIOLET);
  doc.setLineWidth(0.5);
  doc.line(L, y - 1, R, y - 1);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...BLACK);
  doc.text("Total", L, y + 3);
  doc.setTextColor(...VIOLET);
  doc.text(fmtR(totalMonthly), R, y + 3, { align: "right" });
  y += 14;

  y = subHead(doc, "COVER BENEFITS", y);
  y = tHead(doc, [
    { label: "Benefit",  w: 130 },
    { label: "Amount",   w: 60, align: "right" },
  ], y);
  const benefits = [
    { name: "Funeral Cover – Main Member", value: fmtCover(coverAmount) },
    ...addonDetails.map(a => ({ name: `${a.label}${a.sub ? ` (${a.sub})` : ""}`, value: "Included" })),
  ];
  benefits.forEach((b, i) => {
    y = tRow(doc, [
      { text: b.name,  w: 130 },
      { text: b.value, w: 60, align: "right" },
    ], y, i % 2 === 0);
  });

  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...BLACK);
  const debitLine = doc.splitTextToSize(
    `Your total premium of ${fmtR(totalMonthly)} will be debited from your bank account on the ${deductionDate} of every month. ` +
    `The reference on your bank statement will be: MINT-INS ${policyNo}.`,
    TW
  );
  doc.text(debitLine, L, y);

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 3 – BENEFIT DETAILS
  // ═══════════════════════════════════════════════════════════════════════════
  doc.addPage();
  y = 20;

  if (logoB64) {
    try { doc.addImage(logoB64, "PNG", R - 40, 10, 40, 5.1); } catch { /* skip */ }
  }

  y = secHead(doc, "BENEFIT DETAILS", y);
  y += 2;

  y = subHead(doc, planFull, y);
  y = detailGrid(doc, [
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
  ], y);
  y += 2;
  y = tHead(doc, [
    { label: "Monthly Premium", w: 47 },
    { label: "Cover Amount",    w: 47 },
    { label: "Plan Type",       w: 50 },
    { label: "Society Size",    w: 46 },
  ], y);
  y = tRow(doc, [
    { text: fmtR(basePremium),     w: 47 },
    { text: fmtCover(coverAmount), w: 47 },
    { text: planLabel,             w: 50 },
    { text: societySize || "N/A",  w: 46 },
  ], y);
  y += 6;

  addonDetails.forEach(a => {
    if (y > 235) { doc.addPage(); y = 20; }
    y = subHead(doc, `${a.label}${a.sub ? ` – ${a.sub}` : ""}`, y);
    y = detailGrid(doc, [
      [
        { label: "Life Assured",    value: fullName },
        { label: "Policy Term",     value: "Whole of Life" },
      ],
      [
        { label: "Benefit Type",    value: "Once Off Payout" },
        { label: "Monthly Premium", value: fmtR(a.premium) },
      ],
    ], y);
    y += 4;
  });

  if (y > 210) { doc.addPage(); y = 20; }
  y += 4;
  y = secHead(doc, "POLICYHOLDER DETAILS", y);
  y += 2;
  y = detailGrid(doc, [
    [
      { label: "Full Name",       value: fullName },
      { label: "Age",             value: `${age} years` },
    ],
    [
      { label: "Deduction Date",  value: `${deductionDate} of each month` },
      { label: "Bank Reference",  value: `MINT-INS ${policyNo}` },
    ],
    [
      { label: "Policy Number",   value: policyNo },
      { label: "Schedule Date",   value: dateStr },
    ],
  ], y);

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 4 – TERMS & DISCLOSURES
  // ═══════════════════════════════════════════════════════════════════════════
  doc.addPage();
  y = 20;

  if (logoB64) {
    try { doc.addImage(logoB64, "PNG", R - 40, 10, 40, 5.1); } catch { /* skip */ }
  }

  y = secHead(doc, "IMPORTANT TERMS & CONDITIONS", y);
  y += 2;

  [
    {
      head: "Waiting Period",
      body: "A waiting period of six (6) months applies to all claims from the commencement date of this policy. No claims will be paid during the waiting period, except in the case of accidental death where the Accidental Death benefit has been selected.",
    },
    {
      head: "Premium Changes",
      body: "Benefits and premium rates may change from time to time. You will be given thirty-one (31) days' notice of any such changes. Your continued payment of premiums after notice constitutes acceptance of the change.",
    },
    {
      head: "Claim Submission",
      body: "All claims must be submitted within six (6) months of the insured event. Claims submitted after this period may be declined. Required documentation includes a certified copy of the death certificate, identity documents, and a completed claim form.",
    },
    {
      head: "Lapse & Reinstatement",
      body: "If premiums are not paid within the grace period of thirty (30) days, this policy will lapse and all benefits will cease. Reinstatement is subject to approval and may require a new waiting period.",
    },
    {
      head: "Complaints",
      body: "Should you have any complaint regarding this policy, please contact Mint Financial Services at support@mintapp.co.za. If unresolved, you may escalate to the FSCA or the Ombud for Financial Services Providers.",
    },
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
    doc.setTextColor(50, 50, 50);
    doc.text(lines, L, y);
    y += lines.length * 5 + 6;
  });

  y += 4;
  y = secHead(doc, "REMUNERATION DISCLOSURE", y);
  y += 2;
  y = tHead(doc, [
    { label: "Category", w: 140 },
    { label: "Value",    w: 50, align: "right" },
  ], y);
  [
    { cat: "Intermediary remuneration (first 12 months, payable upfront and recoverable on lapse)", val: "Per FAIS schedule" },
    { cat: "Ongoing administration fee payable to Mint Financial Services (Pty) Ltd", val: "Included in premium" },
    { cat: "These amounts exclude VAT. Future premium increases may attract commission.", val: "" },
  ].forEach((r, i) => {
    if (y > 265) { doc.addPage(); y = 20; }
    const lines = doc.splitTextToSize(r.cat, 136);
    const rowH = Math.max(8, lines.length * 5 + 4);
    if (i % 2 === 0) {
      doc.setFillColor(248, 246, 255);
      doc.rect(L, y - 4, TW, rowH, "F");
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...BLACK);
    doc.text(lines, L, y);
    if (r.val) {
      doc.setFont("helvetica", "bold");
      doc.text(r.val, R, y, { align: "right" });
    }
    hRule(doc, y + rowH - 2);
    y += rowH + 2;
  });

  // ─── Footers ──────────────────────────────────────────────────────────────
  addFooters(doc, fullName, policyNo, dateStr, logoB64);

  // ─── Save ─────────────────────────────────────────────────────────────────
  const safe = fullName.replace(/\s+/g, "_") || "Client";
  doc.save(`Mint_Policy_Schedule_${safe}_${policyNo}.pdf`);

  return { policyNo, dateStr };
}
