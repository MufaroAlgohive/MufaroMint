/**
 * Funeral Cover — Database Tables & Seed Data
 * ─────────────────────────────────────────────
 * Creates five tables (idempotent) and seeds them with the full
 * rating tables from MINT Funeral Cover product doc (FSP 55118).
 *
 * Tables:
 *   funeral_plan_rates     — individual / single-parent / family premiums
 *   funeral_society_rates  — stokvel / society group premiums
 *   funeral_accidental_rates — accidental death benefit add-on premiums
 *   funeral_addon_rates    — in-kind benefit add-ons (tombstone / grocery / meat)
 *   funeral_child_cover    — child cover benefit lump-sum matrix
 */

"use strict";

const DDL = `
  CREATE TABLE IF NOT EXISTS funeral_plan_rates (
    id            SERIAL PRIMARY KEY,
    plan_type     TEXT             NOT NULL,
    age_band      TEXT             NOT NULL,
    cover_amount  INTEGER          NOT NULL,
    monthly_premium NUMERIC(10,2) NOT NULL,
    UNIQUE (plan_type, age_band, cover_amount)
  );

  CREATE TABLE IF NOT EXISTS funeral_society_rates (
    id              SERIAL PRIMARY KEY,
    society_size    TEXT             NOT NULL,
    age_band        TEXT             NOT NULL,
    cover_amount    INTEGER          NOT NULL,
    monthly_premium NUMERIC(10,2)   NOT NULL,
    UNIQUE (society_size, age_band, cover_amount)
  );

  CREATE TABLE IF NOT EXISTS funeral_accidental_rates (
    id              SERIAL PRIMARY KEY,
    age_band        TEXT             NOT NULL,
    cover_amount    INTEGER          NOT NULL,
    monthly_premium NUMERIC(10,2)   NOT NULL,
    UNIQUE (age_band, cover_amount)
  );

  CREATE TABLE IF NOT EXISTS funeral_addon_rates (
    id              SERIAL PRIMARY KEY,
    benefit_type    TEXT             NOT NULL,
    benefit_amount  INTEGER          NOT NULL,
    age_band        TEXT             NOT NULL,
    single_premium  NUMERIC(10,2)   NOT NULL,
    family_premium  NUMERIC(10,2)   NOT NULL,
    UNIQUE (benefit_type, benefit_amount, age_band)
  );

  CREATE TABLE IF NOT EXISTS funeral_child_cover (
    id                  SERIAL PRIMARY KEY,
    plan_cover_amount   INTEGER NOT NULL,
    child_age_bracket   TEXT    NOT NULL,
    child_cover_amount  INTEGER NOT NULL,
    UNIQUE (plan_cover_amount, child_age_bracket)
  );
`;

// ─── Seed data (mirrors funeralCoverRates.js exactly) ────────────────────────

