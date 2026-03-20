/**
 * OZOW HASH TEST — Run this to verify your hash before going live
 * ================================================================
 * Run: node ozow/5-test-hash.js
 *
 * Use this to:
 *   1. Confirm your hash generation is correct
 *   2. Debug "Invalid HashCheck" errors from Ozow
 *   3. Test with known values before deploying
 */

import crypto from 'crypto';

// ─────────────────────────────────────────────
// TEST WITH KNOWN VALUES
// Replace these with your actual credentials to test
// ─────────────────────────────────────────────

const TEST_PARAMS = {
  SiteCode: 'NOS-NOS-005',
  CountryCode: 'ZA',
  CurrencyCode: 'ZAR',
  Amount: '99.99',
  TransactionReference: 'TEST-001',
  BankReference: 'Test Payment',
  Optional1: '3',          // planId
  Optional2: 'test@example.com',
  Optional3: '',
  Optional4: '',
  Optional5: '',
  Customer: 'test@example.com',
  CancelUrl: 'https://yourapp.com/payment-cancel',
  ErrorUrl: 'https://yourapp.com/payment-error',
  SuccessUrl: 'https://yourapp.com/payment-success',
  NotifyUrl: 'https://yourapp.com/api/ozow/notify',
  IsTest: 'true',           // Use 'true' for sandbox testing
};

const PRIVATE_KEY = process.env.OZOW_PRIVATE_KEY || 'your-private-key-here';

// ─────────────────────────────────────────────
// HASH GENERATION (same logic as 1-hash-generator.js)
// ─────────────────────────────────────────────

function generateHash(params, privateKey) {
  const parts = [
    params.SiteCode,
    params.CountryCode,
    params.CurrencyCode,
    params.Amount,
    params.TransactionReference,
    params.BankReference,
  ];

  if (params.Optional1) parts.push(params.Optional1);
  if (params.Optional2) parts.push(params.Optional2);
  if (params.Optional3) parts.push(params.Optional3);
  if (params.Optional4) parts.push(params.Optional4);
  if (params.Optional5) parts.push(params.Optional5);

  parts.push(
    params.Customer,
    params.CancelUrl,
    params.ErrorUrl,
    params.SuccessUrl,
    params.NotifyUrl,
    params.IsTest,
    privateKey,
  );

  const rawString = parts.join('');
  const lowered = rawString.toLowerCase();
  return crypto.createHash('sha512').update(lowered, 'utf8').digest('hex');
}

// ─────────────────────────────────────────────
// RUN THE TEST
// ─────────────────────────────────────────────

const hash = generateHash(TEST_PARAMS, PRIVATE_KEY);

console.log('\n=== OZOW HASH TEST ===\n');
console.log('Parameters used:');
Object.entries(TEST_PARAMS).forEach(([k, v]) => {
  console.log(`  ${k}: "${v}"`);
});
console.log(`  PrivateKey: "${PRIVATE_KEY.substring(0, 6)}..." (truncated for security)`);

console.log('\n--- Concatenated string (before lowercase) ---');
const parts = [
  TEST_PARAMS.SiteCode,
  TEST_PARAMS.CountryCode,
  TEST_PARAMS.CurrencyCode,
  TEST_PARAMS.Amount,
  TEST_PARAMS.TransactionReference,
  TEST_PARAMS.BankReference,
  TEST_PARAMS.Optional1,
  TEST_PARAMS.Optional2,
  // Optional3-5 are empty so skipped
  TEST_PARAMS.Customer,
  TEST_PARAMS.CancelUrl,
  TEST_PARAMS.ErrorUrl,
  TEST_PARAMS.SuccessUrl,
  TEST_PARAMS.NotifyUrl,
  TEST_PARAMS.IsTest,
  '[PRIVATE_KEY]',
];
console.log(parts.join(''));

console.log('\n--- Generated HashCheck ---');
console.log(hash);
console.log(`Hash length: ${hash.length} characters (expected: 128)`);

if (hash.length === 128) {
  console.log('\n✅ Hash format is correct (128 hex chars = 512 bits)');
} else {
  console.log('\n❌ Hash length is wrong — something is broken');
}

console.log('\n=== CHECKLIST ===');
console.log('[ ] HashCheck is 128 characters?', hash.length === 128 ? '✅' : '❌');
console.log('[ ] IsTest is "true" for sandbox, "false" for production?');
console.log('[ ] OZOW_PRIVATE_KEY matches your Ozow dashboard?');
console.log('[ ] OZOW_SITE_CODE matches your Ozow dashboard?');
console.log('[ ] NotifyUrl is publicly accessible (not localhost)?');
console.log('[ ] Amount is decimal string like "99.99" not integer 99?');
