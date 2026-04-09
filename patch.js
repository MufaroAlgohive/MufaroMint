import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split(/\r?\n/).forEach(line => {
  const match = line.match(/^\s*([\w]+)\s*=\s*(.*)\s*$/);
  if (match) env[match[1]] = match[2];
});

const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'] || env['VITE_SUPABASE_ANON_KEY'];

const supabase = createClient(supabaseUrl, supabaseKey);

async function patch() {
  const { data: loans } = await supabase.from('loan_application').select('*').neq('status', 'repaid');
  const { data: securities } = await supabase.from('securities').select('*').limit(1);
  const security = securities?.[0];
  
  let count = 0;
  for (const loan of loans) {
    const { data: pledges } = await supabase.from('pbc_collateral_pledges').select('*').eq('loan_application_id', loan.id);
    if (!pledges || pledges.length === 0) {
      const outstanding = loan.principal_amount || 10000;
      const mockCollateralValue = outstanding * 2; 
      const mockPrice = security.last_price || 100;
      const mockQuantity = Math.floor((mockCollateralValue * 100) / mockPrice);

      const res = await supabase.from('pbc_collateral_pledges').insert({
        user_id: loan.user_id,
        loan_application_id: loan.id,
        security_id: security.id,
        symbol: security.symbol || "SYS_MOCK",
        pledged_quantity: mockQuantity > 0 ? mockQuantity : 100,
        pledged_value: mockCollateralValue,
        loan_value: outstanding,
        recognised_value: mockCollateralValue
      });
      if (!res.error) count++;
      else console.error(res.error);
    }
  }
  console.log(`Successfully patched ${count} old loans.`);
}

patch();
