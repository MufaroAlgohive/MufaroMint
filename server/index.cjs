const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const truIDClient = require("./truidClient.cjs");

const app = express();
app.use(cors());
app.use(express.json());

// Sumsub configuration
const SUMSUB_APP_TOKEN = process.env.SUMSUB_APP_TOKEN;
const SUMSUB_SECRET_KEY = process.env.SUMSUB_SECRET_KEY;
const SUMSUB_BASE_URL = "https://api.sumsub.com";
const SUMSUB_LEVEL_NAME = process.env.SUMSUB_LEVEL_NAME || "basic-kyc-level";

// Create signature for Sumsub API requests
function createSumsubSignature(ts, method, path, body = "") {
  const data = ts + method.toUpperCase() + path + body;
  return crypto
    .createHmac("sha256", SUMSUB_SECRET_KEY)
    .update(data)
    .digest("hex");
}

// Generate Sumsub access token
async function generateSumsubAccessToken(userId, levelName = "basic-kyc-level") {
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

let supabase = null;
try {
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    const { createClient } = require('@supabase/supabase-js');
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
} catch (e) {
  console.warn('Supabase client not available:', e.message);
}

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
      // User submitted documents but they were rejected
      status = "needs_resubmission";
      console.log(`Status: needs_resubmission (rejected)`);
    } else if (reviewStatus === "onHold") {
      status = "needs_resubmission";
      console.log(`Status: needs_resubmission (on hold)`);
    } else if (reviewStatus === "pending" || reviewStatus === "queued") {
      status = "pending";
      console.log(`Status: pending (review pending/queued)`);
    } else if (hasAnySubmittedSteps) {
      // User has started verification but not complete yet
      status = "pending";
      console.log(`Status: pending (verification in progress)`);
    } else {
      // User has never submitted any documents
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

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

async function verifyPaystackPayment(reference) {
  if (!PAYSTACK_SECRET_KEY) {
    return { verified: false, error: "Paystack secret key not configured" };
  }
  const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
    },
  });
  const result = await response.json();
  if (!result.status || result.data?.status !== "success") {
    return { verified: false, error: "Payment not successful", data: result.data };
  }
  return { verified: true, data: result.data };
}

app.post("/api/record-investment", async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ success: false, error: "Database not connected" });
    }

    const { user, error: authError } = await authenticateUser(req);
    if (authError || !user) {
      return res.status(401).json({ success: false, error: authError || "Unauthorized" });
    }
    const userId = user.id;

    const { securityId, symbol, name, amount, strategyId, paymentReference } = req.body;

    if (!securityId || !amount || !paymentReference) {
      return res.status(400).json({ success: false, error: "Missing required fields: securityId, amount, paymentReference" });
    }

    const { verified, error: payError, data: payData } = await verifyPaystackPayment(paymentReference);
    if (!verified) {
      return res.status(400).json({ success: false, error: payError || "Payment verification failed" });
    }

    const paidAmount = payData.amount / 100;
    if (Math.abs(paidAmount - amount) > 1) {
      return res.status(400).json({ success: false, error: `Amount mismatch: paid ${paidAmount}, expected ${amount}` });
    }

    let currentPrice = amount;
    const { data: securityData, error: secError } = await supabase
      .from("securities")
      .select("current_price")
      .eq("id", securityId)
      .maybeSingle();

    if (!secError && securityData?.current_price) {
      currentPrice = securityData.current_price;
    } else {
      const { data: priceData, error: priceError } = await supabase
        .from("security_prices")
        .select("price")
        .eq("security_id", securityId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!priceError && priceData?.price) {
        currentPrice = priceData.price;
      }
    }

    const shares = currentPrice > 0 ? amount / currentPrice : 1;

    const { data: existing, error: fetchError } = await supabase
      .from("user_holdings")
      .select("id, shares, cost_basis, current_value")
      .eq("user_id", userId)
      .eq("security_id", securityId)
      .maybeSingle();

    if (fetchError) {
      console.error("Error checking existing holding:", fetchError);
      return res.status(500).json({ success: false, error: fetchError.message });
    }

    let holdingResult;
    if (existing) {
      const newShares = (existing.shares || 0) + shares;
      const newCostBasis = (existing.cost_basis || 0) + amount;
      const newCurrentValue = (existing.current_value || 0) + amount;
      const { data, error } = await supabase
        .from("user_holdings")
        .update({
          shares: newShares,
          cost_basis: newCostBasis,
          current_value: newCurrentValue,
        })
        .eq("id", existing.id)
        .select();
      holdingResult = { data, error };
    } else {
      const holdingData = {
        user_id: userId,
        security_id: securityId,
        shares: shares,
        cost_basis: amount,
        current_value: amount,
        change_percent: 0,
        daily_change: 0,
      };
      if (strategyId) {
        holdingData.strategy_id = strategyId;
      }
      const { data, error } = await supabase
        .from("user_holdings")
        .insert(holdingData)
        .select();
      holdingResult = { data, error };
    }

    if (holdingResult.error) {
      console.error("Error upserting holding:", holdingResult.error);
      return res.status(500).json({ success: false, error: holdingResult.error.message });
    }

    const sharesText = shares === 1 ? "1 share" : `${shares.toFixed(4)} shares`;
    const { error: txError } = await supabase
      .from("transactions")
      .insert({
        user_id: userId,
        type: "buy",
        amount: amount,
        description: `Purchased ${sharesText} of ${name || symbol || "Unknown"}`,
        reference: paymentReference || null,
        status: "completed",
        created_at: new Date().toISOString(),
      });

    if (txError) {
      console.error("Error inserting transaction:", txError);
    }

    res.json({ success: true, holding: holdingResult.data });
  } catch (error) {
    console.error("Record investment error:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to record investment" });
  }
});

const PORT = process.env.API_PORT || 3001;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`TruID API server running on port ${PORT}`);
});
