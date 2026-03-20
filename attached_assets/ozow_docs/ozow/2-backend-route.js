/**
 * OZOW BACKEND ROUTE — Express.js
 * ================================
 * POST /api/ozow/payment
 *
 * This route:
 *   1. Receives the planId from the authenticated frontend
 *   2. Looks up the user and plan from the database
 *   3. Builds all Ozow payment parameters
 *   4. Generates the SHA512 HashCheck
 *   5. Returns everything to the frontend so it can POST the form to Ozow
 *
 * The frontend then submits a hidden HTML form directly to https://pay.ozow.com
 * (see 4-frontend-form.js)
 */

import crypto from 'crypto';
import { generateOzowHash } from './1-hash-generator.js';

// ─────────────────────────────────────────────
// EXPRESS ROUTE REGISTRATION
// ─────────────────────────────────────────────
export function registerOzowRoutes(app, storage) {

  // ── INITIATE PAYMENT ──────────────────────────────────────────────────────
  app.post('/api/ozow/payment', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      const { planId } = req.body;

      // Load user and plan from your database
      const user = await storage.getUser(userId);
      const plan = await storage.getPlan(planId);

      if (!user || !plan) {
        return res.status(404).json({ message: 'User or plan not found' });
      }

      const privateKey = process.env.OZOW_PRIVATE_KEY;
      if (!privateKey) {
        throw new Error('OZOW_PRIVATE_KEY environment variable is not set');
      }

      const siteCode = process.env.OZOW_SITE_CODE || 'NOS-NOS-005';

      // Determine the origin for redirect URLs
      // In production, hard-code your domain. In development, derive from request.
      const origin = process.env.APP_URL
        || req.headers.origin
        || req.headers.referer?.replace(/\/$/, '')
        || 'https://yourapp.com';

      // ── BUILD PAYMENT PARAMETERS ──────────────────────────────────────────
      // TransactionReference encodes userId and planId so the webhook can
      // identify the user without a database lookup on Optional fields
      const transactionReference = `WFX-${user.id}-${plan.id}-${Date.now()}`;

      const ozowParams = {
        SiteCode: siteCode,
        CountryCode: 'ZA',
        CurrencyCode: 'ZAR',
        Amount: parseFloat(plan.price).toFixed(2),   // e.g. "99.99"
        TransactionReference: transactionReference,
        BankReference: 'WatchlistFx Payment',         // Shows on user's bank statement
        Optional1: planId.toString(),                 // Store planId for webhook fallback
        Optional2: user.email,                        // Store email for webhook fallback
        Optional3: '',
        Optional4: '',
        Optional5: '',
        Customer: user.email,
        CancelUrl: `${origin}/payment-cancel`,
        ErrorUrl: `${origin}/payment-error`,
        SuccessUrl: `${origin}/payment-success`,
        NotifyUrl: `${origin}/api/ozow/notify`,       // ⚠️ Must be publicly accessible
        IsTest: 'false',                              // 'true' for sandbox testing
      };

      // ── GENERATE HASH ─────────────────────────────────────────────────────
      const hashCheck = generateOzowHash(ozowParams, privateKey);

      // ── RESPOND TO FRONTEND ───────────────────────────────────────────────
      // Frontend will use this to build and submit the hidden form
      res.json({
        action_url: 'https://pay.ozow.com',   // Form action
        ...ozowParams,
        HashCheck: hashCheck,                 // Must be included in form
        // Note: PrivateKey is NOT returned — it stays on the server
      });

    } catch (error) {
      console.error('Ozow payment error:', error);
      res.status(500).json({ message: 'Failed to create Ozow payment' });
    }
  });


  // ── WEBHOOK NOTIFICATION ──────────────────────────────────────────────────
  // See 3-webhook-handler.js for the full webhook logic
}


// ─────────────────────────────────────────────
// NOTES
// ─────────────────────────────────────────────
//
// WHY does the frontend POST to Ozow instead of the backend redirecting?
//   Ozow requires a full HTML form POST with all parameters as hidden inputs.
//   You cannot simply redirect a GET request to pay.ozow.com — it won't work.
//   The backend returns the params, and the frontend builds + submits the form.
//
// WHY encode userId/planId in TransactionReference?
//   The webhook (NotifyUrl) receives TransactionReference back from Ozow.
//   Parsing it gives you userId and planId without a separate database lookup.
//   Optional1 and Optional2 are a backup — they also come back in the webhook.
