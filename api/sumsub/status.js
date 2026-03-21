import crypto from "crypto";
import { supabaseAdmin, supabase } from "../_lib/supabase.js";

const SUMSUB_APP_TOKEN = process.env.SUMSUB_APP_TOKEN;
const SUMSUB_SECRET_KEY = process.env.SUMSUB_SECRET_KEY;
const SUMSUB_BASE_URL = "https://api.sumsub.com";

const createSignature = (ts, method, path, body = "") => {
  const data = ts + method.toUpperCase() + path + body;
  return crypto
    .createHmac("sha256", SUMSUB_SECRET_KEY)
    .update(data)
    .digest("hex");
};

async function getSumsubApplicantByExternalId(externalUserId) {
  const ts = Math.floor(Date.now() / 1000).toString();
  const path = `/resources/applicants/-;externalUserId=${encodeURIComponent(externalUserId)}/one`;
  const signature = createSignature(ts, "GET", path);

  const response = await fetch(`${SUMSUB_BASE_URL}${path}`, {
    method: "GET",
    headers: {
      "Accept": "application/json",
      "X-App-Token": SUMSUB_APP_TOKEN,
      "X-App-Access-Ts": ts,
      "X-App-Access-Sig": signature,
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    const errorText = await response.text();
    throw new Error(`Sumsub API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

async function getSumsubRequiredDocsStatus(applicantId) {
  const ts = Math.floor(Date.now() / 1000).toString();
  const path = `/resources/applicants/${applicantId}/requiredIdDocsStatus`;
  const signature = createSignature(ts, "GET", path);

  const response = await fetch(`${SUMSUB_BASE_URL}${path}`, {
    method: "GET",
    headers: {
      "Accept": "application/json",
      "X-App-Token": SUMSUB_APP_TOKEN,
      "X-App-Access-Ts": ts,
      "X-App-Access-Sig": signature,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Failed to get required docs status:", errorText);
    return null;
  }

  return response.json();
}

function extractImageIds(obj) {
  let ids = new Set();
  if (Array.isArray(obj)) {
    obj.forEach(v => extractImageIds(v).forEach(id => ids.add(id)));
  } else if (typeof obj === "object" && obj !== null) {
    for (const key of Object.keys(obj)) {
      if (key === "imageId" && obj[key]) {
        ids.add(obj[key]);
      } else if (key === "imageIds" && Array.isArray(obj[key])) {
        obj[key].forEach(id => ids.add(id));
      } else {
        extractImageIds(obj[key]).forEach(id => ids.add(id));
      }
    }
  }
  return ids;
}

async function downloadSumsubImage(applicantId, imageId) {
  const ts = Math.floor(Date.now() / 1000).toString();
  const path = `/resources/applicants/${applicantId}/image/${imageId}`;
  const signature = createSignature(ts, "GET", path);

  const response = await fetch(`${SUMSUB_BASE_URL}${path}`, {
    method: "GET",
    headers: {
      "X-App-Token": SUMSUB_APP_TOKEN,
      "X-App-Access-Ts": ts,
      "X-App-Access-Sig": signature,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Failed to download image ${imageId}:`, errorText);
    return null;
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function archiveDocuments(db, userId, applicant) {
  try {
    const imageIds = extractImageIds(applicant);
    if (imageIds.size === 0) return;
    console.log(`[Archive] Found ${imageIds.size} images for user ${userId}. Archiving...`);

    for (const imageId of imageIds) {
      const buffer = await downloadSumsubImage(applicant.id, imageId);
      if (buffer) {
        const filePath = `${userId}/${imageId}.jpg`;
        const { error } = await db.storage
          .from("sumsub-archive")
          .upload(filePath, buffer, {
            contentType: "image/jpeg",
            upsert: true
          });
        
        if (error) {
          console.error(`[Archive] Failed to upload ${imageId} to Supabase:`, error.message);
        } else {
          console.log(`[Archive] Successfully archived ${imageId} to sumsub-archive`);
        }
      }
    }
  } catch (err) {
    console.error(`[Archive] Global archiving error for ${userId}:`, err.message);
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: { message: "Method not allowed" } });
  }

  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: { message: "userId is required" }
      });
    }

    const db = supabaseAdmin || supabase;
    if (db) {
      try {
        const { data: packRecord } = await db
          .from("user_onboarding_pack_details")
          .select("user_id")
          .eq("user_id", userId)
          .maybeSingle();

        if (packRecord) {
          console.log(`[Sumsub] User ${userId} already verified (found in user_onboarding_pack_details), skipping Sumsub API`);
          return res.status(200).json({
            success: true,
            status: "verified",
            applicantId: null,
            reviewStatus: "completed",
            reviewAnswer: "GREEN",
            rejectLabels: [],
            hasIncompleteSteps: false,
            hasRejectedSteps: false,
            allStepsGreen: true,
            createdAt: null
          });
        }
      } catch (dbErr) {
        console.error("[Sumsub] Error checking user_onboarding_pack_details:", dbErr.message);
      }
    }

    if (!SUMSUB_APP_TOKEN || !SUMSUB_SECRET_KEY) {
      return res.status(500).json({
        success: false,
        error: { message: "Sumsub credentials not configured" }
      });
    }

    const applicant = await getSumsubApplicantByExternalId(userId);

    if (!applicant) {
      return res.status(200).json({
        success: true,
        status: "not_verified",
        applicantId: null,
        reviewStatus: null,
        reviewAnswer: null,
        rejectLabels: [],
        createdAt: null
      });
    }

    const requiredDocsStatus = await getSumsubRequiredDocsStatus(applicant.id);

    let hasIncompleteSteps = false;
    let hasRejectedSteps = false;
    let allStepsGreen = true;
    let hasAnySubmittedSteps = false;

    if (requiredDocsStatus) {
      for (const [stepName, stepData] of Object.entries(requiredDocsStatus)) {
        if (stepData === null) {
          hasIncompleteSteps = true;
          allStepsGreen = false;
        } else {
          hasAnySubmittedSteps = true;
          if (stepData?.reviewResult?.reviewAnswer === "RED") {
            hasRejectedSteps = true;
            allStepsGreen = false;
          } else if (stepData?.reviewResult?.reviewAnswer !== "GREEN") {
            allStepsGreen = false;
          }
        }
      }
    }

    const reviewStatus = applicant.review?.reviewStatus;
    const reviewAnswer = applicant.review?.reviewResult?.reviewAnswer;
    const rejectLabels = applicant.review?.reviewResult?.rejectLabels || [];
    const reviewRejectType = applicant.review?.reviewResult?.reviewRejectType;

    let status = "not_verified";

    if (allStepsGreen && reviewAnswer === "GREEN") {
      status = "verified";

      const db = supabaseAdmin || supabase;
      if (db) {
        try {
          const { data: existingPack } = await db
            .from("user_onboarding_pack_details")
            .select("user_id")
            .eq("user_id", userId)
            .maybeSingle();

          if (!existingPack) {
            await db
              .from("user_onboarding_pack_details")
              .insert({ user_id: userId, pack_details: applicant, updated_at: new Date().toISOString() });
            console.log(`[Status] Created user_onboarding_pack_details for user ${userId}`);
            
            // Trigger background archive of identity documents
            await archiveDocuments(db, userId, applicant);
          }

          const onboardingUpdate = {
            sumsub_external_user_id: userId,
            sumsub_applicant_id: applicant.id,
            sumsub_review_status: reviewStatus || "completed",
            sumsub_review_answer: reviewAnswer,
            kyc_checked_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          const { data: existingOnboarding } = await db
            .from("user_onboarding")
            .select("id, kyc_status")
            .eq("user_id", userId)
            .maybeSingle();

          if (existingOnboarding) {
            if (existingOnboarding.kyc_status !== "onboarding_complete") {
              onboardingUpdate.kyc_status = "verified";
            }
            onboardingUpdate.kyc_verified_at = new Date().toISOString();
            await db.from("user_onboarding").update(onboardingUpdate).eq("id", existingOnboarding.id).eq("user_id", userId);
            console.log(`[Status] Updated user_onboarding for user ${userId}`);
          }

          const { data: existingAction } = await db
            .from("required_actions")
            .select("id")
            .eq("user_id", userId)
            .maybeSingle();

          if (existingAction) {
            await db.from("required_actions").update({ kyc_verified: true, kyc_pending: false, kyc_needs_resubmission: false }).eq("user_id", userId);
          }
        } catch (dbErr) {
          console.error(`[Status] Error updating onboarding for ${userId}:`, dbErr.message);
        }
      }
    } else if (hasRejectedSteps || reviewAnswer === "RED") {
      status = "needs_resubmission";
    } else if (reviewStatus === "onHold") {
      status = "needs_resubmission";
    } else if (hasIncompleteSteps && hasAnySubmittedSteps) {
      status = "needs_resubmission";
    } else if (hasIncompleteSteps && !hasAnySubmittedSteps) {
      status = "not_verified";
    } else if (!allStepsGreen) {
      status = "needs_resubmission";
    } else if (reviewStatus === "pending" || reviewStatus === "queued") {
      status = "pending";
    } else if (hasAnySubmittedSteps && !hasIncompleteSteps) {
      status = "pending";
    } else {
      status = "not_verified";
    }

    return res.status(200).json({
      success: true,
      status,
      applicantId: applicant.id,
      reviewStatus: reviewStatus || null,
      reviewAnswer: reviewAnswer || null,
      reviewRejectType: reviewRejectType || null,
      rejectLabels,
      hasIncompleteSteps,
      hasRejectedSteps,
      allStepsGreen,
      createdAt: applicant.createdAt || null
    });
  } catch (error) {
    console.error("Sumsub status error:", error);
    return res.status(500).json({
      success: false,
      error: { message: error.message || "Failed to get status" }
    });
  }
}
