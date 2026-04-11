import { createClient } from '@supabase/supabase-js';

// Standalone implementation of the logic currently in src/lib/marketData.js (Active Workspace)
const supabaseUrl = 'https://mfxnghmuccevsxwcetej.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1meG5naG11Y2NldnN4d2NldGVqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg1MjU4MCwiZXhwIjoyMDg0NDI4NTgwfQ.0gsEFLa3PtZ82Oams9qbbdx6MFHCMCSlL-aa_ZcHHsY';

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
