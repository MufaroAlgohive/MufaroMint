import { supabaseAdmin } from "../_lib/supabase.js";
import { truIDClient } from "../_lib/truidClient.js";

function toNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function getMode(values = []) {
  if (!values.length) return null;
  const counts = new Map();
  values.forEach((value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return;
    counts.set(numeric, (counts.get(numeric) || 0) + 1);
  });
  if (!counts.size) return null;
  return Number([...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]);
}

function extractMainSalary(statement, transactions) {
  const summaryData = statement?.summaryData || [];
  const summaryCandidates = summaryData
    .map((month) => toNumber(month?.main_income))
    .filter((value) => value > 0);
  const summaryMode = getMode(summaryCandidates);
  if (summaryMode) return summaryMode;

  const salaryCredits = (transactions || []).filter((tx) => {
    const description = String(tx?.description || "").toLowerCase();
    const categoryTwo = String(tx?.category_two || "").toLowerCase();
    const categoryThree = String(tx?.category_three || "").toLowerCase();
    return (
      String(tx?.type || "").toLowerCase() === "credit" &&
      (description.includes("salary") || categoryTwo.includes("salary") || categoryThree.includes("salary"))
    );
  });

  const salaryAmounts = salaryCredits.map((tx) => toNumber(tx?.amount)).filter((value) => value > 0);
  const salaryMode = getMode(salaryAmounts);
  if (salaryMode) return salaryMode;

  const totalSalary = toNumber(statement?.salary);
  if (totalSalary) {
    return salaryCredits.length ? totalSalary / salaryCredits.length : totalSalary;
  }

  return 0;
}

function extractSalaryPaymentDate(transactions) {
  const salaryCredits = (transactions || []).filter((tx) => {
    const description = String(tx?.description || "").toLowerCase();
    const categoryTwo = String(tx?.category_two || "").toLowerCase();
    const categoryThree = String(tx?.category_three || "").toLowerCase();
    return (
      String(tx?.type || "").toLowerCase() === "credit" &&
      (description.includes("salary") || categoryTwo.includes("salary") || categoryThree.includes("salary"))
    );
  });

  if (!salaryCredits.length) return null;

  const latestDate = salaryCredits
    .map((tx) => tx?.date)
    .filter(Boolean)
    .sort()
    .pop();

  return latestDate || null;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.CORS_ORIGIN || "");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: { message: "Method not allowed" } });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, error: { message: "Missing or invalid Authorization header" } });
    }

    const token = authHeader.replace("Bearer ", "");
    if (!supabaseAdmin) {
      return res.status(500).json({ success: false, error: { message: "Database not configured" } });
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ success: false, error: { message: "Invalid or expired token" } });
    }

    const { collectionId } = req.body;
    if (!collectionId) {
      return res.status(400).json({ success: false, error: { message: "collectionId is required" } });
    }

    const data = await truIDClient.getCollectionData(collectionId);
    const payload = data?.data || {};
    const statement = payload?.statement || {};
    const summaryData = Array.isArray(statement?.summaryData) ? statement.summaryData : [];
    const accounts = Array.isArray(statement?.accounts) ? statement.accounts : [];
    const transactions = accounts[0]?.transactions || [];

    const monthsCaptured = summaryData.length || toNumber(statement?.summaries) || 0;
    const totalIncome = summaryData.length
      ? summaryData.reduce((sum, month) => sum + toNumber(month?.total_income), 0)
      : toNumber(statement?.income);
    const totalExpenses = summaryData.length
      ? summaryData.reduce((sum, month) => sum + toNumber(month?.total_expenses), 0)
      : toNumber(statement?.expenses);

    const divisor = monthsCaptured || 1;
    const avgMonthlyIncome = totalIncome / divisor;
    const avgMonthlyExpenses = totalExpenses / divisor;
    const netMonthlyIncome = avgMonthlyIncome - avgMonthlyExpenses;

    const mainSalary = extractMainSalary(statement, transactions);
    const salaryPaymentDate = extractSalaryPaymentDate(transactions);

    const insertPayload = {
      user_id: user.id,
      collection_id: collectionId,
      bank_name: statement?.customer?.bank || null,
      customer_name: statement?.customer?.name || null,
      captured_at: new Date().toISOString(),
      months_captured: monthsCaptured,
      total_income: totalIncome,
      total_expenses: totalExpenses,
      avg_monthly_income: avgMonthlyIncome,
      avg_monthly_expenses: avgMonthlyExpenses,
      net_monthly_income: netMonthlyIncome,
      main_salary: mainSalary,
      salary_payment_date: salaryPaymentDate,
      summary_data: summaryData,
      raw_statement: statement
    };

    const { data: existingSnapshot } = await supabaseAdmin
      .from("truid_bank_snapshots")
      .select("id")
      .eq("user_id", user.id)
      .eq("collection_id", collectionId)
      .maybeSingle();

    let savedSnapshot = null;
    let saveError = null;
    if (existingSnapshot?.id) {
      const { data: updated, error: updateError } = await supabaseAdmin
        .from("truid_bank_snapshots")
        .update(insertPayload)
        .eq("id", existingSnapshot.id)
        .select("*")
        .single();
      savedSnapshot = updated;
      saveError = updateError;
    } else {
      const { data: inserted, error: insertError } = await supabaseAdmin
        .from("truid_bank_snapshots")
        .insert(insertPayload)
        .select("*")
        .single();
      savedSnapshot = inserted;
      saveError = insertError;
    }

    if (saveError) {
      return res.status(500).json({
        success: false,
        error: {
          message: saveError.message || "Failed to save TruID snapshot",
          details: saveError.details,
          hint: saveError.hint,
          code: saveError.code
        }
      });
    }

    const { data: existingAction } = await supabaseAdmin
      .from("required_actions")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingAction) {
      const { error: actionErr } = await supabaseAdmin
        .from("required_actions")
        .update({ bank_linked: true, bank_in_review: false })
        .eq("user_id", user.id);
      if (actionErr) console.warn("[banking/capture] required_actions update failed:", actionErr.message);
    } else {
      const { error: actionErr } = await supabaseAdmin
        .from("required_actions")
        .insert({ user_id: user.id, bank_linked: true, bank_in_review: false });
      if (actionErr) console.warn("[banking/capture] required_actions insert failed:", actionErr.message);
    }

    return res.json({ success: true, snapshot: savedSnapshot, truidRaw: data });
  } catch (error) {
    console.error("Banking capture error:", error);
    return res.status(error.status || 500).json({
      success: false,
      error: { message: error.message || "Internal server error" }
    });
  }
}
