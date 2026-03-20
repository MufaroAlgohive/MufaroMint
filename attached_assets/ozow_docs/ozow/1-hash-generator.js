/**
 * OZOW SHA512 HASH GENERATOR
 * ===========================
 * This is the most critical part of the Ozow integration.
 * Get this wrong and Ozow will silently reject your payment form.
 *
 * The hash proves to Ozow that the payment request came from your server
 * and has not been tampered with.
 */

import crypto from 'crypto';

/**
 * Generates the HashCheck value required by Ozow.
 *
 * PARAMETER ORDER (this exact order, every time):
 *   SiteCode → CountryCode → CurrencyCode → Amount → TransactionReference →
 *   BankReference → Optional1 → Optional2 → Optional3 → Optional4 → Optional5 →
 *   Customer → CancelUrl → ErrorUrl → SuccessUrl → NotifyUrl → IsTest → PrivateKey
 *
 * RULES:
 *   - Only include Optional1-5 if they are non-empty strings
 *   - Concatenate all values with NO separator
 *   - Lowercase the entire string before hashing
 *   - Hash algorithm: SHA512 (NOT SHA256)
 *   - PrivateKey is appended last but is NOT sent to Ozow — it stays on your server
 */
export function generateOzowHash(params, privateKey) {
  const {
    SiteCode,
    CountryCode,
    CurrencyCode,
    Amount,
    TransactionReference,
    BankReference,
    Optional1 = '',
    Optional2 = '',
    Optional3 = '',
    Optional4 = '',
    Optional5 = '',
    Customer,
    CancelUrl,
    ErrorUrl,
    SuccessUrl,
    NotifyUrl,
    IsTest,
  } = params;

  // Build array of values — only include Optionals if they have content
  const parts = [
    SiteCode,
    CountryCode,
    CurrencyCode,
    Amount,
    TransactionReference,
    BankReference,
  ];

  // Add optionals only if non-empty (mirrors Ozow's Ruby SDK compact_blank behaviour)
  if (Optional1) parts.push(Optional1);
  if (Optional2) parts.push(Optional2);
  if (Optional3) parts.push(Optional3);
  if (Optional4) parts.push(Optional4);
  if (Optional5) parts.push(Optional5);

  parts.push(
    Customer,
    CancelUrl,
    ErrorUrl,
    SuccessUrl,
    NotifyUrl,
    IsTest,
    privateKey,   // PrivateKey is LAST — never sent to Ozow, only used for hashing
  );

  // Concatenate with no separator, lowercase, then SHA512
  const rawString = parts.join('');
  const lowercased = rawString.toLowerCase();
  const hash = crypto.createHash('sha512').update(lowercased, 'utf8').digest('hex');

  return hash;
}


// ─────────────────────────────────────────────
// EXAMPLE USAGE
// ─────────────────────────────────────────────
const exampleParams = {
  SiteCode: 'NOS-NOS-005',
  CountryCode: 'ZA',
  CurrencyCode: 'ZAR',
  Amount: '99.99',                           // Must be decimal string
  TransactionReference: 'WFX-42-3-1710000000000',
  BankReference: 'WatchlistFx Payment',
  Optional1: '3',                            // planId (we store it here to retrieve on webhook)
  Optional2: 'user@example.com',             // userEmail (stored here for webhook lookup)
  Optional3: '',
  Optional4: '',
  Optional5: '',
  Customer: 'user@example.com',
  CancelUrl: 'https://yourapp.com/payment-cancel',
  ErrorUrl: 'https://yourapp.com/payment-error',
  SuccessUrl: 'https://yourapp.com/payment-success',
  NotifyUrl: 'https://yourapp.com/api/ozow/notify',
  IsTest: 'false',                           // 'true' for sandbox, 'false' for production
};

const privateKey = process.env.OZOW_PRIVATE_KEY || 'your-private-key-here';

const hash = generateOzowHash(exampleParams, privateKey);
console.log('Generated HashCheck:', hash);
console.log('Hash length (should be 128 chars):', hash.length);
