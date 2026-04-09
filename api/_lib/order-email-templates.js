/**
 * Mint | Wealth-as-a-Service South Africa
 * Professional Email Templates
 * 
 * Usage:
 *   import { buildOrderConfirmationHtml, formatZar, formatDate } from './mint-email-templates.js';
 *
 *   const html = buildOrderConfirmationHtml({
 *     assetName: "Naspers Limited",
 *     amountCents: 1250000,
 *     quantity: 3.4812,
 *     reference: "MNT-20250310-00847",
 *     strategyName: null,
 *   });
 */

const F = "-apple-system,BlinkMacSystemFont,'Segoe UI','Roboto','Helvetica Neue',sans-serif";
const MINT_PURPLE = "#4a1d96";
const GRADIENT = "linear-gradient(135deg, #1e0b4a 0%, #4a1d96 100%)";

// ─── Inline white logo (base64 SVG) ──────────────────────────────────────────
// Replace the value below with your own base64-encoded logo if it changes.
const LOGO_WHITE_B64 = "PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyBpZD0iTGF5ZXJfMiIgZGF0YS1uYW1lPSJMYXllciAyIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA5MzU2LjA4IDExODcuMTIiPgogIDxkZWZzPgogICAgPHN0eWxlPgogICAgICAuY2xzLTEgewogICAgICAgIGZpbGw6ICNmZmY7CiAgICAgIH0KICAgIDwvc3R5bGU+CiAgPC9kZWZzPgogIDxnIGlkPSJMYXllcl8xLTIiIGRhdGEtbmFtZT0iTGF5ZXIgMSI+CiAgICA8Zz4KICAgICAgPGc+CiAgICAgICAgPHBhdGggY2xhc3M9ImNscy0xIiBkPSJNMTc4OS41NSw0MzUuNTFjNDEuNTUsMjAuMjgsMjcuNDIsODIuNzQtMTguODEsODMuMTZoMHMtODQxLjU5LDAtODQxLjU5LDBjLTI0LjE5LDAtNDMuOCwxOS42MS00My44LDQzLjh2Mzc0LjQxYzAsMjQuMTktMTkuNjEsNDMuOC00My44LDQzLjhINDMuOGMtMjQuMTksMC00My44LTE5LjYxLTQzLjgtNDMuOHYtNDA4LjI2YzAtMTUuNjgsOC4zOC0zMC4xNiwyMS45Ny0zNy45N0w4NjUuMjQsNS44M2MxMi42LTcuMjUsMjcuOTgtNy43Nyw0MS4wNC0xLjM5bDg4My4yNyw0MzEuMDdaIi8+CiAgICAgICAgPHBhdGggY2xhc3M9ImNscy0xIiBkPSJNMTIxMC44Niw3NTEuNjJjLTQxLjU1LTIwLjI4LTI3LjQyLTgyLjc0LDE4LjgxLTgzLjE2aDBzODQxLjU5LDAsODQxLjU5LDBjMjQuMTksMCw0My44LTE5LjYxLDQzLjgtNDMuOFYyNTAuMjVjMC0yNC4xOSwxOS42MS00My44LDQzLjgtNDMuOGg3OTcuNzRjMjQuMTksMCw0My44LDE5LjYxLDQzLjgsNDMuOHY0MDguMjZjMCwxNS42OC04LjM4LDMwLjE2LTIxLjk3LDM3Ljk3bC04NDMuMjcsNDg0LjgxYy0xMi42LDcuMjUtMjcuOTgsNy43Ny00MS4wNCwxLjM5bC04ODMuMjctNDMxLjA3WiIvPgogICAgICA8L2c+CiAgICAgIDxnPgogICAgICAgIDxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTM1MjUuNjcsMTE2NS40N1YzMDcuMzZjMC04NC41NywyOS45MS0xNTcuMTEsODkuNzMtMjE3LjYzQzM2NzUuODksMjkuOTEsMzc0OC40NSwwLDM4MzMuMDIsMGgyMi42OWM5Ni45NSwwLDE3OS44LDM0LjQsMjQ4LjU2LDEwMy4xNCwzNy44LDM3LjgyLDY1LjMxLDgwLjExLDgyLjUxLDEyNi44NmwzMDYuMzIsNjEzLjY3LDMwNi4zMi02MTMuNjdjMTcuMTgtNDYuNzUsNDUuMDMtODkuMDQsODMuNTQtMTI2Ljg2QzQ5NTEuNzIsMzQuNCw1MDM0LjU4LDAsNTEzMS41MywwaDIxLjY2Yzg1LjI1LDAsMTU3LjgsMjkuOTEsMjE3LjYyLDg5LjczLDYwLjUsNjAuNTIsOTAuNzYsMTMzLjA1LDkwLjc2LDIxNy42M3Y4NTguMTFoLTM1MS43VjQzOS4zOGMwLTExLjY4LTQuNDgtMjItMTMuNDEtMzAuOTUtOC45NC04LjI0LTE5LjI2LTEyLjM4LTMwLjk1LTEyLjM4LTYuMTksMC0xMi4wNCwxLjA0LTE3LjUzLDMuMS00LjgyLDIuMDYtOS4yOSw1LjE2LTEzLjQxLDkuMjhoLTEuMDNsLTM3OC41Miw3NTcuMDRoLTMyMi44MmwtMTc2LjM3LTM1MS43MS0yMDMuMTgtNDA1LjMzYy00LjEzLTQuMTItOC45NC03LjIyLTE0LjQ0LTkuMjgtNS41MS0yLjA2LTExLTMuMS0xNi41LTMuMS0xMi4zOCwwLTIzLjA1LDQuMTMtMzEuOTgsMTIuMzgtOC4yNSw4Ljk1LTEyLjM4LDE5LjI3LTEyLjM4LDMwLjk1djcyNi4wOWgtMzUxLjdaIi8+CiAgICAgICAgPHBhdGggY2xhc3M9ImNscy0xIiBkPSJNNTYzNy45NCwxMTY1LjQ3VjIxLjY3aDM1MS43djExNDMuOGgtMzUxLjdaIi8+CiAgICAgICAgPHBhdGggY2xhc3M9ImNscy0xIiBkPSJNNzQ0MS44NCwxMTg3LjEyYy05Ni45NiwwLTE3OS44Mi0zNC4wMy0yNDguNTgtMTAyLjExLTIuNzYtMi4wNi01LjE0LTQuNDYtNy4yMi03LjIyaC0xLjA0bC0xMi4zNi0xNS40N2MtMi43Ni0yLjczLTUuMTYtNS40OS03LjIzLTguMjRsLTQyMC43OS01MDQuMzYtMTU4LjgzLTE5MC44Yy0yLjA3LTEuMzYtNC40OS0yLjc0LTcuMjMtNC4xMi01LjUxLTIuMDYtMTEtMy4xLTE2LjUtMy4xLTEyLjM4LDAtMjMuMDUsNC40OC0zMS45OCwxMy40MS04LjI1LDguMjQtMTIuMzgsMTguNTYtMTIuMzgsMzAuOTN2NzY5LjQyaC0zNTEuN1YzMDcuMzZjMC04NC41NywyOS45MS0xNTcuMTEsODkuNzMtMjE3LjYzQzYzMTYuMjQsMjkuOTEsNjM4OC43OSwwLDY0NzMuMzYsMGgyMi42OWM5Ni45NCwwLDE3OS44LDM0LjQsMjQ4LjU3LDEwMy4xNCwyLjA1LDIuMDYsNC4xMiw0LjEyLDYuMTgsNi4xOGgxLjAybDEzLjQxLDE1LjQ3YzIuMDYsMi43Niw0LjEzLDUuNTEsNi4xOCw4LjI2bDU3OS42NSw2OTUuMTZjMi4wNiwyLjA2LDQuNDYsMy40NCw3LjIyLDQuMTIsNS41LDIuMDYsMTEuMzQsMy4xLDE3LjUzLDMuMSwxMS42OCwwLDIyLTQuMTMsMzAuOTUtMTIuMzgsOC45Mi04Ljk0LDEzLjQtMTkuMjUsMTMuNC0zMC45NVYyMS42N2gzNTEuNjl2ODU4LjExYzAsODUuMjctMzAuMjcsMTU3Ljc5LTkwLjc1LDIxNy42MS01OS44Miw1OS44Mi0xMzIuMzcsODkuNzMtMjE3LjYzLDg5LjczaC0yMS42NFoiLz4KICAgICAgICA8cGF0aCBjbGFzcz0iY2xzLTEiIGQ9Ik04NDMxLjk3LDExNjUuNDdWMjg1LjdoLTU3MS40VjIxLjY3aDE0OTUuNTF2MjY0LjA0aC01NzIuNDJ2ODc5Ljc2aC0zNTEuNjlaIi8+CiAgICAgIDwvZz4KICAgIDwvZz4KICA8L2c+Cjwvc3ZnPg==";

