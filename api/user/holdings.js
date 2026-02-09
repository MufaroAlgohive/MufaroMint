import { supabase, supabaseAdmin, authenticateUser } from "../_lib/supabase.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

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

    if (securityIds.length > 0) {
      const { data: secData, error: secError } = await db
        .from("securities")
        .select("id, symbol, name, logo_url, last_price, sector, exchange")
        .in("id", securityIds);

      if (secError) {
        console.error("Error fetching securities for holdings:", secError);
      }
      if (secData) {
        secData.forEach(s => { securitiesMap[s.id] = s; });
      }
    }

    const enrichedHoldings = rawHoldings
      .filter(h => securitiesMap[h.security_id])
      .map(h => ({
        ...h,
        symbol: securitiesMap[h.security_id]?.symbol || "N/A",
        name: securitiesMap[h.security_id]?.name || "Unknown",
        asset_class: securitiesMap[h.security_id]?.sector || "Other",
        logo_url: securitiesMap[h.security_id]?.logo_url || null,
        last_price: securitiesMap[h.security_id]?.last_price || null,
        exchange: securitiesMap[h.security_id]?.exchange || null,
      }));

    return res.status(200).json({ success: true, holdings: enrichedHoldings });
  } catch (error) {
    console.error("User holdings error:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to fetch holdings" });
  }
}
