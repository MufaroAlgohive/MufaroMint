import { supabase, authenticateUser } from "../_lib/supabase.js";

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
    console.log("[strategy-performance] Request received, method:", req.method);

    if (!supabase) {
      console.error("[strategy-performance] Supabase not initialized");
      return res.status(500).json({ success: false, error: "Database not connected" });
    }

    const db = supabase;
    const { strategyId } = req.query;

    console.log("[strategy-performance] Fetching metrics, strategyId:", strategyId);

    let query = db
      .from("strategy_metrics")
      .select(`
        strategy_id,
        as_of_date,
        portfolio_value,
        r_1w,
        r_1m,
        r_3m,
        r_6m,
        r_ytd,
        r_1y,
        r_3y,
        r_all_time,
        holdings_live,
        computed_at
      `)
      .order("as_of_date", { ascending: false })
      .limit(1);

    // If specific strategy requested
    if (strategyId) {
      console.log("[strategy-performance] Filtering by strategy:", strategyId);
      query = query.eq("strategy_id", strategyId);
    }

    const { data: metrics, error } = await query;

    if (error) {
      console.error("[strategy-performance] Supabase error:", error);
      return res.status(500).json({ success: false, error: error.message, details: error });
    }

    console.log("[strategy-performance] Found", metrics?.length || 0, "records");

    if (!metrics || metrics.length === 0) {
      console.log("[strategy-performance] No metrics found");
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    // Format the returns as percentages
    const formatted = (metrics || []).map(m => ({
      strategy_id: m.strategy_id,
      as_of_date: m.as_of_date,
      portfolio_value: m.portfolio_value,
      returns: {
        one_week: m.r_1w ? Number((m.r_1w * 100).toFixed(2)) : null,
        one_month: m.r_1m ? Number((m.r_1m * 100).toFixed(2)) : null,
        three_month: m.r_3m ? Number((m.r_3m * 100).toFixed(2)) : null,
        six_month: m.r_6m ? Number((m.r_6m * 100).toFixed(2)) : null,
        ytd: m.r_ytd ? Number((m.r_ytd * 100).toFixed(2)) : null,
        one_year: m.r_1y ? Number((m.r_1y * 100).toFixed(2)) : null,
        three_year: m.r_3y ? Number((m.r_3y * 100).toFixed(2)) : null,
        all_time: m.r_all_time ? Number((m.r_all_time * 100).toFixed(2)) : null,
      },
      holdings_live: m.holdings_live,
      computed_at: m.computed_at,
    }));

    return res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    console.error("[strategy-performance] Catch error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
}
