import { supabaseAdmin, supabase } from "../_lib/supabase.js";

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
      .select("id, kyc_status, employment_status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[Onboarding] Status fetch error:", error.message);
      return res.status(500).json({ success: false, error: error.message });
    }

    res.json({
      success: true,
      onboarding: data || null,
      onboarding_id: data?.id || null,
    });
  } catch (error) {
    console.error("[Onboarding] Status error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}
