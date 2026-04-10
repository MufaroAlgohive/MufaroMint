import {
  getChildCoverAmount,
  getChildAgeBracket,
  FSP_NUMBER,
  WAITING_PERIOD_MONTHS,
} from "./funeralCoverRates";

function policyRef() {
  return `MNT${Math.floor(100000 + Math.random() * 899999)}`;
}
function todayStr() {
  return new Date()
    .toLocaleDateString("en-ZA", { day: "2-digit", month: "long", year: "numeric" })
    .toUpperCase();
}
function fmtR(n) {
  return `R\u00a0${Number(n).toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
function fmtCover(n) {
  return `R\u00a0${Number(n).toLocaleString("en-ZA")}`;
}
function depAge(dob) {
  if (!dob) return null;
  const parts = dob.split("-").map(Number);
  if (parts.length !== 3) return null;
  const [fy, fm, fd] = parts;
  const now = new Date();
  let a = now.getFullYear() - fy;
  if (now.getMonth() + 1 < fm || (now.getMonth() + 1 === fm && now.getDate() < fd)) a--;
  return a;
}

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
  dependents = [],
}) {
  const policyNo = policyRef();
  const dateStr  = todayStr();
  const fullName = `${firstName} ${lastName}`.trim();
  const planFull = `${planLabel} Funeral Plan${societySize ? ` (${societySize})` : ""}`;
  const spouseDep  = dependents.find(d => d.type === "spouse");
  const childDeps  = dependents.filter(d => d.type === "child");

  const BASE        = window.location.origin;
  const LOGO        = `${BASE}/assets/mint-logo.png`;
  const SIG         = `${BASE}/assets/ceo-signature.png`;
  const IMG_HANDS   = `${BASE}/assets/images/hands-hero.jpeg`;
  const IMG_FAMILY  = `${BASE}/assets/images/family-hero.jpeg`;
  const IMG_KIDS    = `${BASE}/assets/images/children-hero.jpeg`;
  const IMG_SUNSET  = `${BASE}/assets/images/sunset-family.jpeg`;
  const IMG_FOREST  = `${BASE}/assets/images/forest-family.jpeg`;

  // ── Layout constants ──────────────────────────────────────────────────────
  const HDR_BG   = "#3b0b7a";
  const MID_BG   = "#5b21b6";
  const LIGHT_BG = "#ede9fe";
  const P        = "0 14mm";   // horizontal padding shorthand

  // ── Shared HTML helpers ───────────────────────────────────────────────────

  function hdr(rightSlot = "") {
    return `
    <div style="flex-shrink:0;background:${HDR_BG};height:16mm;padding:${P};
                display:flex;align-items:center;justify-content:space-between;">
      <img src="${LOGO}" alt="mint"
           style="height:7.5mm;filter:brightness(0) invert(1);object-fit:contain;display:block;">
      ${rightSlot ? `<div style="text-align:right;color:white;">${rightSlot}</div>` : ""}
    </div>`;
  }

  function strip(src, pos = "center 35%") {
    return `
    <div style="flex-shrink:0;height:55mm;overflow:hidden;">
      <img src="${src}" alt=""
           style="width:100%;height:100%;object-fit:cover;object-position:${pos};display:block;">
    </div>`;
  }

  function ftr(pageLabel) {
    return `
    <div style="flex-shrink:0;background:${HDR_BG};padding:3mm 14mm;min-height:14mm;
                display:flex;flex-direction:column;justify-content:center;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span style="color:white;font-size:10pt;font-weight:bold;letter-spacing:1px;">mint</span>
        <span style="color:#c4b5fd;font-size:5.5pt;">${pageLabel}</span>
        <span style="color:#c4b5fd;font-size:5.5pt;">support@mymint.co.za&nbsp;|&nbsp;FSP No.&nbsp;${FSP_NUMBER}</span>
      </div>
      <div style="color:#c4b5fd;font-size:5pt;text-align:center;margin-top:1.5mm;">
        Policy Schedule — ${fullName}&nbsp;|&nbsp;${policyNo}&nbsp;|&nbsp;${dateStr}
      </div>
    </div>`;
  }

  function sbar(label, dark = false) {
    return `<div style="background:${dark ? HDR_BG : MID_BG};color:white;font-size:7.5pt;
                        font-weight:bold;padding:4px 8px;margin:4mm 0 3mm;
                        text-transform:uppercase;">${label}</div>`;
  }

  function kv(pairs) {
    const cells = pairs.map(([lbl, val]) => `
      <div>
        <div style="font-size:6.5pt;color:#9ca3af;margin-bottom:1px;">${lbl}</div>
        <div style="font-size:8.5pt;font-weight:bold;color:#111;
                    border-bottom:0.5px solid #e5e7eb;padding-bottom:1.5px;">${val}</div>
      </div>`).join("");
    return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:2.5mm 4mm;margin:2mm 0 4mm;">${cells}</div>`;
  }

  function tbl(headers, rows, footRow = null) {
    const thHtml = headers.map(h =>
      `<th style="background:#f5f3ff;color:#6b7280;font-size:7pt;font-weight:bold;
                  padding:4px 6px;border-bottom:1px solid #e5e7eb;
                  text-align:${h.right ? "right" : "left"};">${h.label}</th>`
    ).join("");

    const tdRow = row => row.map((cell, i) => {
      const right = headers[i]?.right;
      const bold  = headers[i]?.bold || right;
      const text  = typeof cell === "object" ? cell.text : cell;
      return `<td style="padding:4px 6px;border-bottom:1px solid #f3f4f6;
                         text-align:${right ? "right" : "left"};
                         ${bold ? "font-weight:bold;" : ""}">${text}</td>`;
    }).join("");

    const tbodyHtml = rows.map((row, i) =>
      `<tr style="${i % 2 !== 0 ? "background:#faf9ff;" : ""}">${tdRow(row)}</tr>`
    ).join("");

    const tfootHtml = footRow
      ? `<tfoot><tr>${footRow.map((c, i) =>
          `<td style="background:${MID_BG};color:white;font-weight:bold;padding:5px 6px;
                      text-align:${headers[i]?.right ? "right" : "left"};">${c}</td>`
        ).join("")}</tr></tfoot>`
      : "";

    return `<table style="width:100%;border-collapse:collapse;font-size:8pt;margin-bottom:3mm;">
      <thead><tr>${thHtml}</tr></thead>
      <tbody>${tbodyHtml}</tbody>
      ${tfootHtml}
    </table>`;
  }

  function notice(html) {
    return `<div style="background:${LIGHT_BG};border-left:3px solid ${MID_BG};
                        padding:5px 8px;font-size:7.5pt;color:#3b0b7a;margin:3mm 0;">
      ${html}</div>`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 1 — COVER LETTER
  // ═══════════════════════════════════════════════════════════════════════════
  const page1 = `
  <div style="width:210mm;height:297mm;overflow:hidden;display:flex;
              flex-direction:column;background:white;">
    ${hdr(`
      <div style="font-size:13pt;font-weight:bold;letter-spacing:1px;">POLICY SCHEDULE</div>
      <div style="font-size:7pt;color:#c4b5fd;margin-top:2px;">${dateStr}</div>
    `)}
    <div style="flex-shrink:0;background:${MID_BG};padding:5px 14mm;
                display:flex;justify-content:space-between;color:white;
                font-size:8.5pt;font-weight:bold;">
      <span>${policyNo}</span><span>${fullName.toUpperCase()}</span>
    </div>
    <div style="flex-shrink:0;background:${LIGHT_BG};padding:5px 14mm;
                display:flex;justify-content:space-between;font-size:7.5pt;color:#374151;">
      <span><b>PLAN TYPE</b> — ${planFull}</span>
      <span>Mint Financial Services (Pty) Ltd &nbsp;—&nbsp; FSP No.&nbsp;${FSP_NUMBER}</span>
    </div>

    <div style="flex:1;overflow:hidden;padding:6mm 14mm 4mm;
                display:flex;flex-direction:column;font-size:8.5pt;color:#1a1a1a;line-height:1.55;">
      <div style="margin-bottom:3mm;">Dear ${fullName},</div>
      <div style="font-size:10.5pt;font-weight:bold;color:${HDR_BG};margin-bottom:4mm;">Welcome to Mint.</div>

      <div style="margin-bottom:3.5mm;">Thank you for choosing the Mint Funeral Plan. We are honoured to be your trusted financial services partner and are committed to ensuring that your loved ones are cared for at their most vulnerable time.</div>

      <div style="margin-bottom:3.5mm;">Your Mint Funeral Plan provides your family with an immediate lump-sum payout upon a valid claim — covering funeral costs and providing financial relief when it matters most. Your policy is underwritten by a licensed South African Life Insurer in terms of the Long-term Insurance Act and the Financial Advisory and Intermediary Services Act (FAIS).</div>

      <div style="margin-bottom:3.5mm;">Please read the enclosed Policy Schedule and attached terms carefully. If any information is incorrect, notify us in writing within <b>thirty-one (31) days</b>. Please also advise us of any changes to your personal information or beneficiary nominations at any time.</div>

      <div style="margin-bottom:3.5mm;">A waiting period of <b>${WAITING_PERIOD_MONTHS} months</b> applies from the commencement date. No benefits will be paid for natural causes of death during this period. Should you have any questions, contact our client support team at <b>support@mymint.co.za</b>.</div>

      <div style="margin-top:auto;display:flex;justify-content:space-between;align-items:flex-end;">
        <div>
          <div style="margin-bottom:3mm;font-size:8pt;">Kind regards,</div>
          <img src="${SIG}" alt="signature"
               style="height:18mm;margin-bottom:2mm;display:block;object-fit:contain;">
          <div style="font-size:9pt;font-weight:bold;margin-bottom:1px;">Lonwabo</div>
          <div style="font-size:7.5pt;color:#6b7280;">Chief Executive Officer</div>
          <div style="font-size:7.5pt;color:#6b7280;">Mint Financial Services (Pty) Ltd</div>
        </div>
        <div style="border:1px solid #e5e7eb;border-radius:4px;overflow:hidden;
                    width:60mm;flex-shrink:0;margin-bottom:2mm;">
          <div style="background:${HDR_BG};color:white;font-size:6.5pt;
                      text-align:center;padding:4px 0;">underwritten by</div>
          <div style="text-align:center;font-size:12pt;font-weight:bold;
                      color:#d97706;padding:5px 0 2px;">GuardRisk</div>
          <div style="text-align:center;font-size:6.5pt;color:#6b7280;
                      padding-bottom:6px;">Life Ltd &nbsp;—&nbsp; FSP 76</div>
        </div>
      </div>
    </div>

    ${strip(IMG_HANDS)}
    ${ftr("Page 1")}
  </div>`;

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 2 — PLAN SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════
  const summaryRows = [
    [planFull, `${fmtR(basePremium)}&nbsp;pm`, fmtCover(coverAmount)],
    ...addonDetails.map(a => [
      `${a.label}${a.sub ? ` – ${a.sub}` : ""}`,
      `${fmtR(a.premium)}&nbsp;pm`,
      "Optional benefit",
    ]),
  ];

  const benefitRows = [
    [`Funeral Cover – Main Member (${planLabel})`, fmtCover(coverAmount)],
  ];
  if (spouseDep)
    benefitRows.push(["Spouse Funeral Cover", fmtCover(coverAmount)]);
  if (childDeps.length > 0)
    benefitRows.push([
      `Children Funeral Cover (${childDeps.length} child${childDeps.length > 1 ? "ren" : ""})`,
      "Per age bracket",
    ]);
  addonDetails.forEach(a =>
    benefitRows.push([
      `${a.label}${a.sub ? ` (${a.sub})` : ""}`,
      `${fmtR(a.premium)}&nbsp;pm`,
    ])
  );

  const page2 = `
  <div style="width:210mm;height:297mm;overflow:hidden;display:flex;
              flex-direction:column;background:white;">
    ${hdr(`<div style="font-size:9pt;font-weight:bold;color:white;letter-spacing:0.5px;">POLICY SUMMARY</div>`)}
    <div style="flex:1;overflow:hidden;padding:6mm 14mm 4mm;
                font-size:8.5pt;color:#1a1a1a;line-height:1.5;">
      <div style="font-size:11pt;font-weight:bold;margin-bottom:4mm;">
        SUMMARY OF PRODUCT AND SERVICE SELECTION</div>

      ${sbar("Plan Summary")}
      ${tbl(
        [
          { label: "Product Name" },
          { label: "Monthly Premium", right: true },
          { label: "Plan Value",      right: true },
        ],
        summaryRows,
        ["Total", `${fmtR(totalMonthly)}&nbsp;pm`, ""]
      )}

      ${sbar("Principal Life Plan Benefits")}
      ${tbl(
        [{ label: "Benefit Name" }, { label: "Plan Value", right: true }],
        benefitRows
      )}

      ${notice(`Your total premium of <b>${fmtR(totalMonthly)} per month</b> will be debited on
        the <b>${deductionDate}</b> of every month. Bank statement reference:
        <b>MINT-INS&nbsp;${policyNo}</b>.`)}

      <div style="font-style:italic;font-size:7pt;color:#6b7280;margin-top:2mm;">
        A waiting period of ${WAITING_PERIOD_MONTHS} months applies from commencement.
        No benefit is payable for natural causes of death during this period.
      </div>
    </div>
    ${strip(IMG_FAMILY)}
    ${ftr("Page 2")}
  </div>`;

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 3 — BENEFIT DETAILS + BENEFICIARIES
  // ═══════════════════════════════════════════════════════════════════════════
  const addonSections = addonDetails.map(a => `
    ${sbar(`${a.label}${a.sub ? ` – ${a.sub}` : ""}`, true)}
    ${kv([
      ["Life Assured",    fullName],
      ["Policy Term",     "Whole of Life"],
      ["Benefit Type",    "Once Off Payout"],
      ["Monthly Premium", fmtR(a.premium)],
    ])}`).join("");

  const depRows = dependents.map((dep, i) => {
    const depName = [dep.firstName, dep.lastName].filter(Boolean).join(" ") || "—";
    const depType = dep.type === "spouse" ? "Spouse"
      : dep.type === "member" ? "Soc. Member" : "Child";
    const ageYrs = depAge(dep.dob);
    const ageStr = ageYrs !== null ? `${ageYrs} yrs` : "—";
    let benefit = "Full cover";
    if (dep.type === "child" && ageYrs !== null && coverAmount) {
      const cb = getChildCoverAmount(coverAmount, ageYrs);
      benefit = cb > 0 ? `${fmtCover(cb)} (${getChildAgeBracket(ageYrs)})` : "Not eligible";
    } else if (dep.type === "spouse" || dep.type === "member") {
      benefit = fmtCover(coverAmount);
    }
    return [depName, depType, dep.dob || "—", ageStr, benefit];
  });

  const page3 = `
  <div style="width:210mm;height:297mm;overflow:hidden;display:flex;
              flex-direction:column;background:white;">
    ${hdr(`<div style="font-size:9pt;font-weight:bold;color:white;letter-spacing:0.5px;">BENEFIT DETAILS</div>`)}
    <div style="flex:1;overflow:hidden;padding:6mm 14mm 4mm;
                font-size:8.5pt;color:#1a1a1a;line-height:1.5;">
      <div style="font-size:11pt;font-weight:bold;margin-bottom:4mm;">BENEFIT DETAILS</div>

      ${sbar(planFull, true)}
      ${kv([
        ["Life Assured",       fullName],
        ["Commencement Date",  dateStr],
        ["Date of Birth / Age", `${age} years`],
        ["Policy Term",        "Whole of Life"],
        ["Age Band",           ageBand],
        ["Premium Increases",  "Not Guaranteed"],
        ["Monthly Premium",    fmtR(basePremium)],
        ["Cover Amount",       fmtCover(coverAmount)],
      ])}

      ${addonSections}

      ${dependents.length > 0 ? `
        ${sbar("Beneficiary Details")}
        ${tbl(
          [
            { label: "Name" },
            { label: "Relationship" },
            { label: "Date of Birth" },
            { label: "Age",           right: true },
            { label: "Cover Benefit", right: true },
          ],
          depRows
        )}` : ""}
    </div>
    ${strip(IMG_KIDS)}
    ${ftr("Page 3")}
  </div>`;

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 4 — POLICYHOLDER & PAYMENT DETAILS
  // ═══════════════════════════════════════════════════════════════════════════
  const payRows = [
    [planFull, `${fmtR(basePremium)}&nbsp;pm`],
    ...addonDetails.map(a => [
      `${a.label}${a.sub ? ` – ${a.sub}` : ""}`,
      `${fmtR(a.premium)}&nbsp;pm`,
    ]),
  ];

  const page4 = `
  <div style="width:210mm;height:297mm;overflow:hidden;display:flex;
              flex-direction:column;background:white;">
    ${hdr(`<div style="font-size:9pt;font-weight:bold;color:white;letter-spacing:0.5px;">POLICYHOLDER DETAILS</div>`)}
    <div style="flex:1;overflow:hidden;padding:6mm 14mm 4mm;
                font-size:8.5pt;color:#1a1a1a;line-height:1.5;">
      <div style="font-size:11pt;font-weight:bold;margin-bottom:4mm;">
        POLICYHOLDER &amp; PAYMENT DETAILS</div>

      ${sbar("Policyholder Details")}
      ${kv([
        ["Full Name",       fullName],
        ["Age at Inception", `${age} years`],
        ["Policy Number",   policyNo],
        ["Schedule Date",   dateStr],
        ["Deduction Date",  `${deductionDate} of each month`],
        ["Bank Reference",  `MINT-INS ${policyNo}`],
      ])}

      ${sbar("Premium Summary")}
      ${tbl(
        [{ label: "Description" }, { label: "Monthly Amount", right: true }],
        payRows,
        ["Total monthly premium", `${fmtR(totalMonthly)}&nbsp;pm`]
      )}

      ${notice(`<b>Important:</b> Ensure your bank account details remain current. Contact us at
        <b>support@mymint.co.za</b> to update your banking details at any time.`)}
    </div>
    ${strip(IMG_SUNSET)}
    ${ftr("Page 4")}
  </div>`;

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 5 — TERMS & CONDITIONS  (min-height, content flows freely)
  // ═══════════════════════════════════════════════════════════════════════════
  const termsBlocks = [
    {
      head: "Waiting Period",
      body: `A waiting period of ${WAITING_PERIOD_MONTHS} months applies from the commencement date. No benefits are payable for natural causes of death during this period. The Accidental Death benefit (where selected) is not subject to the waiting period.`,
    },
    {
      head: "Premium Changes",
      body: "Your monthly premium may increase in line with inflation or as a result of adverse claims experience. Mint Financial Services will give you thirty-one (31) days' written notice of any premium or benefit change. Continued payment after notice constitutes acceptance.",
    },
    {
      head: "Claim Submission",
      body: "All claims must be submitted within six (6) months of the insured event. Required documentation: certified copy of the death certificate, ID documents of the deceased and the claimant, completed Mint claim form, and any additional documents requested by the insurer.",
    },
    {
      head: "Non-Disclosure",
      body: "Failure to disclose any material information — including pre-existing health conditions — may result in a claim being repudiated. All information provided must be complete, accurate, and truthful.",
    },
    {
      head: "Lapse & Reinstatement",
      body: "Should premiums not be received within the thirty (30) day grace period, this policy will lapse and no benefits will be payable. Reinstatement is subject to underwriting approval and may result in a new waiting period being applied.",
    },
    {
      head: "Cancellation",
      body: "You may cancel this policy at any time by providing written notice. No refund of premiums will be made. Contact support@mymint.co.za to action a cancellation.",
    },
    {
      head: "Complaints",
      body: "Dissatisfied clients may contact us at support@mymint.co.za. Unresolved complaints may be escalated to the FSCA (fsca.co.za) or the Ombud for Financial Services Providers: 0860 663 274.",
    },
  ];

  const termsHtml = termsBlocks.map(b => `
    <div style="margin-bottom:4mm;page-break-inside:avoid;">
      <div style="background:${MID_BG};color:white;font-size:7.5pt;font-weight:bold;
                  padding:4px 8px;text-transform:uppercase;margin-bottom:2mm;">${b.head}</div>
      <div style="font-size:7.5pt;color:#1a1a1a;line-height:1.55;">${b.body}</div>
    </div>`).join("");

  const remuRows = [
    [
      "Initial remuneration for the first twelve months, payable upfront on inception of cover and recoverable should the plan lapse.",
      "Per FAIS schedule",
    ],
    [
      "Ongoing administration and intermediary fees payable to Mint Financial Services (Pty) Ltd each month from the plan.",
      "Included in premium",
    ],
    [
      "These amounts exclude VAT. Future premium increases on your plan may attract additional commission.",
      "",
    ],
  ];

  const page5 = `
  <div style="width:210mm;min-height:297mm;display:flex;flex-direction:column;
              background:white;page-break-after:always;">
    ${hdr(`<div style="font-size:9pt;font-weight:bold;color:white;letter-spacing:0.5px;">TERMS &amp; CONDITIONS</div>`)}
    <div style="flex:1;padding:6mm 14mm 4mm;font-size:8.5pt;color:#1a1a1a;line-height:1.5;">
      <div style="font-size:11pt;font-weight:bold;margin-bottom:4mm;">
        IMPORTANT TERMS &amp; CONDITIONS</div>
      ${termsHtml}
      ${sbar("Remuneration Structure", true)}
      ${tbl(
        [{ label: "Category" }, { label: "Value", right: true }],
        remuRows
      )}
    </div>
    ${ftr("Page 5")}
  </div>`;

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 6 — FAIS DISCLOSURE  (min-height, forest strip at bottom)
  // ═══════════════════════════════════════════════════════════════════════════
  const faisBlocks = [
    {
      head: "The Administrator / Binder Holder",
      body: `Name: Mint Financial Services (Pty) Ltd<br>Physical Address: Sandton, Johannesburg, 2196<br>Postal Address: PO Box 786015, Sandton, 2146<br>Email: support@mymint.co.za<br>Website: www.mymint.co.za<br>FSP Licence Number: ${FSP_NUMBER} — Category: Long-term Insurance: Category A, B1, B1-A, B2, B2-A, C`,
    },
    {
      head: "The Financial Services Provider Rendering Advice",
      body: `Name: Mint Financial Services (Pty) Ltd<br>FSP Licence: ${FSP_NUMBER}<br>Mint Financial Services is an Authorised Financial Services Provider. Products are offered subject to the FAIS Act and the Long-term Insurance Act.`,
    },
    {
      head: "Information About the Insurer",
      body: `Name: GuardRisk Life Limited<br>Registration Number: 1999/013922/06<br>FAIS Number: FSP 76<br>Physical Address: The MARC, Tower 2, 129 Rivonia Road, Sandton, 2196<br>Website: www.guardrisk.co.za<br>GuardRisk is an Authorised Financial Services Provider in terms of FAIS. Professional Indemnity Cover and Fidelity Guarantee Cover are in place.`,
    },
    {
      head: "Conflict of Interest Policy",
      body: "You can request a copy of our Conflict of Interest Policy at www.mymint.co.za.",
    },
    {
      head: "Guarantees and Undertakings",
      body: "Both the Administrator and Insurer carry Professional Indemnity and Fidelity Guarantee Insurance. The Financial Service Providers accept responsibility for the lawful actions of their Representatives in rendering Financial Services within the course and scope of their employment.",
    },
    {
      head: "Warnings",
      body: "Do not sign blank or partially completed claim forms. Complete all forms in ink or electronically. Do not be pressured to purchase this product. Failure to disclose facts relevant to your insurance may influence the assessment of a claim.",
    },
    {
      head: "Other Matters of Importance",
      body: `You will be informed of any material changes to information about the Administrator and/or Insurer.<br>
      You have a <b>thirty-one (31) day cooling-off period</b> from receipt of this plan within which you may cancel at no cost.<br>
      Cover will cease upon cancellation of the plan.<br>
      Unresolved complaints may be submitted to the Ombud for Long-term Insurance.<br>
      You will always be given a reason for repudiation of a claim.`,
    },
    {
      head: "National Financial Ombud Scheme",
      body: "Address: Claremont Central Building, 6th Floor, 6 Vineyard Road, Claremont, 7708<br>Email: info@nfosa.co.za | Website: www.nfosa.co.za",
    },
    {
      head: "Financial Sector Conduct Authority (FSCA)",
      body: "PO Box 35655, Menlo Park, 0102 | Telephone: +27 12 428 8000 | Email: info@fsca.co.za",
    },
    {
      head: "Registrar of Long-term Insurance",
      body: "PO Box 35655, Menlo Park, 0102 | Telephone: +27 12 428 8000 | Email: info@fsca.co.za",
    },
  ];

  const faisHtml = faisBlocks.map(b => `
    <div style="margin-bottom:4mm;page-break-inside:avoid;">
      <div style="background:${MID_BG};color:white;font-size:7.5pt;font-weight:bold;
                  padding:4px 8px;text-transform:uppercase;margin-bottom:2mm;">${b.head}</div>
      <div style="font-size:7.5pt;color:#1a1a1a;line-height:1.55;">${b.body}</div>
    </div>`).join("");

  const page6 = `
  <div style="width:210mm;min-height:297mm;display:flex;flex-direction:column;
              background:white;">
    ${hdr(`<div style="font-size:9pt;font-weight:bold;color:white;letter-spacing:0.5px;">FAIS DISCLOSURE</div>`)}
    <div style="flex:1;padding:6mm 14mm 4mm;font-size:8.5pt;color:#1a1a1a;line-height:1.5;">
      <div style="font-size:11pt;font-weight:bold;margin-bottom:2mm;">
        FAIS DISCLOSURE NOTICE</div>
      <div style="font-style:italic;font-size:7.5pt;color:#6b7280;margin-bottom:4mm;">
        Disclosures required in terms of the Financial Advisory and Intermediary Services Act 37 of 2002
      </div>
      ${faisHtml}
    </div>
    ${strip(IMG_FOREST)}
    ${ftr("Page 6")}
  </div>`;

  // ═══════════════════════════════════════════════════════════════════════════
  // ASSEMBLE FULL DOCUMENT
  // ═══════════════════════════════════════════════════════════════════════════
  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Mint Policy Schedule — ${policyNo}</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    background: #d1d5db;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  @media print {
    html, body { width: 210mm; background: white; }
    body > div { page-break-after: always; }
    body > div:last-child { page-break-after: auto; }
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
  }
  @media screen {
    body { padding: 8mm; }
    body > div { margin-bottom: 8mm; box-shadow: 0 4px 20px rgba(0,0,0,0.18); }
  }
</style>
</head>
<body>
${page1}
${page2}
${page3}
${page4}
${page5}
${page6}
</body>
</html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(fullHtml);
    win.document.close();
    setTimeout(() => { try { win.print(); } catch (_) {} }, 900);
  }

  return { policyNo, dateStr };
}
