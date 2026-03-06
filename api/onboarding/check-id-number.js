import { supabaseAdmin, supabase } from "../_lib/supabase.js";

function hasMatchingPackIdNumber(value, idNumber) {
  if (value == null) return false;

  if (Array.isArray(value)) {
    return value.some((item) => hasMatchingPackIdNumber(item, idNumber));
  }

  if (typeof value === "object") {
    for (const [key, nestedValue] of Object.entries(value)) {
      if (key === "number" && String(nestedValue) === idNumber) {
        return true;
      }
      if (hasMatchingPackIdNumber(nestedValue, idNumber)) {
        return true;
      }
    }
  }

  return false;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, error: "Missing token" });

    const db = supabaseAdmin || supabase;
    if (!db) return res.status(500).json({ success: false, error: "Database not available" });

    const { data: { user }, error: authErr } = await db.auth.getUser(token);
    if (authErr || !user) return res.status(401).json({ success: false, error: "Invalid session" });

    const idNumber = String(req.body?.id_number || "").replace(/\D/g, "");
    if (!/^\d{13}$/.test(idNumber)) {
      return res.status(400).json({ success: false, error: "A valid 13-digit id_number is required" });
    }

    const { data: rows, error } = await db
      .from("user_onboarding_pack_details")
      .select("pack_details");

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    const exists = (rows || []).some((row) => hasMatchingPackIdNumber(row?.pack_details, idNumber));

    return res.status(200).json({ success: true, exists });
  } catch (error) {
    console.error("[Onboarding] ID precheck error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
