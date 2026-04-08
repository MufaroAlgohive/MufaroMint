import { supabase, supabaseAdmin } from "./_lib/supabase.js";
import { Resend } from "resend";

/* ── helpers ─────────────────────────────────────────────────────────────── */

function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

function maskEmail(email) {
  if (!email || !email.includes("@")) return "***";
  const [local, domain] = email.split("@");
  return `${local.length > 1 ? local[0] + "***" : "***"}@${domain}`;
}

function buildInviteHtml(inviterName) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8f6fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:480px;margin:0 auto;padding:40px 24px;">
  <div style="background:white;border-radius:24px;padding:40px 32px;text-align:center;">
    <div style="font-size:28px;font-weight:800;color:#1e1b4b;margin-bottom:8px;">mint</div>
    <div style="color:#94a3b8;font-size:13px;margin-bottom:32px;">Family Investing</div>
    <p style="color:#334155;font-size:15px;line-height:1.6;margin-bottom:24px;">
      <strong>${inviterName}</strong> wants to link you as their spouse on Mint — the smart investing platform for South African families.
    </p>
    <p style="color:#334155;font-size:15px;line-height:1.6;margin-bottom:32px;">
      Sign up to start investing together and manage your family&rsquo;s wealth in one place.
    </p>
    <a href="https://mymint.co.za" style="display:inline-block;background:linear-gradient(135deg,#1e1b4b,#312e81);color:white;padding:14px 40px;border-radius:14px;text-decoration:none;font-weight:700;font-size:15px;">Join Mint</a>
    <p style="color:#94a3b8;font-size:11px;margin-top:24px;">If you weren&rsquo;t expecting this invite, you can safely ignore this email.</p>
  </div>
