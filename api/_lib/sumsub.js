import crypto from "crypto";

const SUMSUB_APP_TOKEN = process.env.SUMSUB_APP_TOKEN;
const SUMSUB_SECRET_KEY = process.env.SUMSUB_SECRET_KEY;
const SUMSUB_BASE_URL = "https://api.sumsub.com";

const createSignature = (ts, method, path, body = "") => {
  const data = ts + method.toUpperCase() + path + body;
  return crypto.createHmac("sha256", SUMSUB_SECRET_KEY).update(data).digest("hex");
};

export async function getSumsubApplicantByExternalId(externalUserId) {
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
    if (response.status === 404) return null;
    const errorText = await response.text();
    throw new Error(`Sumsub API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}
