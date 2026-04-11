import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env');

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      process.env[key] = value;
    }
  });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugYTD() {
  console.log("Checking strategy_analytics table...");
  const { data, error } = await supabase
    .from('strategy_analytics')
    .select('strategy_id, ytd_return, computed_at, as_of_date')
    .limit(10);

  if (error) {
    console.error("Error fetching strategy_analytics:", error);
    return;
  }

  console.log("Sample Data from strategy_analytics:");
  console.table(data);

  console.log("\nChecking strategy_metrics table (latest)...");
  const { data: metrics, error: mErr } = await supabase
    .from('strategy_metrics')
    .select('strategy_id, as_of_date, r_ytd')
    .order('as_of_date', { ascending: false })
    .limit(10);

  if (mErr) {
    console.error("Error fetching strategy_metrics:", mErr);
  } else {
    console.log("Sample Data from strategy_metrics:");
    console.table(metrics);
  }
}

debugYTD();
