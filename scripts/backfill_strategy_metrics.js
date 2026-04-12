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

// Normalize symbol
const normalizeSymbol = (symbol) => {
  if (typeof symbol !== 'string') return symbol;
  return symbol.trim().split('.')[0].toUpperCase();
};

// Parse holdings from JSONB/JSON
const parseHoldings = (holdingsData) => {
  if (Array.isArray(holdingsData)) return holdingsData;
  if (typeof holdingsData === 'string') {
    try {
      const parsed = JSON.parse(holdingsData);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn('Failed to parse holdings:', e.message);
      return [];
    }
  }
  return [];
};

async function backfillStrategyMetrics() {
  console.log('🔄 Starting strategy metrics backfill...\n');

  try {
    // 1. Fetch all active strategies
    const { data: strategies, error: stratError } = await supabase
      .from('strategies')
      .select('id, name, holdings')
      .eq('status', 'active');

    if (stratError) throw stratError;
    if (!strategies || strategies.length === 0) {
      console.log('❌ No active strategies found');
      return;
    }

    console.log(`✅ Found ${strategies.length} active strategies\n`);

    // 2. Build symbol to security_id map
    const allSymbols = new Set();
    for (const strategy of strategies) {
      const holdings = parseHoldings(strategy.holdings);
      holdings.forEach(h => {
        const sym = h.ticker || h.symbol;
        if (sym) allSymbols.add(normalizeSymbol(sym));
      });
    }

    console.log(`📊 Fetching ${allSymbols.size} unique securities...\n`);

    const { data: securities, error: secError } = await supabase
      .from('securities')
      .select('id, symbol')
      .in('symbol', Array.from(allSymbols));

    if (secError) throw secError;

    const securityMap = new Map();
    securities.forEach(sec => {
      securityMap.set(normalizeSymbol(sec.symbol), sec.id);
    });

    console.log(`✅ Mapped ${securityMap.size} securities\n`);

    // 3. Process each strategy
    for (const strategy of strategies) {
      console.log(`\n📈 Processing: ${strategy.name}`);
      console.log('═'.repeat(50));

      const holdings = parseHoldings(strategy.holdings);
      if (holdings.length === 0) {
        console.log('⚠️  No holdings found');
        continue;
      }

      // Get security IDs for this strategy's holdings
      const securityIds = [];
      const holdingsMap = new Map();

      for (const h of holdings) {
        const rawSym = h.ticker || h.symbol;
        const normSym = normalizeSymbol(rawSym);
        const secId = securityMap.get(normSym);

        if (secId) {
          securityIds.push(secId);
          holdingsMap.set(secId, {
            symbol: rawSym,
            shares: Number(h.shares || h.quantity || 1),
          });
        }
      }

      if (securityIds.length === 0) {
        console.log('⚠️  No securities found for holdings');
        continue;
      }

      // Find earliest date with price data
      const { data: prices, error: priceError } = await supabase
        .from('security_prices')
        .select('ts')
        .in('security_id', securityIds)
        .order('ts', { ascending: true })
        .limit(1);

      if (priceError) throw priceError;

      if (!prices || prices.length === 0) {
        console.log('⚠️  No price history found');
        continue;
      }

      const earliestDate = new Date(prices[0].ts);
      const today = new Date();

      console.log(`📅 Date range: ${earliestDate.toISOString().split('T')[0]} → ${today.toISOString().split('T')[0]}`);
      console.log(`📊 Holdings: ${holdingsMap.size}`);

      let insertCount = 0;
      let skipCount = 0;
      const batchSize = 100;
      let batch = [];

      // 4. For each date, calculate portfolio value
      const currentDate = new Date(earliestDate);
      while (currentDate <= today) {
        const dateStr = currentDate.toISOString().split('T')[0];

        // Get prices for all holdings on this date
        const { data: dayPrices, error: dayPriceError } = await supabase
          .from('security_prices')
          .select('security_id, close_price')
          .in('security_id', securityIds)
          .eq('ts', dateStr);

        if (dayPriceError) {
          console.error(`  ❌ Error fetching prices for ${dateStr}:`, dayPriceError.message);
          currentDate.setDate(currentDate.getDate() + 1);
          continue;
        }

        if (!dayPrices || dayPrices.length === 0) {
          skipCount++;
          currentDate.setDate(currentDate.getDate() + 1);
          continue;
        }

        // Calculate portfolio value
        let portfolioValue = 0;
        const holdingsSnapshot = {};

        for (const price of dayPrices) {
          const holding = holdingsMap.get(price.security_id);
          if (holding) {
            const value = holding.shares * (Number(price.close_price) / 100);
            portfolioValue += value;
            holdingsSnapshot[holding.symbol] = {
              shares: holding.shares,
              price: price.close_price,
              value: value,
            };
          }
        }

        // Add to batch
        batch.push({
          strategy_id: strategy.id,
          as_of_date: dateStr,
          portfolio_value: portfolioValue,
          holdings_live: holdingsSnapshot,
        });

        if (batch.length >= batchSize) {
          const { error: insertError } = await supabase
            .from('strategy_metrics')
            .upsert(batch, { onConflict: 'strategy_id,as_of_date' });

          if (insertError) {
            console.error(`  ❌ Insert error: ${insertError.message}`);
          } else {
            insertCount += batch.length;
            console.log(`  ✅ Inserted ${batch.length} records`);
          }
          batch = [];
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Insert remaining batch
      if (batch.length > 0) {
        const { error: insertError } = await supabase
          .from('strategy_metrics')
          .upsert(batch, { onConflict: 'strategy_id,as_of_date' });

        if (insertError) {
          console.error(`  ❌ Insert error: ${insertError.message}`);
        } else {
          insertCount += batch.length;
          console.log(`  ✅ Inserted ${batch.length} records`);
        }
      }

      console.log(`\n✅ ${strategy.name}: ${insertCount} snapshots inserted, ${skipCount} dates skipped`);
    }

    console.log('\n\n🎉 Backfill complete!');
    console.log('Next: Run calculate_strategy_returns.js to compute r_1w, r_1m, r_ytd, etc.');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

backfillStrategyMetrics();
