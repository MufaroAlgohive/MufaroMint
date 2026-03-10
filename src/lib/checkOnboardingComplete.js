import { supabase } from "./supabase";

export function parseOnboardingFlags(record) {
  const kycDone = record?.kyc_status === "onboarding_complete" || record?.kyc_status === "verified";

  let bankDone = false;
  let mandateAgreed = false;
  let riskDone = false;
  let sofDone = false;

  if (record?.sumsub_raw) {
    try {
      const raw = typeof record.sumsub_raw === "string" ? JSON.parse(record.sumsub_raw) : record.sumsub_raw;
      bankDone = !!raw?.bank_details_saved;
      mandateAgreed = !!raw?.mandate_data?.agreedMandate || !!raw?.mandate_accepted;
      riskDone = !!raw?.risk_disclosure_accepted;
      sofDone = !!raw?.source_of_funds_accepted;
    } catch {}
  }

  const allComplete = kycDone && bankDone && mandateAgreed && riskDone && sofDone;

  return { kycDone, bankDone, mandateAgreed, riskDone, sofDone, allComplete };
}

export async function checkOnboardingComplete() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return false;

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
