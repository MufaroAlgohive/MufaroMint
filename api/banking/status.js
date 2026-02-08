import { truIDClient } from "../_lib/truidClient.js";

function extractLatestStatus(statuses) {
  if (!Array.isArray(statuses) || !statuses.length) return null;
  const sorted = [...statuses].sort((a, b) => new Date(b.timestamp || b.date || 0) - new Date(a.timestamp || a.date || 0));
  return sorted[0]?.code || sorted[0]?.status || null;
}

function extractLatestMilestone(milestones) {
  if (!Array.isArray(milestones) || !milestones.length) return null;
  const sorted = [...milestones].sort((a, b) => new Date(b.timestamp || b.date || 0) - new Date(a.timestamp || a.date || 0));
  return sorted[0]?.code || sorted[0]?.status || null;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: { message: "Method not allowed" } });
  }

  try {
    const { collectionId } = req.query;
    if (!collectionId) {
      return res.status(400).json({ success: false, error: { message: "Missing collectionId" } });
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

    return res.json({ success: true, collectionId, currentStatus, outcome });
  } catch (error) {
    console.error("Banking status error:", error);
    return res.status(error.status || 500).json({
      success: false,
      error: { message: error.message || "Internal server error" }
    });
  }
}
