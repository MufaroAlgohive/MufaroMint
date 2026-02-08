const CREDIT_SCORE_MIN = 300;
const CREDIT_SCORE_MAX = 850;
const CREDIT_SCORE_WEIGHT = 25; // percent
const CREDIT_UTILIZATION_WEIGHT = 5; // percent
const ADVERSE_LISTINGS_WEIGHT = 10; // percent
const DEVICE_IP_WEIGHT = 2; // percent
const DTI_WEIGHT = 15; // percent
const EMPLOYMENT_TENURE_WEIGHT = 5; // percent
const CONTRACT_TYPE_WEIGHT = 5; // percent
const EMPLOYMENT_CATEGORY_WEIGHT = 5; // percent
const INCOME_STABILITY_WEIGHT = 10; // percent
const ALGOLEND_REPAYMENT_WEIGHT = 3; // percent
const AGL_RETRIEVAL_WEIGHT = 5; // percent

const TOTAL_LOAN_ENGINE_WEIGHT = CREDIT_SCORE_WEIGHT
  + CREDIT_UTILIZATION_WEIGHT
  + ADVERSE_LISTINGS_WEIGHT
  + DEVICE_IP_WEIGHT
  + DTI_WEIGHT
  + EMPLOYMENT_TENURE_WEIGHT
  + CONTRACT_TYPE_WEIGHT
  + EMPLOYMENT_CATEGORY_WEIGHT
  + INCOME_STABILITY_WEIGHT
  + ALGOLEND_REPAYMENT_WEIGHT
  + AGL_RETRIEVAL_WEIGHT;

