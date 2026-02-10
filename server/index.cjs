const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const { Pool } = require("pg");
const truIDClient = require("./truidClient.cjs");

const pgPool = process.env.DATABASE_URL ? new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
}) : null;

const app = express();
app.use(cors());
app.use(express.json());

// Sumsub configuration
const SUMSUB_APP_TOKEN = process.env.SUMSUB_APP_TOKEN;
const SUMSUB_SECRET_KEY = process.env.SUMSUB_SECRET_KEY;
const SUMSUB_BASE_URL = "https://api.sumsub.com";
const SUMSUB_LEVEL_NAME = process.env.SUMSUB_LEVEL_NAME || "mint-advanced-kyc";

// Create signature for Sumsub API requests
function createSumsubSignature(ts, method, path, body = "") {
  const data = ts + method.toUpperCase() + path + body;
  return crypto
    .createHmac("sha256", SUMSUB_SECRET_KEY)
    .update(data)
    .digest("hex");
}

// Create Sumsub applicant
async function createSumsubApplicant(externalUserId, levelName = SUMSUB_LEVEL_NAME) {
  const ts = Math.floor(Date.now() / 1000).toString();
  const path = `/resources/applicants?levelName=${encodeURIComponent(levelName)}`;
  const body = JSON.stringify({ externalUserId });
  const signature = createSumsubSignature(ts, "POST", path, body);

  const response = await fetch(`${SUMSUB_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-App-Access-Ts": ts,
      "X-App-Access-Sig": signature,
      "X-App-Token": SUMSUB_APP_TOKEN,
    },
    body,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create applicant: ${errorText}`);
  }

  return response.json();
}

// Generate Sumsub access token
async function generateSumsubAccessToken(userId, levelName = SUMSUB_LEVEL_NAME) {
  const ts = Math.floor(Date.now() / 1000).toString();
  const path = `/resources/accessTokens?userId=${encodeURIComponent(userId)}&levelName=${encodeURIComponent(levelName)}`;
  const method = "POST";
  
  const signature = createSumsubSignature(ts, method, path);
  
  const response = await fetch(`${SUMSUB_BASE_URL}${path}`, {
    method,
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "X-App-Token": SUMSUB_APP_TOKEN,
      "X-App-Access-Ts": ts,
      "X-App-Access-Sig": signature,
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Sumsub API error: ${response.status} - ${errorText}`);
  }
  
  return response.json();
}

// Get applicant status from Sumsub
async function getSumsubApplicantStatus(applicantId) {
  const ts = Math.floor(Date.now() / 1000).toString();
  const path = `/resources/applicants/${applicantId}/requiredIdDocsStatus`;
  const method = "GET";
  
  const signature = createSumsubSignature(ts, method, path);
  
  const response = await fetch(`${SUMSUB_BASE_URL}${path}`, {
    method,
    headers: {
      "Accept": "application/json",
      "X-App-Token": SUMSUB_APP_TOKEN,
      "X-App-Access-Ts": ts,
      "X-App-Access-Sig": signature,
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Sumsub API error: ${response.status} - ${errorText}`);
  }
  
  return response.json();
}

