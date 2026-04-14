import {
  getChildCoverAmount,
  getChildAgeBracket,
  FSP_NUMBER,
  WAITING_PERIOD_MONTHS,
} from "./funeralCoverRates";

// ─── Utilities ────────────────────────────────────────────────────────────────
function policyRef() {
  return `MNT${Math.floor(100000 + Math.random() * 899999)}`;
}
function todayStr() {
  return new Date().toLocaleDateString("en-ZA", {
    day: "2-digit", month: "long", year: "numeric",
  }).toUpperCase();
}
function fmtR(n) {
  return `R\u00a0${Number(n).toLocaleString("en-ZA", {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
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
  if (l.includes("grocery"))    return "🛒";
  return "🛡️";
}
function mintLogo(height = "24px") {
  const BASE = typeof window !== "undefined" ? window.location.origin : "";
  return `<img src="${BASE}/assets/LOGO%202%20WHITE%20MINT.svg" alt="mint" style="height:${height};width:auto;display:block;">`;
}

// ─── Design tokens (Flutter-inspired) ────────────────────────────────────────
const C = {
  purple:      "#5B2D8E",
  purpleDark:  "#3D1A6B",
  purpleLight: "#EDE8F8",
  purplePale:  "#F5F2FC",
  border:      "#DDD8F0",
  rowAlt:      "#F9F7FF",
  text:        "#1A1A2E",
  textMid:     "#444444",
  white:       "#FFFFFF",
  success:     "#2E7D32",
};

// ─── Shared layout helpers ────────────────────────────────────────────────────
function appBar(title) {
  return `
  <div style="background:${C.purpleDark};padding:12px 20px;display:flex;align-items:center;gap:14px;">
    ${mintLogo("26px")}
    <div style="flex:1;">
      <div style="font-family:'Barlow Condensed',Arial,sans-serif;font-size:11px;
                  color:rgba(255,255,255,0.6);letter-spacing:2px;text-transform:uppercase;">
        Wills &amp; Funeral Specialists
      </div>
    </div>
    <div style="font-family:'Barlow Condensed',Arial,sans-serif;font-size:22px;
                font-weight:800;color:${C.white};letter-spacing:1px;text-transform:uppercase;">
      ${title}
    </div>
  </div>
  <div style="height:3px;background:linear-gradient(90deg,${C.purple},#9B59B6,${C.purpleLight});"></div>`;
}

function sectionHeader(title) {
  return `
  <div style="background:${C.purple};padding:8px 14px;border-radius:6px 6px 0 0;
              font-family:'Barlow Condensed',Arial,sans-serif;font-size:13px;
              font-weight:700;color:${C.white};letter-spacing:1.5px;text-transform:uppercase;">
    ${title}
  </div>`;
}

function card(content, extra = "") {
  return `
  <div style="border:1.5px solid ${C.border};border-radius:8px;overflow:hidden;
              margin-bottom:14px;${extra}">
    ${content}
  </div>`;
}

function dataRow(label, value, alt = false) {
  return `
  <div style="display:flex;align-items:center;padding:9px 14px;
              border-bottom:1px solid ${C.border};
              background:${alt ? C.rowAlt : C.white};">
    <span style="flex:1;font-size:12px;color:${C.textMid};">${label}</span>
    <span style="font-size:12px;font-weight:700;color:${C.text};">${value}</span>
  </div>`;
}

function benefitRow(label, value, alt = false) {
  return `
  <div style="display:flex;align-items:center;justify-content:space-between;
              padding:10px 14px;border-bottom:1px solid ${C.border};
              background:${alt ? C.rowAlt : C.white};">
    <span style="font-size:12px;font-weight:500;color:${C.textMid};">${label}</span>
    <span style="font-size:12px;font-weight:700;color:${C.purple};">${value}</span>
  </div>`;
}

function dependentCard(name, relation, cover) {
  return `
  <div style="background:${C.purplePale};border:1px solid ${C.border};border-radius:8px;
              padding:10px 14px;margin-bottom:8px;
              display:flex;align-items:center;justify-content:space-between;">
    <div>
      <div style="font-size:13px;font-weight:700;color:${C.text};">${name}</div>
      <div style="font-size:11px;color:${C.textMid};margin-top:2px;">${relation}</div>
    </div>
    <div style="font-size:13px;font-weight:700;color:${C.text};">${cover}</div>
  </div>`;
}

function heroBand(src, height = "200px", pos = "center 40%") {
  return `
  <div style="width:100%;height:${height};overflow:hidden;">
    <img src="${src}" alt=""
      style="width:100%;height:100%;object-fit:cover;object-position:${pos};display:block;">
  </div>`;
}

function footerBar(policyNo, fullName, pageNum, totalPages) {
  return `
  <div style="background:${C.purpleDark};display:flex;justify-content:space-between;
              align-items:center;padding:7px 18px;font-size:9.5px;color:rgba(255,255,255,0.7);">
    <span style="color:${C.white};font-weight:700;font-size:11px;letter-spacing:1px;">mint</span>
    <span>Policy Schedule – ${fullName} | ${policyNo} | Page ${pageNum} of ${totalPages}</span>
    <span>support@mymint.co.za</span>
  </div>
  <div style="background:${C.purple};text-align:center;padding:4px 18px;
              font-size:8.5px;color:rgba(255,255,255,0.55);">
    Mint Financial Services (Pty) Ltd | FSP No. ${FSP_NUMBER} | Underwritten by GuardRisk Life Ltd — FSP 76
  </div>`;
}

function noticeBox(html) {
  return `
  <div style="background:${C.purpleLight};border-left:4px solid ${C.purple};
              border-radius:6px;padding:10px 14px;margin:10px 0;
              font-size:11.5px;color:${C.purpleDark};font-weight:500;line-height:1.6;">
    ${html}
  </div>`;
}

function tcBlock(icon, head, body) {
  return `
  <div style="margin-bottom:10px;">
    <div style="background:${C.purple};color:${C.white};padding:6px 12px;border-radius:4px 4px 0 0;
                font-family:'Barlow Condensed',Arial,sans-serif;font-size:12px;
                font-weight:700;letter-spacing:1px;text-transform:uppercase;">
      ${icon}&nbsp;${head}
    </div>
    <div style="background:${C.purplePale};border:1px solid ${C.border};border-top:none;
                padding:8px 12px;font-size:11.5px;color:${C.textMid};
                border-radius:0 0 4px 4px;line-height:1.6;">
      ${body}
    </div>
  </div>`;
}

function infoBlock(icon, head, bodyHtml) {
  return `
  <div style="margin-bottom:10px;">
    <div style="background:${C.purple};color:${C.white};padding:6px 12px;border-radius:4px 4px 0 0;
                font-family:'Barlow Condensed',Arial,sans-serif;font-size:12px;
                font-weight:700;letter-spacing:1px;text-transform:uppercase;">
      ${icon}&nbsp;${head}
    </div>
    <div style="background:${C.white};border:1px solid ${C.border};border-top:none;
                padding:8px 12px;font-size:11px;color:${C.textMid};
                border-radius:0 0 4px 4px;line-height:1.6;">
      ${bodyHtml}
    </div>
  </div>`;
}

function regCard(icon, head, bodyHtml) {
  return `
  <div style="border:1.5px solid ${C.border};border-radius:8px;overflow:hidden;">
    <div style="background:${C.purple};padding:7px 12px;color:${C.white};
                font-family:'Barlow Condensed',Arial,sans-serif;font-size:12px;
                font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">
      ${icon}&nbsp;${head}
    </div>
    <div style="padding:9px 12px;font-size:11px;color:${C.textMid};
                line-height:1.6;background:${C.purplePale};">
      ${bodyHtml}
    </div>
  </div>`;
}

// ─── Main export ─────────────────────────────────────────────────────────────
export async function generateFuneralCoverPDF({
  firstName, lastName, age, ageBand,
  planType, planLabel, coverAmount, basePremium,
  addonDetails = [], totalMonthly, deductionDate, societySize,
  dependents = [],
  overridePolicyNo,
  preOpenedWin,
}) {
  const policyNo  = overridePolicyNo || policyRef();
  const dateStr   = todayStr();
  const fullName  = `${firstName} ${lastName}`.trim();
  const planFull  = `${planLabel} Funeral Plan${societySize ? ` (${societySize})` : ""}`;
  const TOTAL_PAGES = 6;

  const BASE        = window.location.origin;
  const SIG         = `${BASE}/assets/ceo-signature.png`;
  const IMG_HANDS   = `${BASE}/assets/images/hands-hero.jpeg`;
  const IMG_FAMILY  = `${BASE}/assets/images/family-hero.jpeg`;
  const IMG_KIDS    = `${BASE}/assets/images/children-hero.jpeg`;
  const IMG_SUNSET  = `${BASE}/assets/images/sunset-family.jpeg`;
  const IMG_FOREST  = `${BASE}/assets/images/forest-family.jpeg`;

  const spouseDep = dependents.find(d => d.type === "spouse");
  const childDeps = dependents.filter(d => d.type === "child");

  // ───────────────────────────────────────────────────────────────────────────
  // PAGE 1 — WELCOME
  // ───────────────────────────────────────────────────────────────────────────
  const page1 = `
  <div class="page">
    ${heroBand(IMG_HANDS, "200px", "center 40%")}
    ${appBar("Policy Schedule")}

    <div style="background:${C.purpleDark};display:flex;justify-content:space-between;
                align-items:center;padding:7px 20px;border-top:1px solid rgba(255,255,255,0.1);">
      <span style="font-family:'Barlow Condensed',Arial,sans-serif;font-size:13px;
                   font-weight:700;color:${C.white};letter-spacing:2px;">${policyNo}</span>
      <span style="font-size:11px;color:rgba(255,255,255,0.6);">${dateStr}</span>
    </div>

    <div style="padding:22px 24px;">
      <h1 style="font-family:'Barlow Condensed',Arial,sans-serif;font-size:28px;
                 font-weight:800;color:${C.purple};text-transform:uppercase;
                 letter-spacing:1px;margin-bottom:4px;">
        Dear ${fullName},
      </h1>
      <p style="font-size:13px;color:${C.textMid};line-height:1.7;margin-bottom:12px;">
        Thank you for choosing the Mint Funeral Plan. We are honoured to be your trusted financial
        services partner and committed to ensuring your loved ones are cared for at their most
        vulnerable time.
      </p>
      <p style="font-size:13px;color:${C.textMid};line-height:1.7;margin-bottom:12px;">
        Your policy provides your family with an <strong style="color:${C.purple};">immediate
        lump-sum payout</strong> upon a valid claim — covering funeral costs and providing
        financial relief when it matters most. This policy is underwritten by a licensed South
        African Life Insurer under the Long-term Insurance Act and FAIS.
      </p>
      <p style="font-size:13px;color:${C.textMid};line-height:1.7;margin-bottom:18px;">
        Please read this Policy Schedule carefully. If any information is incorrect, notify us
        in writing within <strong style="color:${C.purple};">thirty-one (31) days</strong>.
      </p>

      ${noticeBox(`⚠️ &nbsp; A <strong>waiting period of ${WAITING_PERIOD_MONTHS} months</strong>
        applies from commencement. No benefits will be paid for natural causes of death during
        this period. The Accidental Death benefit (where selected) is
        <strong>not</strong> subject to the waiting period.`)}

      <div style="margin-top:20px;display:flex;justify-content:space-between;align-items:flex-end;gap:12px;">
        <div style="background:${C.purplePale};border:1px solid ${C.border};border-radius:8px;
                    padding:10px 18px;text-align:center;">
          <img src="${SIG}" alt="signature"
               style="height:40px;display:block;margin:0 auto 4px;object-fit:contain;">
          <div style="font-weight:700;font-size:12px;color:${C.text};">Lonwabo</div>
          <div style="font-size:10px;color:#777;">Chief Executive Officer</div>
          <div style="font-size:10px;color:${C.purple};font-weight:500;">Mint Financial Services (Pty) Ltd</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:9px;color:#777;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:4px;">
            Underwritten by
          </div>
          <div style="background:${C.text};color:${C.white};font-family:'Barlow Condensed',Arial,sans-serif;
                      font-size:15px;font-weight:800;letter-spacing:2px;padding:6px 14px;
                      border-radius:5px;display:inline-flex;align-items:center;gap:4px;">
            <span style="color:#F5D400;">GUARD</span>RISK
          </div>
          <div style="font-size:9px;color:#777;margin-top:3px;">Life Ltd — FSP 76</div>
        </div>
      </div>
    </div>

    <div style="margin-top:6px;">
      ${footerBar(policyNo, fullName, 1, TOTAL_PAGES)}
    </div>
  </div>`;

  // ───────────────────────────────────────────────────────────────────────────
  // PAGE 2 — PLAN SUMMARY
  // ───────────────────────────────────────────────────────────────────────────
  const page2 = `
  <div class="page">
    ${heroBand(IMG_FAMILY, "160px", "center 25%")}
    ${appBar("Plan Summary")}

    <div style="padding:20px 24px;">
      ${card(`
        ${sectionHeader("📋 &nbsp; Policy Details")}
        ${dataRow("Policy Number", policyNo, false)}
        ${dataRow("Schedule Date", dateStr, true)}
        ${dataRow("Policyholder", fullName, false)}
        ${dataRow("Age at Inception", `${age} years`, true)}
        ${dataRow("Age Band", ageBand, false)}
        ${dataRow("Plan Type", planFull, true)}
        ${dataRow("Deduction Date", `${deductionDate} of each month`, false)}
        ${dataRow("Bank Reference", `MINT-INS ${policyNo}`, true)}
      `)}

      ${card(`
        ${sectionHeader("💰 &nbsp; Premium Summary")}
        ${dataRow("Base Premium", fmtR(basePremium), false)}
        ${addonDetails.map((a, i) => dataRow(a.label, `+${fmtR(a.premium)}`, i % 2 !== 0)).join("")}
        <div style="display:flex;align-items:center;justify-content:space-between;
                    padding:12px 14px;background:${C.purple};">
          <span style="font-size:13px;font-weight:700;color:${C.white};">Total Monthly Premium</span>
          <span style="font-size:16px;font-weight:800;color:${C.white};">${fmtR(totalMonthly)}</span>
        </div>
      `)}

      ${noticeBox(`💳 &nbsp; Your premium will be debited on the <strong>${deductionDate} of every month</strong>.
        Your bank statement will show: <strong>MINT-INS ${policyNo}</strong>`)}
    </div>

    ${footerBar(policyNo, fullName, 2, TOTAL_PAGES)}
  </div>`;

  // ───────────────────────────────────────────────────────────────────────────
  // PAGE 3 — BENEFIT DETAILS & DEPENDENTS
  // ───────────────────────────────────────────────────────────────────────────
  const dependentsSection = dependents.length > 0 && planType !== "individual" ? `
    ${card(`
      ${sectionHeader("👨‍👧 &nbsp; Covered Dependents")}
      <div style="padding:12px 14px;">
        ${dependents.map(dep => {
          const depName = [dep.firstName, dep.lastName].filter(Boolean).join(" ") || "—";
          const ageYrs = depAge(dep.dob);
          const ageStr = ageYrs !== null ? ` (${ageYrs} yrs)` : "";
          const relation = dep.type === "spouse" ? "Spouse" : dep.type === "member" ? "Society Member" : "Child";
          let cover = "Full cover";
          if (dep.type === "child" && ageYrs !== null && coverAmount) {
            const cb = getChildCoverAmount(coverAmount, ageYrs);
            cover = cb > 0
              ? `${fmtCover(cb)} (${getChildAgeBracket(ageYrs)})`
              : "Not eligible";
          } else if (dep.type === "spouse" || dep.type === "member") {
            cover = fmtCover(coverAmount);
          }
          return dependentCard(depName, `${relation}${ageStr}`, cover);
        }).join("")}
      </div>
    `)}
  ` : "";

  const page3 = `
  <div class="page">
    ${heroBand(IMG_KIDS, "160px", "center 20%")}
    ${appBar("Benefit Details")}

    <div style="padding:20px 24px;">
      ${card(`
        ${sectionHeader("🛡️ &nbsp; Core Cover — ${planFull}")}
        ${benefitRow("Funeral Cover — Main Member", fmtCover(coverAmount), false)}
        ${planType !== "individual" && spouseDep ? benefitRow("Spouse Funeral Cover", fmtCover(coverAmount), true) : ""}
        ${planType !== "individual" && childDeps.length > 0 ? benefitRow(`Children (${childDeps.length})`, "Per age bracket — see dependents below", childDeps.length % 2 === 0) : ""}
        ${addonDetails.map((a, i) => benefitRow(
          `${addonIcon(a.label)}&nbsp; ${a.label}${a.sub ? ` — ${a.sub}` : ""}`,
          fmtR(a.premium) + "/mo",
          (i + (spouseDep ? 1 : 0) + (childDeps.length > 0 ? 1 : 0)) % 2 !== 0
        )).join("")}
        <div style="display:flex;align-items:center;justify-content:space-between;
                    padding:11px 14px;background:${C.purple};border-top:2px solid ${C.purpleDark};">
          <span style="font-size:12px;font-weight:700;color:${C.white};">Total Monthly</span>
          <span style="font-size:15px;font-weight:800;color:${C.white};">${fmtR(totalMonthly)}</span>
        </div>
      `)}

      ${dependentsSection}

      ${noticeBox(`⚠️ &nbsp; A waiting period of <strong>${WAITING_PERIOD_MONTHS} months</strong>
        applies from the commencement date. Accidental Death benefit has no waiting period.`)}
    </div>

    ${footerBar(policyNo, fullName, 3, TOTAL_PAGES)}
  </div>`;

  // ───────────────────────────────────────────────────────────────────────────
  // PAGE 4 — TERMS & CONDITIONS
  // ───────────────────────────────────────────────────────────────────────────
  const page4 = `
  <div class="page">
    ${heroBand(IMG_SUNSET, "160px", "center 50%")}
    ${appBar("Terms & Conditions")}

    <div style="padding:20px 24px;">
      ${tcBlock("⏳", "Waiting Period",
        `A waiting period of <strong>${WAITING_PERIOD_MONTHS} months</strong> applies from commencement.
        No benefits are payable for natural causes of death during this period. The Accidental
        Death benefit (where selected) is not subject to the waiting period.`)}
      ${tcBlock("📈", "Premium Changes",
        "Your monthly premium may increase in line with inflation or adverse claims experience. Mint will give you thirty-one (31) days' written notice of any change.")}
      ${tcBlock("📋", "Claim Submission",
        "All claims must be submitted within six (6) months of the insured event. Required: certified death certificate, ID documents, completed Mint claim form, and any additional documents requested.")}
      ${tcBlock("⚠️", "Non-Disclosure",
        "Failure to disclose any material information — including pre-existing health conditions — may result in a claim being repudiated. All information must be accurate and truthful.")}
      ${tcBlock("🔄", "Lapse & Reinstatement",
        "Should premiums not be received within the thirty (30) day grace period, this policy will lapse. Reinstatement is subject to underwriting approval and may incur a new waiting period.")}
      ${tcBlock("❌", "Cancellation",
        "You may cancel this policy at any time by written notice. No refund of premiums will be made. Contact: support@mymint.co.za")}
      ${tcBlock("📣", "Complaints",
        "Contact us at support@mymint.co.za. Unresolved complaints may be escalated to the FSCA (fsca.co.za) or the Ombud for Financial Services Providers: <strong>0860 663 274</strong>.")}
    </div>

    ${footerBar(policyNo, fullName, 4, TOTAL_PAGES)}
  </div>`;

  // ───────────────────────────────────────────────────────────────────────────
  // PAGE 5 — FAIS DISCLOSURE
  // ───────────────────────────────────────────────────────────────────────────
  const page5 = `
  <div class="page">
    ${heroBand(IMG_FOREST, "160px", "center 35%")}
    ${appBar("FAIS Disclosure")}

    <div style="padding:20px 24px;">
      <p style="font-style:italic;color:#777;font-size:11px;margin-bottom:14px;">
        Disclosures required under the Financial Advisory and Intermediary Services Act 37 of 2002
      </p>

      ${infoBlock("🏢", "The Administrator / Binder Holder", `
        <p><strong>Name:</strong> Mint Financial Services (Pty) Ltd &nbsp;|&nbsp;
           <strong>FSP:</strong> ${FSP_NUMBER}</p>
        <p><strong>Address:</strong> Sandton, Johannesburg, 2196 &nbsp;|&nbsp;
           <strong>Email:</strong> support@mymint.co.za &nbsp;|&nbsp;
           <strong>Web:</strong> www.mymint.co.za</p>
        <p><strong>Category:</strong> Long-term Insurance: A, B1, B1-A, B2, B2-A, C</p>`)}

      ${infoBlock("💼", "Financial Services Provider", `
        <p><strong>Name:</strong> Mint Financial Services (Pty) Ltd &nbsp;|&nbsp;
           <strong>FSP Licence:</strong> ${FSP_NUMBER}</p>
        <p>An Authorised Financial Services Provider under the FAIS Act and Long-term Insurance Act.</p>`)}

      ${infoBlock("🏦", "The Insurer", `
        <p><strong>Name:</strong> GuardRisk Life Limited &nbsp;|&nbsp;
           <strong>FAIS No:</strong> FSP 76 &nbsp;|&nbsp;
           <strong>Reg:</strong> 1999/013922/06</p>
        <p><strong>Address:</strong> The MARC, Tower 2, 129 Rivonia Road, Sandton, 2196</p>
        <p>GuardRisk is an Authorised Financial Services Provider. Professional Indemnity and
           Fidelity Guarantee Cover are in place.</p>`)}

      ${infoBlock("⚖️", "Conflict of Interest",
        `A copy of our Conflict of Interest Policy is available at <strong>www.mymint.co.za</strong>.`)}

      ${infoBlock("⚠️", "Important Warnings", `
        <ul style="padding-left:16px;">
          <li>Do not sign blank or partially completed claim forms.</li>
          <li>You have a <strong>thirty-one (31) day cooling-off period</strong> from receipt
              within which you may cancel in writing at no cost.</li>
          <li>Cover will cease upon cancellation.</li>
          <li>Failure to disclose relevant facts may influence the assessment of a claim.</li>
        </ul>`)}
    </div>

    ${footerBar(policyNo, fullName, 5, TOTAL_PAGES)}
  </div>`;

  // ───────────────────────────────────────────────────────────────────────────
  // PAGE 6 — REGULATORY CONTACTS
  // ───────────────────────────────────────────────────────────────────────────
  const page6 = `
  <div class="page">
    ${heroBand(IMG_HANDS, "160px", "center 40%")}
    ${appBar("Contact Information")}

    <div style="padding:20px 24px;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
        ${regCard("🏛️", "National Financial Ombud", `
          <p>For claims/service-related matters</p>
          <p><strong>Address:</strong> Claremont Central Building, 6th Floor, 6 Vineyard Road,
             Claremont, 7708</p>
          <p><strong>Email:</strong> info@nfosa.co.za &nbsp;|&nbsp;
             <strong>Web:</strong> www.nfosa.co.za</p>`)}
        ${regCard("📞", "Financial Sector Conduct Authority", `
          <p>For market conduct matters</p>
          <p><strong>Postal:</strong> PO Box 35655, Menlo Park, 0102</p>
          <p><strong>Tel:</strong> +27 12 428 8000 &nbsp;|&nbsp;
             <strong>Email:</strong> info@fsca.co.za</p>`)}
        ${regCard("📜", "Registrar of Long-Term Insurance", `
          <p><strong>Postal:</strong> PO Box 35655, Menlo Park, 0102</p>
          <p><strong>Tel:</strong> +27 12 428 8000 &nbsp;|&nbsp;
             <strong>Email:</strong> info@fsca.co.za</p>`)}
        ${regCard("✉️", "Mint Client Support", `
          <p><strong>Email:</strong> support@mymint.co.za</p>
          <p><strong>Web:</strong> www.mymint.co.za</p>
          <p><strong>FSP No:</strong> ${FSP_NUMBER} &nbsp;|&nbsp;
             <strong>Underwriter:</strong> GuardRisk Life Ltd — FSP 76</p>`)}
      </div>

      <div style="background:${C.purpleDark};border-radius:8px;padding:16px 20px;text-align:center;">
        <div style="font-family:'Barlow Condensed',Arial,sans-serif;font-size:14px;
                    font-weight:700;color:${C.white};letter-spacing:2px;margin-bottom:4px;">
          YOUR POLICY REFERENCE
        </div>
        <div style="font-family:'Barlow Condensed',Arial,sans-serif;font-size:26px;
                    font-weight:800;color:#F5D400;letter-spacing:4px;">
          ${policyNo}
        </div>
        <div style="font-size:11px;color:rgba(255,255,255,0.6);margin-top:4px;">
          ${fullName} &nbsp;·&nbsp; ${dateStr}
        </div>
      </div>
    </div>

    ${footerBar(policyNo, fullName, 6, TOTAL_PAGES)}
  </div>`;

  // ───────────────────────────────────────────────────────────────────────────
  // ASSEMBLE & OPEN PRINT WINDOW
  // ───────────────────────────────────────────────────────────────────────────
  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Mint Policy Schedule — ${policyNo}</title>
<link href="https://fonts.googleapis.com/css2?family=Barlow:wght@300;400;500;600;700;800&family=Barlow+Condensed:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Barlow', Helvetica, Arial, sans-serif;
    background: #EEEAF5;
    color: #1A1A2E;
    font-size: 12px;
    line-height: 1.5;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .doc { max-width: 860px; margin: 0 auto; padding: 16px 12px; }
  .page {
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 32px rgba(91,45,142,0.12);
    overflow: hidden;
    margin-bottom: 24px;
  }
  p { margin-bottom: 4px; }
  li { margin-bottom: 4px; }
  @media print {
    body { background: white; }
    .doc { padding: 0; max-width: none; }
    .page {
      border-radius: 0;
      box-shadow: none;
      margin: 0;
      page-break-after: always;
    }
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

  // Return the HTML so the caller can open it via a Blob URL (more reliable than document.write)
  return { policyNo, dateStr, fullHtml };
}
