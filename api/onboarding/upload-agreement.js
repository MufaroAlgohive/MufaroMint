import { supabaseAdmin, supabase } from "../_lib/supabase.js";

/**
 * POST /api/onboarding/upload-agreement
 *
 * Accepts a base64-encoded PDF and uploads it to the
 * "signed-agreements" Supabase Storage bucket using the
 * service role key (supabaseAdmin) so RLS is bypassed.
 *
 * Body: { pdfBase64: string }
 * Returns: { success: true, publicUrl: string }
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    // ── Auth ──────────────────────────────────────────────────────────────
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, error: "Missing token" });

    const db = supabaseAdmin || supabase;
    const { data: { user }, error: authErr } = await db.auth.getUser(token);
    if (authErr || !user) return res.status(401).json({ success: false, error: "Invalid session" });

    // ── Validate body ─────────────────────────────────────────────────────
    const { pdfBase64, subjectId } = req.body || {};
    if (!pdfBase64 || typeof pdfBase64 !== "string") {
      return res.status(400).json({ success: false, error: "Missing pdfBase64 in request body" });
    }

    // ── Decode base64 → Buffer ────────────────────────────────────────────
    let pdfBuffer;
    try {
      pdfBuffer = Buffer.from(pdfBase64, "base64");
    } catch (decodeErr) {
      return res.status(400).json({ success: false, error: "Invalid base64 data" });
    }

    if (pdfBuffer.length === 0) {
      return res.status(400).json({ success: false, error: "PDF buffer is empty" });
    }

    // ── Build storage path ────────────────────────────────────────────────
    let storageSubjectId = user.id;
    if (subjectId) {
      const { data: ownedMember, error: memberErr } = await db
        .from("family_members")
        .select("id")
        .eq("id", subjectId)
        .eq("primary_user_id", user.id)
        .maybeSingle();

      if (memberErr) {
        return res.status(500).json({ success: false, error: memberErr.message || "Failed to validate subject" });
      }
      if (!ownedMember) {
        return res.status(403).json({ success: false, error: "Not authorized for this subjectId" });
      }
      storageSubjectId = subjectId;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filePath = `${storageSubjectId}/agreement-${timestamp}.pdf`;
    const bucketName = "signed-agreements";

    // ── Upload to Supabase Storage ────────────────────────────────────────
    const storageClient = supabaseAdmin || supabase;
    const { error: uploadError } = await storageClient.storage
      .from(bucketName)
      .upload(filePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("[upload-agreement] Storage upload error:", uploadError.message);
      return res.status(500).json({ success: false, error: `Storage upload failed: ${uploadError.message}` });
    }

    // ── Get public URL ────────────────────────────────────────────────────
    const { data: urlData } = storageClient.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    const publicUrl = urlData?.publicUrl || "";

    if (!publicUrl) {
      return res.status(500).json({ success: false, error: "Failed to get public URL after upload" });
    }

    console.log(`[upload-agreement] Uploaded for user ${user.id}, subject ${storageSubjectId}: ${publicUrl}`);
    return res.status(200).json({ success: true, publicUrl });
  } catch (error) {
    console.error("[upload-agreement] Unexpected error:", error);
    return res.status(500).json({ success: false, error: error.message || "Unexpected server error" });
  }
}
