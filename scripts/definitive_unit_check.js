import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// Standalone implementation of the logic currently in src/lib/marketData.js (Active Workspace)
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) throw new Error('Missing SUPABASE env vars — check .env');

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAppFunctionOutput() {
  console.log("🔍 Executing standalone check of getMarketsSecuritiesWithMetrics current logic...");
  
  try {
    // Exact logic from src/lib/marketData.js:31
    const { data: securities, error: securitiesError } = await supabase
      .from("securities")
      .select(`*`)
      .eq("is_active", true)
      .order("market_cap", { ascending: false, nullsFirst: false });

    if (securitiesError) throw securitiesError;

    // Exact logic from src/lib/marketData.js:47 (the 'map' logic)
    const processedSecurities = (securities || []).map(security => {
      return {
        ...security,
        currentPrice: security.last_price ? Number(security.last_price) / 100 : null,
        changePct: security.change_percentage != null
          ? Number(security.change_percentage)
          : security.change_percent != null
            ? Number(security.change_percent)
            : null,
      };
    });

    const ned = processedSecurities.find(s => s.symbol === 'NED.JO');

    if (ned) {
      console.log('✅ Found NED.JO');
      console.log('ytd_performance on map object:', ned.ytd_performance);
    } else {
      console.log('⚠️ NED.JO not found in processed results.');
    }
  } catch (err) {
    console.error("❌ Test Failed:", err.message);
  }
}

checkAppFunctionOutput();