</div></body></html>`;
}

async function findExistingUserByEmail(db, normalizedEmail) {
  const { data: profileMatch, error: profileErr } = await db
    .from("profiles")
    .select("id, first_name, last_name, email")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (!profileErr && profileMatch) {
    return {
      id: profileMatch.id,
      first_name: profileMatch.first_name || "",
      last_name: profileMatch.last_name || "",
      email: profileMatch.email || normalizedEmail,
    };
  }

  const { data: onboardingMatch, error: onboardingErr } = await db
    .from("user_onboarding")
    .select("id, user_id, first_name, last_name, email")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (!onboardingErr && onboardingMatch) {
    const linkedUserId = onboardingMatch.user_id || onboardingMatch.id || null;
    if (linkedUserId) {
      const { data: linkedProfile, error: linkedProfileErr } = await db
        .from("profiles")
        .select("id, first_name, last_name, email")
        .eq("id", linkedUserId)
        .maybeSingle();

      if (!linkedProfileErr && linkedProfile) {
        return {
          id: linkedProfile.id,
          first_name: linkedProfile.first_name || onboardingMatch.first_name || "",
          last_name: linkedProfile.last_name || onboardingMatch.last_name || "",
          email: linkedProfile.email || onboardingMatch.email || normalizedEmail,
        };
      }

      return {
        id: linkedUserId,
        first_name: onboardingMatch.first_name || "",
        last_name: onboardingMatch.last_name || "",
        email: onboardingMatch.email || normalizedEmail,
      };
    }
  }

  return null;
}

/* ── handler ──────────────────────────────────────────────────────────────── */

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
    const {
      primary_user_id, relationship, first_name, last_name,
      date_of_birth, email, certificate_url,
    } = req.body || {};

    if (!primary_user_id || !relationship) {
      return res.status(400).json({ error: "primary_user_id and relationship required" });
    }
    if (!["spouse", "child"].includes(relationship)) {
      return res.status(400).json({ error: "relationship must be spouse or child" });
    }

    try {
      /* ──────────────── SPOUSE ──────────────── */
      if (relationship === "spouse") {
        if (!email || !email.includes("@")) {
          return res.status(400).json({ error: "A valid email address is required to link a spouse." });
        }

        // Already have a spouse?
        const { data: existingSpouse } = await db
          .from("family_members")
          .select("id")
          .eq("primary_user_id", primary_user_id)
          .eq("relationship", "spouse")
          .maybeSingle();
        if (existingSpouse) {
          return res.status(409).json({ error: "A spouse is already linked to this account." });
        }

        // Look up spouse in profiles, then fallback to user_onboarding
        const normalizedEmail = email.toLowerCase().trim();
        const matchedProfile = await findExistingUserByEmail(db, normalizedEmail);

        if (matchedProfile) {
          // Prevent self-linking
          if (matchedProfile.id === primary_user_id) {
            return res.status(400).json({ error: "You cannot add yourself as a spouse." });
          }

          // Fetch their real mint number from wallet
          let spouseMintNumber = null;
          const { data: walletRow } = await db
            .from("wallet")
            .select("mint_number")
            .eq("user_id", matchedProfile.id)
            .maybeSingle();
          spouseMintNumber = walletRow?.mint_number || null;

          if (!spouseMintNumber) {
            const rand = Math.floor(1000000 + Math.random() * 9000000);
            spouseMintNumber = `SPO${String(rand).padStart(10, "0")}`;
          }

          const insertPayload = {
            primary_user_id,
            relationship: "spouse",
            first_name: matchedProfile.first_name || first_name?.trim() || "",
            last_name: matchedProfile.last_name || last_name?.trim() || "",
            spouse_email: normalizedEmail,
            mint_number: spouseMintNumber,
          };

          // Try with linked_user_id (column may not exist yet)
          let member = null;
          const { data: d1, error: e1 } = await db
            .from("family_members")
            .insert({ ...insertPayload, linked_user_id: matchedProfile.id })
            .select()
            .single();

          if (e1 && e1.message?.includes("linked_user_id")) {
            const { data: d2, error: e2 } = await db
              .from("family_members")
              .insert(insertPayload)
              .select()
              .single();
            if (e2) throw e2;
            member = d2;
          } else if (e1) {
            throw e1;
          } else {
            member = d1;
          }

          return res.status(201).json({ member, linked: true });
        }

        /* ── user NOT found → send invite email ── */
        const { data: inviterProfile } = await db
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", primary_user_id)
          .maybeSingle();
        const inviterName =
          [inviterProfile?.first_name, inviterProfile?.last_name].filter(Boolean).join(" ") || "Your partner";

        let emailSent = false;
        const resend = getResend();
        if (resend) {
          try {
            await resend.emails.send({
              from: "Mint <noreply@mymint.co.za>",
              to: [normalizedEmail],
              subject: `${inviterName} has invited you to join Mint`,
              html: buildInviteHtml(inviterName),
            });
            emailSent = true;
          } catch (emailErr) {
            console.error("[family] Invite email failed:", emailErr.message);
          }
        } else {
          console.warn("[family] RESEND_API_KEY not set — cannot send spouse invite");
        }

        const masked = maskEmail(normalizedEmail);
        return res.status(200).json({
          invited: true,
          email_sent: emailSent,
          masked_email: masked,
          message: emailSent
            ? `Invitation sent to ${masked}. Once they sign up on Mint, you can link them as your spouse.`
            : `${masked} is not on Mint yet. Please ask them to sign up, then try again.`,
        });
      }

      /* ──────────────── CHILD ──────────────── */
      if (relationship === "child") {
        if (!first_name?.trim()) {
          return res.status(400).json({ error: "First name is required." });
        }
        if (!date_of_birth) {
          return res.status(400).json({ error: "Date of birth is required for a child." });
        }
        if (!certificate_url) {
          return res.status(400).json({ error: "Unabridged birth certificate is required." });
        }

        const rand = Math.floor(1000000 + Math.random() * 9000000);
        const mint_number = `CHD${String(rand).padStart(10, "0")}`;

        const basePayload = {
          primary_user_id,
          relationship: "child",
          first_name: first_name.trim(),
          last_name: (last_name || "").trim(),
          date_of_birth,
          certificate_uploaded_at: new Date().toISOString(),
          mint_number,
        };

        // Try with certificate_url column (may not exist yet)
        const { data: d1, error: e1 } = await db
          .from("family_members")
          .insert({ ...basePayload, certificate_url })
          .select()
          .single();

        if (e1 && e1.message?.includes("certificate_url")) {
          const { data: d2, error: e2 } = await db
            .from("family_members")
            .insert(basePayload)
            .select()
            .single();
          if (e2) throw e2;
          return res.status(201).json({ member: d2 });
        } else if (e1) {
          throw e1;
        }

        return res.status(201).json({ member: d1 });
      }
    } catch (e) {
      console.error("[family] POST error:", e.message);
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
