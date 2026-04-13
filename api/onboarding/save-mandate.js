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

    const { mandate_data, existing_onboarding_id } = req.body;

    if (!mandate_data) {
      return res.status(400).json({ success: false, error: "Missing mandate_data" });
    }

    const mandateJson = typeof mandate_data === "string" ? mandate_data : JSON.stringify(mandate_data);

    let onboardingId = existing_onboarding_id;

    // Single query to get both ID and sumsub_raw — avoids redundant database hits
    const { data: currentRow } = onboardingId
      ? await db.from("user_onboarding").select("id,sumsub_raw").eq("id", onboardingId).eq("user_id", user.id).maybeSingle()
      : await db.from("user_onboarding").select("id,sumsub_raw").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();

    if (currentRow?.id) onboardingId = currentRow.id;

    let existingRaw = {};
    if (currentRow?.sumsub_raw) {
      try { existingRaw = typeof currentRow.sumsub_raw === "string" ? JSON.parse(currentRow.sumsub_raw) : currentRow.sumsub_raw; } catch (e) { existingRaw = {}; }
    }
    existingRaw.mandate_data = JSON.parse(mandateJson);
    const mergedRaw = JSON.stringify(existingRaw);

    if (onboardingId) {
      const { error } = await db
        .from("user_onboarding")
        .update({ sumsub_raw: mergedRaw })
        .eq("id", onboardingId)
        .eq("user_id", user.id);
      if (error) {
        console.error("[Onboarding] Mandate save update error:", error.message);
        return res.status(500).json({ success: false, error: error.message });
      }
    } else {
      const { data, error } = await db
        .from("user_onboarding")
        .insert({ user_id: user.id, employment_status: "not_provided", sumsub_raw: mergedRaw })
        .select("id")
        .single();
      if (error) {
        console.error("[Onboarding] Mandate save insert error:", error.message);
        return res.status(500).json({ success: false, error: error.message });
      }
      onboardingId = data?.id;
    }

    console.log(`[Onboarding] Mandate saved for user ${user.id}, onboarding_id: ${onboardingId}`);
    res.json({ success: true, onboarding_id: onboardingId });
  } catch (error) {
    console.error("[Onboarding] Mandate save error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}
