import { supabase, supabaseAdmin, authenticateUser } from "./_lib/supabase.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });

  try {
    if (!supabase) return res.status(500).json({ success: false, error: "Database not connected" });

    const { user, error: authError } = await authenticateUser(req);
    if (authError || !user) return res.status(401).json({ success: false, error: "Unauthorized" });

    const db = supabaseAdmin || supabase;
    const userId = user.id;
    const { amount, reference, description } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, error: "Invalid amount" });
    }

    const amountCents = Math.round(Number(amount) * 100);
    const eftRef = reference || `EFT-${Date.now()}`;
    const now = new Date().toISOString();

    // 1. Insert a pending credit transaction so it appears in transaction history
    const { error: txError } = await db.from("transactions").insert({
      user_id: userId,
      direction: "credit",
      name: "EFT Deposit",
      description: description || "Manual EFT bank transfer — pending bank verification",
      amount: amountCents,
      store_reference: eftRef,
      currency: "ZAR",
      status: "pending",
      transaction_date: now,
      created_at: now,
    });

    if (txError) {
      console.error("[eft-deposit] Transaction insert error:", txError.message);
      return res.status(500).json({ success: false, error: "Failed to record pending deposit" });
    }

    // 2. Update pending_balance on the wallets table (best-effort — column added via server migration)
    try {
      const { data: wallet } = await db
        .from("wallets")
        .select("pending_balance")
        .eq("user_id", userId)
        .maybeSingle();

      if (wallet !== null) {
        const currentPending = Number(wallet?.pending_balance || 0);
        await db
          .from("wallets")
          .update({ pending_balance: currentPending + Number(amount) })
          .eq("user_id", userId);
      }
    } catch (walletErr) {
      console.warn("[eft-deposit] Could not update pending_balance:", walletErr?.message);
    }

    console.log(`[eft-deposit] Recorded pending EFT deposit of R${amount} for user ${userId}, ref: ${eftRef}`);
    return res.status(200).json({ success: true, reference: eftRef });
  } catch (err) {
    console.error("[eft-deposit] Error:", err);
    return res.status(500).json({ success: false, error: err.message || "Failed to record EFT deposit" });
  }
}
