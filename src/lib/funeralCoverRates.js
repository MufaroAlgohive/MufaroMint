/**
 * Mint Funeral Cover — Rating & Benefit Tables
 * ─────────────────────────────────────────────
 * Source: MINT Funeral Cover product document (FSP No. 55118)
 *
 * All monetary values are in South African Rand (ZAR).
 * All premiums are monthly (per calendar month).
 * All cover amounts are lump-sum death benefits.
 *
 * Usage:
 *   import { lookupPremium, getChildCover, PLAN_TYPES, ... } from "@/lib/funeralCoverRates";
 */

// ─── Policy Rules ─────────────────────────────────────────────────────────────

export const FSP_NUMBER          = "55118";
export const WAITING_PERIOD_MONTHS = 6;
export const MAX_CHILDREN        = 6;
export const MAX_CHILD_AGE_YEARS = 21;

// ─── Age Bands ────────────────────────────────────────────────────────────────

/**
 * Individual / family plan age bands for the main member.
 * Each string is both the key and the human-readable label.
 */
export const AGE_BANDS = ["18-65", "66-70", "71-75", "76-80", "81-85", "86-90"];

/**
 * Society / stokvel age band for the main member.
 * Based on the oldest member's age.
 */
export const SOCIETY_BANDS = ["<65", "<70", "<75"];

/**
 * Derive the individual/family age band from a numeric age.
 * Returns null if the age is outside the covered range (18–90).
 * @param {number} age
 * @returns {string|null}
 */
export function getAgeBand(age) {
  if (age >= 18 && age <= 65) return "18-65";
  if (age >= 66 && age <= 70) return "66-70";
  if (age >= 71 && age <= 75) return "71-75";
  if (age >= 76 && age <= 80) return "76-80";
  if (age >= 81 && age <= 85) return "81-85";
  if (age >= 86 && age <= 90) return "86-90";
  return null;
}

/**
 * Derive the society/stokvel band from the main member's age.
 * Returns null if the member is over 75 (not eligible).
 * @param {number} age
 * @returns {string|null}
 */
export function getSocietyBand(age) {
  if (age <= 65) return "<65";
  if (age <= 70) return "<70";
  if (age <= 75) return "<75";
  return null;
}

// ─── Plan Types ───────────────────────────────────────────────────────────────

export const PLAN_TYPE_KEYS = ["individual", "single-parent", "family", "stokvel"];

export const PLAN_TYPE_LABELS = {
  individual:     "Individual",
  "single-parent":"Single Parent",
  family:         "Family",
  stokvel:        "Stokvel / Society",
};

export const SOCIETY_SIZES = ["1+5", "1+9", "1+13"];

// ─── Individual (Single Member) Plan ─────────────────────────────────────────
/**
 * Monthly premiums for an individual (single member) plan.
 * { ageBand: { coverAmount: monthlyPremium } }
 */
export const SINGLE = {
  "18-65": {
    10000: 65.57,  12500: 75.60,  13500: 79.60,
    15000: 85.50,  16500: 91.54,  18000: 132.36,
    20000: 133.02, 25000: 192.36, 30000: 251.66,
  },
  "66-70": {
    10000: 185.36, 12500: 214.04, 13500: 225.52,
    15000: 242.75, 16500: 259.97, 18000: 272.09,
    20000: 288.22, 25000: 328.58, 30000: 368.91,
  },
  "71-75": {
    10000: 274.43, 12500: 320.83, 13500: 338.84,
    15000: 365.90, 16500: 393.00, 18000: 454.08,
  },
  "76-80": {
    3000: 111.31, 4000: 148.43, 5000: 185.53,
    6000: 249.94, 7000: 314.39, 8000: 378.81,
    9000: 443.22, 10000: 443.72,
  },
  "81-85": {
    3000: 139.16, 4000: 185.59, 5000: 231.96,
    6000: 296.34, 7000: 360.82, 8000: 425.24,
    9000: 489.62, 10000: 554.10,
  },
  "86-90": {
    3000: 157.74, 4000: 210.28, 5000: 262.85,
    6000: 335.91, 7000: 408.90, 8000: 481.87,
    9000: 554.86, 10000: 627.92,
  },
};

// ─── Single Parent Plan ───────────────────────────────────────────────────────
/**
 * Monthly premiums for a single parent plan (main member + children under 21, max 6).
 * { ageBand: { coverAmount: monthlyPremium } }
 */