const PLAN_RATES = [
  // individual
  { plan_type: "individual", age_band: "18-65", cover_amount: 10000, monthly_premium: 65.57 },
  { plan_type: "individual", age_band: "18-65", cover_amount: 12500, monthly_premium: 75.60 },
  { plan_type: "individual", age_band: "18-65", cover_amount: 13500, monthly_premium: 79.60 },
  { plan_type: "individual", age_band: "18-65", cover_amount: 15000, monthly_premium: 85.50 },
  { plan_type: "individual", age_band: "18-65", cover_amount: 16500, monthly_premium: 91.54 },
  { plan_type: "individual", age_band: "18-65", cover_amount: 18000, monthly_premium: 132.36 },
  { plan_type: "individual", age_band: "18-65", cover_amount: 20000, monthly_premium: 133.02 },
  { plan_type: "individual", age_band: "18-65", cover_amount: 25000, monthly_premium: 192.36 },
  { plan_type: "individual", age_band: "18-65", cover_amount: 30000, monthly_premium: 251.66 },

  { plan_type: "individual", age_band: "66-70", cover_amount: 10000, monthly_premium: 185.36 },
  { plan_type: "individual", age_band: "66-70", cover_amount: 12500, monthly_premium: 214.04 },
  { plan_type: "individual", age_band: "66-70", cover_amount: 13500, monthly_premium: 225.52 },
  { plan_type: "individual", age_band: "66-70", cover_amount: 15000, monthly_premium: 242.75 },
  { plan_type: "individual", age_band: "66-70", cover_amount: 16500, monthly_premium: 259.97 },
  { plan_type: "individual", age_band: "66-70", cover_amount: 18000, monthly_premium: 272.09 },
  { plan_type: "individual", age_band: "66-70", cover_amount: 20000, monthly_premium: 288.22 },
  { plan_type: "individual", age_band: "66-70", cover_amount: 25000, monthly_premium: 328.58 },
  { plan_type: "individual", age_band: "66-70", cover_amount: 30000, monthly_premium: 368.91 },

  { plan_type: "individual", age_band: "71-75", cover_amount: 10000, monthly_premium: 274.43 },
  { plan_type: "individual", age_band: "71-75", cover_amount: 12500, monthly_premium: 320.83 },
  { plan_type: "individual", age_band: "71-75", cover_amount: 13500, monthly_premium: 338.84 },
  { plan_type: "individual", age_band: "71-75", cover_amount: 15000, monthly_premium: 365.90 },
  { plan_type: "individual", age_band: "71-75", cover_amount: 16500, monthly_premium: 393.00 },
  { plan_type: "individual", age_band: "71-75", cover_amount: 18000, monthly_premium: 454.08 },

  { plan_type: "individual", age_band: "76-80", cover_amount:  3000, monthly_premium: 111.31 },
  { plan_type: "individual", age_band: "76-80", cover_amount:  4000, monthly_premium: 148.43 },
  { plan_type: "individual", age_band: "76-80", cover_amount:  5000, monthly_premium: 185.53 },
  { plan_type: "individual", age_band: "76-80", cover_amount:  6000, monthly_premium: 249.94 },
  { plan_type: "individual", age_band: "76-80", cover_amount:  7000, monthly_premium: 314.39 },
  { plan_type: "individual", age_band: "76-80", cover_amount:  8000, monthly_premium: 378.81 },
  { plan_type: "individual", age_band: "76-80", cover_amount:  9000, monthly_premium: 443.22 },
  { plan_type: "individual", age_band: "76-80", cover_amount: 10000, monthly_premium: 443.72 },

  { plan_type: "individual", age_band: "81-85", cover_amount:  3000, monthly_premium: 139.16 },
  { plan_type: "individual", age_band: "81-85", cover_amount:  4000, monthly_premium: 185.59 },
  { plan_type: "individual", age_band: "81-85", cover_amount:  5000, monthly_premium: 231.96 },
  { plan_type: "individual", age_band: "81-85", cover_amount:  6000, monthly_premium: 296.34 },
  { plan_type: "individual", age_band: "81-85", cover_amount:  7000, monthly_premium: 360.82 },
  { plan_type: "individual", age_band: "81-85", cover_amount:  8000, monthly_premium: 425.24 },
  { plan_type: "individual", age_band: "81-85", cover_amount:  9000, monthly_premium: 489.62 },
  { plan_type: "individual", age_band: "81-85", cover_amount: 10000, monthly_premium: 554.10 },

  { plan_type: "individual", age_band: "86-90", cover_amount:  3000, monthly_premium: 157.74 },
  { plan_type: "individual", age_band: "86-90", cover_amount:  4000, monthly_premium: 210.28 },
  { plan_type: "individual", age_band: "86-90", cover_amount:  5000, monthly_premium: 262.85 },
  { plan_type: "individual", age_band: "86-90", cover_amount:  6000, monthly_premium: 335.91 },
  { plan_type: "individual", age_band: "86-90", cover_amount:  7000, monthly_premium: 408.90 },
  { plan_type: "individual", age_band: "86-90", cover_amount:  8000, monthly_premium: 481.87 },
  { plan_type: "individual", age_band: "86-90", cover_amount:  9000, monthly_premium: 554.86 },
  { plan_type: "individual", age_band: "86-90", cover_amount: 10000, monthly_premium: 627.92 },

  // single-parent
  { plan_type: "single-parent", age_band: "18-65", cover_amount: 10000, monthly_premium: 75.60 },
  { plan_type: "single-parent", age_band: "18-65", cover_amount: 12500, monthly_premium: 84.68 },
  { plan_type: "single-parent", age_band: "18-65", cover_amount: 13500, monthly_premium: 92.10 },
  { plan_type: "single-parent", age_band: "18-65", cover_amount: 15000, monthly_premium: 103.36 },
  { plan_type: "single-parent", age_band: "18-65", cover_amount: 16500, monthly_premium: 116.52 },
  { plan_type: "single-parent", age_band: "18-65", cover_amount: 18000, monthly_premium: 153.45 },
  { plan_type: "single-parent", age_band: "18-65", cover_amount: 20000, monthly_premium: 187.74 },
  { plan_type: "single-parent", age_band: "18-65", cover_amount: 25000, monthly_premium: 273.08 },
  { plan_type: "single-parent", age_band: "18-65", cover_amount: 30000, monthly_premium: 358.45 },

  { plan_type: "single-parent", age_band: "66-70", cover_amount: 10000, monthly_premium: 236.08 },
  { plan_type: "single-parent", age_band: "66-70", cover_amount: 12500, monthly_premium: 284.72 },
  { plan_type: "single-parent", age_band: "66-70", cover_amount: 13500, monthly_premium: 304.16 },
  { plan_type: "single-parent", age_band: "66-70", cover_amount: 15000, monthly_premium: 333.33 },
  { plan_type: "single-parent", age_band: "66-70", cover_amount: 16500, monthly_premium: 326.70 },
  { plan_type: "single-parent", age_band: "66-70", cover_amount: 18000, monthly_premium: 362.97 },
  { plan_type: "single-parent", age_band: "66-70", cover_amount: 20000, monthly_premium: 404.78 },
  { plan_type: "single-parent", age_band: "66-70", cover_amount: 25000, monthly_premium: 465.10 },
  { plan_type: "single-parent", age_band: "66-70", cover_amount: 30000, monthly_premium: 525.46 },

  { plan_type: "single-parent", age_band: "71-75", cover_amount: 10000, monthly_premium: 290.90 },
  { plan_type: "single-parent", age_band: "71-75", cover_amount: 12500, monthly_premium: 334.36 },
  { plan_type: "single-parent", age_band: "71-75", cover_amount: 13500, monthly_premium: 358.81 },
  { plan_type: "single-parent", age_band: "71-75", cover_amount: 15000, monthly_premium: 395.54 },
  { plan_type: "single-parent", age_band: "71-75", cover_amount: 16500, monthly_premium: 432.30 },
  { plan_type: "single-parent", age_band: "71-75", cover_amount: 18000, monthly_premium: 452.56 },

  { plan_type: "single-parent", age_band: "76-80", cover_amount:  3000, monthly_premium: 134.51 },
  { plan_type: "single-parent", age_band: "76-80", cover_amount:  4000, monthly_premium: 179.39 },
  { plan_type: "single-parent", age_band: "76-80", cover_amount:  5000, monthly_premium: 224.20 },
  { plan_type: "single-parent", age_band: "76-80", cover_amount:  6000, monthly_premium: 286.04 },
  { plan_type: "single-parent", age_band: "76-80", cover_amount:  7000, monthly_premium: 347.92 },
  { plan_type: "single-parent", age_band: "76-80", cover_amount:  8000, monthly_premium: 409.76 },
  { plan_type: "single-parent", age_band: "76-80", cover_amount:  9000, monthly_premium: 471.57 },
  { plan_type: "single-parent", age_band: "76-80", cover_amount: 10000, monthly_premium: 463.88 },
  { plan_type: "single-parent", age_band: "76-80", cover_amount: 12500, monthly_premium: 686.17 },
  { plan_type: "single-parent", age_band: "76-80", cover_amount: 13500, monthly_premium: 744.18 },

  { plan_type: "single-parent", age_band: "81-85", cover_amount:  3000, monthly_premium: 166.98 },
  { plan_type: "single-parent", age_band: "81-85", cover_amount:  4000, monthly_premium: 222.65 },
  { plan_type: "single-parent", age_band: "81-85", cover_amount:  5000, monthly_premium: 278.29 },
  { plan_type: "single-parent", age_band: "81-85", cover_amount:  6000, monthly_premium: 333.73 },
  { plan_type: "single-parent", age_band: "81-85", cover_amount:  7000, monthly_premium: 389.10 },
  { plan_type: "single-parent", age_band: "81-85", cover_amount:  8000, monthly_premium: 444.54 },
  { plan_type: "single-parent", age_band: "81-85", cover_amount:  9000, monthly_premium: 499.95 },

  { plan_type: "single-parent", age_band: "86-90", cover_amount:  3000, monthly_premium: 197.18 },
  { plan_type: "single-parent", age_band: "86-90", cover_amount:  4000, monthly_premium: 262.91 },
  { plan_type: "single-parent", age_band: "86-90", cover_amount:  5000, monthly_premium: 328.58 },
  { plan_type: "single-parent", age_band: "86-90", cover_amount:  6000, monthly_premium: 393.99 },
  { plan_type: "single-parent", age_band: "86-90", cover_amount:  7000, monthly_premium: 459.39 },

  // family
  { plan_type: "family", age_band: "18-65", cover_amount: 10000, monthly_premium: 122.56 },
  { plan_type: "family", age_band: "18-65", cover_amount: 12500, monthly_premium: 147.64 },
  { plan_type: "family", age_band: "18-65", cover_amount: 13500, monthly_premium: 157.77 },
  { plan_type: "family", age_band: "18-65", cover_amount: 15000, monthly_premium: 172.89 },
  { plan_type: "family", age_band: "18-65", cover_amount: 16500, monthly_premium: 187.97 },
  { plan_type: "family", age_band: "18-65", cover_amount: 18000, monthly_premium: 231.96 },
  { plan_type: "family", age_band: "18-65", cover_amount: 20000, monthly_premium: 270.20 },
  { plan_type: "family", age_band: "18-65", cover_amount: 25000, monthly_premium: 345.02 },
  { plan_type: "family", age_band: "18-65", cover_amount: 30000, monthly_premium: 395.27 },

  { plan_type: "family", age_band: "66-70", cover_amount: 10000, monthly_premium: 239.65 },
  { plan_type: "family", age_band: "66-70", cover_amount: 12500, monthly_premium: 286.04 },
  { plan_type: "family", age_band: "66-70", cover_amount: 13500, monthly_premium: 317.79 },
  { plan_type: "family", age_band: "66-70", cover_amount: 15000, monthly_premium: 332.41 },
  { plan_type: "family", age_band: "66-70", cover_amount: 16500, monthly_premium: 360.26 },
  { plan_type: "family", age_band: "66-70", cover_amount: 18000, monthly_premium: 392.99 },
  { plan_type: "family", age_band: "66-70", cover_amount: 20000, monthly_premium: 436.62 },
  { plan_type: "family", age_band: "66-70", cover_amount: 25000, monthly_premium: 545.79 },
  { plan_type: "family", age_band: "66-70", cover_amount: 30000, monthly_premium: 654.95 },

  { plan_type: "family", age_band: "71-75", cover_amount: 10000, monthly_premium: 311.26 },
  { plan_type: "family", age_band: "71-75", cover_amount: 12500, monthly_premium: 342.11 },
  { plan_type: "family", age_band: "71-75", cover_amount: 13500, monthly_premium: 369.07 },
  { plan_type: "family", age_band: "71-75", cover_amount: 15000, monthly_premium: 409.60 },
  { plan_type: "family", age_band: "71-75", cover_amount: 16500, monthly_premium: 450.19 },
  { plan_type: "family", age_band: "71-75", cover_amount: 18000, monthly_premium: 468.30 },

  { plan_type: "family", age_band: "76-80", cover_amount:  3000, monthly_premium: 150.74 },
  { plan_type: "family", age_band: "76-80", cover_amount:  4000, monthly_premium: 201.04 },
  { plan_type: "family", age_band: "76-80", cover_amount:  5000, monthly_premium: 251.26 },
  { plan_type: "family", age_band: "76-80", cover_amount:  6000, monthly_premium: 309.24 },
  { plan_type: "family", age_band: "76-80", cover_amount:  7000, monthly_premium: 367.22 },
  { plan_type: "family", age_band: "76-80", cover_amount:  8000, monthly_premium: 425.24 },
  { plan_type: "family", age_band: "76-80", cover_amount:  9000, monthly_premium: 483.22 },
  { plan_type: "family", age_band: "76-80", cover_amount: 10000, monthly_premium: 524.37 },
  { plan_type: "family", age_band: "76-80", cover_amount: 12500, monthly_premium: 689.47 },
  { plan_type: "family", age_band: "76-80", cover_amount: 13500, monthly_premium: 749.06 },

  { plan_type: "family", age_band: "81-85", cover_amount:  3000, monthly_premium: 213.38 },
  { plan_type: "family", age_band: "81-85", cover_amount:  4000, monthly_premium: 284.49 },
  { plan_type: "family", age_band: "81-85", cover_amount:  5000, monthly_premium: 355.61 },
  { plan_type: "family", age_band: "81-85", cover_amount:  6000, monthly_premium: 435.86 },
  { plan_type: "family", age_band: "81-85", cover_amount:  7000, monthly_premium: 517.61 },
  { plan_type: "family", age_band: "81-85", cover_amount:  8000, monthly_premium: 481.37 },
  { plan_type: "family", age_band: "81-85", cover_amount:  9000, monthly_premium: 680.02 },
];

