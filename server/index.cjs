const express = require("express");
const cors = require("cors");
const truIDClient = require("./truidClient.cjs");

const app = express();
app.use(cors());
app.use(express.json());

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
