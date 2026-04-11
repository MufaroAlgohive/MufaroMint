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
    .toLocaleDateString("en-ZA", { day: "2-digit", month: "long", year: "numeric" });
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
function addonIcon(label = "") {
  const l = label.toLowerCase();
  if (l.includes("accidental")) return "⚡";
  if (l.includes("tombstone"))  return "🪦";
  if (l.includes("meat"))       return "🥩";
  if (l.includes("grocery") || l.includes("groceries")) return "🛒";
  if (l.includes("repatri"))    return "🚁";
  if (l.includes("cash"))       return "💸";
  if (l.includes("hospital"))   return "🏥";
  return "🛡️";
}

function mintLogo(height = "24px") {
  const BASE_LOGO = typeof window !== "undefined" ? window.location.origin : "";
  const src = `${BASE_LOGO}/assets/LOGO%202%20WHITE%20MINT.svg`;
  return `<img src="${src}" alt="mint" style="height:${height};width:auto;display:block;">`;
}

export async function generateFuneralCoverPDF({
  firstName, lastName, age, ageBand,
  planType, planLabel, coverAmount, basePremium,
  addonDetails = [], totalMonthly, deductionDate, societySize,
  dependents = [],
}) {
  const policyNo  = policyRef();
  const dateStr   = todayStr();
  const fullName  = `${firstName} ${lastName}`.trim();
  const planFull  = `${planLabel} Funeral Plan${societySize ? ` (${societySize})` : ""}`;
  const spouseDep = dependents.find(d => d.type === "spouse");
  const childDeps = dependents.filter(d => d.type === "child");
  const TOTAL_PAGES = 6;

  const BASE     = window.location.origin;
  const SIG      = `${BASE}/assets/ceo-signature.png`;
  const IMG_HANDS   = `${BASE}/assets/images/hands-hero.jpeg`;
  const IMG_FAMILY  = `${BASE}/assets/images/family-hero.jpeg`;
  const IMG_KIDS    = `${BASE}/assets/images/children-hero.jpeg`;
  const IMG_SUNSET  = `${BASE}/assets/images/sunset-family.jpeg`;
  const IMG_FOREST  = `${BASE}/assets/images/forest-family.jpeg`;

  // ── spacing tokens ────────────────────────────────────────────────────────
  const P  = "16px 22px";   // body padding
  const PH = "6px 16px";    // header/bar padding

  // ── helpers ───────────────────────────────────────────────────────────────
  function topLogoBar() {
    return `<div style="background:#3D1A6B;padding:${PH};display:flex;align-items:center;">
      ${mintLogo("22px")}
    </div>
    <div style="height:3px;background:linear-gradient(90deg,#5B2D8E,#7B4DB0,#EDE8F8);"></div>`;
  }

  function footerBar(pageNum) {
    return `
    <div style="background:#3D1A6B;display:flex;justify-content:space-between;align-items:center;
                padding:7px 18px;font-size:9.5px;color:rgba(255,255,255,0.7);">
      <span style="color:white;font-weight:700;font-size:11px;letter-spacing:1px;">mint</span>
      <span>Policy Schedule – ${fullName} | ${policyNo} | ${dateStr} | Page ${pageNum} of ${TOTAL_PAGES}</span>
      <span>support@mymint.co.za</span>
    </div>
    <div style="background:#5B2D8E;text-align:center;padding:4px 18px;
                font-size:8.5px;color:rgba(255,255,255,0.55);">
      Mint Financial Services (Pty) Ltd | FSP No. ${FSP_NUMBER} | Underwritten by GuardRisk Life Ltd — FSP 76
    </div>`;
  }

  function photoBand(src, height = "180px", pos = "center 30%") {
    return `<div style="width:100%;height:${height};overflow:hidden;margin-top:10px;">
      <img src="${src}" alt=""
        style="width:100%;height:100%;object-fit:cover;object-position:${pos};display:block;">
    </div>`;
  }

  function secTitle(text, mt = "0") {
    return `<div style="font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-size:17px;
                        font-weight:800;color:#5B2D8E;text-transform:uppercase;letter-spacing:1px;
                        border-bottom:2px solid #EDE8F8;padding-bottom:5px;
                        margin-top:${mt};margin-bottom:10px;">${text}</div>`;
  }

  function tblHead(label) {
    return `<div style="background:#5B2D8E;color:white;padding:5px 12px;
                        font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-size:12px;
                        font-weight:700;letter-spacing:1px;text-transform:uppercase;
                        border-radius:5px 5px 0 0;">${label}</div>`;
  }

  function notice(html) {
    return `<div style="background:linear-gradient(135deg,#EDE8F8,#E4DCF5);border-left:4px solid #5B2D8E;
                        border-radius:6px;padding:8px 12px;margin:8px 0;font-size:12px;
                        color:#3D1A6B;font-weight:500;">${html}</div>`;
  }

  function debitNote(html) {
    return `<div style="background:#F5F2FC;border:1px solid #DDD8F0;border-radius:6px;
                        padding:8px 12px;font-size:12px;color:#444;margin:8px 0;">${html}</div>`;
  }

  function tcBlock(icon, head, body) {
    return `<div style="margin-bottom:8px;">
      <div style="background:#5B2D8E;color:white;padding:5px 10px;
                  font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-size:12px;
                  font-weight:700;letter-spacing:1px;text-transform:uppercase;border-radius:4px 4px 0 0;">
        ${icon}&nbsp;${head}</div>
      <div style="background:#F5F2FC;border:1px solid #DDD8F0;border-top:none;padding:7px 10px;
                  font-size:11.5px;color:#444;border-radius:0 0 4px 4px;line-height:1.5;">${body}</div>
    </div>`;
  }

  function faisBlock(icon, head, bodyHtml) {
    return `<div style="margin-bottom:8px;">
      <div style="background:#5B2D8E;color:white;padding:5px 10px;
                  font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-size:11.5px;
                  font-weight:700;letter-spacing:1px;text-transform:uppercase;border-radius:4px 4px 0 0;">
        ${icon}&nbsp;${head}</div>
      <div style="border:1px solid #DDD8F0;border-top:none;padding:7px 10px;font-size:11px;
                  color:#444;border-radius:0 0 4px 4px;line-height:1.6;background:white;">
        ${bodyHtml}</div>
    </div>`;
  }

  function regCard(icon, head, bodyHtml) {
    return `<div style="border:1.5px solid #DDD8F0;border-radius:8px;overflow:hidden;">
      <div style="background:#5B2D8E;padding:6px 12px;color:white;
                  font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-size:12px;
                  font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">
        ${icon}&nbsp;${head}</div>
      <div style="padding:8px 12px;font-size:11px;color:#444;line-height:1.6;background:#F5F2FC;">
        ${bodyHtml}</div>
    </div>`;
  }

  // ── benefit card helpers ──────────────────────────────────────────────────
  function bcCell(label, val) {
    return `<div style="padding:6px 12px;border-bottom:1px solid #DDD8F0;border-right:1px solid #DDD8F0;">
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#777;margin-bottom:1px;">${label}</div>
      <div style="font-weight:700;font-size:12.5px;color:#3D1A6B;">${val}</div>
    </div>`;
  }
  function bcCellNoRight(label, val) {
    return `<div style="padding:6px 12px;border-bottom:1px solid #DDD8F0;">
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#777;margin-bottom:1px;">${label}</div>
      <div style="font-weight:700;font-size:12.5px;color:#3D1A6B;">${val}</div>
    </div>`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 1 — WELCOME LETTER
  // ═══════════════════════════════════════════════════════════════════════════
  const page1 = `
  <div class="page">
    <div style="background:#5B2D8E;display:flex;align-items:stretch;min-height:68px;">
      <div style="background:#3D1A6B;padding:12px 20px;display:flex;flex-direction:column;
                  justify-content:center;min-width:220px;">
        ${mintLogo("28px")}
        <div style="color:rgba(255,255,255,0.6);font-size:9px;letter-spacing:1.5px;
                    text-transform:uppercase;margin-top:3px;">Wills &amp; Funeral Specialists</div>
      </div>
      <div style="flex:1;padding:12px 20px;display:flex;flex-direction:column;
                  justify-content:center;align-items:flex-end;">
        <h1 style="font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-size:26px;
                   font-weight:800;color:white;letter-spacing:1px;text-transform:uppercase;">Policy Schedule</h1>
        <div style="font-size:10px;color:rgba(255,255,255,0.65);letter-spacing:2px;
                    text-transform:uppercase;margin-top:1px;">${dateStr}</div>
      </div>
    </div>

    <div style="background:#3D1A6B;display:flex;justify-content:space-between;align-items:center;
                padding:6px 20px;border-top:1px solid rgba(255,255,255,0.1);">
      <span style="font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-size:13px;
                   font-weight:700;color:white;letter-spacing:2px;">${policyNo}</span>
      <span style="font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-size:15px;
                   font-weight:700;color:white;letter-spacing:1px;text-transform:uppercase;">${fullName}</span>
    </div>
    <div style="background:#EDE8F8;display:flex;justify-content:space-between;
                padding:5px 20px;font-size:10px;color:#5B2D8E;">
      <span><b>Plan Type:</b> ${planFull}</span>
      <span><b>Provider:</b> Mint Financial Services (Pty) Ltd — FSP No. ${FSP_NUMBER}</span>
    </div>

    <div style="padding:${P};">
      ${secTitle("Welcome to Mint")}
      <div style="color:#444;line-height:1.55;font-size:12.5px;">
        <p style="margin-bottom:8px;">Dear <strong style="color:#5B2D8E;">${fullName}</strong>,</p>
        <p style="margin-bottom:8px;">Thank you for choosing the Mint Funeral Plan. We are honoured to be your trusted financial services partner and committed to ensuring your loved ones are cared for at their most vulnerable time.</p>
        <p style="margin-bottom:8px;">Your Mint Funeral Plan provides your family with an <strong style="color:#5B2D8E;">immediate lump-sum payout</strong> upon a valid claim — covering funeral costs and providing financial relief when it matters most. Your policy is underwritten by a licensed South African Life Insurer under the Long-term Insurance Act and FAIS.</p>
        <p style="margin-bottom:8px;">Please read this Policy Schedule carefully. If any information is incorrect, notify us in writing within <strong style="color:#5B2D8E;">thirty-one (31) days</strong>. Please also advise us of any changes to your personal information or beneficiary nominations at any time.</p>
      </div>

      ${notice(`⚠️ &nbsp; A <strong>waiting period of ${WAITING_PERIOD_MONTHS} months</strong> applies from the commencement date. No benefits will be paid for natural causes of death during this period. The Accidental Death benefit (where selected) is <strong>not</strong> subject to the waiting period.`)}

      <p style="color:#444;font-size:12px;margin:8px 0 12px;">Questions? Contact us at <strong style="color:#5B2D8E;">support@mymint.co.za</strong></p>

      <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:12px;">
        <div style="background:#F5F2FC;border:1px solid #DDD8F0;border-radius:8px;
                    padding:8px 16px;text-align:center;">
          <img src="${SIG}" alt="signature"
               style="height:38px;display:block;margin:0 auto 3px;object-fit:contain;">
          <div style="font-weight:700;font-size:12px;color:#1A1A2E;">Lonwabo</div>
          <div style="font-size:10px;color:#777;">Chief Executive Officer</div>
          <div style="font-size:10px;color:#5B2D8E;font-weight:500;">Mint Financial Services (Pty) Ltd</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:9px;color:#777;text-transform:uppercase;letter-spacing:1.5px;">Underwritten by</span>
          <div style="background:#1A1A2E;color:white;font-family:'Barlow Condensed',Arial Narrow,sans-serif;
                      font-size:15px;font-weight:800;letter-spacing:2px;padding:5px 12px;
                      border-radius:5px;display:flex;align-items:center;gap:4px;">
            <span style="color:#F5D400;">GUARD</span>RISK
          </div>
          <div style="font-size:9px;color:#777;">Life Ltd — FSP 76</div>
        </div>
      </div>
    </div>

    ${photoBand(IMG_HANDS, "180px", "center 40%")}
    ${footerBar(1)}
  </div>`;

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 2 — PLAN SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════
  const summaryRows = [
    `<tr><td>${planFull}</td><td style="text-align:right">${fmtR(basePremium)}&nbsp;pm</td><td>${fmtCover(coverAmount)}</td></tr>`,
    ...addonDetails.map(a =>
      `<tr><td>${a.label}${a.sub ? ` – ${a.sub}` : ""}</td><td style="text-align:right">${fmtR(a.premium)}&nbsp;pm</td><td>Optional benefit</td></tr>`
    ),
  ].join("");

  const benefitRows = [
    `<tr><td>Funeral Cover – Main Member (${planLabel})</td><td>${fmtCover(coverAmount)}</td></tr>`,
  ];
  if (spouseDep) benefitRows.push(`<tr><td>Spouse Funeral Cover</td><td>${fmtCover(coverAmount)}</td></tr>`);
  if (childDeps.length > 0)
    benefitRows.push(`<tr><td>Children Funeral Cover (${childDeps.length} child${childDeps.length > 1 ? "ren" : ""})</td><td>Per age bracket</td></tr>`);
  addonDetails.forEach(a =>
    benefitRows.push(`<tr><td>${a.label}${a.sub ? ` (${a.sub})` : ""}</td><td>${fmtR(a.premium)}&nbsp;pm</td></tr>`)
  );

  const page2 = `
  <div class="page">
    ${topLogoBar()}
    <div style="padding:${P};">
      ${secTitle("Summary of Product &amp; Service Selection")}

      <div style="margin-bottom:12px;">
        ${tblHead("📋 &nbsp; Plan Summary")}
        <table>
          <thead><tr>
            <th>Product Name</th>
            <th style="text-align:right">Monthly Premium</th>
            <th>Plan Value</th>
          </tr></thead>
          <tbody>${summaryRows}</tbody>
          <tfoot><tr>
            <td><strong>Total</strong></td>
            <td style="text-align:right"><strong>${fmtR(totalMonthly)}&nbsp;pm</strong></td>
            <td></td>
          </tr></tfoot>
        </table>
      </div>

      <div style="margin-bottom:12px;">
        ${tblHead("🛡️ &nbsp; Principal Life Plan Benefits")}
        <table>
          <thead><tr><th>Benefit Name</th><th>Plan Value</th></tr></thead>
          <tbody>${benefitRows.join("")}</tbody>
        </table>
      </div>

      ${debitNote(`💳 &nbsp; Your total premium of <strong style="color:#5B2D8E;">${fmtR(totalMonthly)} per month</strong> will be debited on the <strong style="color:#5B2D8E;">${deductionDate} of every month</strong>. Bank statement reference: <strong style="color:#5B2D8E;">MINT-INS ${policyNo}</strong>.`)}
      ${notice(`⚠️ &nbsp; A waiting period of <strong>${WAITING_PERIOD_MONTHS} months</strong> applies from the commencement date.`)}
    </div>
    ${photoBand(IMG_FAMILY, "180px", "center 25%")}
    ${footerBar(2)}
  </div>`;

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 3 — BENEFIT DETAILS + BENEFICIARIES & POLICYHOLDER
  // ═══════════════════════════════════════════════════════════════════════════
  const iconCells = [
    `<div style="flex:1;text-align:center;padding:7px 4px;border-right:1px solid #DDD8F0;">
      <span style="font-size:18px;display:block;margin-bottom:2px;">💰</span>
      <div style="font-size:8.5px;text-transform:uppercase;letter-spacing:0.5px;color:#3D1A6B;font-weight:600;line-height:1.2;">Monthly<br>Premium</div>
      <div style="font-size:12px;font-weight:800;color:#5B2D8E;margin-top:1px;">${fmtR(basePremium)}</div>
    </div>`,
    `<div style="flex:1;text-align:center;padding:7px 4px;border-right:1px solid #DDD8F0;">
      <span style="font-size:18px;display:block;margin-bottom:2px;">🛡️</span>
      <div style="font-size:8.5px;text-transform:uppercase;letter-spacing:0.5px;color:#3D1A6B;font-weight:600;line-height:1.2;">Cover<br>Amount</div>
      <div style="font-size:12px;font-weight:800;color:#5B2D8E;margin-top:1px;">${fmtCover(coverAmount)}</div>
    </div>`,
    ...addonDetails.map((a, i) =>
      `<div style="flex:1;text-align:center;padding:7px 4px;${i < addonDetails.length - 1 ? "border-right:1px solid #DDD8F0;" : ""}">
        <span style="font-size:18px;display:block;margin-bottom:2px;">${addonIcon(a.label)}</span>
        <div style="font-size:8.5px;text-transform:uppercase;letter-spacing:0.5px;color:#3D1A6B;font-weight:600;line-height:1.2;">${a.label.replace(/ – .+/, "").substring(0, 16)}</div>
        <div style="font-size:12px;font-weight:800;color:#5B2D8E;margin-top:1px;">${fmtR(a.premium)}</div>
      </div>`
    ),
  ];

  const addonCards = addonDetails.map(a => `
    <div style="border:1.5px solid #DDD8F0;border-radius:8px;overflow:hidden;margin-bottom:8px;">
      <div style="background:#5B2D8E;padding:6px 12px;display:flex;align-items:center;gap:8px;">
        <div style="font-size:14px;width:24px;height:24px;background:rgba(255,255,255,0.15);border-radius:50%;
                    display:flex;align-items:center;justify-content:center;flex-shrink:0;">${addonIcon(a.label)}</div>
        <h3 style="font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-size:13px;font-weight:700;
                   color:white;text-transform:uppercase;letter-spacing:0.5px;">${a.label}${a.sub ? ` – ${a.sub}` : ""}</h3>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;">
        ${bcCell("Life Assured", fullName)}
        ${bcCellNoRight("Policy Term", "Whole of Life")}
        <div style="padding:6px 12px;border-right:1px solid #DDD8F0;">
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#777;margin-bottom:1px;">Benefit Type</div>
          <div style="font-weight:700;font-size:12.5px;color:#3D1A6B;">Once Off Payout</div>
        </div>
        <div style="padding:6px 12px;">
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#777;margin-bottom:1px;">Monthly Premium</div>
          <div style="font-weight:700;font-size:12.5px;color:#3D1A6B;">${fmtR(a.premium)}</div>
        </div>
      </div>
    </div>`).join("");

  const depTableRows = dependents.map((dep) => {
    const depName = [dep.firstName, dep.lastName].filter(Boolean).join(" ") || "—";
    const depType = dep.type === "spouse" ? "Spouse" : dep.type === "member" ? "Soc. Member" : "Child";
    const ageYrs  = depAge(dep.dob);
    const ageStr  = ageYrs !== null ? `${ageYrs} yrs` : "—";
    let benefit = "Full cover";
    if (dep.type === "child" && ageYrs !== null && coverAmount) {
      const cb = getChildCoverAmount(coverAmount, ageYrs);
      benefit = cb > 0
        ? `<strong style="color:#5B2D8E;">${fmtCover(cb)} (${getChildAgeBracket(ageYrs)})</strong>`
        : "Not eligible";
    } else if (dep.type === "spouse" || dep.type === "member") {
      benefit = `<strong style="color:#5B2D8E;">${fmtCover(coverAmount)}</strong>`;
    }
    return `<tr><td><strong>${depName}</strong></td><td>${depType}</td><td>${dep.dob || "—"}</td><td>${ageStr}</td><td>${benefit}</td></tr>`;
  }).join("");

  const page3 = `
  <div class="page">
    ${topLogoBar()}
    <div style="padding:${P};">
      ${secTitle("Benefit Details")}

      <div style="border:1.5px solid #DDD8F0;border-radius:8px;overflow:hidden;margin-bottom:8px;">
        <div style="background:#5B2D8E;padding:6px 12px;display:flex;align-items:center;gap:8px;">
          <div style="font-size:14px;width:24px;height:24px;background:rgba(255,255,255,0.15);border-radius:50%;
                      display:flex;align-items:center;justify-content:center;flex-shrink:0;">🏠</div>
          <h3 style="font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-size:13px;font-weight:700;
                     color:white;text-transform:uppercase;letter-spacing:0.5px;">${planFull}</h3>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;">
          ${bcCell("Life Assured", fullName)}
          ${bcCellNoRight("Commencement Date", dateStr)}
          ${bcCell("Date of Birth / Age", `${age} Years`)}
          ${bcCellNoRight("Policy Term", "Whole of Life")}
          ${bcCell("Age Band", ageBand)}
          ${bcCellNoRight("Premium Increases", "Not Guaranteed")}
          <div style="padding:6px 12px;border-right:1px solid #DDD8F0;">
            <div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#777;margin-bottom:1px;">Waiting Period</div>
            <div style="font-weight:700;font-size:12.5px;color:#3D1A6B;">${WAITING_PERIOD_MONTHS} Months</div>
          </div>
          <div style="padding:6px 12px;">
            <div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#777;margin-bottom:1px;">Deduction Date</div>
            <div style="font-weight:700;font-size:12.5px;color:#3D1A6B;">${deductionDate} of each month</div>
          </div>
        </div>
        <div style="display:flex;background:#EDE8F8;border-top:1.5px solid #DDD8F0;">
          ${iconCells.join("")}
        </div>
      </div>

      ${addonCards}

      ${dependents.length > 0 ? `
        ${secTitle("Beneficiary &amp; Policyholder Details", "4px")}
        <div style="margin-bottom:10px;">
          ${tblHead("👨‍👧 &nbsp; Beneficiary Details")}
          <table>
            <thead><tr>
              <th>Name</th><th>Relationship</th><th>Date of Birth</th><th>Age</th><th>Cover Benefit</th>
            </tr></thead>
            <tbody>${depTableRows}</tbody>
          </table>
        </div>` : ""}

      <div style="margin-bottom:6px;">
        ${tblHead("👤 &nbsp; Policyholder Details")}
        <table>
          <tbody>
            <tr>
              <td style="font-weight:600;color:#1A1A2E;width:22%">Full Name</td><td>${fullName}</td>
              <td style="font-weight:600;color:#1A1A2E;width:22%">Age at Inception</td><td>${age} years</td>
            </tr>
            <tr style="background:#F9F7FF;">
              <td style="font-weight:600;color:#1A1A2E;">Policy Number</td><td>${policyNo}</td>
              <td style="font-weight:600;color:#1A1A2E;">Schedule Date</td><td>${dateStr}</td>
            </tr>
            <tr>
              <td style="font-weight:600;color:#1A1A2E;">Deduction Date</td><td>${deductionDate} of each month</td>
              <td style="font-weight:600;color:#1A1A2E;">Bank Reference</td><td>MINT-INS ${policyNo}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    ${photoBand(IMG_KIDS, "180px", "center 20%")}
    ${footerBar(3)}
  </div>`;

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 4 — TERMS & CONDITIONS
  // ═══════════════════════════════════════════════════════════════════════════
  const page4 = `
  <div class="page">
    ${topLogoBar()}
    <div style="padding:${P};">
      ${secTitle("Important Terms &amp; Conditions")}

      ${tcBlock("⏳", "Waiting Period",
        `A waiting period of ${WAITING_PERIOD_MONTHS} months applies from commencement. No benefits are payable for natural causes of death during this period. The Accidental Death benefit (where selected) is not subject to the waiting period.`)}
      ${tcBlock("📈", "Premium Changes",
        "Your monthly premium may increase in line with inflation or adverse claims experience. Mint will give you thirty-one (31) days' written notice of any change. Continued payment after notice constitutes acceptance.")}
      ${tcBlock("📋", "Claim Submission",
        "All claims must be submitted within six (6) months of the insured event. Required documentation: certified death certificate, ID documents of the deceased and claimant, completed Mint claim form, and any additional documents requested by the insurer.")}
      ${tcBlock("⚠️", "Non-Disclosure",
        "Failure to disclose any material information — including pre-existing health conditions — may result in a claim being repudiated. All information provided must be complete, accurate, and truthful.")}
      ${tcBlock("🔄", "Lapse &amp; Reinstatement",
        "Should premiums not be received within the thirty (30) day grace period, this policy will lapse. Reinstatement is subject to underwriting approval and may result in a new waiting period.")}
      ${tcBlock("❌", "Cancellation",
        "You may cancel this policy at any time by providing written notice. No refund of premiums will be made. Contact us at support@mymint.co.za.")}
      ${tcBlock("📣", "Complaints",
        "Contact us at support@mymint.co.za. Unresolved complaints may be escalated to the FSCA (fsca.co.za) or the Ombud for Financial Services Providers: <strong>0860 663 274</strong>.")}

      ${secTitle("Remuneration Structure", "8px")}
      <table>
        <thead><tr><th>Category</th><th style="text-align:right">Value</th></tr></thead>
        <tbody>
          <tr>
            <td style="vertical-align:top;">Your referring intermediary will receive initial remuneration for the first twelve months, payable upfront on inception and recoverable should the plan lapse.</td>
            <td style="text-align:right;font-weight:700;color:#5B2D8E;white-space:nowrap;vertical-align:top;">Per FAIS schedule</td>
          </tr>
          <tr style="background:#F9F7FF;">
            <td style="vertical-align:top;">Ongoing administration and intermediary fees payable to Mint Financial Services (Pty) Ltd each month from the plan.</td>
            <td style="text-align:right;font-weight:700;color:#5B2D8E;white-space:nowrap;vertical-align:top;">Included in premium</td>
          </tr>
        </tbody>
      </table>
      <p style="font-size:10.5px;color:#777;margin-top:6px;">These amounts exclude VAT. Future premium increases may attract additional commission.</p>
    </div>
    ${photoBand(IMG_SUNSET, "180px", "center 50%")}
    ${footerBar(4)}
  </div>`;

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 5 — FAIS DISCLOSURE
  // ═══════════════════════════════════════════════════════════════════════════
  const page5 = `
  <div class="page">
    ${topLogoBar()}
    <div style="padding:${P};">
      ${secTitle("FAIS Disclosure Notice")}
      <p style="font-style:italic;color:#777;font-size:11px;margin-bottom:10px;">
        Disclosures required in terms of the Financial Advisory and Intermediary Services Act 37 of 2002</p>

      ${faisBlock("🏢", "The Administrator / Binder Holder", `
        <p><strong>Name:</strong> Mint Financial Services (Pty) Ltd &nbsp;|&nbsp; <strong>FSP:</strong> ${FSP_NUMBER}</p>
        <p><strong>Address:</strong> Sandton, Johannesburg, 2196 &nbsp;|&nbsp; <strong>Email:</strong> support@mymint.co.za &nbsp;|&nbsp; <strong>Web:</strong> www.mymint.co.za</p>
        <p><strong>Category:</strong> Long-term Insurance: Category A, B1, B1-A, B2, B2-A, C</p>`)}

      ${faisBlock("💼", "The Financial Services Provider Rendering Advice", `
        <p><strong>Name:</strong> Mint Financial Services (Pty) Ltd &nbsp;|&nbsp; <strong>FSP Licence:</strong> ${FSP_NUMBER}</p>
        <p>Mint Financial Services is an Authorised Financial Services Provider under the FAIS Act and Long-term Insurance Act.</p>`)}

      ${faisBlock("🏦", "Information About the Insurer", `
        <p><strong>Name:</strong> GuardRisk Life Limited &nbsp;|&nbsp; <strong>FAIS Number:</strong> FSP 76 &nbsp;|&nbsp; <strong>Reg:</strong> 1999/013922/06</p>
        <p><strong>Address:</strong> The MARC, Tower 2, 129 Rivonia Road, Sandton, 2196 &nbsp;|&nbsp; <strong>Web:</strong> www.guardrisk.co.za</p>
        <p>GuardRisk is an Authorised Financial Services Provider. Professional Indemnity and Fidelity Guarantee Cover are in place.</p>`)}

      ${faisBlock("⚖️", "Conflict of Interest Policy",
        `A copy of our Conflict of Interest Policy is available at <strong>www.mymint.co.za</strong>.`)}

      ${faisBlock("🛡️", "Guarantees and Undertakings",
        "Both the Administrator and Insurer carry Professional Indemnity and Fidelity Guarantee Insurance. Financial Service Providers accept responsibility for the lawful actions of their Representatives in rendering Financial Services within the scope of their employment.")}

      ${faisBlock("⚠️", "Warnings &amp; Other Matters of Importance", `
        <ul style="padding-left:16px;">
          <li>Do not sign blank or partially completed claim forms.</li>
          <li>You have a <strong>thirty-one (31) day cooling-off period</strong> from receipt within which you may cancel in writing at no cost.</li>
          <li>Cover will cease upon cancellation. You will always be given a reason for repudiation of a claim.</li>
          <li>Failure to disclose facts relevant to your insurance may influence the assessment of a claim by the Insurer.</li>
        </ul>`)}
    </div>
    ${photoBand(IMG_FOREST, "180px", "center 35%")}
    ${footerBar(5)}
  </div>`;

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 6 — REGULATORY CONTACTS
  // ═══════════════════════════════════════════════════════════════════════════
  const page6 = `
  <div class="page">
    ${topLogoBar()}
    <div style="padding:${P};">
      ${secTitle("Regulatory &amp; Contact Information")}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        ${regCard("🏛️", "National Financial Ombud Scheme", `
          <p>For claims/service-related matters</p>
          <p><strong>Address:</strong> Claremont Central Building, 6th Floor, 6 Vineyard Road, Claremont, 7708</p>
          <p><strong>Email:</strong> info@nfosa.co.za &nbsp;|&nbsp; <strong>Web:</strong> www.nfosa.co.za</p>`)}
        ${regCard("📞", "Financial Sector Conduct Authority", `
          <p>For market conduct related matters</p>
          <p><strong>Postal:</strong> PO Box 35655, Menlo Park, 0102</p>
          <p><strong>Tel:</strong> +27 12 428 8000 &nbsp;|&nbsp; <strong>Email:</strong> info@fsca.co.za</p>`)}
        ${regCard("📜", "Registrar of Long-Term Insurance", `
          <p><strong>Postal:</strong> PO Box 35655, Menlo Park, 0102</p>
          <p><strong>Tel:</strong> +27 12 428 8000 &nbsp;|&nbsp; <strong>Email:</strong> info@fsca.co.za</p>`)}
        ${regCard("✉️", "Mint Client Support", `
          <p><strong>Email:</strong> support@mymint.co.za</p>
          <p><strong>Web:</strong> www.mymint.co.za</p>
          <p><strong>FSP No:</strong> ${FSP_NUMBER} &nbsp;|&nbsp; <strong>Underwriter:</strong> GuardRisk Life Ltd — FSP 76</p>`)}
      </div>
    </div>
    ${photoBand(IMG_HANDS, "200px", "center 40%")}
    ${footerBar(6)}
  </div>`;

  // ═══════════════════════════════════════════════════════════════════════════
  // ASSEMBLE & OPEN PRINT WINDOW
  // ═══════════════════════════════════════════════════════════════════════════
  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Mint Policy Schedule — ${policyNo}</title>
<link href="https://fonts.googleapis.com/css2?family=Barlow:wght@300;400;500;600;700;800&family=Barlow+Condensed:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
  :root {
    --purple: #5B2D8E; --purple-dark: #3D1A6B;
    --purple-light: #EDE8F8; --purple-pale: #F5F2FC;
    --border: #DDD8F0; --row-alt: #F9F7FF;
    --text: #1A1A2E; --text-mid: #444;
  }
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Barlow', Helvetica, Arial, sans-serif;
    background: #EEEAF5; color: var(--text);
    font-size: 12px; line-height: 1.5;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .doc { max-width: 860px; margin: 0 auto; padding: 16px 12px; }
  .page { background: white; border-radius: 12px; box-shadow: 0 4px 32px rgba(91,45,142,0.12); overflow: hidden; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; }
  table thead tr { background: var(--purple-light); }
  table thead th { padding: 6px 10px; text-align: left; font-weight: 700; font-size: 11px; color: var(--purple); text-transform: uppercase; letter-spacing: 0.5px; }
  table tbody tr { border-bottom: 1px solid var(--border); }
  table tbody tr:nth-child(even) { background: var(--row-alt); }
  table tbody td { padding: 6px 10px; font-size: 12px; color: var(--text-mid); }
  table tfoot tr { background: var(--purple-dark); }
  table tfoot td { padding: 6px 10px; font-weight: 700; color: white; font-size: 12px; }
  p { margin-bottom: 3px; }
  li { margin-bottom: 3px; }
  @media print {
    body { background: white; }
    .doc { padding: 0; max-width: none; }
    .page { border-radius: 0; box-shadow: none; margin: 0; page-break-after: always; }
    .page:last-child { page-break-after: auto; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  }
</style>
</head>
<body>
<div class="doc">
${page1}
${page2}
${page3}
${page4}
${page5}
${page6}
</div>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(fullHtml);
    win.document.close();
    setTimeout(() => { try { win.print(); } catch (_) {} }, 1200);
  }

  return { policyNo, dateStr };
}