const SOCIETY_RATES = [
  // 1+5
  { society_size: "1+5", age_band: "<65", cover_amount:  3000, monthly_premium:  66.43 },
  { society_size: "1+5", age_band: "<65", cover_amount:  5000, monthly_premium: 110.68 },
  { society_size: "1+5", age_band: "<65", cover_amount:  8000, monthly_premium: 177.11 },
  { society_size: "1+5", age_band: "<65", cover_amount: 10000, monthly_premium: 221.43 },
  { society_size: "1+5", age_band: "<65", cover_amount: 12500, monthly_premium: 276.74 },
  { society_size: "1+5", age_band: "<65", cover_amount: 15000, monthly_premium: 330.63 },

  { society_size: "1+5", age_band: "<70", cover_amount:  3000, monthly_premium:  83.46 },
  { society_size: "1+5", age_band: "<70", cover_amount:  5000, monthly_premium: 139.06 },
  { society_size: "1+5", age_band: "<70", cover_amount:  8000, monthly_premium: 222.39 },
  { society_size: "1+5", age_band: "<70", cover_amount: 10000, monthly_premium: 278.16 },
  { society_size: "1+5", age_band: "<70", cover_amount: 12500, monthly_premium: 347.56 },
  { society_size: "1+5", age_band: "<70", cover_amount: 15000, monthly_premium: 417.15 },

  { society_size: "1+5", age_band: "<75", cover_amount:  3000, monthly_premium:  99.63 },
  { society_size: "1+5", age_band: "<75", cover_amount:  5000, monthly_premium: 166.06 },
  { society_size: "1+5", age_band: "<75", cover_amount:  8000, monthly_premium: 265.72 },
  { society_size: "1+5", age_band: "<75", cover_amount: 10000, monthly_premium: 332.18 },
  { society_size: "1+5", age_band: "<75", cover_amount: 12500, monthly_premium: 415.14 },
  { society_size: "1+5", age_band: "<75", cover_amount: 15000, monthly_premium: 519.16 },

  // 1+9
  { society_size: "1+9", age_band: "<65", cover_amount:  3000, monthly_premium: 104.45 },
  { society_size: "1+9", age_band: "<65", cover_amount:  5000, monthly_premium: 189.09 },
  { society_size: "1+9", age_band: "<65", cover_amount:  8000, monthly_premium: 278.55 },
  { society_size: "1+9", age_band: "<65", cover_amount: 10000, monthly_premium: 349.64 },
  { society_size: "1+9", age_band: "<65", cover_amount: 12500, monthly_premium: 437.18 },
  { society_size: "1+9", age_band: "<65", cover_amount: 15000, monthly_premium: 524.63 },

  { society_size: "1+9", age_band: "<70", cover_amount:  3000, monthly_premium: 131.14 },
  { society_size: "1+9", age_band: "<70", cover_amount:  5000, monthly_premium: 218.59 },
  { society_size: "1+9", age_band: "<70", cover_amount:  8000, monthly_premium: 349.73 },
  { society_size: "1+9", age_band: "<70", cover_amount: 10000, monthly_premium: 437.09 },
  { society_size: "1+9", age_band: "<70", cover_amount: 12500, monthly_premium: 543.77 },
  { society_size: "1+9", age_band: "<70", cover_amount: 15000, monthly_premium: 655.68 },

  { society_size: "1+9", age_band: "<75", cover_amount:  3000, monthly_premium: 182.23 },
  { society_size: "1+9", age_band: "<75", cover_amount:  5000, monthly_premium: 265.91 },
  { society_size: "1+9", age_band: "<75", cover_amount:  8000, monthly_premium: 399.70 },
  { society_size: "1+9", age_band: "<75", cover_amount: 10000, monthly_premium: 524.54 },
  { society_size: "1+9", age_band: "<75", cover_amount: 12500, monthly_premium: 652.51 },
  { society_size: "1+9", age_band: "<75", cover_amount: 15000, monthly_premium: 774.61 },

  // 1+13
  { society_size: "1+13", age_band: "<65", cover_amount:  3000, monthly_premium: 143.09 },
  { society_size: "1+13", age_band: "<65", cover_amount:  5000, monthly_premium: 238.43 },
  { society_size: "1+13", age_band: "<65", cover_amount:  8000, monthly_premium: 381.58 },
  { society_size: "1+13", age_band: "<65", cover_amount: 10000, monthly_premium: 476.92 },
  { society_size: "1+13", age_band: "<65", cover_amount: 12500, monthly_premium: 596.21 },
  { society_size: "1+13", age_band: "<65", cover_amount: 15000, monthly_premium: 715.28 },

  { society_size: "1+13", age_band: "<70", cover_amount:  3000, monthly_premium: 178.53 },
  { society_size: "1+13", age_band: "<70", cover_amount:  5000, monthly_premium: 297.56 },
  { society_size: "1+13", age_band: "<70", cover_amount:  8000, monthly_premium: 476.12 },
  { society_size: "1+13", age_band: "<70", cover_amount: 10000, monthly_premium: 596.11 },
  { society_size: "1+13", age_band: "<70", cover_amount: 12500, monthly_premium: 743.95 },
  { society_size: "1+13", age_band: "<70", cover_amount: 15000, monthly_premium: 894.20 },

  { society_size: "1+13", age_band: "<75", cover_amount:  3000, monthly_premium: 214.63 },
  { society_size: "1+13", age_band: "<75", cover_amount:  5000, monthly_premium: 357.72 },
  { society_size: "1+13", age_band: "<75", cover_amount:  8000, monthly_premium: 536.51 },
  { society_size: "1+13", age_band: "<75", cover_amount: 10000, monthly_premium: 715.37 },
  { society_size: "1+13", age_band: "<75", cover_amount: 12500, monthly_premium: 894.37 },
  { society_size: "1+13", age_band: "<75", cover_amount: 15000, monthly_premium: 1073.09 },
];

