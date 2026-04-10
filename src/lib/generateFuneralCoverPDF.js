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

// ── SVG Mint logo (inline, works on any background) ──────────────────────────
const MINT_SVG = `<svg viewBox="0 0 120 38" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:110px;height:auto;display:block;">
  <polygon points="0,0 18,0 28,19 18,38 0,38 10,19" fill="#F5D400"/>
  <polygon points="12,0 30,0 40,19 30,38 12,38 22,19" fill="rgba(255,255,255,0.28)"/>
  <text x="46" y="27" font-family="Barlow Condensed,Arial Narrow,sans-serif" font-weight="800"
        font-size="23" fill="white" letter-spacing="2">MINT</text>
</svg>`;

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
  const policyNo  = policyRef();
  const dateStr   = todayStr();
  const fullName  = `${firstName} ${lastName}`.trim();
  const planFull  = `${planLabel} Funeral Plan${societySize ? ` (${societySize})` : ""}`;
  const spouseDep = dependents.find(d => d.type === "spouse");
  const childDeps = dependents.filter(d => d.type === "child");
  const TOTAL_PAGES = 6;

  const BASE      = window.location.origin;
  const IMG_HANDS   = `${BASE}/assets/images/hands-hero.jpeg`;
  const IMG_FAMILY  = `${BASE}/assets/images/family-hero.jpeg`;
  const IMG_KIDS    = `${BASE}/assets/images/children-hero.jpeg`;
  const IMG_SUNSET  = `${BASE}/assets/images/sunset-family.jpeg`;
  const IMG_FOREST  = `${BASE}/assets/images/forest-family.jpeg`;
  const SIG         = `${BASE}/assets/ceo-signature.png`;

  // ── Shared helpers ──────────────────────────────────────────────────────────

  function topLogoBar() {
    return `<div style="background:#3D1A6B;padding:10px 24px;display:flex;align-items:center;">
      ${MINT_SVG}
    </div>
    <div style="height:3px;background:linear-gradient(90deg,#5B2D8E,#7B4DB0,#EDE8F8);"></div>`;
  }

  function footerBar(pageNum) {
    return `
    <div style="background:#3D1A6B;display:flex;justify-content:space-between;align-items:center;
                padding:10px 24px;font-size:10.5px;color:rgba(255,255,255,0.7);">
      <span style="color:white;font-weight:700;font-size:13px;letter-spacing:1px;">mint</span>
      <span>Policy Schedule – ${fullName} | ${policyNo} | ${dateStr} | Page ${pageNum} of ${TOTAL_PAGES}</span>
      <span>support@mymint.co.za</span>
    </div>
    <div style="background:#5B2D8E;text-align:center;padding:6px 24px;
                font-size:9.5px;color:rgba(255,255,255,0.55);">
      Mint Financial Services (Pty) Ltd | FSP No. ${FSP_NUMBER} | Underwritten by GuardRisk Life Ltd — FSP 76
    </div>`;
  }

  function photoBand(src, height = "260px", pos = "center 30%") {
    return `<img src="${src}" alt=""
      style="width:100%;height:${height};object-fit:cover;object-position:${pos};display:block;margin-top:24px;">`;
  }

  function sectionHeader(icon, title) {
    return `<div style="background:#5B2D8E;padding:14px 30px;display:flex;align-items:center;gap:14px;">
      <div style="width:36px;height:36px;background:rgba(255,255,255,0.15);border-radius:50%;
                  display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">${icon}</div>
      <h2 style="font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-size:20px;font-weight:800;
                 color:white;text-transform:uppercase;letter-spacing:1px;">${title}</h2>
    </div>`;
  }

  function tblHead(label) {
    return `<div style="background:#5B2D8E;color:white;padding:9px 16px;
                        font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-size:14px;
                        font-weight:700;letter-spacing:1px;text-transform:uppercase;
                        border-radius:6px 6px 0 0;">${label}</div>`;
  }

  function secTitle(text, mt = "0") {
    return `<div style="font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-size:22px;
                        font-weight:800;color:#5B2D8E;text-transform:uppercase;letter-spacing:1px;
                        border-bottom:2px solid #EDE8F8;padding-bottom:8px;
                        margin-top:${mt};margin-bottom:20px;">${text}</div>`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 1 — WELCOME LETTER
  // ═══════════════════════════════════════════════════════════════════════════
  const page1 = `
  <div class="page">
    <div style="background:#5B2D8E;position:relative;display:flex;align-items:stretch;min-height:90px;">
      <div style="background:#3D1A6B;padding:22px 30px;display:flex;flex-direction:column;
                  justify-content:center;min-width:210px;">
        ${MINT_SVG}
        <div style="color:rgba(255,255,255,0.6);font-size:10px;letter-spacing:1.5px;
                    text-transform:uppercase;margin-top:5px;">Wills &amp; Funeral Specialists</div>
      </div>
      <div style="flex:1;padding:18px 30px;display:flex;flex-direction:column;
                  justify-content:center;align-items:flex-end;">
        <h1 style="font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-size:32px;
                   font-weight:800;color:white;letter-spacing:1px;text-transform:uppercase;">Policy Schedule</h1>
        <div style="font-size:11px;color:rgba(255,255,255,0.65);letter-spacing:2px;
                    text-transform:uppercase;margin-top:2px;">${dateStr}</div>
      </div>
    </div>

    <div style="background:#3D1A6B;display:flex;justify-content:space-between;align-items:center;
                padding:10px 30px;border-top:1px solid rgba(255,255,255,0.1);">
      <span style="font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-size:15px;
                   font-weight:700;color:white;letter-spacing:2px;">${policyNo}</span>
      <span style="font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-size:18px;
                   font-weight:700;color:white;letter-spacing:1px;text-transform:uppercase;">${fullName}</span>
    </div>

    <div style="background:#EDE8F8;display:flex;justify-content:space-between;
                padding:8px 30px;font-size:11px;color:#5B2D8E;">
      <span><span style="opacity:0.65;text-transform:uppercase;letter-spacing:1px;">Plan Type &nbsp;|&nbsp;</span>
            <span style="font-weight:700;">${planFull}</span></span>
      <span><span style="opacity:0.65;text-transform:uppercase;letter-spacing:1px;">Provider &nbsp;|&nbsp;</span>
            <span style="font-weight:700;">Mint Financial Services (Pty) Ltd — FSP No. ${FSP_NUMBER}</span></span>
    </div>

    <div style="padding:32px 36px;">
      ${secTitle("Welcome to Mint")}

      <div style="color:#444;line-height:1.6;font-size:13.5px;">
        <p style="margin-bottom:13px;">Dear <strong style="color:#5B2D8E;">${fullName}</strong>,</p>
        <p style="margin-bottom:13px;">Thank you for choosing the Mint Funeral Plan. We are honoured to be your trusted financial services partner, and we are committed to ensuring that your loved ones are taken care of at their most vulnerable time.</p>
        <p style="margin-bottom:13px;">Your Mint Funeral Plan has been designed to provide your family with an <strong style="color:#5B2D8E;">immediate lump-sum payout</strong> upon a valid claim — covering funeral costs, associated expenses, and providing financial relief when it matters most. Your policy is underwritten by a licensed South African Life Insurer in terms of the Long-term Insurance Act and the Financial Advisory and Intermediary Services Act (FAIS).</p>
        <p style="margin-bottom:13px;">Please read the enclosed Policy Schedule and the attached terms and conditions carefully. Should any information in this Policy Schedule be incorrect or incomplete, please notify us in writing within <strong style="color:#5B2D8E;">thirty-one (31) days</strong> from the date of this letter.</p>
        <p style="margin-bottom:13px;">Please also advise us, at any time, of any changes to your personal information or beneficiary nominations. Keeping your information up to date ensures that your cover remains valid and your claim can be processed without delay.</p>
      </div>

      <div style="background:linear-gradient(135deg,#EDE8F8,#E4DCF5);border-left:4px solid #5B2D8E;
                  border-radius:8px;padding:14px 18px;margin:20px 0;font-size:13px;
                  color:#3D1A6B;font-weight:500;">
        ⚠️ &nbsp; A <strong>waiting period of ${WAITING_PERIOD_MONTHS} months</strong> applies from the commencement date.
        During this period, no benefits will be paid for natural causes of death.
        The Accidental Death benefit (where selected) is <strong>not</strong> subject to the waiting period.
      </div>

      <p style="color:#444;font-size:13px;margin-bottom:20px;">Should you have any questions, please contact our client support team at
        <strong style="color:#5B2D8E;">support@mymint.co.za</strong>.</p>

      <div style="margin-top:24px;display:flex;align-items:flex-end;gap:20px;">
        <div style="background:#F5F2FC;border:1px solid #DDD8F0;border-radius:10px;
                    padding:14px 24px;text-align:center;">
          <img src="${SIG}" alt="signature"
               style="height:52px;display:block;margin:0 auto 6px;object-fit:contain;">
          <div style="font-weight:700;font-size:13px;color:#1A1A2E;">Lonwabo</div>
          <div style="font-size:11px;color:#777;">Chief Executive Officer</div>
          <div style="font-size:11px;color:#5B2D8E;font-weight:500;">Mint Financial Services (Pty) Ltd</div>
        </div>
      </div>

      <div style="margin-top:24px;display:flex;justify-content:flex-end;align-items:center;gap:12px;">
        <span style="font-size:10px;color:#777;text-transform:uppercase;letter-spacing:1.5px;">Underwritten by</span>
        <div style="background:#1A1A2E;color:white;font-family:'Barlow Condensed',Arial Narrow,sans-serif;
                    font-size:18px;font-weight:800;letter-spacing:2px;padding:6px 14px;
                    border-radius:6px;display:flex;align-items:center;gap:6px;">
          <span style="color:#F5D400;">GUARD</span>RISK
        </div>
        <div style="font-size:10px;color:#777;">Life Ltd — FSP 76</div>
      </div>
    </div>

    ${photoBand(IMG_HANDS)}
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
    <div style="padding:32px 36px;">
      ${secTitle("Summary of Product &amp; Service Selection")}

      <div style="margin-bottom:24px;">
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

      <div style="margin-bottom:24px;">
        ${tblHead("🛡️ &nbsp; Principal Life Plan Benefits")}
        <table>
          <thead><tr><th>Benefit Name</th><th>Plan Value</th></tr></thead>
          <tbody>${benefitRows.join("")}</tbody>
        </table>
      </div>

      <div style="background:#F5F2FC;border:1px solid #DDD8F0;border-radius:8px;
                  padding:13px 18px;font-size:13px;color:#444;margin:16px 0;">
        💳 &nbsp; Your total premium of <strong style="color:#5B2D8E;">${fmtR(totalMonthly)} per month</strong>
        will be debited from your bank account on the
        <strong style="color:#5B2D8E;">${deductionDate} of every month</strong>.
        The reference on your bank statement will be: <strong style="color:#5B2D8E;">MINT-INS ${policyNo}</strong>.
      </div>

      <div style="background:linear-gradient(135deg,#EDE8F8,#E4DCF5);border-left:4px solid #5B2D8E;
                  border-radius:8px;padding:14px 18px;font-size:13px;color:#3D1A6B;font-weight:500;">
        ⚠️ &nbsp; A waiting period of <strong>${WAITING_PERIOD_MONTHS} months</strong> applies from the commencement date.
        Please read this plan schedule in conjunction with the plan terms and conditions.
      </div>
    </div>
    ${photoBand(IMG_FAMILY, "240px", "center 25%")}
    ${footerBar(2)}
  </div>`;

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 3 — BENEFIT DETAILS + BENEFICIARIES & POLICYHOLDER
  // ═══════════════════════════════════════════════════════════════════════════

  // Main plan benefit icon row — shows premium, cover, then each addon
  const iconCells = [
    `<div style="flex:1;text-align:center;padding:14px 8px;border-right:1px solid #DDD8F0;">
      <span style="font-size:26px;display:block;margin-bottom:5px;">💰</span>
      <div style="font-size:9.5px;text-transform:uppercase;letter-spacing:0.5px;color:#3D1A6B;font-weight:600;line-height:1.3;">Monthly<br>Premium</div>
      <div style="font-size:13px;font-weight:800;color:#5B2D8E;margin-top:3px;">${fmtR(basePremium)}</div>
    </div>`,
    `<div style="flex:1;text-align:center;padding:14px 8px;border-right:1px solid #DDD8F0;">
      <span style="font-size:26px;display:block;margin-bottom:5px;">🛡️</span>
      <div style="font-size:9.5px;text-transform:uppercase;letter-spacing:0.5px;color:#3D1A6B;font-weight:600;line-height:1.3;">Cover<br>Amount</div>
      <div style="font-size:13px;font-weight:800;color:#5B2D8E;margin-top:3px;">${fmtCover(coverAmount)}</div>
    </div>`,
    ...addonDetails.map((a, i) =>
      `<div style="flex:1;text-align:center;padding:14px 8px;${i < addonDetails.length - 1 ? "border-right:1px solid #DDD8F0;" : ""}">
        <span style="font-size:26px;display:block;margin-bottom:5px;">${addonIcon(a.label)}</span>
        <div style="font-size:9.5px;text-transform:uppercase;letter-spacing:0.5px;color:#3D1A6B;font-weight:600;line-height:1.3;">${a.label.replace(/ – .+/, "").substring(0, 18)}</div>
        <div style="font-size:13px;font-weight:800;color:#5B2D8E;margin-top:3px;">${fmtR(a.premium)}</div>
      </div>`
    ),
  ];

  const addonCards = addonDetails.map(a => `
    <div style="border:1.5px solid #DDD8F0;border-radius:10px;overflow:hidden;margin-bottom:20px;">
      <div style="background:#5B2D8E;padding:10px 18px;display:flex;align-items:center;gap:10px;">
        <div style="font-size:20px;width:34px;height:34px;background:rgba(255,255,255,0.15);border-radius:50%;
                    display:flex;align-items:center;justify-content:center;flex-shrink:0;">${addonIcon(a.label)}</div>
        <h3 style="font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-size:16px;font-weight:700;
                   color:white;text-transform:uppercase;letter-spacing:0.5px;">${a.label}${a.sub ? ` – ${a.sub}` : ""}</h3>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;">
        <div style="padding:10px 18px;border-bottom:1px solid #DDD8F0;border-right:1px solid #DDD8F0;">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#777;margin-bottom:2px;">Life Assured</div>
          <div style="font-weight:700;font-size:14px;color:#3D1A6B;">${fullName}</div>
        </div>
        <div style="padding:10px 18px;border-bottom:1px solid #DDD8F0;">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#777;margin-bottom:2px;">Policy Term</div>
          <div style="font-weight:700;font-size:14px;color:#3D1A6B;">Whole of Life</div>
        </div>
        <div style="padding:10px 18px;border-right:1px solid #DDD8F0;">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#777;margin-bottom:2px;">Benefit Type</div>
          <div style="font-weight:700;font-size:14px;color:#3D1A6B;">Once Off Payout</div>
        </div>
        <div style="padding:10px 18px;">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#777;margin-bottom:2px;">Monthly Premium</div>
          <div style="font-weight:700;font-size:14px;color:#3D1A6B;">${fmtR(a.premium)}</div>
        </div>
      </div>
    </div>`).join("");

  const depTableRows = dependents.map((dep, i) => {
    const depName = [dep.firstName, dep.lastName].filter(Boolean).join(" ") || "—";
    const depType = dep.type === "spouse" ? "Spouse" : dep.type === "member" ? "Soc. Member" : "Child";
    const ageYrs  = depAge(dep.dob);
    const ageStr  = ageYrs !== null ? `${ageYrs} yrs` : "—";
    let benefit   = "Full cover";
    if (dep.type === "child" && ageYrs !== null && coverAmount) {
      const cb = getChildCoverAmount(coverAmount, ageYrs);
      benefit = cb > 0
        ? `<strong style="color:#5B2D8E;">${fmtCover(cb)} (${getChildAgeBracket(ageYrs)})</strong>`
        : "Not eligible";
    } else if (dep.type === "spouse" || dep.type === "member") {
      benefit = `<strong style="color:#5B2D8E;">${fmtCover(coverAmount)}</strong>`;
    }
    return `<tr>
      <td><strong>${depName}</strong></td>
      <td>${depType}</td>
      <td>${dep.dob || "—"}</td>
      <td>${ageStr}</td>
      <td>${benefit}</td>
    </tr>`;
  }).join("");

  const page3 = `
  <div class="page">
    ${topLogoBar()}
    <div style="padding:32px 36px;">
      ${secTitle("Benefit Details")}

      <!-- Main plan benefit card -->
      <div style="border:1.5px solid #DDD8F0;border-radius:10px;overflow:hidden;margin-bottom:20px;">
        <div style="background:#5B2D8E;padding:10px 18px;display:flex;align-items:center;gap:10px;">
          <div style="font-size:20px;width:34px;height:34px;background:rgba(255,255,255,0.15);border-radius:50%;
                      display:flex;align-items:center;justify-content:center;flex-shrink:0;">🏠</div>
          <h3 style="font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-size:16px;font-weight:700;
                     color:white;text-transform:uppercase;letter-spacing:0.5px;">${planFull}</h3>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;">
          <div style="padding:10px 18px;border-bottom:1px solid #DDD8F0;border-right:1px solid #DDD8F0;">
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#777;margin-bottom:2px;">Life Assured</div>
            <div style="font-weight:700;font-size:14px;color:#3D1A6B;">${fullName}</div>
          </div>
          <div style="padding:10px 18px;border-bottom:1px solid #DDD8F0;">
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#777;margin-bottom:2px;">Commencement Date</div>
            <div style="font-weight:700;font-size:14px;color:#3D1A6B;">${dateStr}</div>
          </div>
          <div style="padding:10px 18px;border-bottom:1px solid #DDD8F0;border-right:1px solid #DDD8F0;">
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#777;margin-bottom:2px;">Date of Birth / Age</div>
            <div style="font-weight:700;font-size:14px;color:#3D1A6B;">${age} Years</div>
          </div>
          <div style="padding:10px 18px;border-bottom:1px solid #DDD8F0;">
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#777;margin-bottom:2px;">Policy Term</div>
            <div style="font-weight:700;font-size:14px;color:#3D1A6B;">Whole of Life</div>
          </div>
          <div style="padding:10px 18px;border-bottom:1px solid #DDD8F0;border-right:1px solid #DDD8F0;">
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#777;margin-bottom:2px;">Age Band</div>
            <div style="font-weight:700;font-size:14px;color:#3D1A6B;">${ageBand}</div>
          </div>
          <div style="padding:10px 18px;border-bottom:1px solid #DDD8F0;">
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#777;margin-bottom:2px;">Premium Increases</div>
            <div style="font-weight:700;font-size:14px;color:#3D1A6B;">Not Guaranteed</div>
          </div>
          <div style="padding:10px 18px;border-right:1px solid #DDD8F0;">
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#777;margin-bottom:2px;">Waiting Period</div>
            <div style="font-weight:700;font-size:14px;color:#3D1A6B;">${WAITING_PERIOD_MONTHS} Months</div>
          </div>
          <div style="padding:10px 18px;">
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#777;margin-bottom:2px;">Deduction Date</div>
            <div style="font-weight:700;font-size:14px;color:#3D1A6B;">${deductionDate} of each month</div>
          </div>
        </div>
        <!-- Icon benefit summary row -->
        <div style="display:flex;background:#EDE8F8;border-top:1.5px solid #DDD8F0;">
          ${iconCells.join("")}
        </div>
      </div>

      ${addonCards}

      ${dependents.length > 0 ? `
        ${secTitle("Beneficiary &amp; Policyholder Details", "8px")}
        <div style="margin-bottom:24px;">
          ${tblHead("👨‍👧 &nbsp; Beneficiary Details")}
          <table>
            <thead><tr>
              <th>Name</th><th>Relationship</th><th>Date of Birth</th><th>Age</th><th>Cover Benefit</th>
            </tr></thead>
            <tbody>${depTableRows}</tbody>
          </table>
        </div>` : ""}

      <div style="margin-bottom:24px;">
        ${tblHead("👤 &nbsp; Policyholder Details")}
        <table>
          <tbody>
            <tr>
              <td style="font-weight:600;color:#1A1A2E;">Full Name</td><td>${fullName}</td>
              <td style="font-weight:600;color:#1A1A2E;">Age at Inception</td><td>${age} years</td>
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
    ${photoBand(IMG_KIDS, "240px", "center 25%")}
    ${footerBar(3)}
  </div>`;

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 4 — TERMS & CONDITIONS
  // ═══════════════════════════════════════════════════════════════════════════
  function tcBlock(icon, head, body) {
    return `<div style="margin-bottom:20px;">
      <div style="background:#5B2D8E;color:white;padding:8px 16px;
                  font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-size:14px;
                  font-weight:700;letter-spacing:1px;text-transform:uppercase;border-radius:5px 5px 0 0;">
        ${icon} &nbsp; ${head}</div>
      <div style="background:#F5F2FC;border:1px solid #DDD8F0;border-top:none;padding:13px 16px;
                  font-size:13px;color:#444;border-radius:0 0 5px 5px;line-height:1.65;">${body}</div>
    </div>`;
  }

  const page4 = `
  <div class="page">
    ${topLogoBar()}
    <div style="padding:32px 36px;">
      ${secTitle("Important Terms &amp; Conditions")}

      ${tcBlock("⏳", "Waiting Period",
        `A waiting period of ${WAITING_PERIOD_MONTHS} months applies from the commencement date. No benefits will be payable for natural causes of death during this period. Where the Accidental Death benefit has been selected, that benefit is not subject to the waiting period.`)}
      ${tcBlock("📈", "Premium Changes",
        "Your monthly premium may increase in line with inflation or as a result of adverse claims experience. Mint Financial Services will give you thirty-one (31) days' written notice of any premium or benefit change. Continued payment after notice constitutes acceptance.")}
      ${tcBlock("📋", "Claim Submission",
        "All claims must be submitted within six (6) months of the date of the insured event. Required documentation includes a certified copy of the death certificate, the ID documents of the deceased and the claimant, the completed Mint claim form, and any other documents requested by the insurer.")}
      ${tcBlock("⚠️", "Non-Disclosure",
        "Do not sign any blank or partially completed claim forms. Failure to disclose any material information — including pre-existing health conditions — may result in a claim being repudiated. All information you provide must be complete, accurate, and truthful.")}
      ${tcBlock("🔄", "Lapse &amp; Reinstatement",
        "Should premiums not be received within the thirty (30) day grace period, this policy will lapse and no benefits will be payable. Reinstatement of a lapsed policy is subject to Mint's underwriting approval and may result in a new waiting period being applied.")}
      ${tcBlock("❌", "Cancellation",
        "You may cancel this policy at any time by providing written notice to Mint Financial Services. No refund of premiums will be made. Contact us at support@mymint.co.za.")}
      ${tcBlock("📣", "Complaints",
        "If you are dissatisfied with any aspect of our service, contact us at support@mymint.co.za. If your complaint is not resolved, you may escalate it to the FSCA (fsca.co.za) or the Ombud for Financial Services Providers: <strong>0860 663 274</strong>.")}

      ${secTitle("Remuneration Structure", "8px")}
      <div style="margin-bottom:16px;">
        <table>
          <thead><tr><th>Category</th><th style="text-align:right">Value</th></tr></thead>
          <tbody>
            <tr>
              <td style="vertical-align:top;">Your referring intermediary will receive initial remuneration for the first twelve months, payable upfront on inception of the cover and recoverable should the plan lapse.</td>
              <td style="text-align:right;font-weight:700;color:#5B2D8E;white-space:nowrap;vertical-align:top;">Per FAIS schedule</td>
            </tr>
            <tr style="background:#F9F7FF;">
              <td style="vertical-align:top;">Ongoing administration and intermediary fees payable to Mint Financial Services (Pty) Ltd each month from the plan.</td>
              <td style="text-align:right;font-weight:700;color:#5B2D8E;white-space:nowrap;vertical-align:top;">Included in premium</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p style="font-size:11.5px;color:#777;margin-top:8px;">
        Please note that these amounts exclude VAT. Future premium increases on your plan may attract additional commission.
      </p>
    </div>
    ${photoBand(IMG_SUNSET, "220px", "center 40%")}
    ${footerBar(4)}
  </div>`;

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 5 — FAIS DISCLOSURE
  // ═══════════════════════════════════════════════════════════════════════════
  function faisBlock(icon, head, bodyHtml) {
    return `<div style="margin-bottom:20px;">
      <div style="background:#5B2D8E;color:white;padding:8px 16px;
                  font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-size:13px;
                  font-weight:700;letter-spacing:1.5px;text-transform:uppercase;border-radius:5px 5px 0 0;">
        ${icon} &nbsp; ${head}</div>
      <div style="border:1px solid #DDD8F0;border-top:none;padding:13px 16px;font-size:12.5px;
                  color:#444;border-radius:0 0 5px 5px;line-height:1.7;background:white;">
        ${bodyHtml}</div>
    </div>`;
  }

  const page5 = `
  <div class="page">
    ${topLogoBar()}
    <div style="padding:32px 36px;">
      ${secTitle("FAIS Disclosure Notice")}
      <p style="font-style:italic;color:#777;font-size:12.5px;margin-bottom:20px;">
        Disclosures required in terms of the Financial Advisory and Intermediary Services Act 37 of 2002</p>

      ${faisBlock("🏢", "The Administrator / Binder Holder", `
        <p><strong>Name:</strong> Mint Financial Services (Pty) Ltd</p>
        <p><strong>Physical Address:</strong> Sandton, Johannesburg, 2196</p>
        <p><strong>Postal Address:</strong> PO Box 786015, Sandton, 2146</p>
        <p><strong>Email:</strong> support@mymint.co.za &nbsp;|&nbsp; <strong>Website:</strong> www.mymint.co.za</p>
        <p><strong>FSP Licence Number:</strong> ${FSP_NUMBER} &nbsp;|&nbsp; Category: Long-term Insurance: Category A, B1, B1-A, B2, B2-A, C</p>`)}

      ${faisBlock("💼", "The Financial Services Provider Rendering Advice", `
        <p><strong>Name:</strong> Mint Financial Services (Pty) Ltd &nbsp;|&nbsp; <strong>FSP Licence:</strong> ${FSP_NUMBER}</p>
        <p>Mint Financial Services is an Authorised Financial Services Provider. Products are offered subject to the FAIS Act and the Long-term Insurance Act.</p>`)}

      ${faisBlock("🏦", "Information About the Insurer", `
        <p><strong>Name:</strong> GuardRisk Life Limited ("GuardRisk") &nbsp;|&nbsp; <strong>FAIS Number:</strong> FSP 76</p>
        <p><strong>Registration Number:</strong> 1999/013922/06</p>
        <p><strong>Physical Address:</strong> The MARC, Tower 2, 129 Rivonia Road, Sandton, 2196</p>
        <p><strong>Website:</strong> www.guardrisk.co.za</p>
        <p>GuardRisk is an Authorised Financial Services Provider in terms of FAIS (FSP 76). Professional Indemnity Cover and Fidelity Guarantee Cover are in place.</p>`)}

      ${faisBlock("⚖️", "Conflict of Interest Policy",
        `You can request a copy of our Conflict of Interest Policy on our website <strong>www.mymint.co.za</strong>.`)}

      ${faisBlock("🛡️", "Guarantees and Undertakings",
        "Both the Administrator and Insurer carry Professional Indemnity and Fidelity Guarantee Insurance. The Financial Service Providers accept responsibility for the lawful actions of their Representatives in rendering Financial Services within the course and scope of their employment.")}

      ${faisBlock("⚠️", "Warnings &amp; Other Matters of Importance", `
        <ul style="padding-left:18px;">
          <li style="margin-bottom:4px;">Do not sign any blank or partially completed claim forms.</li>
          <li style="margin-bottom:4px;">You have a <strong>thirty-one (31) day cooling-off period</strong> from the date of receipt within which you may cancel in writing at no cost.</li>
          <li style="margin-bottom:4px;">Cover will cease upon cancellation of the plan.</li>
          <li style="margin-bottom:4px;">You will always be given a reason for the repudiation of a claim.</li>
          <li style="margin-bottom:4px;">If you fail to disclose facts relevant to your insurance, this may influence the assessment of a claim by the Insurer.</li>
          <li style="margin-bottom:4px;">Please read this plan schedule in conjunction with the plan terms and conditions.</li>
        </ul>`)}
    </div>
    ${photoBand(IMG_FOREST, "220px", "center 30%")}
    ${footerBar(5)}
  </div>`;

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 6 — REGULATORY CONTACTS
  // ═══════════════════════════════════════════════════════════════════════════
  function regCard(icon, head, bodyHtml) {
    return `<div style="border:1.5px solid #DDD8F0;border-radius:10px;overflow:hidden;">
      <div style="background:#5B2D8E;padding:10px 16px;color:white;
                  font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-size:14px;
                  font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">
        ${icon} &nbsp; ${head}</div>
      <div style="padding:13px 16px;font-size:12px;color:#444;line-height:1.7;background:#F5F2FC;">
        ${bodyHtml}</div>
    </div>`;
  }

  const page6 = `
  <div class="page">
    ${topLogoBar()}
    <div style="padding:32px 36px;">
      ${secTitle("Regulatory &amp; Contact Information")}

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
        ${regCard("🏛️", "National Financial Ombud Scheme", `
          <p>For claims/service-related matters</p>
          <p><strong>Address:</strong> Claremont Central Building, 6th Floor, 6 Vineyard Road, Claremont, 7708</p>
          <p><strong>Email:</strong> info@nfosa.co.za &nbsp;|&nbsp; <strong>Website:</strong> www.nfosa.co.za</p>`)}
        ${regCard("📞", "Financial Sector Conduct Authority", `
          <p>For market conduct related matters</p>
          <p><strong>Postal Address:</strong> PO Box 35655, Menlo Park, 0102</p>
          <p><strong>Telephone:</strong> +27 12 428 8000 &nbsp;|&nbsp; <strong>Email:</strong> info@fsca.co.za</p>`)}
        ${regCard("📜", "Registrar of Long-Term Insurance", `
          <p><strong>Postal Address:</strong> PO Box 35655, Menlo Park, 0102</p>
          <p><strong>Telephone:</strong> +27 12 428 8000 &nbsp;|&nbsp; <strong>Email:</strong> info@fsca.co.za</p>`)}
        ${regCard("✉️", "Mint Client Support", `
          <p><strong>Email:</strong> support@mymint.co.za</p>
          <p><strong>Website:</strong> www.mymint.co.za</p>
          <p><strong>FSP No:</strong> ${FSP_NUMBER} &nbsp;|&nbsp; <strong>Underwriter:</strong> GuardRisk Life Ltd — FSP 76</p>`)}
      </div>
    </div>
    ${photoBand(IMG_HANDS, "300px", "center 40%")}
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
    --purple: #5B2D8E;
    --purple-dark: #3D1A6B;
    --purple-light: #EDE8F8;
    --purple-pale: #F5F2FC;
    --border: #DDD8F0;
    --row-alt: #F9F7FF;
    --text: #1A1A2E;
    --text-mid: #444;
  }
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Barlow', Helvetica, Arial, sans-serif;
    background: #EEEAF5;
    color: var(--text);
    font-size: 13.5px;
    line-height: 1.6;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .doc { max-width: 860px; margin: 0 auto; padding: 28px 16px; }
  .page {
    background: white;
    border-radius: 14px;
    box-shadow: 0 6px 48px rgba(91,45,142,0.13);
    overflow: hidden;
    margin-bottom: 32px;
  }
  table { width: 100%; border-collapse: collapse; }
  table thead tr { background: var(--purple-light); }
  table thead th {
    padding: 10px 14px; text-align: left; font-weight: 700;
    font-size: 12px; color: var(--purple); text-transform: uppercase; letter-spacing: 0.5px;
  }
  table tbody tr { border-bottom: 1px solid var(--border); }
  table tbody tr:nth-child(even) { background: var(--row-alt); }
  table tbody td { padding: 10px 14px; font-size: 13px; color: var(--text-mid); }
  table tfoot tr { background: var(--purple-dark); }
  table tfoot td { padding: 11px 14px; font-weight: 700; color: white; font-size: 13.5px; }
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
