import { supabase } from "./supabase";

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

    const record = data[0];
    const kycDone = record.kyc_status === "onboarding_complete" || record.kyc_status === "verified";
    if (!kycDone) return false;

    let mandateAgreed = false;
    if (record.sumsub_raw) {
      try {
        const raw = typeof record.sumsub_raw === "string" ? JSON.parse(record.sumsub_raw) : record.sumsub_raw;
        mandateAgreed = !!raw?.mandate_data?.agreedMandate;
      } catch {}
    }

    return kycDone && mandateAgreed;
  } catch {
    return false;
  }
}