// Get applicant by external user ID
async function getSumsubApplicantByExternalId(externalUserId) {
  const ts = Math.floor(Date.now() / 1000).toString();
  const path = `/resources/applicants/-;externalUserId=${encodeURIComponent(externalUserId)}/one`;
  const method = "GET";
  
  const signature = createSumsubSignature(ts, method, path);
  
  const response = await fetch(`${SUMSUB_BASE_URL}${path}`, {
    method,
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

// Get required docs status for an applicant (checks which steps are complete/incomplete)
async function getSumsubRequiredDocsStatus(applicantId) {
  const ts = Math.floor(Date.now() / 1000).toString();
  const path = `/resources/applicants/${applicantId}/requiredIdDocsStatus`;
  const method = "GET";
  
  const signature = createSumsubSignature(ts, method, path);
  
  const response = await fetch(`${SUMSUB_BASE_URL}${path}`, {
    method,
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

const readEnv = (key) => process.env[key] || process.env[`VITE_${key}`];

const SUPABASE_URL = readEnv('SUPABASE_URL') || readEnv('VITE_SUPABASE_URL');
const SUPABASE_ANON_KEY = readEnv('SUPABASE_ANON_KEY') || readEnv('VITE_SUPABASE_ANON_KEY');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;
let supabaseAdmin = null;
try {
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    const { createClient } = require('@supabase/supabase-js');
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    if (SUPABASE_SERVICE_ROLE_KEY) {
      supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      console.log('Supabase admin client initialized (service role)');
    }
  }
} catch (e) {
  console.warn('Supabase client not available:', e.message);
}

async function cleanupInvalidHoldings() {
  const db = supabaseAdmin || supabase;
  if (!db) return;
  try {
    const { data: holdings } = await db.from('stock_holdings').select('id, security_id');
    if (!holdings || holdings.length === 0) return;
    const secIds = holdings.map(h => h.security_id).filter(Boolean);
    const { data: strategies } = await db.from('strategies').select('id').in('id', secIds);
    const strategyIds = new Set((strategies || []).map(s => s.id));
    for (const h of holdings) {
      if (strategyIds.has(h.security_id)) {
        console.log('[cleanup] Deleting invalid stock_holding', h.id, 'security_id is a strategy');
        await db.from('stock_holdings').delete().eq('id', h.id);
      }
    }
  } catch (e) {
    console.error('[cleanup] Error cleaning up invalid holdings:', e.message);
  }
}

cleanupInvalidHoldings();

function parseServices(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
}

// Sumsub API endpoints
app.post("/api/sumsub/access-token", async (req, res) => {
  try {
    if (!SUMSUB_APP_TOKEN || !SUMSUB_SECRET_KEY) {
      return res.status(500).json({
        success: false,
        error: { message: "Sumsub credentials not configured. Please add SUMSUB_APP_TOKEN and SUMSUB_SECRET_KEY." }
      });
    }

    const { userId, levelName = SUMSUB_LEVEL_NAME } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: { message: "userId is required" }
      });
    }

    try {
      await createSumsubApplicant(userId, levelName);
    } catch (err) {
      if (!err.message.includes("already exists")) {
        console.error("Create applicant error:", err.message);
      }
    }

    const tokenData = await generateSumsubAccessToken(userId, levelName);
    
    res.json({
      success: true,
      token: tokenData.token,
      userId: tokenData.userId
    });
  } catch (error) {
    console.error("Sumsub access token error:", error);
    res.status(500).json({
      success: false,
      error: { message: error.message || "Failed to generate access token" }
    });
  }
});

async function getSumsubApplicantById(applicantId) {
  const ts = Math.floor(Date.now() / 1000).toString();
  const path = `/resources/applicants/${applicantId}/one`;
  const method = "GET";
  
  const signature = createSumsubSignature(ts, method, path);
  
  const response = await fetch(`${SUMSUB_BASE_URL}${path}`, {
    method,
    headers: {
      "Accept": "application/json",
      "X-App-Token": SUMSUB_APP_TOKEN,
      "X-App-Access-Ts": ts,
      "X-App-Access-Sig": signature,
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Sumsub API error: ${response.status} - ${errorText}`);
  }
  
  return response.json();
}

app.get("/api/sumsub/status/:applicantId", async (req, res) => {
  try {
    if (!SUMSUB_APP_TOKEN || !SUMSUB_SECRET_KEY) {
      return res.status(500).json({
        success: false,
        error: { message: "Sumsub credentials not configured" }
      });
    }

    const { applicantId } = req.params;
    
    // Get both the applicant info and required docs status
    const [applicant, requiredDocsStatus] = await Promise.all([
      getSumsubApplicantById(applicantId),
      getSumsubApplicantStatus(applicantId)
    ]);
    
    // Calculate normalized status
    let hasAnySubmittedSteps = false;
    let hasRejectedSteps = false;
    
    if (requiredDocsStatus) {
      for (const [stepName, stepData] of Object.entries(requiredDocsStatus)) {
        if (stepData !== null) {
          hasAnySubmittedSteps = true;
          if (stepData?.reviewResult?.reviewAnswer === "RED") {
            hasRejectedSteps = true;
          }
        }
      }
    }
    
    const reviewStatus = applicant?.review?.reviewStatus;
    const reviewAnswer = applicant?.review?.reviewResult?.reviewAnswer;
    
    let normalizedStatus = "not_verified";
    if (reviewAnswer === "GREEN") {
      normalizedStatus = "verified";
    } else if (hasRejectedSteps || reviewAnswer === "RED") {
      normalizedStatus = "needs_resubmission";
    } else if (reviewStatus === "onHold") {
      normalizedStatus = "needs_resubmission";
    } else if (reviewStatus === "pending" || reviewStatus === "queued") {
      normalizedStatus = "pending";
    } else if (hasAnySubmittedSteps) {
      normalizedStatus = "pending";
    } else {
      normalizedStatus = "not_verified";
    }
    
    res.json({
      success: true,
      normalizedStatus,
      requiredDocsStatus,
      hasAnySubmittedSteps,
      hasRejectedSteps,
      review: applicant?.review || null,
      createdAt: applicant?.createdAt
    });
  } catch (error) {
    console.error("Sumsub status error:", error);
    res.status(500).json({
      success: false,
      error: { message: error.message || "Failed to get applicant status" }
    });
  }
});

app.post("/api/sumsub/check-status", async (req, res) => {
  try {
    if (!SUMSUB_APP_TOKEN || !SUMSUB_SECRET_KEY) {
      return res.status(500).json({
        success: false,
        error: { message: "Sumsub credentials not configured" }
      });
    }

    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: { message: "userId is required" }
      });
    }

    const applicant = await getSumsubApplicantByExternalId(userId);
    
    if (!applicant) {
      return res.json({
        success: true,
        status: null,
        message: "No applicant found for this user"
      });
    }

    res.json({
      success: true,
      status: {
        applicantId: applicant.id,
        reviewStatus: applicant.review?.reviewStatus,
        reviewResult: applicant.review?.reviewResult,
        createdAt: applicant.createdAt,
        inspectionId: applicant.inspectionId
      }
    });
  } catch (error) {
    console.error("Sumsub check-status error:", error);
    res.status(500).json({
      success: false,
      error: { message: error.message || "Failed to check status" }
    });
  }
});

app.post("/api/sumsub/status", async (req, res) => {
  try {
    if (!SUMSUB_APP_TOKEN || !SUMSUB_SECRET_KEY) {
      return res.status(500).json({
        success: false,
        error: { message: "Sumsub credentials not configured" }
      });
    }

    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: { message: "userId is required" }
      });
    }

    const applicant = await getSumsubApplicantByExternalId(userId);
    
    if (!applicant) {
      return res.json({
        success: true,
        status: "not_verified",
        applicantId: null,
        reviewStatus: null,
        reviewAnswer: null,
        rejectLabels: [],
        createdAt: null
      });
    }

    // Get the required docs status to check for incomplete steps
    const requiredDocsStatus = await getSumsubRequiredDocsStatus(applicant.id);
    
    // Check document status - distinguish between "never started" and "started but incomplete"
    let hasIncompleteSteps = false;
    let hasRejectedSteps = false;
    let allStepsGreen = true;
    let hasAnySubmittedSteps = false; // Track if user ever submitted anything
    
    if (requiredDocsStatus) {
      for (const [stepName, stepData] of Object.entries(requiredDocsStatus)) {
        if (stepData === null) {
          // Step not started yet
          hasIncompleteSteps = true;
          allStepsGreen = false;
          console.log(`Step ${stepName} is not started (null)`);
        } else {
          // Step has some data - user submitted something
          hasAnySubmittedSteps = true;
          if (stepData?.reviewResult?.reviewAnswer === "RED") {
            hasRejectedSteps = true;
            allStepsGreen = false;
            console.log(`Step ${stepName} is rejected`);
          } else if (stepData?.reviewResult?.reviewAnswer !== "GREEN") {
            allStepsGreen = false;
            console.log(`Step ${stepName} is not GREEN:`, stepData?.reviewResult?.reviewAnswer);
          }
        }
      }
    }

    const reviewStatus = applicant.review?.reviewStatus;
    const reviewAnswer = applicant.review?.reviewResult?.reviewAnswer;
    const rejectLabels = applicant.review?.reviewResult?.rejectLabels || [];
    const reviewRejectType = applicant.review?.reviewResult?.reviewRejectType;
    
    // Log detailed Sumsub status for debugging
    console.log(`=== Sumsub Status for ${userId} ===`);
    console.log(`Applicant ID: ${applicant.id}`);
    console.log(`Review Status: ${reviewStatus}`);
    console.log(`Review Answer: ${reviewAnswer}`);
    console.log(`Review Reject Type: ${reviewRejectType}`);
    console.log(`Reject Labels: ${JSON.stringify(rejectLabels)}`);
    console.log(`Has Incomplete Steps: ${hasIncompleteSteps}`);
    console.log(`Has Rejected Steps: ${hasRejectedSteps}`);
    console.log(`Has Any Submitted Steps: ${hasAnySubmittedSteps}`);
    console.log(`All Steps Green: ${allStepsGreen}`);
    
    let status = "not_verified";
    
    // Priority order for status determination:
    // 1. If all steps are GREEN and review is GREEN → verified
    // 2. If any steps are rejected → needs_resubmission
    // 3. If user submitted something but incomplete → pending (in progress)
    // 4. If user never submitted anything → not_verified
    
    if (allStepsGreen && reviewAnswer === "GREEN") {
      status = "verified";
      console.log(`Status: verified (all steps GREEN)`);
    } else if (hasRejectedSteps || reviewAnswer === "RED") {
      status = "needs_resubmission";
      console.log(`Status: needs_resubmission (rejected)`);
    } else if (reviewStatus === "onHold") {
      status = "needs_resubmission";
      console.log(`Status: needs_resubmission (on hold)`);
    } else if (hasIncompleteSteps && hasAnySubmittedSteps && (reviewStatus === "init" || !reviewStatus)) {
      status = "needs_resubmission";
      console.log(`Status: needs_resubmission (documents requested - reset with incomplete steps)`);
    } else if (reviewStatus === "pending" || reviewStatus === "queued") {
      status = "pending";
      console.log(`Status: pending (review pending/queued)`);
    } else if (hasAnySubmittedSteps && !hasIncompleteSteps) {
      status = "pending";
      console.log(`Status: pending (verification in progress)`);
    } else if (hasAnySubmittedSteps) {
      status = "pending";
      console.log(`Status: pending (partially submitted)`);
    } else {
      status = "not_verified";
      console.log(`Status: not_verified (no documents submitted)`);
    }

    res.json({
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
    res.status(500).json({
      success: false,
      error: { message: error.message || "Failed to get status" }
    });
  }
});

// Legacy endpoint - redirects to /api/sumsub/status (no database writes)
app.post("/api/sumsub/sync-status", async (req, res) => {
  try {
    if (!SUMSUB_APP_TOKEN || !SUMSUB_SECRET_KEY) {
      return res.status(500).json({
        success: false,
        error: { message: "Sumsub credentials not configured" }
      });
    }

    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: { message: "userId is required" }
      });
    }

    const applicant = await getSumsubApplicantByExternalId(userId);
    
    if (!applicant) {
      return res.json({
        success: true,
        status: "not_verified",
        applicantId: null,
        reviewStatus: null,
        reviewAnswer: null,
        rejectLabels: [],
        createdAt: null
      });
    }

    const reviewStatus = applicant.review?.reviewStatus;
    const reviewAnswer = applicant.review?.reviewResult?.reviewAnswer;
    const rejectLabels = applicant.review?.reviewResult?.rejectLabels || [];
    
    let status = "not_verified";
    
    if (reviewAnswer === "GREEN") {
      status = "verified";
    } else if (reviewAnswer === "RED") {
      status = rejectLabels.length > 0 ? "needs_resubmission" : "not_verified";
    } else if (reviewStatus === "pending" || reviewStatus === "queued") {
      status = "pending";
    } else if (reviewStatus === "onHold" || applicant.requiredIdDocs?.length > 0) {
      status = "needs_resubmission";
    } else if (reviewStatus === "init" || !reviewStatus) {
      status = "not_verified";
    } else {
      status = "pending";
    }

    res.json({
      success: true,
      status,
      applicantId: applicant.id,
      reviewStatus,
      reviewAnswer: reviewAnswer || null,
      rejectLabels,
      createdAt: applicant.createdAt || null,
      applicant: {
        id: applicant.id,
        reviewStatus,
        reviewAnswer: reviewAnswer || null,
        rejectLabels
      }
    });
  } catch (error) {
    console.error("Sumsub sync-status error:", error);
    res.status(500).json({
      success: false,
      error: { message: error.message || "Failed to sync status" }
    });
  }
});

app.post("/api/sumsub/webhook", async (req, res) => {
  console.log("Sumsub webhook received:", JSON.stringify(req.body, null, 2));
  
  const { type, applicantId, reviewResult, reviewStatus, externalUserId } = req.body;
  
  if (!supabase || !externalUserId) {
    console.log("No Supabase or externalUserId, skipping database update");
    return res.status(200).json({ received: true });
  }

  try {
    let kycUpdate = null;
    
    // Determine status based on webhook type and review result
    if (type === "applicantReviewed") {
      const reviewAnswer = reviewResult?.reviewAnswer;
      const rejectLabels = reviewResult?.rejectLabels || [];
      
      if (reviewAnswer === "GREEN") {
        console.log(`User ${externalUserId} KYC verified successfully`);
        kycUpdate = { 
          kyc_verified: true, 
          kyc_pending: false, 
          kyc_needs_resubmission: false 
        };
      } else if (reviewAnswer === "RED") {
        // Check if it's a temporary rejection (can resubmit) or permanent
        const canResubmit = rejectLabels.some(label => 
          ["DOCUMENT_PAGE_MISSING", "INCOMPLETE_DOCUMENT", "UNSATISFACTORY_PHOTOS", 
           "DOCUMENT_DAMAGED", "SCREENSHOTS", "SPAM", "NOT_DOCUMENT", "SELFIE_MISMATCH",
           "FORGERY", "GRAPHIC_EDITOR", "DOCUMENT_DEPRIVED"].includes(label)
        );
        
        if (canResubmit) {
          console.log(`User ${externalUserId} KYC needs resubmission: ${rejectLabels.join(", ")}`);
          kycUpdate = { 
            kyc_verified: false, 
            kyc_pending: false, 
            kyc_needs_resubmission: true 
          };
        } else {
          console.log(`User ${externalUserId} KYC rejected permanently: ${rejectLabels.join(", ")}`);
          kycUpdate = { 
            kyc_verified: false, 
            kyc_pending: false, 
            kyc_needs_resubmission: false 
          };
        }
      }
    } else if (type === "applicantPending" || type === "applicantCreated") {
      console.log(`User ${externalUserId} KYC is pending review`);
      kycUpdate = { 
        kyc_verified: false, 
        kyc_pending: true, 
        kyc_needs_resubmission: false 
      };
    } else if (type === "applicantOnHold") {
      console.log(`User ${externalUserId} KYC on hold - action required`);
      kycUpdate = { 
        kyc_verified: false, 
        kyc_pending: false, 
        kyc_needs_resubmission: true 
      };
    } else if (type === "applicantActionPending") {
      console.log(`User ${externalUserId} KYC action pending - resubmission needed`);
      kycUpdate = { 
        kyc_verified: false, 
        kyc_pending: false, 
        kyc_needs_resubmission: true 
      };
    }
    
    if (kycUpdate) {
      const { data: existingAction } = await supabase
        .from("required_actions")
        .select("id")
        .eq("user_id", externalUserId)
        .maybeSingle();

      if (existingAction) {
        await supabase
          .from("required_actions")
          .update(kycUpdate)
          .eq("user_id", externalUserId);
      } else {
        await supabase
          .from("required_actions")
          .insert({ user_id: externalUserId, ...kycUpdate });
      }
      console.log(`Updated KYC status for user ${externalUserId}:`, kycUpdate);
    }
  } catch (err) {
    console.error("Failed to update KYC status:", err);
  }
  
  res.status(200).json({ received: true });
});

app.post("/api/truid/initiate", async (req, res) => {
  try {
    const requiredEnv = ['TRUID_API_KEY', 'BRAND_ID'];
    const missing = requiredEnv.filter((key) => !readEnv(key));
    if (missing.length) {
      return res.status(500).json({
        success: false,
        error: { message: `Missing required environment variables: ${missing.join(', ')}` }
      });
    }

    const { name, idNumber, idType = 'id', email, mobile, services } = req.body;

    if (!name || !idNumber) {
      return res.status(400).json({
        success: false,
        error: { message: 'Name and ID number are required' }
      });
    }

    const requestedServices = parseServices(services);
    const envServices = parseServices(process.env.TRUID_SERVICES);
    const defaultServices = envServices.length ? envServices : [
      'eeh03fzauckvj8u982dbeq1d8',
      'amqfuupe00xk3cfw3dergvb9n',
      's8d7f67de8w9iekjrfu',
      'mk2weodif8gutjre4kwsdfd',
      '12wsdofikgjtm5k4eiduy',
      'apw99w0lj1nwde4sfxd0'
    ];
    const finalServices = requestedServices.length ? requestedServices : defaultServices;

    const collection = await truIDClient.createCollection({
      name,
      idNumber,
      idType,
      email,
      mobile,
      services: finalServices
    });

    res.status(201).json({
      success: true,
      collectionId: collection.collectionId,
      consumerUrl: collection.consumerUrl,
      consentId: collection.consentId
    });
  } catch (error) {
    console.error("TruID initiate error:", error);
    res.status(error.status || 500).json({
      success: false,
      error: { message: error.message || "Internal server error" }
    });
  }
});

app.get("/api/truid/status", async (req, res) => {
  try {
    const { collectionId } = req.query;
    if (!collectionId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Missing collectionId' }
      });
    }

    const result = await truIDClient.getCollection(collectionId);
    const statusNode = result.data?.status || result.data?.current_status;
    const fallbackStatus = statusNode?.code || statusNode || result.data?.state;
    const currentStatus =
      fallbackStatus ||
      extractLatestStatus(result.data?.statuses) ||
      extractLatestMilestone(result.data?.milestones) ||
      'UNKNOWN';

    let outcome = 'pending';
    const upperStatus = String(currentStatus).toUpperCase();
    if (upperStatus === 'COMPLETED' || upperStatus === 'COMPLETE' || upperStatus === 'SUCCESS') {
      outcome = 'completed';
    } else if (upperStatus === 'FAILED' || upperStatus === 'REJECTED' || upperStatus === 'ERROR') {
      outcome = 'failed';
    }

    res.json({
      success: true,
      collectionId,
      currentStatus,
      outcome,
      raw: result.data
    });
  } catch (error) {
    console.error("TruID status error:", error);
    res.status(error.status || 500).json({
      success: false,
      error: { message: error.message || "Internal server error" }
    });
  }
});

app.post("/api/truid/webhook", async (req, res) => {
  console.log("TruID webhook received:", JSON.stringify(req.body, null, 2));
  res.status(200).json({ received: true });
});

// ============ BANKING API ENDPOINTS ============

app.post("/api/banking/initiate", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: { message: "Missing or invalid Authorization header" }
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const db = supabaseAdmin || supabase;
    if (!db) {
      return res.status(500).json({
        success: false,
        error: { message: "Database not configured" }
      });
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({
        success: false,
        error: { message: "Invalid or expired token" }
      });
    }

    const { data: profile, error: profileError } = await db
      .from("profiles")
      .select("first_name, last_name, id_number")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile) {
      console.error("Profile lookup error:", profileError?.message || "No profile found");
      return res.status(400).json({
        success: false,
        error: { message: "User profile not found or missing required fields" }
      });
    }

    const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(" ");
    let idNumber = profile.id_number;

    if (!idNumber) {
      try {
        const applicant = await getSumsubApplicantByExternalId(user.id);
        if (applicant?.info?.idDocs?.length) {
          const idDoc = applicant.info.idDocs.find(d => d.number) || {};
          idNumber = idDoc.number || null;
        }
        if (!idNumber && applicant?.fixedInfo?.idDocs?.length) {
          const idDoc = applicant.fixedInfo.idDocs.find(d => d.number) || {};
          idNumber = idDoc.number || null;
        }
        if (idNumber) {
          console.log("ID number retrieved from Sumsub KYC data");
          await db.from("profiles").update({ id_number: idNumber }).eq("id", user.id);
        }
      } catch (sumsubErr) {
        console.warn("Could not fetch ID from Sumsub:", sumsubErr.message);
      }
    }

    if (!fullName || !idNumber) {
      console.error("Profile incomplete:", { hasName: !!fullName, hasIdNumber: !!idNumber });
      return res.status(400).json({
        success: false,
        error: { message: "Profile is missing name or ID number. Please complete your profile first." }
      });
    }

    const collection = await truIDClient.createCollection({
      name: fullName,
      idNumber: idNumber,
      email: user.email
    });

    res.status(201).json({
      success: true,
      collectionId: collection.collectionId,
      consumerUrl: collection.consumerUrl
    });
  } catch (error) {
    console.error("Banking initiate error:", error);
    res.status(error.status || 500).json({
      success: false,
      error: { message: error.message || "Internal server error" }
    });
  }
});

app.get("/api/banking/status", async (req, res) => {
  try {
    const { collectionId } = req.query;
    if (!collectionId) {
      return res.status(400).json({
        success: false,
        error: { message: "Missing collectionId" }
      });
    }

    const result = await truIDClient.getCollection(collectionId);
    const statusNode = result.data?.status || result.data?.current_status;
    const fallbackStatus = statusNode?.code || statusNode || result.data?.state;
    const currentStatus =
      fallbackStatus ||
      extractLatestStatus(result.data?.statuses) ||
      extractLatestMilestone(result.data?.milestones) ||
      "UNKNOWN";

    const numericCode = Number(currentStatus);
    const isNumeric = Number.isFinite(numericCode);

    let outcome = "pending";
    const upperStatus = String(currentStatus).toUpperCase();
    if (
      upperStatus === "COMPLETED" || upperStatus === "COMPLETE" || upperStatus === "SUCCESS" ||
      (isNumeric && numericCode === 1099) ||
      (isNumeric && numericCode >= 2000 && numericCode < 3000)
    ) {
      outcome = "completed";
    } else if (
      upperStatus === "FAILED" || upperStatus === "REJECTED" || upperStatus === "ERROR" ||
      upperStatus === "CANCELLED" || upperStatus === "EXPIRED" ||
      (isNumeric && numericCode >= 4000)
    ) {
      outcome = "failed";
    }

    console.log(`Banking status poll: collectionId=${collectionId}, currentStatus=${currentStatus}, outcome=${outcome}`);

    res.json({
      success: true,
      collectionId,
      currentStatus,
      outcome
    });
  } catch (error) {
    console.error("Banking status error:", error);
    res.status(error.status || 500).json({
      success: false,
      error: { message: error.message || "Internal server error" }
    });
  }
});

app.post("/api/banking/capture", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: { message: "Missing or invalid Authorization header" }
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const db = supabaseAdmin || supabase;
    if (!db) {
      return res.status(500).json({
        success: false,
        error: { message: "Database not configured" }
      });
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({
        success: false,
        error: { message: "Invalid or expired token" }
      });
    }

    const { collectionId } = req.body;
    if (!collectionId) {
      return res.status(400).json({
        success: false,
        error: { message: "collectionId is required" }
      });
    }

    const data = await truIDClient.getCollectionData(collectionId);

    let bankAccounts = [];
    try {
      console.log("TruID capture raw data:", JSON.stringify(data, null, 2));
      const summary = data?.data || data;
      const statement = summary?.statement || {};
      const customer = statement?.customer || {};
      const bankName = customer.bank || customer.institution || customer.bankName || "";

      if (statement.accounts && Array.isArray(statement.accounts) && statement.accounts.length > 0) {
        bankAccounts = statement.accounts.map(acc => ({
          bankName: acc.bank || acc.institution || bankName || "Bank Account",
          accountNumber: acc.accountNumber || acc.account_number || acc.number || acc.accountId || "",
          accountType: acc.accountType || acc.account_type || acc.type || "Current",
        }));
      }

      if (bankAccounts.length === 0 && bankName) {
        try {
          const detailRes = await truIDClient.deliveryClient.get(`/collections/${collectionId}/products`);
          console.log("TruID products detail:", JSON.stringify(detailRes.data, null, 2));
          const products = detailRes.data;

          const extractAccounts = (obj) => {
            if (!obj || typeof obj !== 'object') return;
            if (Array.isArray(obj)) {
              obj.forEach(item => extractAccounts(item));
              return;
            }
            const accNum = obj.accountNumber || obj.account_number || obj.number || obj.accountId || obj.accountNo || "";
            if (accNum) {
              bankAccounts.push({
                bankName: obj.bank || obj.institution || bankName,
                accountNumber: accNum,
                accountType: obj.accountType || obj.account_type || obj.type || "Current",
              });
            }
            for (const val of Object.values(obj)) {
              if (typeof val === 'object') extractAccounts(val);
            }
          };
          extractAccounts(products);
        } catch (detailErr) {
          console.log("TruID products detail not available:", detailErr.message);
        }
      }

      if (bankAccounts.length === 0 && bankName) {
        bankAccounts = [{ bankName, accountNumber: customer.id || "", accountType: customer.type || "Current" }];
      }

      const seen = new Set();
      bankAccounts = bankAccounts.filter(a => {
        const key = `${a.bankName}|${a.accountNumber}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    } catch (parseErr) {
      console.error("Error parsing TruID bank data:", parseErr);
    }

    if (bankAccounts.length === 0) {
      bankAccounts = [{ bankName: "Bank Account", accountNumber: "", accountType: "Current" }];
    }

    console.log("Extracted bank accounts:", JSON.stringify(bankAccounts));

    const { data: existingAction } = await db
      .from("required_actions")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingAction) {
      await db
        .from("required_actions")
        .update({ bank_linked: true, bank_in_review: false })
        .eq("user_id", user.id);
    } else {
      await db
        .from("required_actions")
        .insert({ user_id: user.id, bank_linked: true, bank_in_review: false });
    }

    try {
      const bankJson = JSON.stringify(bankAccounts);
      const { data: existingOnboarding } = await db
        .from("user_onboarding")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (existingOnboarding) {
        await db
          .from("user_onboarding")
          .update({ sumsub_outcome: bankJson })
          .eq("id", existingOnboarding.id);
      }
    } catch (bankSaveErr) {
      console.error("Failed to save bank details:", bankSaveErr.message);
    }

    res.json({
      success: true,
      snapshot: data,
      bankAccounts
    });
  } catch (error) {
    console.error("Banking capture error:", error);
    res.status(error.status || 500).json({
      success: false,
      error: { message: error.message || "Internal server error" }
    });
  }
});


app.get("/api/banking/accounts", async (req, res) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, error: "Missing token" });

    const db = supabaseAdmin || supabase;
    const authClient = supabaseAdmin || supabase;
    const { data: { user }, error: authErr } = await authClient.auth.getUser(token);
    if (authErr || !user) return res.status(401).json({ success: false, error: "Invalid session" });

    const { data, error } = await db
      .from("user_onboarding")
      .select("sumsub_outcome")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    let accounts = [];
    if (data?.sumsub_outcome) {
      try {
        accounts = JSON.parse(data.sumsub_outcome);
      } catch (e) {
        accounts = [];
      }
    }

    res.json({ success: true, accounts });
  } catch (error) {
    console.error("Fetch bank accounts error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/banking/unlink", async (req, res) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, error: "Missing token" });

    const db = supabaseAdmin || supabase;
    const authClient = supabaseAdmin || supabase;
    const { data: { user }, error: authErr } = await authClient.auth.getUser(token);
    if (authErr || !user) return res.status(401).json({ success: false, error: "Invalid session" });

    const { accountIndex, unlinkAll } = req.body;

    const { data: onboarding } = await db
      .from("user_onboarding")
      .select("id, sumsub_outcome")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let remainingAccounts = [];
    if (onboarding?.sumsub_outcome) {
      try {
        const accounts = JSON.parse(onboarding.sumsub_outcome);
        if (unlinkAll) {
          remainingAccounts = [];
        } else if (typeof accountIndex === "number" && accountIndex >= 0 && accountIndex < accounts.length) {
          remainingAccounts = accounts.filter((_, i) => i !== accountIndex);
        } else {
          return res.status(400).json({ success: false, error: "Valid accountIndex or unlinkAll flag required" });
        }
      } catch (e) {
        remainingAccounts = [];
      }
    }

    if (onboarding) {
      await db
        .from("user_onboarding")
        .update({ sumsub_outcome: remainingAccounts.length > 0 ? JSON.stringify(remainingAccounts) : null })
        .eq("id", onboarding.id);
    }

    if (remainingAccounts.length === 0) {
      await db
        .from("required_actions")
        .update({ bank_linked: false, bank_in_review: false, bank_linked_at: null })
        .eq("user_id", user.id);
    }

    res.json({ success: true, remainingAccounts, message: remainingAccounts.length > 0 ? "Account removed" : "All bank accounts unlinked" });
  } catch (error) {
    console.error("Unlink error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/account/reset", async (req, res) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, error: "Missing token" });

    const db = supabaseAdmin || supabase;
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return res.status(401).json({ success: false, error: "Invalid session" });

    const uid = user.id;
    const results = {};

    const tables = [
      { name: "required_actions", action: "update", data: { bank_linked: false, bank_in_review: false, bank_linked_at: null, kyc_verified: false } },
      { name: "user_onboarding", action: "delete" },
      { name: "transactions", action: "delete" },
      { name: "loan_engine_score", action: "delete" },
      { name: "loan_application", action: "delete" },
      { name: "investment_goals", action: "delete" },
      { name: "notifications", action: "delete" },
      { name: "stock_holdings", action: "delete" },
      { name: "allocations", action: "delete" },
    ];

    for (const t of tables) {
      try {
        if (t.action === "delete") {
          const { error } = await db.from(t.name).delete().eq("user_id", uid);
          results[t.name] = error ? `error: ${error.message}` : "cleared";
        } else if (t.action === "update") {
          const { error } = await db.from(t.name).update(t.data).eq("user_id", uid);
          results[t.name] = error ? `error: ${error.message}` : "reset";
        }
      } catch (e) {
        results[t.name] = `skipped: ${e.message}`;
      }
    }

    console.log("Account reset results for", uid, results);
    res.json({ success: true, message: "Account reset complete", results });
  } catch (error) {
    console.error("Account reset error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

function extractLatestStatus(statuses) {
  if (!Array.isArray(statuses) || !statuses.length) return null;
  const sorted = [...statuses].sort((a, b) => {
    const aTime = Date.parse(a?.time || a?.created || a?.timestamp || 0);
    const bTime = Date.parse(b?.time || b?.created || b?.timestamp || 0);
    return bTime - aTime;
  });
  const latest = sorted[0];
  return latest?.code || latest?.status || latest?.state || null;
}

function extractLatestMilestone(milestones) {
  if (!Array.isArray(milestones) || !milestones.length) return null;
  const sorted = [...milestones].sort((a, b) => {
    const aTime = Date.parse(a?.time || a?.created || a?.timestamp || 0);
    const bTime = Date.parse(b?.time || b?.created || b?.timestamp || 0);
    return bTime - aTime;
  });
  const latest = sorted[0];
  return latest?.code || latest?.status || latest?.state || latest?.name || null;
}

// ============ STOCK MARKET DATA ENDPOINTS ============

app.get("/api/stocks/quote", async (req, res) => {
  try {
    const { symbols } = req.query;
    if (!symbols) return res.status(400).json({ error: "symbols parameter required" });
    
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbols.split(',')[0]}?interval=1d&range=1d`;
    
    const symbolList = symbols.split(',').map(s => s.trim());
    const results = {};
    
    await Promise.all(symbolList.map(async (symbol) => {
      try {
        const response = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=5d`,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
          }
        );
        const data = await response.json();
        const result = data?.chart?.result?.[0];
        if (result) {
          const meta = result.meta;
          const prevClose = meta.chartPreviousClose || meta.previousClose;
          const currentPrice = meta.regularMarketPrice;
          const change = currentPrice - prevClose;
          const changePercent = prevClose ? ((change / prevClose) * 100) : 0;
          
          results[symbol] = {
            symbol: symbol,
            name: meta.shortName || meta.longName || symbol,
            price: currentPrice,
            previousClose: prevClose,
            change: change,
            changePercent: changePercent,
            currency: meta.currency || 'USD',
            exchange: meta.exchangeName || '',
          };
        }
      } catch (err) {
        console.error(`Error fetching quote for ${symbol}:`, err.message);
        results[symbol] = { symbol, error: err.message };
      }
    }));
    
    res.json(results);
  } catch (error) {
    console.error("Stock quote error:", error);
    res.status(500).json({ error: "Failed to fetch stock quotes" });
  }
});

