import { supabaseAdmin } from "../_lib/supabase.js";
import { truIDClient } from "../_lib/truidClient.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: { message: "Method not allowed" } });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, error: { message: "Missing or invalid Authorization header" } });
    }

    const token = authHeader.replace("Bearer ", "");
    if (!supabaseAdmin) {
      return res.status(500).json({ success: false, error: { message: "Database not configured" } });
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ success: false, error: { message: "Invalid or expired token" } });
    }

    const { collectionId } = req.body;
    if (!collectionId) {
      return res.status(400).json({ success: false, error: { message: "collectionId is required" } });
    }

    const data = await truIDClient.getCollectionData(collectionId);

    const { data: existingAction } = await supabaseAdmin
      .from("required_actions")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingAction) {
      await supabaseAdmin
        .from("required_actions")
        .update({ bank_linked: true, bank_in_review: false })
        .eq("user_id", user.id);
    } else {
      await supabaseAdmin
        .from("required_actions")
        .insert({ user_id: user.id, bank_linked: true, bank_in_review: false });
    }

    return res.json({ success: true, snapshot: data });
  } catch (error) {
    console.error("Banking capture error:", error);
    return res.status(error.status || 500).json({
      success: false,
      error: { message: error.message || "Internal server error" }
    });
  }
}
