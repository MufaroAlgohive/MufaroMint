import { getMonthlyReturns } from './src/lib/strategyData.js';
import { supabase } from './src/lib/supabase.js';

async function verifyCalendarFix() {
  console.log('🧪 Verifying Calendar Data Fix...');
  
  // Yield Basket ID from previous turns
  const YIELD_BASKET_ID = '919d77e4-8f15-46f9-bd99-72f3e823f993';
  
  // Fetch monthly returns
  const returns = await getMonthlyReturns(YIELD_BASKET_ID, '2026-01-01');
  
  console.log('Monthly Returns for 2026:', returns['2026']);
  
  let ytdSum = 0;
  if (returns['2026']) {
    Object.values(returns['2026']).forEach(val => ytdSum += val);
  }
  
  console.log(`Sum of monthly returns: ${(ytdSum * 100).toFixed(2)}%`);
  
  if (Math.abs(ytdSum * 100 - 38.68) < 1) {
    console.log('✅ PASS: Monthly returns now reflect the ~38.6% dynamic YTD!');
  } else if (Math.abs(ytdSum * 100 - 4.5) < 0.5) {
    console.log('❌ FAIL: Still showing stale 4.5% YTD sum.');
  } else {
    console.log(`⚠️ UNCERTAIN: Sum is neither 4.5% nor 38.6%. Actual sum: ${(ytdSum * 100).toFixed(2)}%`);
  }
}

// Mocking some globals we need for strategyData.js to run in node
global.localStorage = { getItem: () => null, setItem: () => null, removeItem: () => null };
global.sessionStorage = { getItem: () => null, setItem: () => null, removeItem: () => null };

verifyCalendarFix().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