app.get("/api/stocks/chart", async (req, res) => {
  try {
    const { symbol, range = '5d', interval = '15m' } = req.query;
    if (!symbol) return res.status(400).json({ error: "symbol parameter required" });
    
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      }
    );
    
    const data = await response.json();
    const result = data?.chart?.result?.[0];
    
    if (!result) {
      return res.status(404).json({ error: "No data found for symbol" });
    }
    
    const timestamps = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0] || {};
    const closes = quotes.close || [];
    
    const chartPoints = timestamps.map((ts, i) => {
      const date = new Date(ts * 1000);
      let label;
      
      if (range === '1d') {
        label = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      } else if (range === '5d') {
        label = date.toLocaleDateString('en-US', { weekday: 'short' });
      } else if (range === '1mo') {
        label = date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      } else if (range === '6mo' || range === '1y') {
        label = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      } else {
        label = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      }
      
      return {
        day: label,
        value: closes[i] != null ? Number(closes[i].toFixed(2)) : null,
        timestamp: ts,
      };
    }).filter(p => p.value != null);
    
    const meta = result.meta;
    
    res.json({
      symbol: symbol,
      currency: meta.currency || 'USD',
      chartPoints,
      currentPrice: meta.regularMarketPrice,
      previousClose: meta.chartPreviousClose || meta.previousClose,
    });
  } catch (error) {
    console.error("Stock chart error:", error);
    res.status(500).json({ error: "Failed to fetch stock chart data" });
  }
});

