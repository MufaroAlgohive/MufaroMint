import crypto from "crypto";

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

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: { message: "Method not allowed" } });
  }

  try {
    if (!SUMSUB_APP_TOKEN || !SUMSUB_SECRET_KEY) {
      return res.status(500).json({
        success: false,
        error: { message: "Sumsub credentials not configured" }
      });
    }

    const { applicantId } = req.query;

    if (!applicantId) {
      return res.status(400).json({
        success: false,
        error: { message: "applicantId is required" }
      });
    }

    const path = `/resources/applicants/${applicantId}/status`;
    const ts = Math.floor(Date.now() / 1000).toString();
    const signature = createSignature(ts, "GET", path);

    const response = await fetch(`${SUMSUB_BASE_URL}${path}`, {
      method: "GET",
      headers: {
        "X-App-Access-Ts": ts,
        "X-App-Access-Sig": signature,
        "X-App-Token": SUMSUB_APP_TOKEN,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get applicant status: ${errorText}`);
    }

    const statusData = await response.json();

    return res.status(200).json({
      success: true,
      status: statusData
    });
  } catch (error) {
    console.error("Sumsub status error:", error);
    return res.status(500).json({
      success: false,
      error: { message: error.message || "Failed to get applicant status" }
    });
  }
}
