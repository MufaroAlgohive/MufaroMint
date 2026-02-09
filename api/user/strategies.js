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
      return res.status(200).json({ success: true, strategies: [] });
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

    return res.status(200).json({ success: true, strategies: matchedStrategies });
  } catch (error) {
    console.error("[user/strategies] Error:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to fetch user strategies" });
  }
}
