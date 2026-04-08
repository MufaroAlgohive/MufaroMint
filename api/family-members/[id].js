import { supabase, supabaseAdmin } from "../_lib/supabase.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();

  const db = supabaseAdmin || supabase;
  if (!db) return res.status(500).json({ error: "Database not connected" });

  if (req.method === "DELETE") {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "id required" });
    try {
      const { error } = await db
        .from("family_members")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return res.json({ success: true });
    } catch (e) {
      console.error("[family] DELETE error:", e.message);
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
