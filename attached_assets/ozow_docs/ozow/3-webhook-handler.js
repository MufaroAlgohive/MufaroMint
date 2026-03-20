/**
 * OZOW WEBHOOK HANDLER — Express.js
 * ====================================
 * POST /api/ozow/notify
 *
 * Ozow calls this endpoint server-to-server after every payment attempt.
 * This is the ONLY place you should activate/update a user's subscription.
 * Never trust browser redirects (SuccessUrl) for subscription activation.
 *
 * What Ozow sends (application/x-www-form-urlencoded POST body):
 *   SiteCode, TransactionId, TransactionReference, Amount, Status,
 *   Optional1, Optional2, Optional3, Optional4, Optional5,
 *   CurrencyCode, IsTest, StatusMessage, HashCheck
 *
 * Status values:
 *   "Complete"          — Payment successful ✅
 *   "CompleteExternal"  — External EFT completed ✅
 *   "Cancelled"         — User cancelled ❌
 *   "Error"             — Payment failed ❌
 *   "PendingInvestigation" — Under review, wait for another notification
 */

import crypto from 'crypto';

export function registerOzowWebhook(app, storage) {

  app.post('/api/ozow/notify', async (req, res) => {
    try {
      console.log('🔔 Ozow notification received:', req.body);

      const privateKey = process.env.OZOW_PRIVATE_KEY || '';

      // req.body is parsed from application/x-www-form-urlencoded
      // Make sure your Express app has: app.use(express.urlencoded({ extended: true }))
      const notificationData = req.body;

      const {
        SiteCode,
        TransactionId,
        TransactionReference,
        Amount,
        Status,
        Optional1,
        Optional2,
        Optional3,
        Optional4,
        Optional5,
        CurrencyCode,
        IsTest,
        StatusMessage,
        HashCheck,    // This is what Ozow sends for you to verify
      } = notificationData;

      // ── STEP 1: VERIFY THE HASH ───────────────────────────────────────────
      // This proves the notification came from Ozow, not a forged request.
      // Build the hash the same way Ozow does, then compare.
      if (privateKey && HashCheck) {
        // The notification hash uses the same field order as the payment hash
        // but Ozow generates it from the values they send back
        const hashParts = [
          SiteCode,
          TransactionId,
          TransactionReference,
          Amount,
          Status,
          Optional1 || '',
          Optional2 || '',
          Optional3 || '',
          Optional4 || '',
          Optional5 || '',
          CurrencyCode,
          IsTest,
          privateKey,
        ];

        const rawString = hashParts.join('').toLowerCase();
        const expectedHash = crypto.createHash('sha512').update(rawString, 'utf8').digest('hex');

        if (expectedHash.toLowerCase() !== HashCheck.toLowerCase()) {
          console.error('❌ Ozow notification hash mismatch — possible spoofed request');
          // Respond 200 to Ozow anyway to prevent retries, but do not process
          return res.status(200).send('OK');
        }

        console.log('✅ Ozow notification hash verified');
      } else {
        console.warn('⚠️ Skipping hash verification — OZOW_PRIVATE_KEY not set or HashCheck missing');
      }

      // ── STEP 2: CHECK PAYMENT STATUS ─────────────────────────────────────
      if (Status === 'Complete' || Status === 'CompleteExternal') {
        console.log(`💰 Ozow payment successful — TransactionRef: ${TransactionReference}`);

        // ── STEP 3: IDENTIFY THE USER AND PLAN ────────────────────────────
        // Primary method: parse TransactionReference (format: WFX-{userId}-{planId}-{timestamp})
        let userId = null;
        let planId = null;

        const parts = TransactionReference.split('-');
        if (parts.length >= 4 && parts[0] === 'WFX') {
          userId = parseInt(parts[1]);
          planId = parseInt(parts[2]);
        }

        // Fallback: use Optional1 (planId) and Optional2 (userEmail)
        if (!userId || !planId) {
          const fallbackPlanId = parseInt(Optional1);
          const fallbackEmail = Optional2;

          if (fallbackEmail) {
            const user = await storage.getUserByEmail(fallbackEmail);
            userId = user?.id;
          }

          planId = fallbackPlanId || planId;
        }

        if (!userId || !planId) {
          console.error('❌ Could not determine userId or planId from notification');
          return res.status(200).send('OK');
        }

        // ── STEP 4: ACTIVATE SUBSCRIPTION ────────────────────────────────
        const plan = await storage.getPlan(planId);

        if (plan) {
          const endDate = new Date();
          endDate.setDate(endDate.getDate() + plan.duration);  // e.g. 30 days

          await storage.updateUserSubscriptionStatus(userId, planId, 'active', endDate);

          console.log(`✅ Activated: User ${userId} → ${plan.name} until ${endDate.toISOString()}`);
        } else {
          console.error(`❌ Plan ${planId} not found`);
        }

      } else if (Status === 'Cancelled') {
        console.log(`🚫 Ozow payment cancelled — TransactionRef: ${TransactionReference}`);

      } else if (Status === 'Error') {
        console.log(`❌ Ozow payment error — TransactionRef: ${TransactionReference}, Message: ${StatusMessage}`);

      } else {
        console.log(`📋 Ozow status: ${Status} — TransactionRef: ${TransactionReference}`);
      }

      // Ozow expects a 200 response — anything else causes it to retry
      res.status(200).send('OK');

    } catch (error) {
      console.error('Ozow notification error:', error);
      // Still return 200 to prevent Ozow from retrying endlessly
      res.status(200).send('OK');
    }
  });
}


// ─────────────────────────────────────────────
// COMMON WEBHOOK MISTAKES
// ─────────────────────────────────────────────
//
// 1. Returning a non-200 status → Ozow retries the notification repeatedly
//
// 2. Not parsing urlencoded body → req.body is undefined or {}
//    Fix: app.use(express.urlencoded({ extended: true }))
//
// 3. Using the payment hash order for the notification hash
//    The notification hash has a slightly different field order:
//    SiteCode → TransactionId → TransactionReference → Amount → Status →
//    Optional1-5 → CurrencyCode → IsTest → PrivateKey
//
// 4. Using localhost as NotifyUrl — Ozow cannot reach localhost
//    Use a deployed URL or ngrok for local testing
//
// 5. Activating the subscription on browser redirect (SuccessUrl)
//    Users can manually navigate to /payment-success — always use the webhook