const ACCIDENTAL_RATES = [
  { age_band: "18-65", cover_amount: 10000, monthly_premium: 15.44 },
  { age_band: "18-65", cover_amount: 12500, monthly_premium: 18.38 },
  { age_band: "18-65", cover_amount: 13500, monthly_premium: 19.54 },
  { age_band: "18-65", cover_amount: 15000, monthly_premium: 21.25 },
  { age_band: "18-65", cover_amount: 16500, monthly_premium: 27.62 },
  { age_band: "18-65", cover_amount: 18000, monthly_premium: 29.80 },
  { age_band: "18-65", cover_amount: 20000, monthly_premium: 33.99 },
  { age_band: "18-65", cover_amount: 25000, monthly_premium: 37.65 },
  { age_band: "18-65", cover_amount: 30000, monthly_premium: 40.82 },

  { age_band: "66-70", cover_amount: 10000, monthly_premium: 30.89 },
  { age_band: "66-70", cover_amount: 12500, monthly_premium: 37.06 },
  { age_band: "66-70", cover_amount: 13500, monthly_premium: 39.53 },
  { age_band: "66-70", cover_amount: 15000, monthly_premium: 43.20 },
  { age_band: "66-70", cover_amount: 16500, monthly_premium: 53.16 },
  { age_band: "66-70", cover_amount: 18000, monthly_premium: 60.52 },
  { age_band: "66-70", cover_amount: 20000, monthly_premium: 67.68 },
  { age_band: "66-70", cover_amount: 25000, monthly_premium: 72.50 },
  { age_band: "66-70", cover_amount: 30000, monthly_premium: 82.96 },

  { age_band: "71-75", cover_amount: 10000, monthly_premium: 36.73 },
  { age_band: "71-75", cover_amount: 12500, monthly_premium: 45.64 },
  { age_band: "71-75", cover_amount: 13500, monthly_premium: 49.24 },
  { age_band: "71-75", cover_amount: 15000, monthly_premium: 54.62 },
  { age_band: "71-75", cover_amount: 16500, monthly_premium: 64.45 },
  { age_band: "71-75", cover_amount: 18000, monthly_premium: 75.64 },
  { age_band: "71-75", cover_amount: 20000, monthly_premium: 84.08 },
];

