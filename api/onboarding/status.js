import { supabaseAdmin, supabase } from "../_lib/supabase.js";

function parseOnboardingFlags(record) {
  // Accept both 'approved' (new) and legacy statuses for old SumSub users
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
      const raw = typeof record.sumsub_raw === "string"
        ? JSON.parse(record.sumsub_raw)
        : record.sumsub_raw;
      taxDone = !!raw?.tax_details_saved;
      bankDone = !!raw?.bank_details_saved;
      mandateAgreed = !!raw?.mandate_data?.agreedMandate || !!raw?.mandate_accepted;
      riskDone = !!raw?.risk_disclosure_accepted;
      sofDone = !!raw?.source_of_funds_accepted;
      termsDone = !!raw?.terms_accepted;
    } catch {}
  }

  const allComplete = kycDone && taxDone && bankDone && mandateAgreed && riskDone && sofDone && termsDone;
  return { kycDone, taxDone, bankDone, mandateAgreed, riskDone, sofDone, termsDone, allComplete };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, error: "Missing token" });

    const db = supabaseAdmin || supabase;
    const { data: { user }, error: authErr } = await db.auth.getUser(token);
    if (authErr || !user) return res.status(401).json({ success: false, error: "Invalid session" });

    const { data, error } = await db
      .from("user_onboarding")
      .select("id, kyc_status, employment_status, sumsub_raw, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[Onboarding] Status fetch error:", error.message);
      return res.status(500).json({ success: false, error: error.message });
    }

    const flags = data ? parseOnboardingFlags(data) : null;

    // Return onboarding without exposing sumsub_raw raw data
    const { sumsub_raw: _, ...onboardingPublic } = data || {};

    res.json({
      success: true,
      onboarding: onboardingPublic || null,
      onboarding_id: data?.id || null,
      is_fully_onboarded: flags?.allComplete ?? false,
      flags: flags || null,
    });
  } catch (error) {
    console.error("[Onboarding] Status error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}
