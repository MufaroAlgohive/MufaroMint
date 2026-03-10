import { supabaseAdmin, supabase } from "../_lib/supabase.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, error: "Unauthorized" });

    const db = supabaseAdmin || supabase;
    const { data: { user }, error: authError } = await db.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ success: false, error: "Invalid token" });

    res.json({ success: true, valid: true });
  } catch (error) {
    console.error("Session validate error:", error);
    res.json({ success: true, valid: true });
  }
}