const ADDON_RATES = [
  { benefit_type: "tombstone", benefit_amount: 5000, age_band: "18-65", single_premium:  45.64, family_premium:  72.27 },
  { benefit_type: "tombstone", benefit_amount: 5000, age_band: "66-70", single_premium: 127.94, family_premium: 146.88 },
  { benefit_type: "tombstone", benefit_amount: 5000, age_band: "71-75", single_premium: 139.16, family_premium: 185.53 },

  { benefit_type: "grocery",   benefit_amount: 5000, age_band: "18-65", single_premium:  57.59, family_premium: 102.47 },
  { benefit_type: "grocery",   benefit_amount: 5000, age_band: "66-70", single_premium: 162.39, family_premium: 202.52 },
  { benefit_type: "grocery",   benefit_amount: 5000, age_band: "71-75", single_premium: 220.31, family_premium: 239.65 },
  { benefit_type: "grocery",   benefit_amount: 8000, age_band: "18-65", single_premium:  45.64, family_premium:  72.27 },
  { benefit_type: "grocery",   benefit_amount: 8000, age_band: "66-70", single_premium: 127.94, family_premium: 146.88 },
  { benefit_type: "grocery",   benefit_amount: 8000, age_band: "71-75", single_premium: 139.16, family_premium: 185.53 },

  { benefit_type: "meat",      benefit_amount: 5000, age_band: "18-65", single_premium:  45.64, family_premium:  72.27 },
  { benefit_type: "meat",      benefit_amount: 5000, age_band: "66-70", single_premium: 127.94, family_premium: 146.88 },
  { benefit_type: "meat",      benefit_amount: 5000, age_band: "71-75", single_premium: 139.16, family_premium: 185.53 },
  { benefit_type: "meat",      benefit_amount: 8000, age_band: "18-65", single_premium:  57.59, family_premium: 102.47 },
  { benefit_type: "meat",      benefit_amount: 8000, age_band: "66-70", single_premium: 162.39, family_premium: 202.52 },
  { benefit_type: "meat",      benefit_amount: 8000, age_band: "71-75", single_premium: 220.31, family_premium: 239.65 },
];