export const SINGLE_PARENT = {
  "18-65": {
    10000: 75.60,  12500: 84.68,  13500: 92.10,
    15000: 103.36, 16500: 116.52, 18000: 153.45,
    20000: 187.74, 25000: 273.08, 30000: 358.45,
  },
  "66-70": {
    10000: 236.08, 12500: 284.72, 13500: 304.16,
    15000: 333.33, 16500: 326.70, 18000: 362.97,
    20000: 404.78, 25000: 465.10, 30000: 525.46,
  },
  "71-75": {
    10000: 290.90, 12500: 334.36, 13500: 358.81,
    15000: 395.54, 16500: 432.30, 18000: 452.56,
  },
  "76-80": {
    3000: 134.51,  4000: 179.39,  5000: 224.20,
    6000: 286.04,  7000: 347.92,  8000: 409.76,
    9000: 471.57,  10000: 463.88, 12500: 686.17,
    13500: 744.18,
  },
  "81-85": {
    3000: 166.98, 4000: 222.65, 5000: 278.29,
    6000: 333.73, 7000: 389.10, 8000: 444.54,
    9000: 499.95,
  },
  "86-90": {
    3000: 197.18, 4000: 262.91, 5000: 328.58,
    6000: 393.99, 7000: 459.39,
  },
};

// ─── Family Plan ──────────────────────────────────────────────────────────────
/**
 * Monthly premiums for a family plan (main member + spouse + children under 21, max 6).
 * { ageBand: { coverAmount: monthlyPremium } }
 */
export const FAMILY = {
  "18-65": {
    10000: 122.56, 12500: 147.64, 13500: 157.77,
    15000: 172.89, 16500: 187.97, 18000: 231.96,
    20000: 270.20, 25000: 345.02, 30000: 395.27,
  },
  "66-70": {
    10000: 239.65, 12500: 286.04, 13500: 317.79,
    15000: 332.41, 16500: 360.26, 18000: 392.99,
    20000: 436.62, 25000: 545.79, 30000: 654.95,
  },
  "71-75": {
    10000: 311.26, 12500: 342.11, 13500: 369.07,
    15000: 409.60, 16500: 450.19, 18000: 468.30,
  },
  "76-80": {
    3000: 150.74,  4000: 201.04,  5000: 251.26,
    6000: 309.24,  7000: 367.22,  8000: 425.24,
    9000: 483.22,  10000: 524.37, 12500: 689.47,
    13500: 749.06,
  },
  "81-85": {
    3000: 213.38, 4000: 284.49, 5000: 355.61,
    6000: 435.86, 7000: 517.61, 8000: 481.37,
    9000: 680.02,
  },
};

// ─── Society / Stokvel Group Plans ────────────────────────────────────────────
/**
 * Monthly premiums for society / stokvel group plans.
 * { societySize: { societyBand: { coverAmount: monthlyPremium } } }
 *
 * societySize: "1+5" | "1+9" | "1+13"
 * societyBand: "<65" | "<70" | "<75"  (based on main member's age)
 */
export const SOCIETY = {
  "1+5": {
    "<65": { 3000: 66.43,  5000: 110.68, 8000: 177.11, 10000: 221.43, 12500: 276.74, 15000: 330.63 },
    "<70": { 3000: 83.46,  5000: 139.06, 8000: 222.39, 10000: 278.16, 12500: 347.56, 15000: 417.15 },
    "<75": { 3000: 99.63,  5000: 166.06, 8000: 265.72, 10000: 332.18, 12500: 415.14, 15000: 519.16 },
  },
  "1+9": {
    "<65": { 3000: 104.45, 5000: 189.09, 8000: 278.55, 10000: 349.64, 12500: 437.18, 15000: 524.63 },
    "<70": { 3000: 131.14, 5000: 218.59, 8000: 349.73, 10000: 437.09, 12500: 543.77, 15000: 655.68 },
    "<75": { 3000: 182.23, 5000: 265.91, 8000: 399.70, 10000: 524.54, 12500: 652.51, 15000: 774.61 },
  },
  "1+13": {
    "<65": { 3000: 143.09, 5000: 238.43, 8000: 381.58, 10000: 476.92, 12500: 596.21, 15000: 715.28 },
    "<70": { 3000: 178.53, 5000: 297.56, 8000: 476.12, 10000: 596.11, 12500: 743.95, 15000: 894.20 },
    "<75": { 3000: 214.63, 5000: 357.72, 8000: 536.51, 10000: 715.37, 12500: 894.37, 15000: 1073.09 },
  },
};