async function authenticateUser(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { user: null, error: "Missing or invalid Authorization header" };
  }
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return { user: null, error: error?.message || "Invalid token" };
  }
  return { user: data.user, error: null };
}

async function verifyPaystackPayment(reference) {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return { verified: false, error: "Paystack secret key not configured" };
  }
  console.log("[paystack-verify] Verifying reference:", reference, "key prefix:", secretKey.substring(0, 8) + "...");
  const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${secretKey}`,
    },
  });
  const result = await response.json();
  console.log("[paystack-verify] API response status:", result.status, "data.status:", result.data?.status, "data.gateway_response:", result.data?.gateway_response, "message:", result.message);
  if (!result.status || result.data?.status !== "success") {
    return { verified: false, error: "Payment not successful", data: result.data };
  }
  return { verified: true, data: result.data };
}

app.post("/api/record-investment", async (req, res) => {
  try {
    console.log("[record-investment] === ENDPOINT CALLED ===");
    console.log("[record-investment] Request body:", JSON.stringify(req.body, null, 2));

    if (!supabase) {
      console.log("[record-investment] ERROR: Database not connected");
      return res.status(500).json({ success: false, error: "Database not connected" });
    }

    const { user, error: authError } = await authenticateUser(req);
    if (authError || !user) {
      console.log("[record-investment] AUTH FAILED:", authError || "No user");
      return res.status(401).json({ success: false, error: authError || "Unauthorized" });
    }
    const userId = user.id;
    console.log("[record-investment] Authenticated user:", userId);
    const db = supabaseAdmin || supabase;
    console.log("[record-investment] Using DB client:", supabaseAdmin ? "admin (service role)" : "anon");

    const { securityId, symbol, name, amount, strategyId, paymentReference } = req.body;
    console.log("[record-investment] Parsed fields - securityId:", securityId, "symbol:", symbol, "name:", name, "amount:", amount, "strategyId:", strategyId, "paymentReference:", paymentReference);

    if (!securityId || !amount || !paymentReference) {
      console.log("[record-investment] MISSING FIELDS - securityId:", !!securityId, "amount:", !!amount, "paymentReference:", !!paymentReference);
      return res.status(400).json({ success: false, error: "Missing required fields: securityId, amount, paymentReference" });
    }

    console.log("[record-investment] Verifying Paystack payment:", paymentReference);
    const { verified, error: payError, data: payData } = await verifyPaystackPayment(paymentReference);
    if (!verified) {
      console.log("[record-investment] PAYSTACK VERIFICATION FAILED:", payError);
      return res.status(400).json({ success: false, error: payError || "Payment verification failed" });
    }
    console.log("[record-investment] Paystack verified OK. Paid amount (kobo):", payData.amount, "= R", payData.amount / 100);

    const { data: existingTx } = await db
      .from("transactions")
      .select("id")
      .eq("store_reference", paymentReference)
      .maybeSingle();
    if (existingTx) {
      console.log("[record-investment] DUPLICATE: Transaction already recorded for ref:", paymentReference, "tx id:", existingTx.id);
      return res.json({ success: true, message: "Already recorded", duplicate: true });
    }

    const paidAmount = payData.amount / 100;
    if (Math.abs(paidAmount - amount) > 1) {
      console.log("[record-investment] AMOUNT MISMATCH: paid", paidAmount, "expected", amount);
      return res.status(400).json({ success: false, error: `Amount mismatch: paid ${paidAmount}, expected ${amount}` });
    }

    if (strategyId) {
      console.log("[record-investment] Strategy investment detected - strategyId:", strategyId, "- strategy subscriptions are derived from transactions");
    }

    console.log("[record-investment] Checking if securityId exists in securities table:", securityId);
    const { data: securityCheck, error: secCheckError } = await db
      .from("securities")
      .select("id")
      .eq("id", securityId)
      .maybeSingle();
    console.log("[record-investment] Security check result:", securityCheck ? "FOUND" : "NOT FOUND", "error:", secCheckError ? JSON.stringify(secCheckError) : "none");

    let holdingResult = { data: null, error: null };

    if (securityCheck) {
      console.log("[record-investment] Security exists - will create/update stock_holdings");
      let currentPriceCents = null;
      const { data: securityData, error: secError } = await db
        .from("securities")
        .select("last_price")
        .eq("id", securityId)
        .maybeSingle();

      if (!secError && securityData?.last_price) {
        currentPriceCents = Number(securityData.last_price);
        console.log("[record-investment] Got last_price from securities:", currentPriceCents, "cents");
      } else {
        console.log("[record-investment] No last_price in securities, checking security_prices table");
        const { data: priceData, error: priceError } = await db
          .from("security_prices")
          .select("close_price")
          .eq("security_id", securityId)
          .order("price_date", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!priceError && priceData?.close_price) {
          currentPriceCents = Number(priceData.close_price);
          console.log("[record-investment] Got close_price from security_prices:", currentPriceCents, "cents");
        } else {
          console.log("[record-investment] No price found in security_prices either. priceError:", priceError ? JSON.stringify(priceError) : "none");
        }
      }

      const currentPriceRands = currentPriceCents ? currentPriceCents / 100 : amount;
      const quantity = currentPriceRands > 0 ? amount / currentPriceRands : 1;
      const avgFillCents = currentPriceCents || Math.round(amount * 100);
      const marketValueCents = Math.round(quantity * (currentPriceCents || amount * 100));
      console.log("[record-investment] Calculated - currentPriceRands:", currentPriceRands, "quantity:", quantity, "avgFillCents:", avgFillCents, "marketValueCents:", marketValueCents);

      const { data: existing, error: fetchError } = await db
        .from("stock_holdings")
        .select("id, quantity, avg_fill, market_value")
        .eq("user_id", userId)
        .eq("security_id", securityId)
        .maybeSingle();

      if (fetchError) {
        console.error("[record-investment] Error checking existing holding:", JSON.stringify(fetchError));
        return res.status(500).json({ success: false, error: fetchError.message });
      }

      if (existing) {
        console.log("[record-investment] Existing holding found, updating. Old qty:", existing.quantity, "avg_fill:", existing.avg_fill);
        const oldQty = Number(existing.quantity || 0);
        const oldAvgFill = Number(existing.avg_fill || 0);
        const newQty = oldQty + quantity;
        const newAvgFill = newQty > 0 ? ((oldAvgFill * oldQty) + (avgFillCents * quantity)) / newQty : avgFillCents;
        const newMarketValue = Math.round(newQty * (currentPriceCents || newAvgFill));
        console.log("[record-investment] New values - qty:", newQty, "avgFill:", Math.round(newAvgFill), "marketValue:", newMarketValue);
        const { data, error } = await db
          .from("stock_holdings")
          .update({
            quantity: newQty,
            avg_fill: Math.round(newAvgFill),
            market_value: newMarketValue,
            as_of_date: new Date().toISOString().split("T")[0],
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
          .select();
        holdingResult = { data, error };
        console.log("[record-investment] Holding UPDATE result:", error ? "ERROR: " + JSON.stringify(error) : "OK", JSON.stringify(data));
      } else {
        console.log("[record-investment] No existing holding, inserting new");
        const holdingData = {
          user_id: userId,
          security_id: securityId,
          quantity: quantity,
          avg_fill: avgFillCents,
          market_value: marketValueCents,
          unrealized_pnl: 0,
          as_of_date: new Date().toISOString().split("T")[0],
          Status: "active",
        };
        console.log("[record-investment] Insert data:", JSON.stringify(holdingData));
        const { data, error } = await db
          .from("stock_holdings")
          .insert(holdingData)
          .select();
        holdingResult = { data, error };
        console.log("[record-investment] Holding INSERT result:", error ? "ERROR: " + JSON.stringify(error) : "OK", JSON.stringify(data));
      }

      if (holdingResult.error) {
        console.error("[record-investment] HOLDING UPSERT FAILED:", JSON.stringify(holdingResult.error));
        return res.status(500).json({ success: false, error: holdingResult.error.message });
      }
    } else {
      console.log("[record-investment] Security NOT in securities table (likely strategy-only investment). No stock_holdings will be created.");
    }

    const isStrategyInvestment = strategyId && !securityCheck;
    console.log("[record-investment] isStrategyInvestment:", isStrategyInvestment);
    const descriptionText = isStrategyInvestment
      ? `Invested in strategy ${name || "Strategy"}`
      : `Purchased ${(holdingResult.data ? "shares" : "units")} of ${name || symbol || "Unknown"}`;
    
    console.log("[record-investment] Creating transaction record...");
    const { data: txData, error: txError } = await db
      .from("transactions")
      .insert({
        user_id: userId,
        direction: "debit",
        name: isStrategyInvestment ? `Strategy Investment: ${name || symbol || "Strategy"}` : `Purchased ${name || symbol || "Stock"}`,
        description: descriptionText,
        amount: Math.round(amount * 100),
        store_reference: paymentReference || null,
        currency: "ZAR",
        status: "posted",
        transaction_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
      })
      .select();

    if (txError) {
      console.error("[record-investment] TRANSACTION INSERT ERROR:", JSON.stringify(txError));
    } else {
      console.log("[record-investment] Transaction created OK:", JSON.stringify(txData));
    }

    console.log("[record-investment] === SUCCESS === Holding:", JSON.stringify(holdingResult.data));
    res.json({ success: true, holding: holdingResult.data });
  } catch (error) {
    console.error("[record-investment] === UNCAUGHT ERROR ===", error);
    res.status(500).json({ success: false, error: error.message || "Failed to record investment" });
  }
});

app.get("/api/user/holdings", async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ success: false, error: "Database not connected" });
    }

    const { user, error: authError } = await authenticateUser(req);
    if (authError || !user) {
      return res.status(401).json({ success: false, error: authError || "Unauthorized" });
    }

    const db = supabaseAdmin || supabase;
    const userId = user.id;

    const { data: holdings, error: holdingsError } = await db
      .from("stock_holdings")
      .select("id, user_id, security_id, quantity, avg_fill, market_value, unrealized_pnl, as_of_date, created_at, updated_at, Status")
      .eq("user_id", userId);

    if (holdingsError) {
      console.error("Error fetching holdings:", holdingsError);
      return res.status(500).json({ success: false, error: holdingsError.message });
    }

    const rawHoldings = holdings || [];
    const securityIds = rawHoldings.map(h => h.security_id).filter(Boolean);
    let securitiesMap = {};
    let latestPricesMap = {};

    if (securityIds.length > 0) {
      const [secResult, pricesResult] = await Promise.all([
        db.from("securities")
          .select("id, symbol, name, logo_url, last_price, change_price, change_percent, sector, exchange")
          .in("id", securityIds),
        db.from("security_prices")
          .select("security_id, close_price, ts")
          .in("security_id", securityIds)
          .order("ts", { ascending: false })
          .limit(securityIds.length * 2)
      ]);

      if (secResult.error) {
        console.error("Error fetching securities for holdings:", secResult.error);
      }
      if (secResult.data) {
        secResult.data.forEach(s => { securitiesMap[s.id] = s; });
      }

      const pricesBySecId = {};
      (pricesResult.data || []).forEach(p => {
        if (!pricesBySecId[p.security_id]) pricesBySecId[p.security_id] = [];
        if (pricesBySecId[p.security_id].length < 2) {
          pricesBySecId[p.security_id].push(p.close_price);
        }
      });
      for (const [secId, prices] of Object.entries(pricesBySecId)) {
        latestPricesMap[secId] = {
          latestPrice: prices[0],
          prevPrice: prices.length > 1 ? prices[1] : prices[0],
        };
      }
    }

    const enrichedHoldings = rawHoldings
      .filter(h => securitiesMap[h.security_id])
      .map(h => {
        const sec = securitiesMap[h.security_id];
        const priceData = latestPricesMap[h.security_id];
        const livePrice = priceData?.latestPrice ?? sec?.last_price ?? 0;
        const prevPrice = priceData?.prevPrice ?? livePrice;
        const dailyChange = livePrice - prevPrice;
        const dailyChangePct = prevPrice > 0 ? ((dailyChange / prevPrice) * 100) : 0;
        const quantity = h.quantity || 0;
        const avgFill = h.avg_fill || 0;
        const costBasis = avgFill * quantity;
        const liveMarketValue = livePrice * quantity;
        const pnl = liveMarketValue - costBasis;
        return {
          ...h,
          market_value: liveMarketValue,
          unrealized_pnl: pnl,
          symbol: sec?.symbol || "N/A",
          name: sec?.name || "Unknown",
          asset_class: sec?.sector || "Other",
          logo_url: sec?.logo_url || null,
          last_price: livePrice,
          change_price: dailyChange,
          change_percent: Number(dailyChangePct.toFixed(2)),
          exchange: sec?.exchange || null,
        };
      });

    res.json({ success: true, holdings: enrichedHoldings });
  } catch (error) {
    console.error("User holdings error:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to fetch holdings" });
  }
});

app.get("/api/user/strategies", async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ success: false, error: "Database not connected" });
    }

    const { user, error: authError } = await authenticateUser(req);
    if (authError || !user) {
      return res.status(401).json({ success: false, error: authError || "Unauthorized" });
    }

    const db = supabaseAdmin || supabase;
    const userId = user.id;

    const { data: transactions, error: txError } = await db
      .from("transactions")
      .select("id, name, amount, direction, transaction_date")
      .eq("user_id", userId)
      .eq("direction", "debit");

    if (txError) {
      console.error("[user/strategies] Error fetching transactions:", txError);
      return res.status(500).json({ success: false, error: txError.message });
    }

    const strategyInvestments = {};
    const strategyFirstDate = {};
    for (const tx of (transactions || [])) {
      const txName = (tx.name || "").trim();
      let strategyName = null;
      if (txName.startsWith("Strategy Investment: ")) {
        strategyName = txName.replace("Strategy Investment: ", "").trim();
      } else if (txName.startsWith("Purchased ")) {
        strategyName = txName.replace("Purchased ", "").trim();
      }
      if (strategyName) {
        if (!strategyInvestments[strategyName]) {
          strategyInvestments[strategyName] = 0;
        }
        strategyInvestments[strategyName] += Math.abs(tx.amount || 0);
        if (tx.transaction_date) {
          if (!strategyFirstDate[strategyName] || tx.transaction_date < strategyFirstDate[strategyName]) {
            strategyFirstDate[strategyName] = tx.transaction_date;
          }
        }
      }
    }

    const strategyNames = Object.keys(strategyInvestments);
    if (strategyNames.length === 0) {
      return res.json({ success: true, strategies: [] });
    }

    const { data: allStrategies, error: stratErr } = await db
      .from("strategies")
      .select(`
        id, name, short_name, description, risk_level, sector, icon_url, image_url, holdings, status,
        strategy_metrics (
          as_of_date, last_close, change_pct, r_1w, r_1m, r_3m, r_ytd, r_1y
        )
      `)
      .eq("status", "active");

    if (stratErr) {
      console.error("[user/strategies] Error fetching strategies:", stratErr);
      return res.status(500).json({ success: false, error: stratErr.message });
    }

    const allHoldingSymbols = new Set();
    for (const strategy of (allStrategies || [])) {
      const h = strategy.holdings || [];
      if (Array.isArray(h)) {
        h.forEach(item => { if (item.symbol) allHoldingSymbols.add(item.symbol); });
      }
    }

    let securitiesMap = {};
    if (allHoldingSymbols.size > 0) {
      const { data: secs } = await db
        .from("securities")
        .select("symbol, logo_url, name")
        .in("symbol", Array.from(allHoldingSymbols));
      if (secs) {
        secs.forEach(s => { securitiesMap[s.symbol] = s; });
      }
    }

    const matchedStrategies = [];
    for (const strategy of (allStrategies || [])) {
      const matchKey = strategyNames.find(sn =>
        sn.toLowerCase() === (strategy.name || "").toLowerCase() ||
        sn.toLowerCase() === (strategy.short_name || "").toLowerCase()
      );
      if (matchKey) {
        const metrics = strategy.strategy_metrics;
        const latestMetric = Array.isArray(metrics) ? metrics[0] : metrics;
        const enrichedHoldings = (strategy.holdings || []).map(h => ({
          ...h,
          logo_url: h.logo_url || securitiesMap[h.symbol]?.logo_url || null,
          name: h.name || securitiesMap[h.symbol]?.name || h.symbol,
        }));
        matchedStrategies.push({
          id: strategy.id,
          name: strategy.name,
          shortName: strategy.short_name || strategy.name,
          description: strategy.description || "",
          riskLevel: strategy.risk_level || "Moderate",
          sector: strategy.sector || "",
          iconUrl: strategy.icon_url,
          imageUrl: strategy.image_url,
          holdings: enrichedHoldings,
          investedAmount: strategyInvestments[matchKey] / 100,
          metrics: latestMetric || null,
          firstInvestedDate: strategyFirstDate[matchKey] || null,
        });
      }
    }

    const holdingSecIds = matchedStrategies.map(s => s.id);
    if (holdingSecIds.length > 0) {
      const { data: badHoldings } = await db
        .from("stock_holdings")
        .select("id, security_id")
        .eq("user_id", userId)
        .in("security_id", holdingSecIds);
      for (const bh of (badHoldings || [])) {
        console.log("[user/strategies] Cleaning up invalid stock_holding", bh.id, "for strategy", bh.security_id);
        await db.from("stock_holdings").delete().eq("id", bh.id);
      }
    }

    res.json({ success: true, strategies: matchedStrategies });
  } catch (error) {
    console.error("[user/strategies] Error:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to fetch user strategies" });
  }
});

app.get("/api/user/transactions", async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ success: false, error: "Database not connected" });
    }

    const { user, error: authError } = await authenticateUser(req);
    if (authError || !user) {
      return res.status(401).json({ success: false, error: authError || "Unauthorized" });
    }

    const db = supabaseAdmin || supabase;
    const userId = user.id;
    const limit = parseInt(req.query.limit) || 50;

    const { data: transactions, error: txError } = await db
      .from("transactions")
      .select("id, user_id, direction, name, description, amount, store_reference, currency, status, transaction_date, created_at")
      .eq("user_id", userId)
      .order("transaction_date", { ascending: false })
      .limit(limit);

    if (txError) {
      console.error("Error fetching transactions:", txError);
      return res.status(500).json({ success: false, error: txError.message });
    }

    const txList = transactions || [];

    const extractedNames = new Map();
    for (const tx of txList) {
      const txName = (tx.name || "").trim();
      if (txName.startsWith("Strategy Investment: ")) {
        extractedNames.set(txName.replace("Strategy Investment: ", "").trim(), "strategy");
      } else if (txName.startsWith("Purchased ")) {
        extractedNames.set(txName.replace("Purchased ", "").trim(), "purchased");
      }
    }

    let strategyHoldingsMap = {};
    let securityLogoMap = {};

    if (extractedNames.size > 0) {
      const { data: allSecs } = await db
        .from("securities")
        .select("name, symbol, logo_url");
      if (allSecs) {
        for (const sec of allSecs) {
          if (sec.logo_url) {
            if (sec.name) securityLogoMap[sec.name.toLowerCase()] = sec.logo_url;
            if (sec.symbol) {
              securityLogoMap[sec.symbol.toLowerCase()] = sec.logo_url;
              const normalized = sec.symbol.split(".")[0].toUpperCase().toLowerCase();
              if (normalized !== sec.symbol.toLowerCase()) {
                securityLogoMap[normalized] = sec.logo_url;
              }
            }
          }
        }
      }

      const { data: strategies } = await db
        .from("strategies")
        .select("name, short_name, holdings")
        .eq("status", "active");

      if (strategies) {
        const findLogo = (sym) => {
          if (!sym) return null;
          const lower = sym.toLowerCase();
          const normalized = sym.split(".")[0].toLowerCase();
          return securityLogoMap[lower] || securityLogoMap[normalized] || securityLogoMap[lower + ".jo"] || securityLogoMap[normalized + ".jo"] || null;
        };
        for (const s of strategies) {
          const holdings = Array.isArray(s.holdings) ? s.holdings : [];
          const sorted = [...holdings].sort((a, b) => {
            return Number(b.weight || b.shares || b.quantity || 0) - Number(a.weight || a.shares || a.quantity || 0);
          });
          const top3 = [];
          for (const h of sorted) {
            if (top3.length >= 3) break;
            const sym = h.symbol || h.ticker || "";
            const logo = findLogo(sym);
            if (logo) {
              top3.push({ symbol: sym, logo_url: logo, name: h.name || sym });
            }
          }
          if (s.name) strategyHoldingsMap[s.name.toLowerCase()] = top3;
          if (s.short_name) strategyHoldingsMap[s.short_name.toLowerCase()] = top3;
        }
      }
    }

    const enrichedTx = txList.map(tx => {
      const txName = (tx.name || "").trim();
      let sName = null;
      if (txName.startsWith("Strategy Investment: ")) {
        sName = txName.replace("Strategy Investment: ", "").trim();
      } else if (txName.startsWith("Purchased ")) {
        sName = txName.replace("Purchased ", "").trim();
      }
      
      if (sName) {
        const holdingLogos = strategyHoldingsMap[sName.toLowerCase()] || [];
        if (holdingLogos.length > 0) {
          return { ...tx, holding_logos: holdingLogos, logo_url: null };
        }
        const lower = sName.toLowerCase();
        const logo_url = securityLogoMap[lower] || securityLogoMap[lower.split(".")[0]] || null;
        return { ...tx, holding_logos: [], logo_url };
      }
      return { ...tx, holding_logos: [], logo_url: null };
    });

    res.json({ success: true, transactions: enrichedTx });
  } catch (error) {
    console.error("User transactions error:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to fetch transactions" });
  }
});

app.get("/api/debug/user-investments", async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ success: false, error: "Database not connected" });
    }

    const { user, error: authError } = await authenticateUser(req);
    if (authError || !user) {
      return res.status(401).json({ success: false, error: authError || "Unauthorized" });
    }

    const db = supabaseAdmin || supabase;
    const userId = user.id;

    const [holdingsResult, transactionsResult] = await Promise.all([
      db.from("stock_holdings").select("*").eq("user_id", userId),
      db.from("transactions").select("id, direction, name, description, amount, store_reference, status, transaction_date").eq("user_id", userId).order("transaction_date", { ascending: false }).limit(20),
    ]);

    res.json({
      success: true,
      userId,
      stockHoldings: holdingsResult.data || [],
      recentTransactions: transactionsResult.data || [],
      summary: {
        stockHoldingsCount: (holdingsResult.data || []).length,
        transactionsCount: (transactionsResult.data || []).length,
      },
    });
  } catch (error) {
    console.error("Debug user investments error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/credit-check", async (req, res) => {
  try {
    const { userData, loanApplicationId } = req.body;
    if (!userData) {
      return res.status(400).json({ success: false, error: "Missing userData" });
    }

    const annualIncome = Number(userData.annual_income) || 0;
    const annualExpenses = Number(userData.annual_expenses) || 0;
    const grossMonthly = annualIncome / 12;
    const netMonthly = (annualIncome - annualExpenses) / 12;
    const monthsInJob = Number(userData.months_in_current_job) || 0;
    const contractType = userData.contract_type || "UNEMPLOYED_OR_UNKNOWN";
    const sectorType = userData.employment_sector_type || "other";
    const isNewBorrower = userData.algolend_is_new_borrower === true;

    let score = 0;
    const scoreReasons = [];
    const breakdown = {};

    const dti = grossMonthly > 0 ? ((grossMonthly - netMonthly) / grossMonthly) * 100 : 100;
    breakdown.debtToIncome = { ratio: Math.round(dti), maxAllowed: 50 };

    if (dti <= 30) {
      score += 30;
      scoreReasons.push({ factor: "Debt-to-Income", impact: "positive", detail: `DTI ${Math.round(dti)}% is healthy (≤30%)` });
    } else if (dti <= 50) {
      score += 15;
      scoreReasons.push({ factor: "Debt-to-Income", impact: "neutral", detail: `DTI ${Math.round(dti)}% is moderate (30-50%)` });
    } else {
      score += 5;
      scoreReasons.push({ factor: "Debt-to-Income", impact: "negative", detail: `DTI ${Math.round(dti)}% is high (>50%)` });
    }

    breakdown.employmentTenure = { monthsInCurrentJob: monthsInJob, contractType };
    if (monthsInJob >= 36) {
      score += 25;
      scoreReasons.push({ factor: "Employment Tenure", impact: "positive", detail: `${Math.round(monthsInJob / 12)}+ years at current employer` });
    } else if (monthsInJob >= 12) {
      score += 15;
      scoreReasons.push({ factor: "Employment Tenure", impact: "neutral", detail: `${Math.round(monthsInJob / 12)} year(s) at current employer` });
    } else if (monthsInJob > 0) {
      score += 8;
      scoreReasons.push({ factor: "Employment Tenure", impact: "negative", detail: `Less than 1 year at current employer` });
    } else {
      score += 2;
      scoreReasons.push({ factor: "Employment Tenure", impact: "negative", detail: "Employment tenure unknown" });
    }

    breakdown.contractStability = { type: contractType };
    const stableContracts = new Set(["PERMANENT", "PERMANENT_ON_PROBATION", "SELF_EMPLOYED_12_PLUS", "FIXED_TERM_12_PLUS"]);
    if (stableContracts.has(contractType)) {
      score += 20;
      scoreReasons.push({ factor: "Contract Type", impact: "positive", detail: `${contractType.replace(/_/g, " ")} is considered stable` });
    } else {
      score += 5;
      scoreReasons.push({ factor: "Contract Type", impact: "negative", detail: `${contractType.replace(/_/g, " ")} carries higher risk` });
    }

    breakdown.incomeLevel = { grossMonthly: Math.round(grossMonthly) };
    if (grossMonthly >= 25000) {
      score += 15;
      scoreReasons.push({ factor: "Income Level", impact: "positive", detail: "Above-average monthly income" });
    } else if (grossMonthly >= 10000) {
      score += 10;
      scoreReasons.push({ factor: "Income Level", impact: "neutral", detail: "Moderate monthly income" });
    } else if (grossMonthly > 0) {
      score += 5;
      scoreReasons.push({ factor: "Income Level", impact: "negative", detail: "Below-average monthly income" });
    } else {
      scoreReasons.push({ factor: "Income Level", impact: "negative", detail: "No income data available" });
    }

    breakdown.sectorRisk = { sector: sectorType };
    if (sectorType === "government" || sectorType === "listed") {
      score += 10;
      scoreReasons.push({ factor: "Employment Sector", impact: "positive", detail: `${sectorType} sector has lower risk` });
    } else if (sectorType === "private") {
      score += 7;
      scoreReasons.push({ factor: "Employment Sector", impact: "neutral", detail: "Private sector" });
    } else {
      score += 3;
      scoreReasons.push({ factor: "Employment Sector", impact: "negative", detail: "Unclassified sector" });
    }

    const normalizedScore = Math.min(100, Math.max(0, score));

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.split(" ")[1];
        const supabaseUrl = process.env.VITE_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (supabaseUrl && supabaseKey) {
          const { createClient } = require("@supabase/supabase-js");
          const sb = createClient(supabaseUrl, supabaseKey);
          const { data: { user } } = await sb.auth.getUser(token);
          if (user?.id) {
            await sb.from("loan_engine_score").upsert({
              user_id: user.id,
              engine_score: normalizedScore,
              years_current_employer: Number(userData.years_in_current_job) || 0,
              run_at: new Date().toISOString()
            }, { onConflict: "user_id" });

            if (loanApplicationId) {
              await sb.from("loan_application").update({
                engine_score: normalizedScore,
                step_number: 3,
                updated_at: new Date().toISOString()
              }).eq("id", loanApplicationId);
            }
          }
        }
      } catch (saveErr) {
        console.error("Failed to save score:", saveErr.message);
      }
    }

    res.json({
      success: true,
      loanEngineScore: normalizedScore,
      loanEngineScoreNormalized: normalizedScore,
      breakdown,
      scoreReasons
    });
  } catch (error) {
    console.error("Credit check error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/sessions/record", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    const token = authHeader.split(" ")[1];
    const db = supabaseAdmin || supabase;
    if (!db) {
      return res.status(500).json({ success: false, error: "Database not available" });
    }
    const { data: { user }, error: authError } = await db.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ success: false, error: "Invalid token" });
    }
    if (!pgPool) {
      return res.status(500).json({ success: false, error: "Direct database not available" });
    }
    const { userAgent, browser, os, deviceType, sessionFingerprint } = req.body;
    const fingerprint = sessionFingerprint || user.id + "_" + Date.now();
    const client = await pgPool.connect();
    try {
      await client.query("DELETE FROM user_sessions WHERE user_id = $1 AND session_token = $2", [user.id, fingerprint]);
      const result = await client.query(
        `INSERT INTO user_sessions (user_id, session_token, user_agent, browser, os, device_type, ip_address, is_current, created_at, last_active_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, false, NOW(), NOW()) RETURNING id`,
        [user.id, fingerprint, userAgent || "", browser || "", os || "", deviceType || "desktop", req.headers["x-forwarded-for"] || req.socket.remoteAddress || ""]
      );
      res.json({ success: true, sessionId: result.rows[0]?.id });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Session record error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/sessions/list", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    const token = authHeader.split(" ")[1];
    const db = supabaseAdmin || supabase;
    if (!db) {
      return res.status(500).json({ success: false, error: "Database not available" });
    }
    const { data: { user }, error: authError } = await db.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ success: false, error: "Invalid token" });
    }
    if (!pgPool) {
      return res.status(500).json({ success: false, error: "Direct database not available" });
    }
    const currentFingerprint = req.query.fingerprint || "";
    const client = await pgPool.connect();
    try {
      const result = await client.query(
        `SELECT id, user_id, browser, os, device_type, ip_address, created_at, last_active_at,
          CASE WHEN $2 != '' AND session_token = $2 THEN true ELSE false END AS is_current
         FROM user_sessions WHERE user_id = $1 ORDER BY last_active_at DESC`,
        [user.id, currentFingerprint]
      );
      res.json({ success: true, sessions: result.rows });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Session list error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/sessions/revoke", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    const token = authHeader.split(" ")[1];
    const db = supabaseAdmin || supabase;
    if (!db) {
      return res.status(500).json({ success: false, error: "Database not available" });
    }
    const { data: { user }, error: authError } = await db.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ success: false, error: "Invalid token" });
    }
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ success: false, error: "sessionId required" });
    }
    if (!pgPool) {
      return res.status(500).json({ success: false, error: "Direct database not available" });
    }
    const client = await pgPool.connect();
    try {
      await client.query("DELETE FROM user_sessions WHERE id = $1 AND user_id = $2", [sessionId, user.id]);
      res.json({ success: true });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Session revoke error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/sessions/revoke-others", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    const token = authHeader.split(" ")[1];
    const db = supabaseAdmin || supabase;
    if (!db) {
      return res.status(500).json({ success: false, error: "Database not available" });
    }
    const { data: { user }, error: authError } = await db.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ success: false, error: "Invalid token" });
    }
    const { currentSessionId } = req.body;
    if (!currentSessionId) {
      return res.status(400).json({ success: false, error: "currentSessionId required" });
    }
    if (!pgPool) {
      return res.status(500).json({ success: false, error: "Direct database not available" });
    }
    const client = await pgPool.connect();
    try {
      await client.query("DELETE FROM user_sessions WHERE user_id = $1 AND id != $2", [user.id, currentSessionId]);
      res.json({ success: true });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Session revoke-others error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/sessions/validate", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    const token = authHeader.split(" ")[1];
    const db = supabaseAdmin || supabase;
    if (!db) {
      return res.status(500).json({ success: false, error: "Database not available" });
    }
    const { data: { user }, error: authError } = await db.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ success: false, error: "Invalid token" });
    }
    const fingerprint = req.query.fingerprint || "";
    if (!fingerprint) {
      return res.json({ success: true, valid: true });
    }
    if (!pgPool) {
      return res.json({ success: true, valid: true });
    }
    const client = await pgPool.connect();
    try {
      const result = await client.query(
        "SELECT id FROM user_sessions WHERE user_id = $1 AND session_token = $2 LIMIT 1",
        [user.id, fingerprint]
      );
      res.json({ success: true, valid: result.rows.length > 0 });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Session validate error:", error);
    res.json({ success: true, valid: true });
  }
});

app.post("/api/migrate/onboarding-columns", async (req, res) => {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return res.json({ error: "Missing Supabase credentials" });
    }

    const db = supabaseAdmin || supabase;
    if (!db) return res.json({ error: "no db" });

    const testResult = await db
      .from("user_onboarding")
      .select("risk_disclosure_agreed")
      .limit(1);

    if (testResult.error) {
      const sql = `
