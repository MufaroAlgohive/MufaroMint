import { supabaseAdmin, supabase } from "../_lib/supabase.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, error: "Unauthorized" });

    const db = supabaseAdmin || supabase;
    const { data: { user }, error: authError } = await db.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ success: false, error: "Invalid token" });

    const { sessionFingerprint } = req.body;
    const fingerprint = sessionFingerprint || user.id + "_" + Date.now();

    res.json({ success: true, sessionId: fingerprint });
  } catch (error) {
    console.error("Session record error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}