// ─── Accidental Death Benefit ─────────────────────────────────────────────────
/**
 * Additional monthly premiums for the Accidental Death benefit.
 * Pays DOUBLE the selected cover amount on accidental death.
 * Only available for age bands 18-65, 66-70, and 71-75.
 * { ageBand: { coverAmount: additionalMonthlyPremium } }
 */
export const ACCIDENTAL = {
  "18-65": {
    10000: 15.44, 12500: 18.38, 13500: 19.54,
    15000: 21.25, 16500: 27.62, 18000: 29.80,
    20000: 33.99, 25000: 37.65, 30000: 40.82,
  },
  "66-70": {
    10000: 30.89, 12500: 37.06, 13500: 39.53,
    15000: 43.20, 16500: 53.16, 18000: 60.52,
    20000: 67.68, 25000: 72.50, 30000: 82.96,
  },
  "71-75": {
    10000: 36.73, 12500: 45.64, 13500: 49.24,
    15000: 54.62, 16500: 64.45, 18000: 75.64,
    20000: 84.08,
  },
};

// ─── In-Kind Additional Benefits ──────────────────────────────────────────────
/**
 * Additional monthly premiums for in-kind benefits (tombstone, grocery, meat).
 * Only available for the main member and spouse on age bands 18-65, 66-70, 71-75.
 *
 * Structure: { benefitType: { coverAmount: { ageBand: { single, family } } } }
 *
 * single = individual or single-parent plan
 * family = family plan
 */
export const ADDON_RATES = {
  tombstone: {
    5000: {
      "18-65": { single: 45.64, family: 72.27  },
      "66-70": { single: 127.94, family: 146.88 },
      "71-75": { single: 139.16, family: 185.53 },
    },
  },
  grocery: {
    5000: {
      "18-65": { single: 57.59, family: 102.47 },
      "66-70": { single: 162.39, family: 202.52 },
      "71-75": { single: 220.31, family: 239.65 },
    },
    8000: {
      "18-65": { single: 45.64, family: 72.27  },
      "66-70": { single: 127.94, family: 146.88 },
      "71-75": { single: 139.16, family: 185.53 },
    },
  },
  meat: {
    5000: {
      "18-65": { single: 45.64, family: 72.27  },
      "66-70": { single: 127.94, family: 146.88 },
      "71-75": { single: 139.16, family: 185.53 },
    },
    8000: {
      "18-65": { single: 57.59, family: 102.47 },
      "66-70": { single: 162.39, family: 202.52 },
      "71-75": { single: 220.31, family: 239.65 },
    },
  },
};

// ─── Child Cover Benefit Matrix ───────────────────────────────────────────────
/**
 * Lump-sum child cover amounts automatically included in family and single-parent plans.
 * Children must be under 21 years old at inception (max 6 children per policy).
 *
 * Structure: { planCoverAmount: { childAgeBracket: childCoverAmount } }
 *
 * childAgeBracket keys:
 *   "0-11m"  = 0 to 11 months old
 *   "1-5"    = 1 to 5 years old
 *   "6-13"   = 6 to 13 years old
 *   "14-21"  = 14 to 21 years old
 */
export const CHILD_COVER = {
  10000: { "0-11m": 1500, "1-5": 2500,  "6-13": 5000,  "14-21": 10000 },
  12500: { "0-11m": 2000, "1-5": 3500,  "6-13": 6250,  "14-21": 12500 },
  13500: { "0-11m": 2000, "1-5": 3500,  "6-13": 6750,  "14-21": 13500 },
  15000: { "0-11m": 2000, "1-5": 3500,  "6-13": 7000,  "14-21": 10000 },
  16500: { "0-11m": 2000, "1-5": 3500,  "6-13": 7500,  "14-21": 16500 },
  18000: { "0-11m": 2000, "1-5": 4000,  "6-13": 9000,  "14-21": 18000 },
  20000: { "0-11m": 2500, "1-5": 5000,  "6-13": 10000, "14-21": 20000 },
  25000: { "0-11m": 2500, "1-5": 4000,  "6-13": 8500,  "14-21": 25000 },
  30000: { "0-11m": 3000, "1-5": 7500,  "6-13": 15000, "14-21": 30000 },
};

