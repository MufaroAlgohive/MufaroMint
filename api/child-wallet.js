import { supabase, supabaseAdmin, authenticateUser } from "./_lib/supabase.js";

/**
 * Child Wallet API
 *
 * GET  /api/child-wallet?family_member_id=xxx
 *   → { balance, mint_number }
 *
 * POST /api/child-wallet
 *   body: { action: "transfer", family_member_id, amount }
 *   → { success, child_balance, parent_balance, transaction_id }
 */

export default async function handler(req, res) {
  const db = supabaseAdmin || supabase;
  if (!db) return res.status(500).json({ error: "Database not available." });

  // ── GET: read child balance ────────────────────────────────────────────
  if (req.method === "GET") {
    const { family_member_id } = req.query || {};
    if (!family_member_id) return res.status(400).json({ error: "family_member_id is required." });

    try {
      const { data, error } = await db
        .from("family_members")
        .select("id, available_balance, mint_number, first_name")
        .eq("id", family_member_id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return res.status(404).json({ error: "Child account not found." });

      return res.json({
        balance: data.available_balance || 0,
        mint_number: data.mint_number,
        first_name: data.first_name,
      });
    } catch (e) {
      console.error("[child-wallet] GET error:", e.message);
      return res.status(500).json({ error: "Failed to fetch balance." });
    }
  }

  // ── POST: transfer funds from parent to child ─────────────────────────
  if (req.method === "POST") {
    const { action, family_member_id, amount } = req.body || {};

    if (action !== "transfer") {
      return res.status(400).json({ error: 'Only action "transfer" is supported.' });
    }
    if (!family_member_id) return res.status(400).json({ error: "family_member_id is required." });

    const amountCents = Number(amount);
    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      return res.status(400).json({ error: "Amount must be a positive integer (in cents)." });
    }

    // Authenticate parent
    let parentUserId;
    try {
      const user = await authenticateUser(req);
      parentUserId = user?.id;
    } catch {}
    if (!parentUserId) {
      // Fallback: look up from family_member's primary_user_id
      // (for dev/testing without auth header)
      try {
        const { data: fm } = await db
          .from("family_members")
          .select("primary_user_id")
          .eq("id", family_member_id)
          .maybeSingle();
        parentUserId = fm?.primary_user_id;
      } catch {}
    }
    if (!parentUserId) return res.status(401).json({ error: "Could not identify parent." });

    try {
      const transferRef = `CHILD-TRF-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const { data, error } = await db.rpc("transfer_parent_to_child_wallet", {
        p_parent_user_id: parentUserId,
        p_family_member_id: family_member_id,
        p_amount_cents: amountCents,
        p_reference: transferRef,
      });

      if (error) {
        const message = error.message || "Transfer failed.";
        if (message.includes("Insufficient wallet balance")) {
          return res.status(400).json({ error: "Insufficient wallet balance." });
        }
        if (message.includes("Child account not found") || message.includes("Parent wallet not found")) {
          return res.status(404).json({ error: message });
        }
        if (message.includes("only transfer to your own children")) {
          return res.status(403).json({ error: "You can only transfer to your own children." });
        }
        if (message.includes("only supported for child accounts")) {
          return res.status(400).json({ error: "Transfers are only supported for child accounts." });
        }
        if (error.code === "42883") {
          return res.status(500).json({
            error: "Transfer function not found. Run scripts/sql/family-and-child-dashboard.sql in Supabase first.",
          });
        }
        throw error;
      }

      const row = Array.isArray(data) ? data[0] : data;
      if (!row) {
        return res.status(500).json({ error: "Transfer failed. No transfer result returned." });
      }

      return res.json({
        success: true,
        child_balance: Number(row.child_balance_cents || 0),
        parent_balance: Number(row.parent_balance_cents || 0),
        transaction_ref: row.transfer_reference || transferRef,
      });
    } catch (e) {
      console.error("[child-wallet] POST error:", e.message);
      return res.status(500).json({ error: "Transfer failed. Please try again." });
    }
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Method not allowed." });
}