const CHILD_COVER = [
  { plan_cover_amount: 10000, child_age_bracket: "0-11m", child_cover_amount:  1500 },
  { plan_cover_amount: 10000, child_age_bracket: "1-5",   child_cover_amount:  2500 },
  { plan_cover_amount: 10000, child_age_bracket: "6-13",  child_cover_amount:  5000 },
  { plan_cover_amount: 10000, child_age_bracket: "14-21", child_cover_amount: 10000 },

  { plan_cover_amount: 12500, child_age_bracket: "0-11m", child_cover_amount:  2000 },
  { plan_cover_amount: 12500, child_age_bracket: "1-5",   child_cover_amount:  3500 },
  { plan_cover_amount: 12500, child_age_bracket: "6-13",  child_cover_amount:  6250 },
  { plan_cover_amount: 12500, child_age_bracket: "14-21", child_cover_amount: 12500 },

  { plan_cover_amount: 13500, child_age_bracket: "0-11m", child_cover_amount:  2000 },
  { plan_cover_amount: 13500, child_age_bracket: "1-5",   child_cover_amount:  3500 },
  { plan_cover_amount: 13500, child_age_bracket: "6-13",  child_cover_amount:  6750 },
  { plan_cover_amount: 13500, child_age_bracket: "14-21", child_cover_amount: 13500 },

  { plan_cover_amount: 15000, child_age_bracket: "0-11m", child_cover_amount:  2000 },
  { plan_cover_amount: 15000, child_age_bracket: "1-5",   child_cover_amount:  3500 },
  { plan_cover_amount: 15000, child_age_bracket: "6-13",  child_cover_amount:  7000 },
  { plan_cover_amount: 15000, child_age_bracket: "14-21", child_cover_amount: 10000 },

  { plan_cover_amount: 16500, child_age_bracket: "0-11m", child_cover_amount:  2000 },
  { plan_cover_amount: 16500, child_age_bracket: "1-5",   child_cover_amount:  3500 },
  { plan_cover_amount: 16500, child_age_bracket: "6-13",  child_cover_amount:  7500 },
  { plan_cover_amount: 16500, child_age_bracket: "14-21", child_cover_amount: 16500 },

  { plan_cover_amount: 18000, child_age_bracket: "0-11m", child_cover_amount:  2000 },
  { plan_cover_amount: 18000, child_age_bracket: "1-5",   child_cover_amount:  4000 },
  { plan_cover_amount: 18000, child_age_bracket: "6-13",  child_cover_amount:  9000 },
  { plan_cover_amount: 18000, child_age_bracket: "14-21", child_cover_amount: 18000 },

  { plan_cover_amount: 20000, child_age_bracket: "0-11m", child_cover_amount:  2500 },
  { plan_cover_amount: 20000, child_age_bracket: "1-5",   child_cover_amount:  5000 },
  { plan_cover_amount: 20000, child_age_bracket: "6-13",  child_cover_amount: 10000 },
  { plan_cover_amount: 20000, child_age_bracket: "14-21", child_cover_amount: 20000 },

  { plan_cover_amount: 25000, child_age_bracket: "0-11m", child_cover_amount:  2500 },
  { plan_cover_amount: 25000, child_age_bracket: "1-5",   child_cover_amount:  4000 },
  { plan_cover_amount: 25000, child_age_bracket: "6-13",  child_cover_amount:  8500 },
  { plan_cover_amount: 25000, child_age_bracket: "14-21", child_cover_amount: 25000 },

  { plan_cover_amount: 30000, child_age_bracket: "0-11m", child_cover_amount:  3000 },
  { plan_cover_amount: 30000, child_age_bracket: "1-5",   child_cover_amount:  7500 },
  { plan_cover_amount: 30000, child_age_bracket: "6-13",  child_cover_amount: 15000 },
  { plan_cover_amount: 30000, child_age_bracket: "14-21", child_cover_amount: 30000 },
];

