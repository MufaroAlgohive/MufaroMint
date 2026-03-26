import { createClient } from "@supabase/supabase-js";
import { performCreditCheck } from "../../services/creditCheckService.js";
import {
  TOTAL_LOAN_ENGINE_WEIGHT,
  extractClientDeviceMetadata,
  computeCreditScoreContribution,
  computeAdverseListingsContribution,
  computeCreditUtilizationContribution,
  computeDeviceFingerprintContribution,
  computeDTIContribution,
  computeEmploymentTenureContribution,
  computeContractTypeContribution,
  computeEmploymentCategoryContribution,
  computeIncomeStabilityContribution,
  computeAlgolendRepaymentContribution,
  computeAglRetrievalContribution
} from "../../services/loanEngine.js";

function normalizeDobForExperian(dob) {
  if (!dob) return dob;
  return String(dob).replace(/-/g, '');
}

function buildUserData(overrides = {}) {
  const base = {
    reference: 'mintcheck',
    identity_number: '',
    passport_number: '',
    surname: '',
    forename: '',
    middle_name: '',
    gender: '',
    date_of_birth: '',
    address1: '',
    address2: '',
    address3: '',
    address4: '',
    postal_code: '',
    cell_tel_no: '',
    work_tel_no: '',
    home_tel_no: '',
    email: '',
    user_id: '',
    client_ref: `MINT-${Date.now()}`
  };

  const merged = { ...base, ...(overrides || {}) };
  if (merged.date_of_birth) {
    merged.date_of_birth = normalizeDobForExperian(merged.date_of_birth);
  }

  return merged;
}

