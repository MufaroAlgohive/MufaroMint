import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import truIDClient from '../../services/truidClient.js';

const REQUIRED_ENV = ['TRUID_API_KEY', 'TRUID_API_BASE', 'COMPANY_ID', 'BRAND_ID', 'WEBHOOK_URL', 'REDIRECT_URL'];
const readEnv = (key) => process.env[key] || process.env[`VITE_${key}`];
const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || null;

const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;
const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null;

function applyCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function respondMissingEnv(res) {
  const missing = REQUIRED_ENV.filter((key) => !readEnv(key));
  if (!missing.length) return false;
  res.status(500).json({
    success: false,
    error: `Missing required environment variables: ${missing.join(', ')}`
  });
  return true;
}

function respondMissingSupabase(res) {
  if (supabase) return false;
  res.status(500).json({
    success: false,
    error: 'Missing Supabase configuration on the server',
    details: 'Set SUPABASE_URL and SUPABASE_ANON_KEY.'
  });
  return true;
}

function parseBody(req) {
  let body = req.body || {};
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body || '{}');
    } catch {
      body = {};
    }
  }
  return body || {};
}

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function getMode(values) {
  if (!values.length) return null;
  const counts = new Map();
  values.forEach((value) => {
    const key = Number(value);
    if (!Number.isFinite(key) || key <= 0) return;
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  if (!counts.size) return null;
  return Number([...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]);
}

function extractMainSalary(statement, transactions) {
  const summaryData = statement?.summaryData || [];
  const mainIncomeCandidates = summaryData
    .map((month) => toNumber(month?.main_income))
    .filter((value) => value > 0);

  const summaryMode = getMode(mainIncomeCandidates);
  if (summaryMode) return summaryMode;

  const salaryCredits = (transactions || []).filter((tx) => {
    const description = String(tx?.description || '').toLowerCase();
    const categoryTwo = String(tx?.category_two || '').toLowerCase();
    const categoryThree = String(tx?.category_three || '').toLowerCase();
    return (
      String(tx?.type || '').toLowerCase() === 'credit' &&
      (description.includes('salary') || categoryTwo.includes('salary') || categoryThree.includes('salary'))
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
    const description = String(tx?.description || '').toLowerCase();
    const categoryTwo = String(tx?.category_two || '').toLowerCase();
    const categoryThree = String(tx?.category_three || '').toLowerCase();
    return (
      String(tx?.type || '').toLowerCase() === 'credit' &&
      (description.includes('salary') || categoryTwo.includes('salary') || categoryThree.includes('salary'))
    );
  });

  if (!salaryCredits.length) return null;

  const latest = salaryCredits
    .map((tx) => tx?.date)
    .filter(Boolean)
    .sort()
    .pop();

  return latest || null;
}

function tryWriteLocalSnapshot(collectionId, payload) {
  try {
    const baseDir = process.env.VERCEL ? '/tmp' : path.join(process.cwd(), 'tmp');
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }
    const fileName = `truid-capture-${collectionId}-${Date.now()}.json`;
    const filePath = path.join(baseDir, fileName);
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
    return filePath;
  } catch (error) {
    console.warn('[truID:capture] local snapshot write failed', error.message);
    return null;
  }
}

function createUserClient(accessToken) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  });
}

export default async function handler(req, res) {
  applyCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (respondMissingEnv(res)) return;
  if (respondMissingSupabase(res)) return;

  const body = parseBody(req);
  const collectionId = body.collectionId || req.query?.collectionId;
  if (!collectionId) {
    return res.status(400).json({ success: false, error: 'Missing collectionId' });
  }

  const authHeader = req.headers.authorization || '';
  const accessToken = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : null;

  if (!accessToken) {
    return res.status(401).json({ success: false, error: 'Missing bearer token' });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
  if (userError || !userData?.user?.id) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired session',
      details: userError?.message
    });
  }

  try {
    const result = await truIDClient.getCollectionData(collectionId);
    const payload = result?.data || {};
    const statement = payload?.statement || {};
    const summaryData = statement?.summaryData || [];
    const accounts = statement?.accounts || [];
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

    const bankName = statement?.customer?.bank || null;
    const customerName = statement?.customer?.name || null;
    const capturedAt = new Date().toISOString();

    const insertPayload = {
      user_id: userData.user.id,
      collection_id: collectionId,
      bank_name: bankName,
      customer_name: customerName,
      captured_at: capturedAt,
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

    const localSnapshotPath = tryWriteLocalSnapshot(collectionId, {
      collectionId,
      capturedAt,
      bankName,
      customerName,
      summaryData,
      statement,
      metrics: {
        monthsCaptured,
        totalIncome,
        totalExpenses,
        avgMonthlyIncome,
        avgMonthlyExpenses,
        netMonthlyIncome,
        mainSalary,
        salaryPaymentDate
      }
    });

    const insertClient = supabaseAdmin || createUserClient(accessToken);
    const { data: inserted, error: insertError } = await insertClient
      .from('truid_bank_snapshots')
      .insert(insertPayload)
      .select('*')
      .single();

    if (insertError) {
      return res.status(500).json({
        success: false,
        error: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code
      });
    }

    return res.status(201).json({
      success: true,
      collectionId,
      localSnapshotPath,
      snapshot: inserted
    });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, error: error.message });
  }
}