// ─── Migration Runner ─────────────────────────────────────────────────────────

async function upsertRows(client, table, rows, conflictCols) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const conflictClause = `ON CONFLICT (${conflictCols.join(", ")}) DO NOTHING`;
  for (const row of rows) {
    const vals = cols.map((c) => row[c]);
    const placeholders = vals.map((_, i) => `$${i + 1}`).join(", ");
    await client.query(
      `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${placeholders}) ${conflictClause}`,
      vals
    );
  }
}

async function runFuneralCoverMigration(pgPool) {
  if (!pgPool) return;
  const client = await pgPool.connect();
  try {
    await client.query(DDL);

    await upsertRows(client, "funeral_plan_rates",      PLAN_RATES,       ["plan_type", "age_band", "cover_amount"]);
    await upsertRows(client, "funeral_society_rates",   SOCIETY_RATES,    ["society_size", "age_band", "cover_amount"]);
    await upsertRows(client, "funeral_accidental_rates",ACCIDENTAL_RATES, ["age_band", "cover_amount"]);
    await upsertRows(client, "funeral_addon_rates",     ADDON_RATES,      ["benefit_type", "benefit_amount", "age_band"]);
    await upsertRows(client, "funeral_child_cover",     CHILD_COVER,      ["plan_cover_amount", "child_age_bracket"]);

    console.log("[funeral-cover] All rating tables created and seeded.");
  } catch (e) {
    console.error("[funeral-cover] Migration failed:", e.message);
  } finally {
    client.release();
  }
}

module.exports = { runFuneralCoverMigration };
