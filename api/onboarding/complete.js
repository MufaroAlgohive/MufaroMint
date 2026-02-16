import { supabaseAdmin, supabase } from "../_lib/supabase.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, error: "Missing token" });

    const db = supabaseAdmin || supabase;
    const { data: { user }, error: authErr } = await db.auth.getUser(token);
    if (authErr || !user) return res.status(401).json({ success: false, error: "Invalid session" });

    const { existing_onboarding_id } = req.body;
    const userId = user.id;

    try {
      const { data: existingAction } = await db
        .from("required_actions")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existingAction) {
        await db.from("required_actions").update({ kyc_verified: true }).eq("user_id", userId);
      } else {
        await db.from("required_actions").insert({ user_id: userId, kyc_verified: true });
      }
    } catch (actionErr) {
      console.warn("[Onboarding] required_actions update failed (non-critical):", actionErr?.message);
    }

    let onboardingId = existing_onboarding_id;
    if (!onboardingId) {
      const { data: latest } = await db
        .from("user_onboarding")
        .select("id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latest?.id) onboardingId = latest.id;
    }

    const updatePayload = { kyc_status: "onboarding_complete" };
    const insertPayload = {
      user_id: userId,
      kyc_status: "onboarding_complete",
      employment_status: "not_provided",
    };

    let saved = false;

    if (onboardingId) {
      const { data: updated, error } = await db
        .from("user_onboarding")
        .update(updatePayload)
        .eq("id", onboardingId)
        .eq("user_id", userId)
        .select("id");

      if (error) {
        console.error("[Onboarding] Update failed:", error.message);
      } else if (updated && updated.length > 0) {
        saved = true;
      }
    }

    if (!saved) {
      const { data: inserted, error: insErr } = await db
        .from("user_onboarding")
        .insert(insertPayload)
        .select("id");
      if (insErr) {
        console.error("[Onboarding] Insert failed:", insErr.message);
        return res.status(500).json({ success: false, error: insErr.message });
      }
      saved = true;
      if (inserted?.[0]?.id) onboardingId = inserted[0].id;
    }

    console.log(`[Onboarding] Completed for user ${userId}, onboarding_id: ${onboardingId}`);
    res.json({ success: true, onboarding_id: onboardingId });
  } catch (error) {
    console.error("[Onboarding] Complete error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}
