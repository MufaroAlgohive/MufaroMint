import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env');

// Load environment variables
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

// Calculate days offset from today
const getDaysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
};

async function calculateStrategyReturns() {
  console.log('🧮 Calculating strategy returns...\n');

  try {
    // 1. Get all strategies that have metrics
    const { data: strategies, error: stratError } = await supabase
      .from('strategy_metrics')
      .select('DISTINCT strategy_id')
      .order('strategy_id');

    if (stratError) throw stratError;
    if (!strategies || strategies.length === 0) {
      console.log('❌ No strategies with metrics found');
      return;
    }

    console.log(`✅ Found ${strategies.length} strategies with metrics\n`);

    const strategyIds = strategies.map(s => s.strategy_id);

    // 2. For each strategy, calculate returns
    for (const strategyId of strategyIds) {
      console.log(`📈 Processing strategy: ${strategyId}`);
      console.log('═'.repeat(50));

      try {
        // Get all snapshots for this strategy, ordered by date
        const { data: snapshots, error: snapError } = await supabase
          .from('strategy_metrics')
          .select('as_of_date, portfolio_value')
          .eq('strategy_id', strategyId)
          .order('as_of_date', { ascending: false });

        if (snapError) throw snapError;
        if (!snapshots || snapshots.length === 0) {
          console.log('  ⚠️  No snapshots found');
          continue;
        }

        // Create a map for easy lookup
        const snapshotMap = new Map();
        snapshots.forEach(s => {
          snapshotMap.set(s.as_of_date, s.portfolio_value);
        });

        const todayStr = new Date().toISOString().split('T')[0];
        const todayValue = snapshotMap.get(todayStr);

        if (!todayValue) {
          console.log('  ⚠️  No data for today');
          continue;
        }

        // Calculate return: (value_today / value_period_ago) - 1
        const calculateReturn = (daysAgo) => {
          const pastDateStr = getDaysAgo(daysAgo);
          const pastValue = snapshotMap.get(pastDateStr);

          if (!pastValue || pastValue <= 0) return null;
          return (todayValue / pastValue) - 1;
        };

        // Find earliest date for all-time return
        const earliestSnapshot = snapshots[snapshots.length - 1];
        const earliestValue = earliestSnapshot.portfolio_value;
        const r_all_time = earliestValue > 0 ? (todayValue / earliestValue) - 1 : null;

        // Calculate all period returns
        const returns = {
          r_1w: calculateReturn(7),
          r_1m: calculateReturn(30),
          r_3m: calculateReturn(90),
          r_6m: calculateReturn(180),
          r_1y: calculateReturn(365),
          r_3y: calculateReturn(1095),
          r_ytd: null,
        };

        // Special handling for YTD (Jan 1 of current year)
        const currentYear = new Date().getFullYear();
        const jan1Str = `${currentYear}-01-01`;
        const jan1Value = snapshotMap.get(jan1Str);
        if (jan1Value && jan1Value > 0) {
          returns.r_ytd = (todayValue / jan1Value) - 1;
        }

        // 3. Update strategy_metrics for today with calculated returns
        const { error: updateError } = await supabase
          .from('strategy_metrics')
          .update({
            r_1w: returns.r_1w,
            r_1m: returns.r_1m,
            r_3m: returns.r_3m,
            r_6m: returns.r_6m,
            r_ytd: returns.r_ytd,
            r_1y: returns.r_1y,
            r_3y: returns.r_3y,
            r_all_time: r_all_time,
            computed_at: new Date().toISOString(),
          })
          .eq('strategy_id', strategyId)
          .eq('as_of_date', todayStr);

        if (updateError) throw updateError;

        console.log(`  ✅ Returns calculated:`);
        console.log(`     r_1w:   ${returns.r_1w ? (returns.r_1w * 100).toFixed(2) : 'N/A'}%`);
        console.log(`     r_1m:   ${returns.r_1m ? (returns.r_1m * 100).toFixed(2) : 'N/A'}%`);
        console.log(`     r_3m:   ${returns.r_3m ? (returns.r_3m * 100).toFixed(2) : 'N/A'}%`);
        console.log(`     r_6m:   ${returns.r_6m ? (returns.r_6m * 100).toFixed(2) : 'N/A'}%`);
        console.log(`     r_ytd:  ${returns.r_ytd ? (returns.r_ytd * 100).toFixed(2) : 'N/A'}%`);
        console.log(`     r_1y:   ${returns.r_1y ? (returns.r_1y * 100).toFixed(2) : 'N/A'}%`);
        console.log(`     r_3y:   ${returns.r_3y ? (returns.r_3y * 100).toFixed(2) : 'N/A'}%`);
        console.log(`     r_all_time: ${r_all_time ? (r_all_time * 100).toFixed(2) : 'N/A'}%\n`);

      } catch (error) {
        console.error(`  ❌ Error processing strategy: ${error.message}\n`);
      }
    }

    console.log('🎉 Return calculations complete!');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

calculateStrategyReturns();