function clampToRange(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function computeCreditScoreContribution(score = 0) {
  const clampedScore = Number.isFinite(score) ? score : 0;
  const range = CREDIT_SCORE_MAX - CREDIT_SCORE_MIN;
  const delta = clampedScore - CREDIT_SCORE_MIN;
  const normalizedRatio = range > 0 ? clampToRange(delta / range, 0, 1) : 0;
  const normalizedPercent = normalizedRatio * 100;
  const contributionPercent = normalizedPercent * (CREDIT_SCORE_WEIGHT / 100);

  return {
    score: clampedScore,
    min: CREDIT_SCORE_MIN,
    max: CREDIT_SCORE_MAX,
    delta,
    range,
    normalizedPercent,
    valuePercent: normalizedPercent,
    weightPercent: CREDIT_SCORE_WEIGHT,
    contributionPercent
  };
}

function computeAdverseListingsContribution(creditScoreData = {}) {
  const adverseAccounts = creditScoreData.accountSummary?.adverseAccounts || 0;
  const adverseStatsTotal = creditScoreData.adverseStats?.adverseTotal || 0;
  const totalAdverse = Math.max(adverseAccounts, adverseStatsTotal);

  let valuePercent;
  if (totalAdverse === 0) {
    valuePercent = 100;
  } else if (totalAdverse === 1) {
    valuePercent = 40;
  } else {
    valuePercent = 0;
  }

  const contributionPercent = valuePercent * (ADVERSE_LISTINGS_WEIGHT / 100);

  return {
    totalAdverse,
    valuePercent,
    weightPercent: ADVERSE_LISTINGS_WEIGHT,
    contributionPercent
  };
}

function computeCreditUtilizationContribution(accountMetrics = {}) {
  const rawRatio = accountMetrics.revolvingUtilizationRatio ?? accountMetrics.revolvingUtilizationPercent;
  const ratio = Number.isFinite(rawRatio)
    ? rawRatio
    : Number.isFinite(Number(rawRatio))
      ? Number(rawRatio)
      : null;
  const percentRatio = ratio === null
    ? null
    : ratio > 1 && ratio <= 100
      ? ratio
      : ratio * 100;

  let valuePercent;
  if (!Number.isFinite(percentRatio)) {
    valuePercent = 0;
  } else if (percentRatio <= 30) {
    valuePercent = 100;
  } else if (percentRatio <= 50) {
    valuePercent = 70;
  } else if (percentRatio <= 75) {
    valuePercent = 40;
  } else if (percentRatio <= 90) {
    valuePercent = 20;
  } else {
    valuePercent = 5;
  }

  const contributionPercent = valuePercent * (CREDIT_UTILIZATION_WEIGHT / 100);

  return {
    ratioPercent: Number.isFinite(percentRatio) ? percentRatio : null,
    totalRevolvingLimit: accountMetrics.revolvingLimits || 0,
    totalRevolvingBalance: accountMetrics.revolvingBalance || 0,
    totalLimits: accountMetrics.totalLimits || 0,
    totalBalance: accountMetrics.totalBalance || 0,
    weightPercent: CREDIT_UTILIZATION_WEIGHT,
    valuePercent,
    contributionPercent
  };
}

function normalizeIp(ipAddress) {
  if (!ipAddress) {
    return null;
  }

  const value = typeof ipAddress === 'string' ? ipAddress : String(ipAddress);

  if (value.startsWith('::ffff:')) {
    return value.slice(7);
  }

  return value;
}

function extractClientDeviceMetadata(req) {
  const forwardedHeader = req.headers['x-forwarded-for'];
  const forwardedForChain = typeof forwardedHeader === 'string'
    ? forwardedHeader.split(',').map(entry => entry.trim()).filter(Boolean)
    : [];

  const rawIp = forwardedForChain[0] || req.socket?.remoteAddress || req.ip || null;
  const normalizedIp = normalizeIp(rawIp);

  return {
    ip: normalizedIp,
    rawIp,
    forwardedForChain,
    userAgent: req.headers['user-agent'] || null,
    acceptLanguage: req.headers['accept-language'] || null,
    captureTimestamp: new Date().toISOString()
  };
}

function computeDeviceFingerprintContribution(deviceFingerprint = {}) {
  const signals = ['ip', 'userAgent'];
  const signalsCaptured = signals.reduce((count, signalKey) => (
    deviceFingerprint[signalKey] ? count + 1 : count
  ), 0);
  const requiredSignals = signals.length || 1;
  const completenessRatio = signalsCaptured / requiredSignals;
  const valuePercent = completenessRatio * 100;
  const contributionPercent = valuePercent * (DEVICE_IP_WEIGHT / 100);

  return {
    ...deviceFingerprint,
    signalsCaptured,
    requiredSignals,
    valuePercent,
    weightPercent: DEVICE_IP_WEIGHT,
    contributionPercent
  };
}

function computeDTIContribution(totalMonthlyDebt = 0, grossMonthlyIncome = 0) {
  if (!grossMonthlyIncome || grossMonthlyIncome <= 0) {
    return {
      dtiRatio: null,
      dtiPercent: null,
      totalMonthlyDebt,
      grossMonthlyIncome,
      valuePercent: 0,
      weightPercent: DTI_WEIGHT,
      contributionPercent: 0
    };
  }

  const dtiRatio = totalMonthlyDebt / grossMonthlyIncome;
  const dtiPercent = dtiRatio * 100;

  let valuePercent;
  if (dtiPercent <= 30) {
    valuePercent = 100;
  } else if (dtiPercent <= 40) {
    valuePercent = 90;
  } else if (dtiPercent <= 50) {
    valuePercent = 75;
  } else if (dtiPercent <= 60) {
    valuePercent = 60;
  } else if (dtiPercent <= 75) {
    valuePercent = 50;
  } else {
    valuePercent = 0;
  }

  const contributionPercent = valuePercent * (DTI_WEIGHT / 100);

  return {
    dtiRatio,
    dtiPercent,
    totalMonthlyDebt,
    grossMonthlyIncome,
    valuePercent,
    weightPercent: DTI_WEIGHT,
    contributionPercent
  };
}

function computeEmploymentTenureContribution(monthsInCurrentJob = null) {
  const numericMonths = Number(monthsInCurrentJob);
  const monthsValue = Number.isFinite(numericMonths) ? Math.max(0, numericMonths) : null;

  let valuePercent;
  if (!Number.isFinite(monthsValue) || monthsValue === null || monthsValue <= 0) {
    valuePercent = 0;
  } else if (monthsValue >= 36) {
    valuePercent = 100;
  } else if (monthsValue >= 24) {
    valuePercent = 80;
  } else if (monthsValue >= 12) {
    valuePercent = 75;
  } else if (monthsValue >= 6) {
    valuePercent = 60;
  } else if (monthsValue >= 3) {
    valuePercent = 55;
  } else if (monthsValue >= 2) {
    valuePercent = 25;
  } else {
    valuePercent = 0;
  }

  const contributionPercent = valuePercent * (EMPLOYMENT_TENURE_WEIGHT / 100);

  return {
    monthsInCurrentJob: monthsValue,
    yearsInCurrentJob: Number.isFinite(monthsValue) && monthsValue !== null ? monthsValue / 12 : null,
    valuePercent,
    weightPercent: EMPLOYMENT_TENURE_WEIGHT,
    contributionPercent
  };
}

function computeContractTypeContribution(contractType = null) {
  const raw = typeof contractType === 'string' ? contractType.trim() : null;
  const normalizedRaw = raw
    ? raw.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '')
    : null;

  const aliasMap = {
    PERMANENT: 'PERMANENT',
    PERMANENT_EMPLOYEE: 'PERMANENT',
    FULL_TIME: 'PERMANENT',
    PROBATION: 'PERMANENT_ON_PROBATION',
    PERMANENT_ON_PROBATION: 'PERMANENT_ON_PROBATION',
    FIXED_TERM: 'FIXED_TERM_LT_12',
    FIXED_TERM_12_PLUS: 'FIXED_TERM_12_PLUS',
    FIXED_TERM_12_MONTHS: 'FIXED_TERM_12_PLUS',
    FIXED_TERM_12_MONTHS_PLUS: 'FIXED_TERM_12_PLUS',
    FIXED_TERM_LT_12: 'FIXED_TERM_LT_12',
    FIXED_TERM_LT_12_MONTHS: 'FIXED_TERM_LT_12',
    FIXED_TERM_UNDER_12: 'FIXED_TERM_LT_12',
    FIXED_TERM_UNDER_12_MONTHS: 'FIXED_TERM_LT_12',
    SELF_EMPLOYED: 'SELF_EMPLOYED_12_PLUS',
    SELF_EMPLOYED_12_PLUS: 'SELF_EMPLOYED_12_PLUS',
    SELF_EMPLOYED_12_MONTHS_PLUS: 'SELF_EMPLOYED_12_PLUS',
    CONTRACTOR: 'FIXED_TERM_LT_12',
    PART_TIME: 'PART_TIME',
    PARTTIME: 'PART_TIME',
    PART_TIME_EMPLOYEE: 'PART_TIME',
    UNEMPLOYED: 'UNEMPLOYED_OR_UNKNOWN',
    UNKNOWN: 'UNEMPLOYED_OR_UNKNOWN',
    UNEMPLOYED_OR_UNKNOWN: 'UNEMPLOYED_OR_UNKNOWN'
  };

  const normalized = normalizedRaw && aliasMap[normalizedRaw]
    ? aliasMap[normalizedRaw]
    : normalizedRaw;

  const valueMap = {
    PERMANENT: 100,
    PERMANENT_ON_PROBATION: 80,
    FIXED_TERM_12_PLUS: 70,
    FIXED_TERM_LT_12: 50,
    SELF_EMPLOYED_12_PLUS: 60,
    PART_TIME: 40,
    UNEMPLOYED_OR_UNKNOWN: 0
  };

  const valuePercent = normalized && Object.prototype.hasOwnProperty.call(valueMap, normalized)
    ? valueMap[normalized]
    : 0;

  const contributionPercent = valuePercent * (CONTRACT_TYPE_WEIGHT / 100);

  const fixedTermMonthsRemaining = normalized === 'FIXED_TERM_12_PLUS'
    ? '12+'
    : normalized === 'FIXED_TERM_LT_12'
      ? '<12'
      : null;

  return {
    contractType: normalized,
    fixedTermMonthsRemaining,
    valuePercent,
    weightPercent: CONTRACT_TYPE_WEIGHT,
    contributionPercent
  };
}

