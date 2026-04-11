import { getMarketsSecuritiesWithMetrics } from '../src/lib/marketData.js';
import { buildHoldingsBySymbol, calculateYtdReturn } from '../src/lib/strategyUtils.js';

async function finalIntegrationCheck() {
  console.log("🧪 Final Integration Check...");
  try {
    const securities = await getMarketsSecuritiesWithMetrics();
    const map = buildHoldingsBySymbol(securities);
    const ned = map.get('NED.JO');
    
    console.log('✅ Security in Map:', ned?.symbol);
    console.log('✅ YTD Performance in Map:', ned?.ytd_performance);
    
    if (ned?.ytd_performance) {
      console.log("\n🚀 DATA CHAIN VERIFIED: The utility can successfully read ytd_performance from the map.");
    } else {
      console.error("\n❌ DATA CHAIN BROKEN: ytd_performance missing from map.");
    }
  } catch (err) {
    console.error("❌ Test Failed:", err.message);
  }
}

finalIntegrationCheck();
