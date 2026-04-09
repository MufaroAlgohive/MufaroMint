import { supabase, supabaseAdmin, authenticateUser } from "./_lib/supabase.js";

/**
 * Child Wallet API
 *
 * GET  /api/child-wallet?family_member_id=xxx
 *   → { balance, mint_number }
 *
 * POST /api/child-wallet
 *   body: { action: "transfer", family_member_id, amount }
 *   → { success, child_balance, parent_balance, transaction_ref }
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

    // Authenticate parent — authenticateUser returns { user, error }
    let parentUserId;
    try {
      const { user } = await authenticateUser(req);
      parentUserId = user?.id;
    } catch {}
    if (!parentUserId) {
      // Fallback: look up from family_member's primary_user_id
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

    // Keep original balances for rollback
    let originalParentBalance = null;
    let originalChildBalance = null;

    try {
      const transferRef = `CHILD-TRF-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      // 1. Read child record and verify ownership
      const { data: child, error: childErr } = await db
        .from("family_members")
        .select("id, primary_user_id, available_balance, first_name, relationship")
        .eq("id", family_member_id)
        .maybeSingle();

      if (childErr) throw childErr;
      if (!child) return res.status(404).json({ error: "Child account not found." });
      if (child.relationship !== "child") {
        return res.status(400).json({ error: "Transfers are only supported for child accounts." });
      }
      if (child.primary_user_id !== parentUserId) {
        return res.status(403).json({ error: "You can only transfer to your own children." });
      }

      originalChildBalance = child.available_balance || 0;

      // 2. Read parent wallet (balance is in RANDS)
      const { data: wallet, error: walletErr } = await db
        .from("wallets")
        .select("balance")
        .eq("user_id", parentUserId)
        .maybeSingle();

      if (walletErr) throw walletErr;
      if (!wallet) return res.status(404).json({ error: "Parent wallet not found." });

      const parentBalanceCents = Math.round(Number(wallet.balance) * 100);
      originalParentBalance = Number(wallet.balance);

      if (parentBalanceCents < amountCents) {
        return res.status(400).json({ error: "Insufficient wallet balance." });
      }

      // 3. Deduct from parent wallet (convert cents → rands for wallets table)
      const newParentBalanceRands = (parentBalanceCents - amountCents) / 100;
      const { error: deductErr } = await db
        .from("wallets")
        .update({ balance: newParentBalanceRands, updated_at: new Date().toISOString() })
        .eq("user_id", parentUserId);

      if (deductErr) throw deductErr;

      // 4. Credit child's available_balance (in cents)
      const newChildBalanceCents = originalChildBalance + amountCents;
      const { error: creditErr } = await db
        .from("family_members")
        .update({ available_balance: newChildBalanceCents })
        .eq("id", family_member_id);

      if (creditErr) {
        // Rollback parent wallet
        await db.from("wallets").update({ balance: originalParentBalance }).eq("user_id", parentUserId);
        throw creditErr;
      }

      // 5. Record transactions (amounts in cents)
      const { error: txErr } = await db.from("transactions").insert([
        {
          user_id: parentUserId,
          family_member_id: family_member_id,
          type: "transfer_out",
          direction: "debit",
          amount: amountCents,
          description: `Transfer to ${child.first_name || "child"}'s account`,
          store_reference: transferRef,
          status: "completed",
        },
        {
          user_id: parentUserId,
          family_member_id: family_member_id,
          type: "transfer_in",
          direction: "credit",
          amount: amountCents,
          description: "Received from parent",
          store_reference: transferRef,
          status: "completed",
        },
      ]);

      if (txErr) {
        console.error("[child-wallet] Transaction insert failed (transfer still applied):", txErr.message);
        // Don't rollback — money moved, just log the missing records
      }

      return res.json({
        success: true,
        child_balance: newChildBalanceCents,
        parent_balance: Math.round(newParentBalanceRands * 100),
        transaction_ref: transferRef,
      });
    } catch (e) {
      console.error("[child-wallet] POST error:", e.message);
      return res.status(500).json({ error: "Transfer failed. Please try again." });
    }
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Method not allowed." });
}
