import crypto from "crypto";

const SUMSUB_APP_TOKEN = process.env.SUMSUB_APP_TOKEN;
const SUMSUB_SECRET_KEY = process.env.SUMSUB_SECRET_KEY;
const SUMSUB_BASE_URL = "https://api.sumsub.com";
const SUMSUB_LEVEL_NAME = process.env.SUMSUB_LEVEL_NAME || "mint-advanced-kyc";

const createSignature = (ts, method, path, body = "") => {
  const data = ts + method.toUpperCase() + path + body;
  return crypto
    .createHmac("sha256", SUMSUB_SECRET_KEY)
    .update(data)
    .digest("hex");
};

const createApplicant = async (externalUserId, levelName) => {
  const path = `/resources/applicants?levelName=${encodeURIComponent(levelName)}`;
  const ts = Math.floor(Date.now() / 1000).toString();
  const body = JSON.stringify({ externalUserId });
  const signature = createSignature(ts, "POST", path, body);

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
};

const generateAccessToken = async (externalUserId, levelName) => {
  const path = `/resources/accessTokens?userId=${encodeURIComponent(externalUserId)}&levelName=${encodeURIComponent(levelName)}`;
  const ts = Math.floor(Date.now() / 1000).toString();
  const signature = createSignature(ts, "POST", path);

  const response = await fetch(`${SUMSUB_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-App-Access-Ts": ts,
      "X-App-Access-Sig": signature,
      "X-App-Token": SUMSUB_APP_TOKEN,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to generate access token: ${errorText}`);
  }

  return response.json();
};

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
      await createApplicant(userId, levelName);
    } catch (err) {
      if (!err.message.includes("already exists")) {
        console.error("Create applicant error:", err.message);
      }
    }

    const tokenData = await generateAccessToken(userId, levelName);

    return res.status(200).json({
      success: true,
      token: tokenData.token,
      userId: tokenData.userId
    });
  } catch (error) {
    console.error("Sumsub access token error:", error);
    return res.status(500).json({
      success: false,
      error: { message: error.message || "Failed to generate access token" }
    });
  }
}