function computeEmploymentCategoryContribution(overrides = {}) {
  const rawSector = typeof overrides.employment_sector_type === 'string'
    ? overrides.employment_sector_type.toUpperCase()
    : null;
  const employerName = overrides.employment_employer_name || null;
  const rawMatch = typeof overrides.employment_employer_match === 'string'
    ? overrides.employment_employer_match.toUpperCase()
    : null;
  const listedMatchName = overrides.employment_listed_match_name || null;

  let valuePercent = 0;
  let matchLabel = 'UNKNOWN';

  if (rawSector === 'GOVERNMENT' && employerName) {
    valuePercent = 100;
    matchLabel = 'GOVERNMENT';
  } else if ((rawSector === 'LISTED' || (rawSector === 'PRIVATE' && rawMatch === 'LISTED')) && employerName) {
    valuePercent = 80;
    matchLabel = 'LISTED';
  } else if (rawSector === 'PRIVATE' && rawMatch === 'HIGH_RISK_MANUAL') {
    valuePercent = 50;
    matchLabel = 'HIGH_RISK';
  } else if (rawMatch === 'BLACKLISTED' || rawMatch === 'NOT_FOUND') {
    valuePercent = 0;
    matchLabel = 'NOT_FOUND';
  } else if (rawSector === 'PRIVATE' && employerName) {
    valuePercent = 50;
    matchLabel = 'HIGH_RISK';
  }

  const contributionPercent = valuePercent * (EMPLOYMENT_CATEGORY_WEIGHT / 100);

  return {
    sector: rawSector,
    employerName,
    matchLabel,
    listedMatchName,
    valuePercent,
    weightPercent: EMPLOYMENT_CATEGORY_WEIGHT,
    contributionPercent
  };
}