ALTER TABLE user_onboarding ADD COLUMN IF NOT EXISTS risk_disclosure_agreed boolean DEFAULT false;
ALTER TABLE user_onboarding ADD COLUMN IF NOT EXISTS source_of_funds text;
ALTER TABLE user_onboarding ADD COLUMN IF NOT EXISTS source_of_funds_other text;
ALTER TABLE user_onboarding ADD COLUMN IF NOT EXISTS expected_monthly_investment text;`;

      // Try via Supabase SQL API  
      const response = await globalThis.fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ sql_query: sql }),
      });

      res.json({
        status: "columns_missing",
        column_test_error: testResult.error.message,
        sql_to_run: sql.trim(),
      });
    } else {
      res.json({ status: "columns_exist", data: testResult.data });
    }
  } catch (e) {
    res.json({ error: e.message });
  }
});

app.get("/api/debug/onboarding/:userId", async (req, res) => {
  try {
    const db = supabaseAdmin || supabase;
    if (!db) return res.json({ error: "no db" });
    const { data: onboarding, error: e1 } = await db
      .from("user_onboarding")
      .select("*")
      .eq("user_id", req.params.userId)
      .order("created_at", { ascending: false })
      .limit(5);
    const { data: actions, error: e2 } = await db
      .from("required_actions")
      .select("*")
      .eq("user_id", req.params.userId)
      .limit(1);
    res.json({ onboarding, actions, errors: { onboarding: e1?.message, actions: e2?.message } });
  } catch (e) {
    res.json({ error: e.message });
  }
});

const PORT = process.env.API_PORT || 3001;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`TruID API server running on port ${PORT}`);
});
