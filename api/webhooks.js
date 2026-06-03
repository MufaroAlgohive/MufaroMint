/**
 * api/webhooks.js
 * Handles POST /api/webhooks/supabase — Supabase Database Webhook receiver.
 *
 * Setup in Supabase Dashboard → Database → Webhooks:
 *   URL:    https://<your-domain>/api/webhooks/supabase
 *   Method: POST
 *   Secret: set SUPABASE_WEBHOOK_SECRET env var and add it as the webhook secret
 */

const { logEmail } = require('./_email-logger');

const SB_URL  = () => process.env.SUPABASE_URL;
const SB_KEY  = () => process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND  = () => process.env.RESEND_API_KEY;
const F       = "Inter,Segoe UI,Arial,sans-serif";

const sendJson = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
};

const sbGet = async (path) => {
  const res = await fetch(`${SB_URL()}${path}`, {
    headers: { 'apikey': SB_KEY(), 'Authorization': `Bearer ${SB_KEY()}`, 'Accept': 'application/json' }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Supabase ${res.status}`);
  return data;
};

const sendEmail = async ({ to, subject, html, emailType, source = 'webhook', metadata = {} }) => {
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.ORDERBOOK_EMAIL_FROM || 'noreply@mymint.co.za', to: [to], subject, html })
  });
  const payload = await resp.json().catch(() => ({}));
  const ok = resp.ok && !payload.error;
  await logEmail({
    emailType, recipient: to, subject,
    resendId: payload.id || null,
    status: ok ? 'sent' : 'failed',
    triggerSource: source,
    metadata,
    errorMessage: ok ? null : (payload.message || payload.error || `HTTP ${resp.status}`)
  });
  if (!ok) throw new Error(payload.message || payload.error || `Resend error ${resp.status}`);
  return payload;
};

// ── Email builders ────────────────────────────────────────────────────────────

const buildWelcomeHtml = (firstName) => `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Welcome to Mint</title></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:${F};">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4f4f7;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 8px 32px rgba(15,23,42,.07);">
<tr><td style="background:linear-gradient(135deg,#31005e 0%,#5b21b6 50%,#7c3aed 100%);padding:36px 36px 28px;">
  <div style="display:inline-block;width:36px;height:36px;background:#fff;border-radius:10px;text-align:center;line-height:36px;font-weight:700;color:#7c3aed;font-size:18px;font-family:${F};">M</div>
  <h1 style="margin:20px 0 0;color:#fff;font-size:26px;font-weight:800;letter-spacing:-.5px;">Welcome to Mint</h1>
</td></tr>
<tr><td style="padding:32px 36px;">
  <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:#1e293b;">Hi ${firstName || 'there'},</p>
  <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.6;">Your Mint account is ready. You can now explore investment strategies, track your portfolio, and grow your wealth — all in one place.</p>
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0;">
    <tr><td style="border-radius:999px;background:#5c3bcf;box-shadow:0 4px 14px rgba(92,59,207,.3);">
      <a href="https://app.mymint.co.za" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:700;color:#fff;text-decoration:none;border-radius:999px;">Open Mint</a>
    </td></tr>
  </table>
  <p style="font-size:12px;color:#94a3b8;line-height:1.5;">Questions? Reply to this email or visit <a href="https://www.mymint.co.za" style="color:#7c3aed;">mymint.co.za</a></p>
</td></tr>
<tr><td style="padding:20px 36px 28px;border-top:1px solid #f0f0f3;">
  <p style="margin:0;font-size:10px;color:#94a3b8;">MINT (Pty) Ltd · FSP 55118 · <a href="https://www.mymint.co.za" style="color:#94a3b8;">&copy; ${new Date().getFullYear()} MINT</a></p>
</td></tr>
</table></td></tr></table>
</body></html>`;

const buildWalletFundedHtml = ({ firstName, amount, walletId }) => {
  const fmt = (n) => 'R ' + Number(n).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Wallet Funded</title></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:${F};">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4f4f7;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 8px 32px rgba(15,23,42,.07);">
<tr><td style="background:linear-gradient(135deg,#31005e 0%,#5b21b6 50%,#7c3aed 100%);padding:36px 36px 28px;">
  <div style="display:inline-block;width:36px;height:36px;background:#fff;border-radius:10px;text-align:center;line-height:36px;font-weight:700;color:#7c3aed;font-size:18px;font-family:${F};">M</div>
  <h1 style="margin:20px 0 0;color:#fff;font-size:26px;font-weight:800;letter-spacing:-.5px;">Funds Received</h1>
</td></tr>
<tr><td style="padding:32px 36px 20px;">
  <p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#1e293b;">Hi ${firstName || 'there'},</p>
  <p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.6;">Your Mint wallet has been funded. The amount is ready to invest.</p>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#faf7ff;border:1px solid #ede5ff;border-radius:12px;margin-bottom:24px;">
    <tr>
      <td style="padding:20px;text-align:center;">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#7c3aed;margin-bottom:6px;">Amount Added</div>
        <div style="font-size:28px;font-weight:800;color:#0f172a;">${fmt(amount)}</div>
      </td>
    </tr>
  </table>
  <table role="presentation" cellspacing="0" cellpadding="0" border="0">
    <tr><td style="border-radius:999px;background:#5c3bcf;box-shadow:0 4px 14px rgba(92,59,207,.3);">
      <a href="https://app.mymint.co.za" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:700;color:#fff;text-decoration:none;border-radius:999px;">View Portfolio</a>
    </td></tr>
  </table>
</td></tr>
<tr><td style="padding:16px 36px 28px;border-top:1px solid #f0f0f3;">
  <p style="margin:0;font-size:10px;color:#94a3b8;">MINT (Pty) Ltd · FSP 55118 · <a href="https://www.mymint.co.za" style="color:#94a3b8;">&copy; ${new Date().getFullYear()} MINT</a></p>
</td></tr>
</table></td></tr></table>
</body></html>`;
};

// ── Email action dispatchers ───────────────────────────────────────────────────

async function handleWelcome(record, trigger) {
  const email = record.email;
  const firstName = record.first_name || record.full_name || '';
  if (!email) throw new Error('No email in profiles record');
  await sendEmail({
    to: email,
    subject: 'Welcome to Mint',
    html: buildWelcomeHtml(firstName),
    emailType: 'welcome',
    metadata: { profile_id: record.id }
  });
  console.log(`[Webhook] Welcome email sent to ${email}`);
}

async function handleWalletFunded(record, trigger) {
  const userId = record[trigger.user_id_field || 'user_id'];
  if (!userId) throw new Error('No user_id in wallet_transactions record');

  const profiles = await sbGet(`/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=email,first_name&limit=1`);
  const profile = Array.isArray(profiles) ? profiles[0] : null;
  if (!profile?.email) throw new Error('No profile/email found for user ' + userId);

  const amount = record.amount || 0;
  await sendEmail({
    to: profile.email,
    subject: `Funds received — R ${Number(amount).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
    html: buildWalletFundedHtml({ firstName: profile.first_name, amount, walletId: record.wallet_id }),
    emailType: 'wallet_funded',
    metadata: { wallet_id: record.wallet_id, amount, user_id: userId }
  });
  console.log(`[Webhook] Wallet funded email sent to ${profile.email}`);
}

async function handleTradeConfirmation(record, trigger) {
  // Delegate to the existing orderbook email system
  const { sendTradeConfirmationForHolding } = require('./_orderbook');
  if (typeof sendTradeConfirmationForHolding === 'function') {
    await sendTradeConfirmationForHolding(record.id, 'webhook');
  } else {
    console.warn('[Webhook] sendTradeConfirmationForHolding not exported from _orderbook.js — skipping');
  }
}

const EMAIL_DISPATCHERS = {
  welcome:              handleWelcome,
  wallet_funded:        handleWalletFunded,
  trade_confirmation:   handleTradeConfirmation,
};

// ── Main handler ──────────────────────────────────────────────────────────────

module.exports = async (req, res) => {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });

  // Verify webhook secret
  const secret = process.env.SUPABASE_WEBHOOK_SECRET;
  if (secret) {
    const incomingSecret = req.headers['x-webhook-secret'] || req.headers['authorization']?.replace('Bearer ', '');
    if (incomingSecret !== secret) {
      console.warn('[Webhook] Rejected — invalid secret');
      return sendJson(res, 401, { error: 'Unauthorized' });
    }
  }

  // Parse body
  let payload;
  try {
    const raw = await new Promise((resolve, reject) => {
      let body = '';
      req.on('data', c => body += c);
      req.on('end', () => resolve(body));
      req.on('error', reject);
    });
    payload = JSON.parse(raw);
  } catch {
    return sendJson(res, 400, { error: 'Invalid JSON body' });
  }

  const { type: eventType, table: tableName, record, old_record } = payload;
  if (!eventType || !tableName) return sendJson(res, 400, { error: 'Missing type or table in payload' });

  console.log(`[Webhook] ${eventType} on ${tableName}`);

  // Load matching triggers from DB
  let triggers = [];
  try {
    triggers = await sbGet(
      `/rest/v1/email_webhook_triggers?table_name=eq.${encodeURIComponent(tableName)}&event_type=eq.${encodeURIComponent(eventType)}&enabled=eq.true&select=*`
    );
    if (!Array.isArray(triggers)) triggers = [];
  } catch (err) {
    if (String(err.message).includes('42P01') || String(err.message).includes('does not exist')) {
      console.warn('[Webhook] email_webhook_triggers table not found — run sql/email_webhook_triggers.sql');
      return sendJson(res, 200, { ok: true, message: 'trigger table not configured' });
    }
    console.error('[Webhook] Failed to load triggers:', err.message);
    return sendJson(res, 500, { error: err.message });
  }

  if (triggers.length === 0) {
    return sendJson(res, 200, { ok: true, matched: 0 });
  }

  // Apply each trigger
  const results = [];
  for (const trigger of triggers) {
    try {
      // Check optional condition
      if (trigger.condition_field && trigger.condition_value !== null && trigger.condition_value !== undefined) {
        const actual = String(record?.[trigger.condition_field] ?? '');
        if (actual !== String(trigger.condition_value)) {
          results.push({ trigger: trigger.name, skipped: true, reason: 'condition not met' });
          continue;
        }
      }

      const dispatcher = EMAIL_DISPATCHERS[trigger.email_type];
      if (!dispatcher) {
        results.push({ trigger: trigger.name, error: `Unknown email_type: ${trigger.email_type}` });
        continue;
      }

      await dispatcher(record || old_record || {}, trigger);
      results.push({ trigger: trigger.name, ok: true });
    } catch (err) {
      console.error(`[Webhook] Trigger "${trigger.name}" failed:`, err.message);
      results.push({ trigger: trigger.name, error: err.message });
    }
  }

  return sendJson(res, 200, { ok: true, matched: triggers.length, results });
};