// ─── Styles ──────────────────────────────────────────────────────────────────
const S = {
  container: "max-width:600px; background:#ffffff; border-radius:32px; overflow:hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.04); border: 1px solid #f1f5f9;",
  hero: `background: ${GRADIENT}; padding: 56px 48px; text-align: left;`,
  row: "margin-bottom:8px; background:#f8fafc; border-radius:16px;",
  label: `padding:18px 20px; font-family:${F}; font-size:11px; color:#64748b; text-transform:uppercase; letter-spacing:0.1em; font-weight:700;`,
  value: `padding:18px 20px; font-family:${F}; font-size:14px; color:#0f172a; font-weight:600; text-align:right;`,
  button: `background:${MINT_PURPLE}; color:#ffffff; padding:18px 36px; border-radius:16px; font-family:${F}; font-size:15px; font-weight:700; text-decoration:none; display:inline-block;`,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Formats cents to ZAR string — e.g. R 12 500,00
 */
export function formatZar(cents) {
  const rands = (typeof cents === "number" ? cents : Number(cents)) / 100;
  if (isNaN(rands)) return "R 0,00";
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 2,
  })
    .format(rands)
    .replace("ZAR", "R");
}

/**
 * Formats ISO date string to SA Standard Time
 */
export function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Johannesburg",
  });
}

