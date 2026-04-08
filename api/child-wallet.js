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
    if (!amount || typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({ error: "Amount must be a positive number (in cents)." });
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
      // 1. Verify child belongs to this parent
      const { data: child, error: childErr } = await db
        .from("family_members")
        .select("id, primary_user_id, available_balance, first_name, relationship")
        .eq("id", family_member_id)
        .maybeSingle();

      if (childErr) throw childErr;
      if (!child) return res.status(404).json({ error: "Child account not found." });
      if (child.relationship !== "child") return res.status(400).json({ error: "Transfers are only supported for child accounts." });
      if (child.primary_user_id !== parentUserId) {
        return res.status(403).json({ error: "You can only transfer to your own children." });
      }

      // 2. Check parent wallet
      const { data: wallet, error: walletErr } = await db
        .from("wallets")
        .select("balance")
        .eq("user_id", parentUserId)
        .maybeSingle();

      if (walletErr) throw walletErr;
      const parentBalance = wallet?.balance || 0;
      if (parentBalance < amount) {
        return res.status(400).json({ error: "Insufficient wallet balance." });
      }

      // 3. Deduct from parent
      const newParentBalance = parentBalance - amount;
      const { error: deductErr } = await db
        .from("wallets")
        .update({ balance: newParentBalance })
        .eq("user_id", parentUserId);

      if (deductErr) throw deductErr;

      // 4. Credit child
      const childCurrentBalance = child.available_balance || 0;
      const newChildBalance = childCurrentBalance + amount;
      const { error: creditErr } = await db
        .from("family_members")
        .update({ available_balance: newChildBalance })
        .eq("id", family_member_id);

      if (creditErr) {
        // Rollback parent deduction
        await db.from("wallets").update({ balance: parentBalance }).eq("user_id", parentUserId);
        throw creditErr;
      }

      // 5. Record transactions
      const ref = `CHILD-TRF-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      // Parent side (debit)
      try {
        await db.from("transactions").insert({
          user_id: parentUserId,
          family_member_id: family_member_id,
          type: "transfer_out",
          direction: "debit",
          amount: amount,
          description: `Transfer to ${child.first_name}'s account`,
          store_reference: ref,
          status: "completed",
        });
      } catch (e) { console.warn("[child-wallet] parent tx insert:", e.message); }

      // Child side (credit)
      try {
        await db.from("transactions").insert({
          user_id: parentUserId,
          family_member_id: family_member_id,
          type: "transfer_in",
          direction: "credit",
          amount: amount,
          description: `Received from parent`,
          store_reference: ref,
          status: "completed",
        });
      } catch (e) { console.warn("[child-wallet] child tx insert:", e.message); }

      return res.json({
        success: true,
        child_balance: newChildBalance,
        parent_balance: newParentBalance,
        transaction_ref: ref,
      });
    } catch (e) {
      console.error("[child-wallet] POST error:", e.message);
      return res.status(500).json({ error: "Transfer failed. Please try again." });
    }
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Method not allowed." });
}
