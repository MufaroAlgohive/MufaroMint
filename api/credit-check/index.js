import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userData, loanApplicationId } = req.body;
    if (!userData) {
      return res.status(400).json({ success: false, error: "Missing userData" });
    }

    const annualIncome = Number(userData.annual_income) || 0;
    const annualExpenses = Number(userData.annual_expenses) || 0;
    const grossMonthly = annualIncome / 12;
    const netMonthly = (annualIncome - annualExpenses) / 12;
    const monthsInJob = Number(userData.months_in_current_job) || 0;
    const contractType = userData.contract_type || "UNEMPLOYED_OR_UNKNOWN";
    const sectorType = userData.employment_sector_type || "other";

    let score = 0;
    const scoreReasons = [];
    const breakdown = {};

    const dti = grossMonthly > 0 ? ((grossMonthly - netMonthly) / grossMonthly) * 100 : 100;
    breakdown.debtToIncome = { ratio: Math.round(dti), maxAllowed: 50 };

    if (dti <= 30) {
      score += 30;
      scoreReasons.push({ factor: "Debt-to-Income", impact: "positive", detail: `DTI ${Math.round(dti)}% is healthy (≤30%)` });
    } else if (dti <= 50) {
      score += 15;
      scoreReasons.push({ factor: "Debt-to-Income", impact: "neutral", detail: `DTI ${Math.round(dti)}% is moderate (30-50%)` });
    } else {
      score += 5;
      scoreReasons.push({ factor: "Debt-to-Income", impact: "negative", detail: `DTI ${Math.round(dti)}% is high (>50%)` });
    }

    breakdown.employmentTenure = { monthsInCurrentJob: monthsInJob, contractType };
    if (monthsInJob >= 36) {
      score += 25;
      scoreReasons.push({ factor: "Employment Tenure", impact: "positive", detail: `${Math.round(monthsInJob / 12)}+ years at current employer` });
    } else if (monthsInJob >= 12) {
      score += 15;
      scoreReasons.push({ factor: "Employment Tenure", impact: "neutral", detail: `${Math.round(monthsInJob / 12)} year(s) at current employer` });
    } else if (monthsInJob > 0) {
      score += 8;
      scoreReasons.push({ factor: "Employment Tenure", impact: "negative", detail: "Less than 1 year at current employer" });
    } else {
      score += 2;
      scoreReasons.push({ factor: "Employment Tenure", impact: "negative", detail: "Employment tenure unknown" });
    }

    breakdown.contractStability = { type: contractType };
    const stableContracts = new Set(["PERMANENT", "PERMANENT_ON_PROBATION", "SELF_EMPLOYED_12_PLUS", "FIXED_TERM_12_PLUS"]);
    if (stableContracts.has(contractType)) {
      score += 20;
      scoreReasons.push({ factor: "Contract Type", impact: "positive", detail: `${contractType.replace(/_/g, " ")} is considered stable` });
    } else {
      score += 5;
      scoreReasons.push({ factor: "Contract Type", impact: "negative", detail: `${contractType.replace(/_/g, " ")} carries higher risk` });
    }

    breakdown.incomeLevel = { grossMonthly: Math.round(grossMonthly) };
    if (grossMonthly >= 25000) {
      score += 15;
      scoreReasons.push({ factor: "Income Level", impact: "positive", detail: "Above-average monthly income" });
    } else if (grossMonthly >= 10000) {
      score += 10;
      scoreReasons.push({ factor: "Income Level", impact: "neutral", detail: "Moderate monthly income" });
    } else if (grossMonthly > 0) {
      score += 5;
      scoreReasons.push({ factor: "Income Level", impact: "negative", detail: "Below-average monthly income" });
    } else {
      scoreReasons.push({ factor: "Income Level", impact: "negative", detail: "No income data available" });
    }

    breakdown.sectorRisk = { sector: sectorType };
    if (sectorType === "government" || sectorType === "listed") {
      score += 10;
      scoreReasons.push({ factor: "Employment Sector", impact: "positive", detail: `${sectorType} sector has lower risk` });
    } else if (sectorType === "private") {
      score += 7;
      scoreReasons.push({ factor: "Employment Sector", impact: "neutral", detail: "Private sector" });
    } else {
      score += 3;
      scoreReasons.push({ factor: "Employment Sector", impact: "negative", detail: "Unclassified sector" });
    }

    const normalizedScore = Math.min(100, Math.max(0, score));

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.split(" ")[1];
        const supabaseUrl = process.env.VITE_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (supabaseUrl && supabaseKey) {
          const sb = createClient(supabaseUrl, supabaseKey);
          const { data: { user } } = await sb.auth.getUser(token);
          if (user?.id) {
            await sb.from("loan_engine_score").upsert({
              user_id: user.id,
              engine_score: normalizedScore,
              years_current_employer: Number(userData.years_in_current_job) || 0,
              run_at: new Date().toISOString()
            }, { onConflict: "user_id" });

            if (loanApplicationId) {
              await sb.from("loan_application").update({
                engine_score: normalizedScore,
                step_number: 3,
                updated_at: new Date().toISOString()
              }).eq("id", loanApplicationId);
            }
          }
        }
      } catch (saveErr) {
        console.error("Failed to save score:", saveErr.message);
      }
    }

    res.json({
      success: true,
      loanEngineScore: normalizedScore,
      loanEngineScoreNormalized: normalizedScore,
      breakdown,
      scoreReasons
    });
  } catch (error) {
    console.error("Credit check error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}