// ─── Internal components ─────────────────────────────────────────────────────

function detailRow(label, value) {
  return `
    <div style="${S.row}">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td style="${S.label}">${label}</td>
          <td style="${S.value}">${value}</td>
        </tr>
      </table>
    </div>`;
}

function buildShell({ heroLabel, heroTitle, body, footerNote }) {
  const yr = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <style>
    @media only screen and (max-width:600px) {
      .inner-padding { padding: 32px !important; }
      .hero-text    { font-size: 26px !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#fcfcfd; font-family:${F};">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#fcfcfd">
    <tr>
      <td align="center" style="padding:60px 10px;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="${S.container}">

          <!-- ── Hero ── -->
          <tr>
            <td style="${S.hero}">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom:32px;">
                <tr>
                  <td style="font-family:${F}; font-size:12px; font-weight:800; color:#c084fc; text-transform:uppercase; letter-spacing:0.2em;">
                    ${heroLabel}
                  </td>
                  <td align="right">
                    <img src="data:image/svg+xml;base64,${LOGO_WHITE_B64}" width="90" alt="Mint" style="display:block;">
                  </td>
                </tr>
              </table>
              <div class="hero-text" style="font-family:${F}; font-size:36px; font-weight:800; color:#ffffff; line-height:1.1; letter-spacing:-0.02em;">
                ${heroTitle}
              </div>
            </td>
          </tr>

          <!-- ── Body ── -->
          <tr>
            <td class="inner-padding" style="padding:48px;">
              ${body}
            </td>
          </tr>

          <!-- ── Footer ── -->
          <tr>
            <td style="padding:48px; background:#f8fafc; border-top:1px solid #f1f5f9; text-align:center;">
              <div style="font-size:14px; font-weight:700; color:#0f172a; margin-bottom:8px;">Mint Financial Services</div>
              <div style="font-size:13px; color:#64748b; line-height:1.8;">
                3 Gwen Ln, Sandown, Sandton, 2031<br>
                <a href="mailto:info@mymint.co.za" style="color:${MINT_PURPLE}; text-decoration:none;">info@mymint.co.za</a>
                &nbsp;•&nbsp; +27 10 276 0531
              </div>
              <div style="margin-top:32px; padding-top:32px; border-top:1px solid #e2e8f0; font-size:11px; color:#94a3b8; text-align:left; line-height:1.6;">
                <strong>FSP Compliance</strong><br>
                ${footerNote}
                <br><br>&copy; ${yr} Mint. Proudly South African.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Templates ───────────────────────────────────────────────────────────────

/**
 * Order Confirmation Email
 *
 * @param {object} params
 * @param {string} params.assetName      - e.g. "Naspers Limited"
 * @param {string} [params.assetSymbol]  - e.g. "NPN"
 * @param {number} params.amountCents    - amount in cents, e.g. 1250000
 * @param {number} [params.quantity]     - number of shares
 * @param {string} [params.reference]    - transaction reference
 * @param {string} [params.strategyName] - if a strategy, overrides assetName
 * @param {string} [params.paymentMethod] - e.g. "wallet", "paystack"
 */
export function buildOrderConfirmationHtml({
  assetName,
  assetSymbol,
  amountCents,
  quantity,
  reference,
  strategyName,
  paymentMethod,
}) {

  const displayName = strategyName || assetName || assetSymbol || "Investment";
  const isStrategy = !!strategyName;

  const body = `
    <p style="font-size:16px; color:#475569; line-height:1.6; margin:0 0 32px;">
      Hello Investor, your order for <strong>${displayName}</strong> has been
      successfully received and is moving to settlement.
    </p>

    ${detailRow("Order Type", isStrategy ? "Strategy Allocation" : "Stock Purchase")}
    ${paymentMethod ? detailRow("Funding Source", paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1).replace('_', ' ')) : ""}
    ${detailRow("Portfolio Asset", `<strong>${displayName}</strong>`)}
    ${detailRow("Total Amount", `<span style="color:${MINT_PURPLE}; font-size:16px;">${formatZar(amountCents)}</span>`)}
    ${quantity ? detailRow("Quantity", `${Number(quantity).toFixed(4)} shares`) : ""}
    ${detailRow("Reference", `<span style="font-family:monospace; color:#64748b;">${reference || "—"}</span>`)}
    ${detailRow("Status", `<span style="color:#d97706; font-weight:700;">Pending Settlement</span>`)}

    <div style="margin-top:40px; text-align:center;">
      <a href="https://www.mymint.co.za" style="${S.button}">View My Portfolio &rarr;</a>
    </div>`;

  return buildShell({
    heroLabel: "Trade Confirmation",
    heroTitle: "Your investment is<br>now in progress.",
    body,
    footerNote:
      "Mint is a Wealth-as-a-Service technology platform. All investment products are managed through authorized Financial Services Providers (FSP). Capital is at risk. Past performance does not guarantee future results. Settlement typically occurs within 1–3 business days.",
  });
}

/**
 * EFT Payment Pending Email (sent immediately when user submits EFT intent)
 *
 * @param {object} params
 * @param {string} params.assetName    - name of asset / strategy being purchased
 * @param {number} params.amountCents  - amount in cents
 * @param {string} params.reference    - EFT reference
 * @param {string} [params.dateStr]    - ISO date string
 */
export function buildEFTPendingHtml({ assetName, amountCents, reference, dateStr }) {
  const displayName = assetName || "your selected investment";

  const body = `
    <p style="font-size:16px; color:#475569; line-height:1.6; margin:0 0 32px;">
      Hello Investor, we have received your EFT payment instruction for
      <strong>${displayName}</strong>. Once your funds reflect in our bank account
      (typically 1–3 business days), your purchase will be processed automatically
      and you will receive an order confirmation.
    </p>

    ${detailRow("Purchase Intent", `<strong>${displayName}</strong>`)}
    ${detailRow("Expected Amount", `<span style="color:${MINT_PURPLE}; font-size:16px;">${formatZar(amountCents)}</span>`)}
    ${detailRow("Your EFT Reference", `<span style="font-family:monospace; color:#64748b;">${reference || "—"}</span>`)}
    ${dateStr ? detailRow("Submitted", formatDate(dateStr)) : ""}
    ${detailRow("Status", `<span style="color:#d97706; font-weight:700;">Awaiting EFT Funds</span>`)}

    <p style="font-size:14px; color:#64748b; line-height:1.6; margin:32px 0;">
      Please use the reference <strong style="font-family:monospace;">${reference || ""}</strong>
      as your payment reference when making the EFT so we can match your payment quickly.
    </p>

    <div style="margin-top:40px; text-align:center;">
      <a href="https://www.mymint.co.za" style="${S.button}">View Dashboard &rarr;</a>
    </div>`;

  return buildShell({
    heroLabel: "EFT Payment Noted",
    heroTitle: "Payment instruction<br>received.",
    body,
    footerNote:
      "Your investment purchase will be executed once your EFT payment is confirmed in our account. If you have any questions, contact us at info@mymint.co.za.",
  });
}

/**
 * Deposit Received Email
 *
 * @param {object} params
 * @param {number} params.amountCents - deposit amount in cents
 * @param {string} params.reference   - transaction reference
 * @param {string} [params.dateStr]   - ISO date string
 */
export function buildDepositConfirmationHtml({ amountCents, newBalanceCents, reference, dateStr }) {
  const body = `
    <p style="font-size:16px; color:#475569; line-height:1.6; margin:0 0 32px;">
      Hello Investor, we've received your deposit and your funds are now
      available in your Mint wallet.
    </p>
    
    ${detailRow("Transaction Type", "Wallet Top-up")}
    ${detailRow("Top-up Amount", `<span style="color:${MINT_PURPLE}; font-size:16px;">${formatZar(amountCents)}</span>`)}
    ${newBalanceCents ? detailRow("New Balance", `<span style="font-weight:700;">${formatZar(newBalanceCents)}</span>`) : ""}
    ${detailRow("Reference", `<span style="font-family:monospace; color:#64748b;">${reference || "—"}</span>`)}
    ${dateStr ? detailRow("Date", formatDate(dateStr)) : ""}
    ${detailRow("Status", `<span style="color:#16a34a; font-weight:700;">Settled</span>`)}


    <div style="margin-top:40px; text-align:center;">
      <a href="https://www.mymint.co.za" style="${S.button}">Go to Dashboard &rarr;</a>
    </div>`;

  return buildShell({
    heroLabel: "Deposit Notification",
    heroTitle: "Funds received<br>successfully.",
    body,
    footerNote:
      "This is an automated deposit confirmation from Mint. If you did not initiate this transaction, please contact us immediately at info@mymint.co.za.",
  });
}

/**
 * Withdrawal Confirmation Email
 *
 * @param {object} params
 * @param {number} params.amountCents   - withdrawal amount in cents
 * @param {string} params.reference     - transaction reference
 * @param {string} [params.bankAccount] - masked bank account, e.g. "****4821"
 * @param {string} [params.dateStr]     - ISO date string
 */
export function buildWithdrawalConfirmationHtml({ amountCents, reference, bankAccount, dateStr }) {
  const body = `
    <p style="font-size:16px; color:#475569; line-height:1.6; margin:0 0 32px;">
      Hello Investor, your withdrawal request has been processed and funds are
      on their way to your bank account.
    </p>

    ${detailRow("Transaction Type", "Withdrawal")}
    ${detailRow("Amount", `<span style="color:${MINT_PURPLE}; font-size:16px;">${formatZar(amountCents)}</span>`)}
    ${bankAccount ? detailRow("Destination Account", `<span style="font-family:monospace;">${bankAccount}</span>`) : ""}
    ${detailRow("Reference", `<span style="font-family:monospace; color:#64748b;">${reference || "—"}</span>`)}
    ${dateStr ? detailRow("Date", formatDate(dateStr)) : ""}
    ${detailRow("Status", `<span style="color:#d97706; font-weight:700;">Processing</span>`)}

    <div style="margin-top:40px; text-align:center;">
      <a href="https://www.mymint.co.za" style="${S.button}">View Transactions &rarr;</a>
    </div>`;

  return buildShell({
    heroLabel: "Withdrawal Notification",
    heroTitle: "Your withdrawal<br>is being processed.",
    body,
    footerNote:
      "Withdrawals typically reflect within 1–2 business days depending on your bank. If you did not request this withdrawal, contact us immediately at info@mymint.co.za.",
  });
}

/**
 * Funeral Cover Policy Schedule Email
 *
 * @param {object} params
 * @param {string} params.firstName
 * @param {string} params.lastName
 * @param {string} params.policyNo       - e.g. "MNT123456"
 * @param {string} params.planLabel      - e.g. "Family"
 * @param {number} params.coverAmount    - in rands, e.g. 10000
 * @param {number} params.basePremium    - in rands, e.g. 122.56
 * @param {Array}  params.addonDetails   - [{ label, sub, premium }]
 * @param {number} params.totalMonthly   - in rands
 * @param {string} params.deductionDate  - e.g. "1st"
 * @param {string} params.dateStr        - formatted date string
 */
export function buildPolicySummaryHtml({
  firstName,
  lastName,
  policyNo,
  planLabel,
  coverAmount,
  basePremium,
  addonDetails = [],
  totalMonthly,
  deductionDate,
  dateStr,
}) {
  const fullName = `${firstName} ${lastName}`.trim();

  const fmtR = (n) =>
    `R ${Number(n).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtCover = (n) => `R ${Number(n).toLocaleString("en-ZA")}`;

  const addonRows = addonDetails
    .map((a) =>
      detailRow(
        `${a.label}${a.sub ? ` (${a.sub})` : ""}`,
        `<span style="color:#16a34a; font-weight:700;">+${fmtR(a.premium)}/mo</span>`
      )
    )
    .join("");

  const body = `
    <p style="font-size:16px; color:#475569; line-height:1.6; margin:0 0 32px;">
      Dear ${fullName}, your Mint Funeral Cover policy schedule has been issued.
      Please find your policy document attached. Keep it in a safe place — your
      family will need it when making a claim.
    </p>

    ${detailRow("Policy Number", `<span style="font-family:monospace; color:#64748b;">${policyNo}</span>`)}
    ${detailRow("Plan Type", `<strong>${planLabel} Funeral Plan</strong>`)}
    ${detailRow("Cover Amount", `<span style="color:${MINT_PURPLE}; font-size:16px; font-weight:700;">${fmtCover(coverAmount)}</span>`)}
    ${detailRow("Base Monthly Premium", fmtR(basePremium))}
    ${addonRows}
    ${detailRow("Total Monthly Premium", `<span style="color:${MINT_PURPLE}; font-size:16px; font-weight:700;">${fmtR(totalMonthly)}</span>`)}
    ${detailRow("Deduction Date", `${deductionDate} of each month`)}
    ${detailRow("Waiting Period", "6 months from commencement")}
    ${detailRow("Bank Statement Reference", `<span style="font-family:monospace;">MINT-INS ${policyNo}</span>`)}
    ${detailRow("Schedule Date", dateStr || new Date().toLocaleDateString("en-ZA"))}
    ${detailRow("Status", `<span style="color:#16a34a; font-weight:700;">Active — Waiting Period Applies</span>`)}

    <p style="font-size:14px; color:#64748b; line-height:1.6; margin:32px 0 0;">
      Your premium of <strong>${fmtR(totalMonthly)}</strong> will be debited on the
      <strong>${deductionDate}</strong> of each month. Your bank statement will reflect
      <strong style="font-family:monospace;">MINT-INS ${policyNo}</strong>.
    </p>

    <div style="margin-top:40px; text-align:center;">
      <a href="https://www.mymint.co.za" style="${S.button}">View My Cover &rarr;</a>
    </div>`;

  return buildShell({
    heroLabel: "Policy Schedule Issued",
    heroTitle: "Your Mint Funeral<br>Cover is confirmed.",
    body,
    footerNote:
      "Mint Financial Services (Pty) Ltd FSP No. 55118. A 6-month waiting period applies from commencement. Benefits and premium rates may change with 31 days' notice. Claims must be submitted within 6 months of the insured event. This is not a tax invoice.",
  });
}