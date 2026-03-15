import { supabase } from "./supabase";

/**
 * Parses the full set of onboarding completion flags from a DB record.
 * Accepts both 'approved' (new users) and legacy SumSub statuses
 * ('verified', 'onboarding_complete') so old users are not locked out of
 * onboarding — they just need to complete the financial steps (bank,
 * mandate, risk disclosure, SOF, terms) as well.
 */
export function parseOnboardingFlags(record) {
  const kycDone = record?.kyc_status === "approved"
    || record?.kyc_status === "onboarding_complete"
    || record?.kyc_status === "verified";

  let taxDone = false;
  let bankDone = false;
  let mandateAgreed = false;
  let riskDone = false;
  let sofDone = false;
  let termsDone = false;

  if (record?.sumsub_raw) {
    try {
      const raw = typeof record.sumsub_raw === "string" ? JSON.parse(record.sumsub_raw) : record.sumsub_raw;
      taxDone = !!raw?.tax_details_saved;
      bankDone = !!raw?.bank_details_saved;
      mandateAgreed = !!raw?.mandate_data?.agreedMandate || !!raw?.mandate_accepted;
      riskDone = !!raw?.risk_disclosure_accepted;
      sofDone = !!raw?.source_of_funds_accepted;
      termsDone = !!raw?.terms_accepted;
    } catch {}
  }

  // ALL steps must be complete — KYC identity AND all financial onboarding steps including tax
  const allComplete = kycDone && taxDone && bankDone && mandateAgreed && riskDone && sofDone && termsDone;

  return { kycDone, taxDone, bankDone, mandateAgreed, riskDone, sofDone, termsDone, allComplete };
}

/**
 * Returns true only if the user has completed every onboarding step.
 * Works for both old SumSub users and new users, on any device.
 */
export async function checkOnboardingComplete() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return false;

    // Try the API first — it computes is_fully_onboarded server-side
    // accounting for all steps: KYC + bank + mandate + risk + SOF + terms
    try {
      const res = await fetch("/api/onboarding/status", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const json = await res.json();
        // Use the server-computed flag that covers ALL onboarding steps
        return json.is_fully_onboarded === true;
      }
    } catch {
      // API not reachable (local dev / offline) — fall back to Supabase
    }

    // Fallback: direct Supabase query (also covers all steps)
    const { data, error } = await supabase
      .from("user_onboarding")
      .select("kyc_status, sumsub_raw")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error || !data?.length) return false;

    const { allComplete } = parseOnboardingFlags(data[0]);
    return allComplete;
  } catch {
    return false;
  }
}
