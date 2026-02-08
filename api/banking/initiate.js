import { createClient } from '@supabase/supabase-js';
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

function parseServices(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
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
  const {
    idType = process.env.TEST_ID_TYPE || 'id',
    provider = process.env.TEST_PROVIDER,
    accounts,
    auto,
    rememberMe = process.env.TEST_REMEMBER_ME,
    consentId,
    services,
    correlation,
    force
  } = body || {};

  const requestedServices = parseServices(services);
  const envServices = parseServices(process.env.TRUID_SERVICES);
  const defaultServices = envServices.length
    ? envServices
    : [
        'eeh03fzauckvj8u982dbeq1d8',
        'amqfuupe00xk3cfw3dergvb9n',
        's8d7f67de8w9iekjrfu',
        'mk2weodif8gutjre4kwsdfd',
        '12wsdofikgjtm5k4eiduy',
        'apw99w0lj1nwde4sfxd0'
      ];
  const finalServices = requestedServices.length ? requestedServices : defaultServices;

  const authHeader = req.headers.authorization || '';
  const accessToken = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : null;

  if (!accessToken) {
    return res.status(401).json({ success: false, error: 'Missing bearer token' });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
  if (userError || !userData?.user?.id) {
    const message = userError?.message || 'Invalid or expired session';
    return res.status(401).json({ success: false, error: 'Invalid or expired session', details: message });
  }

  const profileClient = supabaseAdmin || supabase;
  let { data: profile, error: profileError } = await profileClient
    .from('profiles')
    // select all columns to avoid failing when optional legacy columns are absent
    .select('*')
    .eq('id', userData.user.id)
    .single();

    if (profileError || !profile) {
      const newProfile = {
        id: userData.user.id,
        email: userData.user.email || null,
        email_address: userData.user.email || null,
        first_name: userData.user.user_metadata?.first_name || userData.user.user_metadata?.firstName || '',
        last_name: userData.user.user_metadata?.last_name || userData.user.user_metadata?.lastName || '',
        id_number: userData.user.user_metadata?.id_number || userData.user.user_metadata?.idNumber || '',
        // write both `phone` and legacy `phone_number` when possible
        phone: userData.user.user_metadata?.phone || userData.user.phone || '',
        phone_number: userData.user.user_metadata?.phone || userData.user.phone || ''
      };

      try {
        // Attempt insert; if Supabase reports missing columns (schema mismatch),
        // strip the offending column and retry a few times.
        let insertData = { ...newProfile };
        let createdProfile = null;
        let createError = null;

        for (let attempt = 0; attempt < 4; attempt++) {
          try {
            const resp = await profileClient
              .from('profiles')
              .insert(insertData)
              .select('*')
              .single();

            createdProfile = resp.data;
            createError = resp.error;
            if (!createError && createdProfile) break;
          } catch (err) {
            createError = err;
          }

          const msg = (createError && (createError.message || String(createError))) || '';
          // try to detect a missing column name reported by Supabase
          const m1 = msg.match(/Could not find the '(.+?)' column/);
          const m2 = msg.match(/column "(.+?)" does not exist/i);
          const missingCol = (m1 && m1[1]) || (m2 && m2[1]);

          if (missingCol && Object.prototype.hasOwnProperty.call(insertData, missingCol)) {
            console.warn('[api/banking/initiate] dropping missing profile column and retrying:', missingCol);
            delete insertData[missingCol];
            continue;
          }

          // fallback: remove legacy optional fields if present and retry
          if (Object.prototype.hasOwnProperty.call(insertData, 'email_address')) {
            delete insertData.email_address;
            continue;
          }
          if (Object.prototype.hasOwnProperty.call(insertData, 'phone_number')) {
            delete insertData.phone_number;
            continue;
          }

          break;
        }

        if (createError || !createdProfile) {
          console.error('[api/banking/initiate] failed to create profile', { createError: createError?.message || createError, createdProfile });
        } else {
          profile = createdProfile;
        }
      } catch (e) {
        console.error('[api/banking/initiate] exception creating profile', e?.message || e);
      }
    }

  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim();
  const idNumber = profile.id_number ? String(profile.id_number).trim() : '';
  const email = profile.email || '';
  // schema uses `phone_number`
  const mobile = profile.phone_number || '';

  if (!fullName || !idNumber) {
    return res.status(400).json({
      success: false,
      error: 'Profile missing required fields',
      required: ['first_name', 'last_name', 'id_number']
    });
  }

  try {
    const collection = await truIDClient.createCollection({
      name: fullName,
      idNumber,
      idType,
      email,
      mobile,
      provider,
      accounts,
      auto,
      rememberMe,
      consentId,
      services: finalServices,
      correlation,
      force
    });

    res.status(201).json({
      success: true,
      collectionId: collection.collectionId,
      consumerUrl: collection.consumerUrl,
      consentId: collection.consentId
    });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
}