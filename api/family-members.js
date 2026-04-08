import { supabase, supabaseAdmin } from "./_lib/supabase.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();

  const db = supabaseAdmin || supabase;
  if (!db) return res.status(500).json({ error: "Database not connected" });

  // ── GET /api/family-members?user_id=xxx ──────────────────────────────────
  if (req.method === "GET") {
    const userId = req.query.user_id;
    if (!userId) return res.status(400).json({ error: "user_id required" });
    try {
      const { data, error } = await db
        .from("family_members")
        .select("*")
        .eq("primary_user_id", userId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return res.json({ members: data || [] });
    } catch (e) {
      console.error("[family] GET error:", e.message);
      return res.status(500).json({ error: e.message });
    }
  }

  // ── POST /api/family-members ─────────────────────────────────────────────
  if (req.method === "POST") {
    const { primary_user_id, relationship, first_name, last_name, date_of_birth } = req.body || {};
    if (!primary_user_id || !relationship || !first_name) {
      return res.status(400).json({ error: "primary_user_id, relationship, first_name required" });
    }
    if (!["spouse", "child"].includes(relationship)) {
      return res.status(400).json({ error: "relationship must be spouse or child" });
    }
    try {
      if (relationship === "spouse") {
        const { data: existing } = await db
          .from("family_members")
          .select("id")
          .eq("primary_user_id", primary_user_id)
          .eq("relationship", "spouse")
          .maybeSingle();
        if (existing) return res.status(409).json({ error: "A spouse is already linked to this account." });
      }

      const prefix = relationship === "spouse" ? "SPO" : "CHD";
      const rand = Math.floor(1000000 + Math.random() * 9000000);
      const mint_number = `${prefix}${String(rand).padStart(10, "0")}`;

      const { data, error } = await db
        .from("family_members")
        .insert({
          primary_user_id,
          relationship,
          first_name: first_name.trim(),
          last_name: (last_name || "").trim(),
          date_of_birth: date_of_birth || null,
          mint_number,
        })
        .select()
        .single();
      if (error) throw error;
      return res.status(201).json({ member: data });
    } catch (e) {
      console.error("[family] POST error:", e.message);
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
