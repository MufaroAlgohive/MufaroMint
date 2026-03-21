import { supabaseAdmin, supabase } from "../_lib/supabase.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, error: "Missing token" });

    const db = supabaseAdmin || supabase;
    const { data: { user }, error: authErr } = await db.auth.getUser(token);
    if (authErr || !user) return res.status(401).json({ success: false, error: "Invalid session" });

    const {
      existing_onboarding_id,
      // signing fields from AccountAgreementStep
      signed_agreement_url,
      signed_at,
      downloaded_at,
      // legacy fields (kept for backwards compat)
      bank_name,
      bank_account_name,
      bank_account_type,
      bank_account_number,
      bank_branch_code,
      tax_number,
    } = req.body;

    const userId = user.id;

    // ── Update required_actions (non-critical) ────────────────────────────
    try {
      const { data: existingAction } = await db
        .from("required_actions")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existingAction) {
        await db.from("required_actions").update({ kyc_verified: true }).eq("user_id", userId);
      } else {
        await db.from("required_actions").insert({ user_id: userId, kyc_verified: true });
      }
    } catch (actionErr) {
      console.warn("[Onboarding] required_actions update failed (non-critical):", actionErr?.message);
    }

    // ── Resolve onboarding record ID ──────────────────────────────────────
    let onboardingId = existing_onboarding_id;
    if (!onboardingId) {
      const { data: latest } = await db
        .from("user_onboarding")
        .select("id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latest?.id) onboardingId = latest.id;
    }

    // ── Build update payload ──────────────────────────────────────────────
    const updatePayload = { kyc_status: "onboarding_complete" };

    // The URLs are correctly written to sumsub_raw JSON blob further down.

    // Legacy bank fields
    if (bank_name) updatePayload.bank_name = bank_name;
    if (bank_account_number) updatePayload.bank_account_number = bank_account_number;
    if (bank_branch_code) updatePayload.bank_branch_code = bank_branch_code;

    const insertPayload = {
      user_id: userId,
      kyc_status: "onboarding_complete",
      employment_status: "not_provided",
      ...( bank_name ? { bank_name } : {} ),
      ...( bank_account_number ? { bank_account_number } : {} ),
      ...( bank_branch_code ? { bank_branch_code } : {} ),
    };

    let saved = false;

    // ── Try update first ──────────────────────────────────────────────────
    if (onboardingId) {
      const { data: updated, error } = await db
        .from("user_onboarding")
        .update(updatePayload)
        .eq("id", onboardingId)
        .eq("user_id", userId)
        .select("id");

      if (error) {
        console.error("[Onboarding] Update failed:", error.message);
      } else if (updated && updated.length > 0) {
        saved = true;
      }
    }

    // ── Fallback insert ───────────────────────────────────────────────────
    if (!saved) {
      const { data: inserted, error: insErr } = await db
        .from("user_onboarding")
        .insert(insertPayload)
        .select("id");
      if (insErr) {
        console.error("[Onboarding] Insert failed:", insErr.message);
        return res.status(500).json({ success: false, error: insErr.message });
      }
      saved = true;
      if (inserted?.[0]?.id) onboardingId = inserted[0].id;
    }

    // ── Merge sumsub_raw flags (non-critical) ─────────────────────────────
    if (onboardingId) {
      try {
        const { data: current } = await db
          .from("user_onboarding")
          .select("sumsub_raw")
          .eq("id", onboardingId)
          .maybeSingle();

        let rawData = {};
        if (current?.sumsub_raw) {
          rawData = typeof current.sumsub_raw === "string"
            ? JSON.parse(current.sumsub_raw)
            : current.sumsub_raw;
        }

        // Stamp agreement completion flags
        if (signed_at) rawData.signed_at = signed_at;
        if (downloaded_at) rawData.downloaded_at = downloaded_at;
        if (signed_agreement_url) rawData.signed_agreement_url = signed_agreement_url;
        rawData.account_agreement_signed = true;
        rawData.terms_accepted = rawData.terms_accepted || true;

        // Legacy bank/tax details
        if (bank_name || bank_account_name || bank_account_type || bank_account_number || bank_branch_code) {
          rawData.bank_details = {
            bank_name: bank_name || null,
            bank_account_name: bank_account_name || null,
            bank_account_type: bank_account_type || null,
            bank_account_number: bank_account_number || null,
            bank_branch_code: bank_branch_code || null,
            savedAt: new Date().toISOString(),
          };
        }

        if (tax_number) {
          rawData.tax_details = { tax_number, savedAt: new Date().toISOString() };
        }

        await db
          .from("user_onboarding")
          .update({ sumsub_raw: JSON.stringify(rawData) })
          .eq("id", onboardingId);
      } catch (rawErr) {
        console.warn("[Onboarding] Failed to merge sumsub_raw:", rawErr?.message);
      }
    }

    console.log(`[Onboarding] Completed for user ${userId}, onboarding_id: ${onboardingId}, url: ${signed_agreement_url || "none"}`);
    res.json({ success: true, onboarding_id: onboardingId });
  } catch (error) {
    console.error("[Onboarding] Complete error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}
