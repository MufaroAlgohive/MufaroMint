const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Basic .env loader
const envPath = path.join(__dirname, '..', '.env');
const env = {};
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
  });
}

const supabaseUrl = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function findTables() {
  // Query for table names in public schema
  const { data, error } = await supabase.from('securities').select('id').limit(1);
  if (error) console.error("Securities query failed", error);
  else console.log("Securities table exists");

  // Try suspected names
  const suspects = ['security_metrics', 'security_performance', 'security_analytics', 'security_metrics_summary', 'security_analytics_summary'];
  for (const table of suspects) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (!error) {
      console.log(`✅ Table found: ${table}`);
      console.log(JSON.stringify(data[0], null, 2));
    }
  }

  // Check views
  const views = ['security_metrics_view', 'security_prices_view', 'security_quotes_view'];
  for (const view of views) {
    const { data, error } = await supabase.from(view).select('*').limit(1);
    if (!error) {
      console.log(`✅ View found: ${view}`);
      console.log(JSON.stringify(data[0], null, 2));
    }
  }
}

findTables();
