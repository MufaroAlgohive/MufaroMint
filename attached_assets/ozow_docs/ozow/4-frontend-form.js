/**
 * OZOW FRONTEND — Form Submission
 * =================================
 * Ozow works by POSTing a hidden HTML form to https://pay.ozow.com
 * You cannot use a fetch/redirect — it MUST be a form POST.
 *
 * This file shows:
 *   A) React component (handleOzowPayment function)
 *   B) Vanilla JavaScript equivalent
 */


// ─────────────────────────────────────────────
// A) REACT VERSION (used in WatchlistFx Plans.tsx)
// ─────────────────────────────────────────────

export async function handleOzowPayment({ selectedPlan, user, toast }) {
  try {
    // 1. Call your backend to build the payment params + hash
    const response = await fetch('/api/ozow/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',               // Required for session auth
      body: JSON.stringify({
        planId: selectedPlan.id,
        userId: user?.id,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create Ozow payment');
    }

    const paymentData = await response.json();
    // paymentData looks like:
    // {
    //   action_url: "https://pay.ozow.com",
    //   SiteCode: "NOS-NOS-005",
    //   CountryCode: "ZA",
    //   CurrencyCode: "ZAR",
    //   Amount: "99.99",
    //   TransactionReference: "WFX-42-3-1710000000000",
    //   BankReference: "WatchlistFx Payment",
    //   Optional1: "3",
    //   Optional2: "user@example.com",
    //   Optional3: "",
    //   Optional4: "",
    //   Optional5: "",
    //   Customer: "user@example.com",
    //   CancelUrl: "https://yourapp.com/payment-cancel",
    //   ErrorUrl: "https://yourapp.com/payment-error",
    //   SuccessUrl: "https://yourapp.com/payment-success",
    //   NotifyUrl: "https://yourapp.com/api/ozow/notify",
    //   IsTest: "false",
    //   HashCheck: "a3f8c2d1e9b7..."   <-- 128-char SHA512 hex
    // }

    // 2. Build a hidden HTML form and submit it to Ozow
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = paymentData.action_url;   // https://pay.ozow.com
    form.target = '_blank';                 // Open in new tab (optional)
    // If you want same tab: remove form.target and do NOT use _blank

    // 3. Add every field from paymentData (except action_url) as hidden inputs
    const skipFields = ['action_url'];

    Object.entries(paymentData).forEach(([key, value]) => {
      if (skipFields.includes(key)) return;

      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;       // Field name must match exactly (case-sensitive)
      input.value = value;
      form.appendChild(input);
    });

    // 4. Append to body, submit, then remove
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);

  } catch (error) {
    console.error('Ozow payment error:', error);
    toast({
      title: 'Payment Error',
      description: error.message || 'Failed to initiate Ozow EFT payment.',
      variant: 'destructive',
    });
  }
}


// ─────────────────────────────────────────────
// B) VANILLA JAVASCRIPT VERSION
// ─────────────────────────────────────────────

async function initiateOzowPayment(planId, userId) {
  const response = await fetch('/api/ozow/payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ planId, userId }),
  });

  if (!response.ok) {
    alert('Failed to create payment. Please try again.');
    return;
  }

  const paymentData = await response.json();

  const form = document.createElement('form');
  form.method = 'POST';
  form.action = paymentData.action_url;

  Object.entries(paymentData).forEach(([key, value]) => {
    if (key === 'action_url') return;
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = key;
    input.value = value;
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
}


// ─────────────────────────────────────────────
// NOTES
// ─────────────────────────────────────────────
//
// WHY a form POST and not a fetch/redirect?
//   Ozow's payment gateway requires a multipart POST with all fields.
//   A GET redirect would expose the HashCheck in the URL.
//   A fetch() POST would hit CORS restrictions.
//   An HTML form POST is the only correct way.
//
// Can I open in same tab vs new tab?
//   form.target = '_blank'  → new tab (user stays on your page)
//   Remove form.target      → same tab (simpler UX, user navigates away)
//
// What happens after the user pays?
//   Ozow redirects the user's browser to SuccessUrl, CancelUrl, or ErrorUrl.
//   SIMULTANEOUSLY, Ozow sends a server-to-server POST to your NotifyUrl.
//   Always process subscriptions in the webhook (NotifyUrl), not the browser redirect.
