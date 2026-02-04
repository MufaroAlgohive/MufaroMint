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

app.get("/api/sumsub/status/:applicantId", async (req, res) => {
  try {
    if (!SUMSUB_APP_TOKEN || !SUMSUB_SECRET_KEY) {
      return res.status(500).json({
        success: false,
        error: { message: "Sumsub credentials not configured" }
      });
    }

    const { applicantId } = req.params;
    const status = await getSumsubApplicantStatus(applicantId);
    
    res.json({
      success: true,
      status
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

app.post("/api/sumsub/webhook", async (req, res) => {
  console.log("Sumsub webhook received:", JSON.stringify(req.body, null, 2));
  
  const { type, applicantId, reviewResult, reviewStatus, externalUserId } = req.body;
  
  // Handle verification completion
  if (type === "applicantReviewed" && reviewResult?.reviewAnswer === "GREEN") {
    console.log(`User ${externalUserId} KYC verified successfully`);
    
    // Update user KYC status in database if Supabase is available
    if (supabase && externalUserId) {
      try {
        const { data: existingAction } = await supabase
          .from("required_actions")
          .select("id")
          .eq("user_id", externalUserId)
          .maybeSingle();

        if (existingAction) {
          await supabase
            .from("required_actions")
            .update({ kyc_verified: true })
            .eq("user_id", externalUserId);
        } else {
          await supabase
            .from("required_actions")
            .insert({ user_id: externalUserId, kyc_verified: true });
        }
        console.log(`Updated KYC status for user ${externalUserId}`);
      } catch (err) {
        console.error("Failed to update KYC status:", err);
      }
    }
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

const PORT = process.env.API_PORT || 3001;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`TruID API server running on port ${PORT}`);
});
