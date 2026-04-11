import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// Re-implementing the logic from src/lib/marketData.js to check current output
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) throw new Error('Missing SUPABASE env vars — check .env');

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCurrentAppOutput() {
  console.log("🔍 Checking what the app currently returns for 'NED.JO'...");
  
  // This mimics the logic in the current src/lib/marketData.js (Active Workspace)
  const { data: securities } = await supabase
    .from("securities")
    .select("*")
    .eq("symbol", "NED.JO")
    .single();

  if (securities) {
    // This is what the current processed object looks like
    const processed = {
        ...securities,
        currentPrice: securities.last_price ? Number(securities.last_price) / 100 : null,
    };
    
    console.log(`✅ NED.JO in Securities Table:`);
    console.log(`- ytd_performance (Direct): ${processed.ytd_performance}`);
    console.log(`- returns.r_ytd (Nested): ${processed.returns?.r_ytd}`);
    
    // Now let's check what it WILL look like if we use security_metrics
    const { data: metrics } = await supabase
        .from("security_metrics")
        .select("r_ytd")
        .eq("security_id", securities.id)
        .single();
    
    console.log(`\n🔍 NED.JO in Security_Metrics Table:`);
    console.log(`- r_ytd (Raw): ${metrics?.r_ytd}`);
  } else {
    console.log("⚠️ NED.JO not found.");
  }
}

checkCurrentAppOutput();