// ─── Lookup Helpers ───────────────────────────────────────────────────────────

/**
 * Get the correct premium table for a given plan type.
 * @param {"individual"|"single-parent"|"family"} planType
 */
export function getPremiumTable(planType) {
  if (planType === "single-parent") return SINGLE_PARENT;
  if (planType === "family") return FAMILY;
  return SINGLE;
}

/**
 * Look up the monthly premium for an individual/family plan.
 * Returns 0 if the combination is not in the tables.
 * @param {"individual"|"single-parent"|"family"} planType
 * @param {string} ageBand  e.g. "18-65"
 * @param {number} coverAmount  e.g. 15000
 * @returns {number}
 */
export function lookupPremium(planType, ageBand, coverAmount) {
  const table = getPremiumTable(planType);
  return table[ageBand]?.[coverAmount] ?? 0;
}

/**
 * Look up the monthly premium for a society/stokvel plan.
 * Returns 0 if the combination is not available.
 * @param {"1+5"|"1+9"|"1+13"} societySize
 * @param {"<65"|"<70"|"<75"} societyBand
 * @param {number} coverAmount
 * @returns {number}
 */
export function lookupSocietyPremium(societySize, societyBand, coverAmount) {
  return SOCIETY[societySize]?.[societyBand]?.[coverAmount] ?? 0;
}

/**
 * Look up the additional monthly premium for the accidental death benefit.
 * Returns 0 if not available for this age band / cover amount combination.
 * @param {string} ageBand
 * @param {number} coverAmount
 * @returns {number}
 */
export function lookupAccidentalPremium(ageBand, coverAmount) {
  return ACCIDENTAL[ageBand]?.[coverAmount] ?? 0;
}

/**
 * Look up the additional monthly premium for an in-kind benefit (tombstone/grocery/meat).
 * @param {"tombstone"|"grocery"|"meat"} benefitType
 * @param {5000|8000} benefitAmount
 * @param {string} ageBand
 * @param {boolean} isFamily  true = family rate, false = single rate
 * @returns {number}
 */
export function lookupAddonPremium(benefitType, benefitAmount, ageBand, isFamily) {
  const rate = ADDON_RATES[benefitType]?.[benefitAmount]?.[ageBand];
  if (!rate) return 0;
  return isFamily ? rate.family : rate.single;
}

/**
 * Determine the child age bracket key from age in years.
 * Pass fractional years for infants (e.g. 0.5 for 6 months).
 * Returns null if child is over 21 and not eligible.
 * @param {number} ageYears
 * @returns {"0-11m"|"1-5"|"6-13"|"14-21"|null}
 */
export function getChildAgeBracket(ageYears) {
  if (ageYears < 0)   return null;
  if (ageYears < 1)   return "0-11m";
  if (ageYears <= 5)  return "1-5";
  if (ageYears <= 13) return "6-13";
  if (ageYears <= 21) return "14-21";
  return null;
}

/**
 * Look up the child cover benefit amount for a given plan size and child age.
 * Returns 0 if the child is not eligible.
 * @param {number} planCoverAmount  e.g. 15000
 * @param {number} childAgeYears    e.g. 8
 * @returns {number}
 */
export function getChildCoverAmount(planCoverAmount, childAgeYears) {
  const bracket = getChildAgeBracket(childAgeYears);
  if (!bracket) return 0;
  return CHILD_COVER[planCoverAmount]?.[bracket] ?? 0;
}

/**
 * Get all available cover options (sorted ascending) for a plan type and age band.
 * @param {"individual"|"single-parent"|"family"} planType
 * @param {string} ageBand
 * @returns {number[]}
 */
export function getCoverOptions(planType, ageBand) {
  if (!ageBand) return [];
  const table = getPremiumTable(planType);
  return Object.keys(table[ageBand] || {}).map(Number).sort((a, b) => a - b);
}

/**
 * Get all available society cover options (sorted ascending).
 * @param {"1+5"|"1+9"|"1+13"} societySize
 * @param {"<65"|"<70"|"<75"} societyBand
 * @returns {number[]}
 */
export function getSocietyCoverOptions(societySize, societyBand) {
  if (!societyBand) return [];
  return Object.keys(SOCIETY[societySize]?.[societyBand] || {}).map(Number).sort((a, b) => a - b);
}
