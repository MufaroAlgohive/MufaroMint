import { createClient } from '@supabase/supabase-js';

// Re-implementing the logic from src/lib/marketData.js to check current output
const supabaseUrl = 'https://mfxnghmuccevsxwcetej.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1meG5naG11Y2NldnN4d2NldGVqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg1MjU4MCwiZXhwIjoyMDg0NDI4NTgwfQ.0gsEFLa3PtZ82Oams9qbbdx6MFHCMCSlL-aa_ZcHHsY';

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