function normalizeCreditScore(result) {
  const scoreCandidate =
    result?.extracted?.extractedCreditScore ??
    result?.creditScore ??
    result?.creditScoreData?.creditScore ??
    result?.creditScore?.score ??
    result?.creditScoreData?.score;

  const score = Number(scoreCandidate);
  return Number.isFinite(score) ? score : 0;
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const ALLOW_UNAUTH = process.env.ALLOW_UNAUTH !== 'false';

const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body = req.body || {};
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body || '{}');
    } catch {
      body = {};
    }
  }

  const authHeader = req.headers.authorization || '';
  const accessToken = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : null;

  let userId = null;
  if (accessToken) {
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase not configured on server' });
    }
    const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
    if (!userError && userData?.user?.id) {
      userId = userData.user.id;
    } else if (!ALLOW_UNAUTH) {
      return res.status(401).json({ error: 'Invalid or expired session', details: userError?.message });
    }
  } else if (!ALLOW_UNAUTH) {
    return res.status(401).json({ error: 'Missing bearer token' });
  }

  if (!userId) userId = 'anon-dev';

  let loanApplicationId = body.loanApplicationId || body.loan_application_id || null;
  const applicationId = body.applicationId || loanApplicationId || `app_${Date.now()}`;
  const overrides = body.userData || body;
  const normalizedOverrides = {
    ...overrides,
    identity_number: overrides?.identity_number || overrides?.id_number || overrides?.identityNumber,
    surname: overrides?.surname || overrides?.last_name || overrides?.lastName,
    forename: overrides?.forename || overrides?.first_name || overrides?.firstName,
    date_of_birth: overrides?.date_of_birth || overrides?.dateOfBirth,
    address1: overrides?.address1 || overrides?.address,
    contract_type: overrides?.contract_type || overrides?.contractType
  };

  if (normalizedOverrides?.annual_income && !normalizedOverrides?.gross_monthly_income) {
    const annualIncome = Number(normalizedOverrides.annual_income);
    if (Number.isFinite(annualIncome)) {
      normalizedOverrides.gross_monthly_income = annualIncome / 12;
    }
  }

  if (normalizedOverrides?.years_in_current_job && !normalizedOverrides?.months_in_current_job) {
    const yearsValue = Number(normalizedOverrides.years_in_current_job);
    if (Number.isFinite(yearsValue)) {
      normalizedOverrides.months_in_current_job = yearsValue * 12;
    }
  }

  let truidSnapshot = null;
  if (supabase && userId && userId !== 'anon-dev') {
    try {
      const dbClient = accessToken
        ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            global: { headers: { Authorization: `Bearer ${accessToken}` } }
          })
        : supabase;

      const { data: snapshotData } = await dbClient
        .from('truid_bank_snapshots')
        .select('months_captured,main_salary')
        .eq('user_id', userId)
        .order('captured_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      truidSnapshot = snapshotData || null;
      if (snapshotData) {
        normalizedOverrides.truid_months_captured = snapshotData.months_captured;
        normalizedOverrides.truid_main_salary = snapshotData.main_salary;
      }
    } catch (snapshotError) {
      console.warn('TruID snapshot lookup failed:', snapshotError?.message || snapshotError);
    }
  }

  // Enrich from user profile if identity fields missing
  if (supabase && userId && userId !== 'anon-dev' && !normalizedOverrides.identity_number) {
    try {
      const dbClient = accessToken
        ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            global: { headers: { Authorization: `Bearer ${accessToken}` } }
          })
        : supabase;

      const { data: profile } = await dbClient
        .from('profiles')
        .select('id_number,first_name,last_name,date_of_birth,gender,phone,address_line1,address_line2,city,postal_code')
        .eq('id', userId)
        .maybeSingle();

      if (profile) {
        if (!normalizedOverrides.identity_number && profile.id_number) normalizedOverrides.identity_number = profile.id_number;
        if (!normalizedOverrides.surname && profile.last_name) normalizedOverrides.surname = profile.last_name;
        if (!normalizedOverrides.forename && profile.first_name) normalizedOverrides.forename = profile.first_name;
        if (!normalizedOverrides.date_of_birth && profile.date_of_birth) normalizedOverrides.date_of_birth = profile.date_of_birth;
        if (!normalizedOverrides.gender && profile.gender) normalizedOverrides.gender = profile.gender;
        if (!normalizedOverrides.cell_tel_no && profile.phone) normalizedOverrides.cell_tel_no = profile.phone;
        if (!normalizedOverrides.address1 && profile.address_line1) normalizedOverrides.address1 = profile.address_line1;
        if (!normalizedOverrides.address2 && profile.address_line2) normalizedOverrides.address2 = profile.address_line2;
        if (!normalizedOverrides.address4 && profile.city) normalizedOverrides.address4 = profile.city;
        if (!normalizedOverrides.postal_code && profile.postal_code) normalizedOverrides.postal_code = profile.postal_code;
      }
    } catch (profileError) {
      console.warn('Profile lookup failed:', profileError?.message || profileError);
    }
  }

  // Enrich from onboarding if employment fields missing
  if (supabase && userId && userId !== 'anon-dev') {
    try {
      const dbClient = accessToken
        ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            global: { headers: { Authorization: `Bearer ${accessToken}` } }
          })
        : supabase;

      const { data: onboarding } = await dbClient
        .from('user_onboarding')
        .select('employer_name,employment_type,employer_industry')
        .eq('user_id', userId)
        .maybeSingle();

      if (onboarding) {
        if (!normalizedOverrides.employment_employer_name && onboarding.employer_name) {
          normalizedOverrides.employment_employer_name = onboarding.employer_name;
        }
        if (!normalizedOverrides.contract_type && onboarding.employment_type) {
          normalizedOverrides.contract_type = onboarding.employment_type;
        }
        if (!normalizedOverrides.employment_sector_type && onboarding.employer_industry) {
          normalizedOverrides.employment_sector_type = onboarding.employer_industry;
        }
      }
    } catch (onboardingError) {
      console.warn('Onboarding lookup failed:', onboardingError?.message || onboardingError);
    }
  }

  const userPayload = buildUserData(normalizedOverrides);
  userPayload.user_id = overrides?.user_id || userId;

  if (!loanApplicationId && supabase && userId && userId !== 'anon-dev') {
    try {
      const dbClient = accessToken
        ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            global: { headers: { Authorization: `Bearer ${accessToken}` } }
          })
        : supabase;

      const { data: loanApp } = await dbClient
        .from('loan_application')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'in_progress')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (loanApp?.id) {
        loanApplicationId = loanApp.id;
      }
    } catch (lookupError) {
      console.warn('Loan application lookup failed:', lookupError?.message || lookupError);
    }
  }

  if (!userPayload.identity_number || !userPayload.surname || !userPayload.forename) {
    return res.status(400).json({ error: 'Missing required identity fields', required: ['identity_number', 'surname', 'forename'] });
  }

  try {
    const result = await performCreditCheck(userPayload, applicationId, accessToken);

    const creditScoreData = (result && typeof result.creditScore === 'object' && result.creditScore)
      ? result.creditScore
      : (result?.creditScoreData || result?.extracted?.creditScoreData || {});

    const creditScoreValue = normalizeCreditScore({
      ...result,
      creditScoreData,
      creditScore: creditScoreData
    });

    const accountExposure = creditScoreData?.accounts?.exposure || {};
    const accountSummary = creditScoreData?.accountSummary || {};
    const accountMetrics = {
      ...accountExposure,
      ...accountSummary,
      totalMonthlyInstallment: accountExposure.totalMonthlyInstallments ?? accountSummary.totalMonthlyInstallments ?? 0
    };

    const employmentHistory = creditScoreData?.employmentHistory || result?.employmentHistory || [];

    const deviceFingerprint = extractClientDeviceMetadata(req);

    const creditScoreBreakdown = computeCreditScoreContribution(creditScoreValue);
    const adverseListingsBreakdown = computeAdverseListingsContribution(creditScoreData);
    const creditUtilizationBreakdown = computeCreditUtilizationContribution(accountMetrics);
    const deviceFingerprintBreakdown = computeDeviceFingerprintContribution(deviceFingerprint);

    const totalMonthlyDebt = accountMetrics.totalMonthlyInstallment || 0;
    const grossMonthlyIncome = Number(userPayload.gross_monthly_income || 0);
    const dtiBreakdown = computeDTIContribution(totalMonthlyDebt, grossMonthlyIncome);

    const employmentTenureBreakdown = computeEmploymentTenureContribution(userPayload.months_in_current_job);
    const contractTypeBreakdown = computeContractTypeContribution(userPayload.contract_type);
    const employmentCategoryBreakdown = computeEmploymentCategoryContribution(userPayload);
    const incomeStabilityBreakdown = computeIncomeStabilityContribution(userPayload);
    const algolendRepaymentBreakdown = computeAlgolendRepaymentContribution(userPayload.algolend_is_new_borrower);
    const aglRetrievalBreakdown = computeAglRetrievalContribution();

    const breakdown = {
      creditScore: creditScoreBreakdown,
      creditUtilization: creditUtilizationBreakdown,
      adverseListings: adverseListingsBreakdown,
      deviceFingerprint: deviceFingerprintBreakdown,
      dti: dtiBreakdown,
      employmentTenure: employmentTenureBreakdown,
      contractType: contractTypeBreakdown,
      employmentCategory: employmentCategoryBreakdown,
      incomeStability: incomeStabilityBreakdown,
      algolendRepayment: algolendRepaymentBreakdown,
      aglRetrieval: aglRetrievalBreakdown
    };

    const loanEngineScore = Object.values(breakdown)
      .map(item => item?.contributionPercent)
      .reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0);
    const loanEngineScoreMax = TOTAL_LOAN_ENGINE_WEIGHT;
    const loanEngineScoreNormalized = loanEngineScoreMax > 0
      ? Math.min(100, (loanEngineScore / loanEngineScoreMax) * 100)
      : 0;

    const creditExposure = {
      totalBalance: accountMetrics.totalBalance || 0,
      totalLimits: accountMetrics.totalLimits || 0,
      revolvingBalance: accountMetrics.revolvingBalance || 0,
      revolvingLimits: accountMetrics.revolvingLimits || 0,
      totalMonthlyInstallment: accountMetrics.totalMonthlyInstallment || 0
    };

    const scoreReasons = [];
    if (creditScoreValue < 580) scoreReasons.push('Low credit score');
    if (creditUtilizationBreakdown.ratioPercent !== null && creditUtilizationBreakdown.ratioPercent > 75) {
      scoreReasons.push('High credit utilization');
    }
    if ((adverseListingsBreakdown.totalAdverse || 0) > 0) scoreReasons.push('Adverse listings present');
    if (dtiBreakdown.dtiPercent !== null && dtiBreakdown.dtiPercent > 50) scoreReasons.push('High debt-to-income ratio');
    if ((employmentTenureBreakdown.monthsInCurrentJob || 0) < 6) scoreReasons.push('Short employment tenure');

    const success = result?.success === true;
    const ok = success;

    if (supabase && userId && userId !== 'anon-dev') {
      try {
        const dbClient = accessToken
          ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
              global: { headers: { Authorization: `Bearer ${accessToken}` } }
            })
          : supabase;

        const loanEngineInsert = {
          user_id: userId,
          loan_application_id: loanApplicationId,
          engine_score: Number.isFinite(loanEngineScoreNormalized)
            ? Math.round(loanEngineScoreNormalized)
            : null,
          score_band: creditScoreData?.riskType || 'UNKNOWN',
          experian_score: Number.isFinite(creditScoreValue) ? creditScoreValue : null,
          experian_weight: creditScoreBreakdown?.weightPercent ?? null,
          engine_total_contribution: Number.isFinite(loanEngineScore) ? loanEngineScore : null,
          annual_income: Number.isFinite(Number(normalizedOverrides?.annual_income))
            ? Number(normalizedOverrides.annual_income)
            : null,
          annual_expenses: Number.isFinite(Number(normalizedOverrides?.annual_expenses))
            ? Number(normalizedOverrides.annual_expenses)
            : null,
          years_current_employer: Number.isFinite(Number(normalizedOverrides?.years_in_current_job))
            ? Number(normalizedOverrides.years_in_current_job)
            : null,
          contract_type: normalizedOverrides?.contract_type || null,
          is_new_borrower: Boolean(normalizedOverrides?.algolend_is_new_borrower),
          employment_sector: normalizedOverrides?.employment_sector_type || null,
          employer_name: normalizedOverrides?.employment_employer_name || null,
          exposure_revolving_utilization: creditUtilizationBreakdown?.ratioPercent ?? null,
          exposure_revolving_balance: Number.isFinite(accountMetrics.revolvingBalance)
            ? accountMetrics.revolvingBalance
            : null,
          exposure_revolving_limit: Number.isFinite(accountMetrics.revolvingLimits)
            ? accountMetrics.revolvingLimits
            : null,
          exposure_total_balance: Number.isFinite(accountMetrics.totalBalance)
            ? accountMetrics.totalBalance
            : null,
          exposure_total_limit: Number.isFinite(accountMetrics.totalLimits)
            ? accountMetrics.totalLimits
            : null,
          exposure_open_accounts: Number.isFinite(accountMetrics.openAccounts)
            ? accountMetrics.openAccounts
            : null,
          score_reasons: scoreReasons,
          engine_result: breakdown,
          created_at: new Date().toISOString()
        };

        const { error: insertError } = await dbClient
          .from('loan_engine_score')
          .insert(loanEngineInsert);

        if (insertError) {
          console.warn('Loan engine score insert failed:', insertError.message || insertError);
        }
      } catch (dbError) {
        console.warn('Loan engine score insert exception:', dbError?.message || dbError);
      }
    }

    return res.status(200).json({
      success,
      ok,
      applicationId,
      userId,
      creditScore: creditScoreValue,
      recommendation: result?.recommendation,
      riskFlags: result?.riskFlags,
      breakdown,
      loanEngineScore,
      loanEngineScoreMax,
      loanEngineScoreNormalized,
      creditExposure,
      scoreReasons,
      employmentHistory,
      cpaAccounts: result?.cpaAccounts || [],
      deviceFingerprint,
      raw: result
    });
  } catch (error) {
    console.error('Credit check API error:', error);
    return res.status(500).json({ error: error.message || 'Credit check failed' });
  }
}