function computeIncomeStabilityContribution(overrides = {}) {
  const rawSector = typeof overrides.employment_sector_type === 'string'
    ? overrides.employment_sector_type.toUpperCase()
    : null;
  const employerName = overrides.employment_employer_name || null;
  const monthsCaptured = Number(overrides.truid_months_captured);
  const mainSalary = Number(overrides.truid_main_salary);

  let valuePercent = 0;
  let stabilityReason = 'Income stability not evaluated';

  if (Number.isFinite(monthsCaptured) && monthsCaptured >= 4 && Number.isFinite(mainSalary) && mainSalary > 0) {
    valuePercent = 100;
    stabilityReason = 'TruID snapshot: 4+ months with main salary detected';
  } else if (rawSector === 'GOVERNMENT' && employerName) {
    valuePercent = 100;
    stabilityReason = 'Government employee · automatic 100%';
  } else {
    valuePercent = 0;
    stabilityReason = 'Pending bank statement or payroll analysis';
  }

  const contributionPercent = valuePercent * (INCOME_STABILITY_WEIGHT / 100);

  return {
    sector: rawSector,
    employerName,
    stabilityReason,
    valuePercent,
    weightPercent: INCOME_STABILITY_WEIGHT,
    contributionPercent
  };
}

function computeAlgolendRepaymentContribution(isNewBorrower = null) {
  const normalized = typeof isNewBorrower === 'string'
    ? isNewBorrower.toLowerCase()
    : isNewBorrower;
  const interpreted = normalized === true || normalized === 'true' || normalized === 'yes';
  const valuePercent = interpreted ? 100 : 50;
  const contributionPercent = valuePercent * (ALGOLEND_REPAYMENT_WEIGHT / 100);

  return {
    isNewBorrower: interpreted,
    valuePercent,
    weightPercent: ALGOLEND_REPAYMENT_WEIGHT,
    contributionPercent
  };
}

function computeAglRetrievalContribution() {
  const valuePercent = 100;
  const contributionPercent = valuePercent * (AGL_RETRIEVAL_WEIGHT / 100);

  return {
    valuePercent,
    weightPercent: AGL_RETRIEVAL_WEIGHT,
    contributionPercent,
    automatic: true
  };
}

export {
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
};
