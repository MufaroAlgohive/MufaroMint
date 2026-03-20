# Ozow Payment Integration — Complete Reference

This folder contains everything you need to integrate Ozow (EFT payments) into any Node.js/Express platform. All logic is extracted from the working WatchlistFx implementation.

---

## How Ozow Works — The Full Flow

```
USER CLICKS "PAY WITH OZOW"
        │
        ▼
1. YOUR BACKEND builds payment params + generates SHA512 HashCheck
        │
        ▼
2. YOUR FRONTEND submits a hidden HTML FORM (POST) directly to https://pay.ozow.com
        │
        ▼
3. OZOW shows the user their bank's EFT payment screen
        │
        ▼
4. USER completes payment at their bank
        │
        ├──► SUCCESS  → Ozow redirects to your SuccessUrl (browser redirect)
        ├──► CANCEL   → Ozow redirects to your CancelUrl  (browser redirect)
        └──► ERROR    → Ozow redirects to your ErrorUrl   (browser redirect)
        │
        ▼
5. OZOW also sends a server-to-server POST to your NotifyUrl (the webhook)
   ⚠️  This is the ONLY reliable signal — do NOT activate subscriptions on browser redirect
        │
        ▼
6. YOUR WEBHOOK verifies the HashCheck, checks Status === "Complete", then activates the user
```

---

## Environment Variables Required

| Variable | Description |
|---|---|
| `OZOW_SITE_CODE` | Your site code from the Ozow dashboard (e.g. `NOS-NOS-005`) |
| `OZOW_PRIVATE_KEY` | Your private/secret key from the Ozow dashboard |

---

## Files in This Folder

| File | What it does |
|---|---|
| `1-hash-generator.js` | Isolated SHA512 hash logic — run and test this first |
| `2-backend-route.js` | Express route: builds params and returns payment data to frontend |
| `3-webhook-handler.js` | Express route: receives Ozow notification, verifies hash, activates user |
| `4-frontend-form.js` | React/vanilla JS: submits the hidden form POST to Ozow |
| `5-test-hash.js` | Runnable test to verify your hash is correct before going live |

---

## Critical Rules (Common Mistakes)

1. **Hash is SHA512, NOT SHA256** — Ozow will reject your form silently if you use the wrong algorithm.
2. **Lowercase everything before hashing** — The entire concatenated string must be `.toLowerCase()` before hashing.
3. **Parameter ORDER matters** — The hash string must follow the exact order: SiteCode → CountryCode → CurrencyCode → Amount → TransactionReference → BankReference → [Optional1-5 only if non-empty] → Customer → CancelUrl → ErrorUrl → SuccessUrl → NotifyUrl → IsTest → PrivateKey
4. **Amount format** — Must be a decimal string like `"99.99"`, not an integer like `99`.
5. **Do NOT activate subscriptions on browser redirect** — Users can manipulate URL parameters. Only trust the webhook (NotifyUrl POST).
6. **IsTest** — Set `"true"` while testing (uses test banks), `"false"` in production. This affects the hash too.
7. **Form must POST to `https://pay.ozow.com`** — Not a redirect, an actual HTML form POST.
8. **NotifyUrl must be publicly accessible** — Localhost will NOT work. Use a deployed URL.
