# Ozow Integration Checklist — Copy-Paste Guide

Use this when integrating into a new platform. Go through each step in order.

---

## Step 1 — Get Your Credentials from Ozow Dashboard

- Log into https://merchant.ozow.com
- Go to **Settings → API Keys**
- Copy your:
  - `Site Code` → set as `OZOW_SITE_CODE` env variable
  - `Private Key` → set as `OZOW_PRIVATE_KEY` env variable

---

## Step 2 — Set Environment Variables

```bash
OZOW_SITE_CODE=NOS-NOS-005
OZOW_PRIVATE_KEY=your-private-key-from-dashboard
```

---

## Step 3 — Install Dependencies (backend only)

No external Ozow SDK needed. Only Node's built-in `crypto` module is used for hashing.

---

## Step 4 — Add Backend Routes

Copy these two routes into your Express server:

**Route 1: `/api/ozow/payment` (POST)** — from `2-backend-route.js`
- Requires authenticated user session
- Builds all payment params + SHA512 HashCheck
- Returns JSON to frontend

**Route 2: `/api/ozow/notify` (POST)** — from `3-webhook-handler.js`
- Receives Ozow's server-to-server notification
- Verifies HashCheck
- Activates user subscription on `Status === "Complete"`
- Must NOT require authentication (Ozow calls this directly)
- Must return HTTP 200 always (even on errors)

Make sure your app has urlencoded body parsing:
```js
app.use(express.urlencoded({ extended: true }));
```

---

## Step 5 — Add Frontend Handler

Copy `4-frontend-form.js` → call `handleOzowPayment()` when the user clicks "Pay with Ozow".

The function:
1. POSTs to `/api/ozow/payment` to get params
2. Creates a hidden HTML form
3. Submits it to `https://pay.ozow.com`

---

## Step 6 — Create Redirect Pages

Create pages at these routes in your frontend:

| Route | What to show |
|---|---|
| `/payment-success` | "Thank you! Your payment is being processed. Your account will activate shortly." |
| `/payment-cancel` | "Payment was cancelled. You can try again anytime." |
| `/payment-error` | "Something went wrong. Please try again or contact support." |

**Important:** Do NOT activate the subscription on `/payment-success`. Only activate in the webhook.

---

## Step 7 — Test Your Hash

Run:
```bash
node ozow/5-test-hash.js
```

Confirm the hash is 128 characters long.

---

## Step 8 — Test in Sandbox Mode

Set `IsTest: 'true'` in `2-backend-route.js`.

Ozow sandbox test bank details:
- Bank: **FNB** (or any listed on the Ozow test page)
- Account: Use Ozow's test credentials from their docs

Your NotifyUrl must be publicly accessible for sandbox testing too. Use **ngrok** locally:
```bash
ngrok http 5000
# Then set NotifyUrl to: https://abc123.ngrok.io/api/ozow/notify
```

---

## Step 9 — Go Live

1. Set `IsTest: 'false'` in your payment route
2. Ensure `OZOW_SITE_CODE` and `OZOW_PRIVATE_KEY` are set in production
3. Ensure `NotifyUrl` points to your production domain
4. Deploy

---

## Full Payment Field Reference

| Field | Type | Example | Notes |
|---|---|---|---|
| `SiteCode` | string | `NOS-NOS-005` | From Ozow dashboard |
| `CountryCode` | string | `ZA` | Always ZA for South Africa |
| `CurrencyCode` | string | `ZAR` | Always ZAR |
| `Amount` | string | `99.99` | Decimal format, not integer |
| `TransactionReference` | string | `WFX-42-3-1710000` | Your unique reference |
| `BankReference` | string | `WatchlistFx Payment` | Shows on user's bank statement |
| `Optional1` | string | `3` | planId (comes back in webhook) |
| `Optional2` | string | `user@example.com` | userEmail (comes back in webhook) |
| `Optional3-5` | string | `` | Leave empty |
| `Customer` | string | `user@example.com` | User's email |
| `CancelUrl` | string | `https://app.com/payment-cancel` | Browser redirect on cancel |
| `ErrorUrl` | string | `https://app.com/payment-error` | Browser redirect on error |
| `SuccessUrl` | string | `https://app.com/payment-success` | Browser redirect on success |
| `NotifyUrl` | string | `https://app.com/api/ozow/notify` | Server-to-server webhook |
| `IsTest` | string | `false` | `"true"` for sandbox |
| `HashCheck` | string | `a3f8c2...` | SHA512, generated server-side |

---

## Webhook Fields Ozow Sends Back

| Field | Example | Notes |
|---|---|---|
| `SiteCode` | `NOS-NOS-005` | Your site code |
| `TransactionId` | `abc-123` | Ozow's internal ID |
| `TransactionReference` | `WFX-42-3-171...` | Your reference (echoed back) |
| `Amount` | `99.99` | Amount paid |
| `Status` | `Complete` | See status values below |
| `Optional1-5` | `3`, `user@...` | Your values (echoed back) |
| `CurrencyCode` | `ZAR` | Currency |
| `IsTest` | `false` | Test mode flag |
| `StatusMessage` | `Payment successful` | Human-readable status |
| `HashCheck` | `a3f8c2...` | Verify this before processing |

**Status values:**

| Status | Meaning | Action |
|---|---|---|
| `Complete` | Payment successful ✅ | Activate subscription |
| `CompleteExternal` | External EFT completed ✅ | Activate subscription |
| `Cancelled` | User cancelled ❌ | No action needed |
| `Error` | Payment failed ❌ | No action needed |
| `PendingInvestigation` | Under review | Wait for follow-up notification |
