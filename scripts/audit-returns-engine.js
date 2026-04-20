/**
 * MINT Returns Engine — Database vs Spreadsheet Audit
 *
 * Compares what exists in Supabase against the institutional logic
 * defined in MINT_returns_engine_worked_example_final.xlsx.
 *
 * Run: node scripts/audit-returns-engine.js
 */

import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// ── env ──────────────────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (m) {
      let v = m[2] || '';
      if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
      process.env[m[1]] = v;
    }
  });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// ── helpers ───────────────────────────────────────────────────────────────────
const GREEN  = '\x1b[32m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN   = '\x1b[36m';
const BOLD   = '\x1b[1m';
const RESET  = '\x1b[0m';

const ok   = msg => `  ${GREEN}✅ ${msg}${RESET}`;
const fail = msg => `  ${RED}❌ ${msg}${RESET}`;
const warn = msg => `  ${YELLOW}⚠️  ${msg}${RESET}`;
const info = msg => `  ${CYAN}ℹ️  ${msg}${RESET}`;
const h1   = msg => `\n${BOLD}${'═'.repeat(70)}\n  ${msg}\n${'═'.repeat(70)}${RESET}`;
const h2   = msg => `\n${BOLD}── ${msg} ──${RESET}`;

const pct  = n  => (n * 100).toFixed(2) + '%';
const fmt  = n  => n == null ? 'NULL' : Number(n).toLocaleString();

// Query information_schema for columns of a table
async function getColumns(table) {
  const { data } = await supabase
    .from('information_schema.columns')
    .select('column_name, data_type, is_nullable')
    .eq('table_schema', 'public')
    .eq('table_name', table);
  return (data || []).map(r => r.column_name);
}

// Count rows in a table
async function count(table, filter = {}) {
  let q = supabase.from(table).select('*', { count: 'exact', head: true });
  for (const [k, v] of Object.entries(filter)) q = q.eq(k, v);
  const { count: n, error } = await q;
  return error ? null : n;
}

// ── SPEC: what the spreadsheet requires ──────────────────────────────────────

const SPREADSHEET_TABLES = {
  // table_name → required columns
  securities:       ['id', 'symbol', 'name', 'last_price', 'change_price', 'change_percent', 'ytd_performance', 'sector', 'exchange', 'is_active'],
  security_prices:  ['security_id', 'close_price', 'ts'],
  strategies:       ['id', 'name', 'holdings', 'status'],
  strategy_metrics: ['strategy_id', 'as_of_date', 'last_close', 'prev_close', 'change_abs', 'change_pct', 'r_1w', 'r_1m', 'r_3m', 'r_6m', 'r_ytd', 'r_1y'],
  stock_holdings_c:   ['user_id', 'security_id', 'strategy_id', 'quantity', 'avg_fill', 'market_value', 'unrealized_pnl', 'as_of_date'],
  user_strategies:  ['user_id', 'strategy_id', 'invested_amount', 'status'],
};

const MISSING_TABLES = [
  {
    name: 'trading_calendar',
    purpose: 'Business-day calendar with period-start flags and prev_trading_day lookup',
    spreadsheet_tab: 'Trading_Calendar',
    required_columns: ['date', 'is_trading_day', 'week_start', 'month_start', 'quarter_start', 'year_start', 'prev_trading_day'],
    impact: 'HIGH — period denominators (YTD, WTD, 1W) are currently approximated with raw day offsets, not actual trading days',
  },
  {
    name: 'reference_dates',
    purpose: 'One row per as-of date; locks the period benchmark prices per security',
    spreadsheet_tab: 'Reference_Dates',
    required_columns: ['as_of_date', 'period', 'security_id', 'benchmark_price'],
    impact: 'HIGH — without this, YTD denominator is reconstructed backward from ytd_performance (circular if ytd_performance itself was wrong)',
  },
  {
    name: 'strategy_holdings_history',
    purpose: 'Initial basket definition per strategy (immutable; never overwritten)',
    spreadsheet_tab: 'Strategy_Holdings',
    required_columns: ['strategy_id', 'ticker', 'initial_qty', 'start_date', 'initial_price', 'initial_market_value', 'initial_weight'],
    impact: 'HIGH — currently strategies.holdings is mutable JSONB; rebalancing overwrites history',
  },
  {
    name: 'rebalancing_events',
    purpose: 'Delta-based quantity changes per strategy (adds, removals); never rewrites past history',
    spreadsheet_tab: 'Rebalancing_Events',
    required_columns: ['strategy_id', 'effective_date', 'ticker', 'delta_qty', 'event_type', 'rationale'],
    impact: 'CRITICAL — without this, effective quantities cannot be reconstructed for any past date; rebalancing silently corrupts historical returns',
  },
];

// ── LOGIC CHECKS ──────────────────────────────────────────────────────────────

const LOGIC_CHECKS = [
  {
    id: 'YTD_DENOMINATOR',
    title: 'YTD denominator method',
    spreadsheet_rule: 'Denominator = close price on last trading day before 1 Jan (Dec 31 in security_prices)',
    current_code: 'calculateYtdReturn() back-calculates Jan 1 price as: lastPrice / (1 + ytd_performance/100)',
    correct: false,
    risk: 'HIGH',
    detail: [
      'If ytd_performance is stale or wrong, the Jan 1 price will be wrong too.',
      'This is circular: ytd_performance was computed from the Dec 31 price, so errors compound.',
      'Fix: query security_prices for the actual Dec 31 close instead of deriving it.',
    ],
    fix: 'SELECT close_price FROM security_prices WHERE security_id = $1 AND ts::date = \'YYYY-12-31\' ORDER BY ts DESC LIMIT 1',
  },
  {
    id: 'REBALANCING_HISTORY',
    title: 'Effective quantity for any past date',
    spreadsheet_rule: 'Qty(date) = initial_qty + SUM(delta_qty WHERE effective_date <= date)',
    current_code: 'strategies.holdings JSONB contains current quantities only — no history',
    correct: false,
    risk: 'CRITICAL',
    detail: [
      'If ABG goes from 30 → 50 shares, the code overwrites the JSON.',
      'Any historical NAV calculation before the rebalance now uses the wrong (post-rebalance) quantity.',
      'Public YTD return becomes overstated because early-period quantities are too high.',
    ],
    fix: 'Add rebalancing_events table. In NAV calculations, join to it with effective_date <= date.',
  },
  {
    id: 'CLIENT_VS_PUBLIC',
    title: 'Client return vs public YTD',
    spreadsheet_rule: 'Client return denominator = entry NAV on investment_date. Public YTD denominator = Dec 31 NAV.',
    current_code: 'getStrategyCurrentValue() uses r_ytd from strategy_metrics (public view) for all clients',
    correct: false,
    risk: 'HIGH',
    detail: [
      'A client who entered in February sees the public +60% YTD, not their actual -0.2% since entry.',
      'user_strategies.invested_amount stores Rands invested, not the entry NAV per unit.',
      'Fix: store entry_nav_per_unit and units_bought in user_strategies.',
      'Client return = (current_nav / entry_nav) - 1, not strategy_metrics.r_ytd.',
    ],
    fix: 'Add entry_nav, units_bought, entry_date to user_strategies. Compute client return separately.',
  },
  {
    id: 'WTD_1W_ANCHORS',
    title: '1W and WTD denominators',
    spreadsheet_rule: '1W = close 5 trading days before as-of. WTD = close on last day before week-start.',
    current_code: 'getSecurityPrices() uses raw calendar day offsets (daysToFetch = 10 for 1W)',
    correct: false,
    risk: 'MEDIUM',
    detail: [
      'A week with a public holiday has fewer than 5 trading days, so daysToFetch = 10 over-reaches.',
      'Without a trading calendar, there is no way to correctly find the 5th prior trading day.',
    ],
    fix: 'Use trading_calendar table to find the Nth prior trading day by filtering is_trading_day = true.',
  },
  {
    id: 'UNITS_FIXED',
    title: 'Strategy NAV unitisation',
    spreadsheet_rule: 'Launch units are fixed (e.g. 1000). NAV per unit = strategy_value / launch_units.',
    current_code: 'strategy_metrics.last_close stores a NAV-like value but no unit count is defined',
    correct: null, // needs verification
    risk: 'MEDIUM',
    detail: [
      'Without a fixed unit count, last_close might be total strategy value or per-unit NAV — ambiguous.',
      'Client units_bought = investment_amount / entry_nav_per_unit requires a defined unit series.',
    ],
    fix: 'Add launch_units and launch_date to strategies. Store nav_per_unit in strategy_metrics.',
  },
  {
    id: 'FEE_APPLICATION',
    title: 'Fee-adjusted returns',
    spreadsheet_rule: 'Not in this worked example, but management_fee_bps and performance_fee_pct are in DB',
    current_code: 'management_fee_bps and performance_fee_pct exist in strategies table but are never applied',
    correct: false,
    risk: 'MEDIUM',
    detail: [
      'Returns shown to clients are gross of fees.',
      'Regulatory requirement in SA: performance returns to clients must be net of fees.',
    ],
    fix: 'Apply daily fee accrual: nav_net = nav_gross * (1 - management_fee_bps/10000/252) per day.',
  },
  {
    id: 'SECURITY_PRICES_UNIT',
    title: 'Consistent unit: security_prices.close_price',
    spreadsheet_rule: 'All prices in same unit (Rands). Master_Data stores Rand prices.',
    current_code: 'security_prices.close_price stored in cents. getSecurityPrices() divides by 100.',
    correct: true, // conversion is done, just needs to be consistent
    risk: 'LOW',
    detail: [
      'The /100 conversion is done in getSecurityPrices() and holdings enrichment.',
      'RISK: if any upstream writer stores Rands instead of cents, returns will be off by 10,000x.',
      'Recommendation: add a DB-level CHECK constraint or comment documenting the unit.',
    ],
    fix: 'Add column comment: COMMENT ON COLUMN security_prices.close_price IS \'Price in ZAR cents\'',
  },
];

// ── MAIN ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(h1('MINT RETURNS ENGINE — DATABASE AUDIT'));
  console.log(info(`Spreadsheet: MINT_returns_engine_worked_example_final.xlsx`));
  console.log(info(`Database:    ${supabaseUrl}`));
  console.log(info(`Run date:    ${new Date().toISOString().slice(0, 10)}`));

  // ────────────────────────────────────────────────────────────────────────────
  // SECTION 1 — Table existence & column coverage
  // ────────────────────────────────────────────────────────────────────────────
  console.log(h1('SECTION 1 — TABLE & COLUMN CHECK'));

  const columnReport = {};
  for (const [table, requiredCols] of Object.entries(SPREADSHEET_TABLES)) {
    const actual = await getColumns(table);
    columnReport[table] = { actual, required: requiredCols };

    if (actual.length === 0) {
      console.log(fail(`${table} — TABLE DOES NOT EXIST`));
      continue;
    }

    const missing = requiredCols.filter(c => !actual.includes(c));
    const extra   = actual.filter(c => !requiredCols.includes(c));

    if (missing.length === 0) {
      console.log(ok(`${table} — all ${requiredCols.length} required columns present`));
    } else {
      console.log(warn(`${table} — missing columns: ${missing.join(', ')}`));
    }

    if (extra.length > 0) {
      console.log(info(`  Extra columns (not in spec): ${extra.slice(0, 8).join(', ')}${extra.length > 8 ? '…' : ''}`));
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // SECTION 2 — Missing tables from spreadsheet spec
  // ────────────────────────────────────────────────────────────────────────────
  console.log(h1('SECTION 2 — MISSING TABLES (required by spreadsheet logic)'));

  for (const t of MISSING_TABLES) {
    const actual = await getColumns(t.name);
    if (actual.length > 0) {
      console.log(ok(`${t.name} — EXISTS (${actual.length} columns)`));
    } else {
      console.log(fail(`${t.name} — MISSING`));
      console.log(`     ${CYAN}Purpose:${RESET}  ${t.purpose}`);
      console.log(`     ${CYAN}From tab:${RESET} ${t.spreadsheet_tab}`);
      console.log(`     ${RED}Impact:${RESET}   ${t.impact}`);
      console.log(`     ${CYAN}Needs:${RESET}    ${t.required_columns.join(', ')}`);
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // SECTION 3 — Data quality checks
  // ────────────────────────────────────────────────────────────────────────────
  console.log(h1('SECTION 3 — DATA QUALITY'));

  // 3a. Securities
  console.log(h2('securities'));
  const totalSecs = await count('securities');
  const activeSecs = await count('securities', { is_active: true });
  console.log(info(`Total securities: ${fmt(totalSecs)}, active: ${fmt(activeSecs)}`));

  const { data: secSample } = await supabase
    .from('securities')
    .select('symbol, last_price, change_percent, change_percentage, ytd_performance')
    .eq('is_active', true)
    .limit(200);

  const noPrice    = (secSample || []).filter(s => !s.last_price || s.last_price <= 0);
  const noYtd      = (secSample || []).filter(s => s.ytd_performance == null);
  const noChangePct= (secSample || []).filter(s => s.change_percent == null && s.change_percentage == null);
  const sampleSize = (secSample || []).length;

  if (noPrice.length === 0)     console.log(ok(`All ${sampleSize} sampled securities have last_price > 0`));
  else                          console.log(fail(`${noPrice.length}/${sampleSize} securities have NULL or zero last_price`));

  if (noYtd.length === 0)       console.log(ok(`All ${sampleSize} sampled securities have ytd_performance populated`));
  else                          console.log(fail(`${noYtd.length}/${sampleSize} securities are missing ytd_performance — YTD calculation will SKIP these`));

  if (noChangePct.length === 0) console.log(ok(`change_percent populated`));
  else                          console.log(warn(`${noChangePct.length}/${sampleSize} missing change_percent / change_percentage`));

  // Check for dual column name (change_percent vs change_percentage)
  const hasBothCols = columnReport['securities']?.actual.includes('change_percent')
    && columnReport['securities']?.actual.includes('change_percentage');
  if (hasBothCols) console.log(warn('securities has BOTH change_percent and change_percentage columns — code uses both with fallback, but this is ambiguous'));

  // 3b. security_prices — YTD anchor check
  console.log(h2('security_prices'));
  const totalPrices = await count('security_prices');
  console.log(info(`Total price rows: ${fmt(totalPrices)}`));

  const { data: priceRange } = await supabase
    .from('security_prices')
    .select('ts')
    .order('ts', { ascending: true })
    .limit(1);
  const { data: priceRangeEnd } = await supabase
    .from('security_prices')
    .select('ts')
    .order('ts', { ascending: false })
    .limit(1);

  const earliest = priceRange?.[0]?.ts;
  const latest   = priceRangeEnd?.[0]?.ts;
  console.log(info(`Date range: ${earliest?.slice(0, 10) ?? 'N/A'} → ${latest?.slice(0, 10) ?? 'N/A'}`));

  // Check Dec 31 prices exist for current year YTD anchor
  const ytdYear = new Date().getFullYear() - 1;
  const { data: dec31Rows } = await supabase
    .from('security_prices')
    .select('security_id, ts, close_price')
    .gte('ts', `${ytdYear}-12-28`)
    .lte('ts', `${ytdYear}-12-31T23:59:59`);

  const dec31Count = (dec31Rows || []).length;
  if (dec31Count > 0) {
    const uniqueSecs = new Set((dec31Rows || []).map(r => r.security_id)).size;
    console.log(ok(`Dec ${ytdYear} prices found: ${dec31Count} rows covering ${uniqueSecs} securities`));
    if (uniqueSecs < (activeSecs || 0)) {
      console.log(warn(`  But ${(activeSecs || 0) - uniqueSecs} active securities are MISSING Dec ${ytdYear} prices — their YTD will fall back to ytd_performance field`));
    }
  } else {
    console.log(fail(`NO Dec ${ytdYear} prices in security_prices — YTD calculation cannot use direct price anchor; falls back entirely to ytd_performance`));
  }

  // Check latest price date vs today
  const daysSinceLatest = latest
    ? Math.floor((Date.now() - new Date(latest).getTime()) / 86400000)
    : null;
  if (daysSinceLatest != null && daysSinceLatest > 3) {
    console.log(warn(`Latest price is ${daysSinceLatest} days old (${latest?.slice(0, 10)}) — price history may be stale`));
  } else if (daysSinceLatest != null) {
    console.log(ok(`Latest price is current (${daysSinceLatest} day(s) ago)`));
  }

  // 3c. strategy_metrics
  console.log(h2('strategy_metrics'));
  const totalMetrics = await count('strategy_metrics');
  console.log(info(`Total metric rows: ${fmt(totalMetrics)}`));

  const { data: latestMetrics } = await supabase
    .from('strategy_metrics')
    .select('strategy_id, as_of_date, last_close, r_ytd, r_1m, r_3m, r_6m, r_1y, r_1w')
    .order('as_of_date', { ascending: false })
    .limit(20);

  if (latestMetrics && latestMetrics.length > 0) {
    const latestDate = latestMetrics[0].as_of_date;
    const metricDaysOld = Math.floor((Date.now() - new Date(latestDate).getTime()) / 86400000);

    if (metricDaysOld > 2)
      console.log(warn(`Latest strategy_metrics as_of_date: ${latestDate} (${metricDaysOld} days old)`));
    else
      console.log(ok(`Latest strategy_metrics as_of_date: ${latestDate} (${metricDaysOld} day(s) ago)`));

    const nullYtd = latestMetrics.filter(m => m.r_ytd == null).length;
    const null1m  = latestMetrics.filter(m => m.r_1m == null).length;
    const null1w  = latestMetrics.filter(m => m.r_1w == null).length;

    if (nullYtd === 0) console.log(ok(`r_ytd populated in latest batch`));
    else               console.log(fail(`${nullYtd}/${latestMetrics.length} latest rows have NULL r_ytd`));

    if (null1m === 0)  console.log(ok(`r_1m populated in latest batch`));
    else               console.log(warn(`${null1m}/${latestMetrics.length} latest rows have NULL r_1m`));

    if (null1w === 0)  console.log(ok(`r_1w populated in latest batch`));
    else               console.log(warn(`${null1w}/${latestMetrics.length} latest rows have NULL r_1w`));

    // Sanity check: returns should be decimals (-1 < r < 5) not percentages
    const looksLikePct = latestMetrics.filter(m => m.r_ytd != null && Math.abs(m.r_ytd) > 5);
    if (looksLikePct.length > 0) {
      console.log(fail(`${looksLikePct.length} rows have |r_ytd| > 5 — likely stored as percentage (e.g. 10) not decimal (e.g. 0.10). Code expects decimal.`));
    } else {
      console.log(ok(`r_ytd values look like decimals (|value| ≤ 5)`));
    }
  } else {
    console.log(fail('strategy_metrics is empty — all strategy returns will fall back to 0'));
  }

  // 3d. strategies
  console.log(h2('strategies'));
  const totalStrats = await count('strategies');
  const activeStrats = await count('strategies', { status: 'active' });
  console.log(info(`Total strategies: ${fmt(totalStrats)}, active: ${fmt(activeStrats)}`));

  const { data: stratSample } = await supabase
    .from('strategies')
    .select('id, name, holdings, management_fee_bps, benchmark_symbol')
    .eq('status', 'active')
    .limit(50);

  const noHoldings    = (stratSample || []).filter(s => !s.holdings || (Array.isArray(s.holdings) && s.holdings.length === 0));
  const noFee         = (stratSample || []).filter(s => s.management_fee_bps == null);
  const noBenchmark   = (stratSample || []).filter(s => !s.benchmark_symbol);

  if (noHoldings.length === 0) console.log(ok(`All active strategies have holdings defined`));
  else                         console.log(fail(`${noHoldings.length} active strategies have empty/null holdings — YTD calculation impossible for these`));

  if (noFee.length === 0)      console.log(ok(`All active strategies have management_fee_bps`));
  else                         console.log(warn(`${noFee.length} strategies have NULL management_fee_bps (fees not applied to returns anyway)`));

  if (noBenchmark.length === 0)console.log(ok(`All active strategies have benchmark_symbol`));
  else                         console.log(warn(`${noBenchmark.length} strategies have no benchmark_symbol (benchmark comparison not possible)`));

  // Check if any strategy has 'launch_units' column
  const stratCols = columnReport['strategies']?.actual || [];
  const hasLaunchUnits = stratCols.includes('launch_units');
  const hasLaunchDate  = stratCols.includes('launch_date');
  if (!hasLaunchUnits) console.log(warn(`strategies.launch_units column missing — NAV unitisation not possible`));
  if (!hasLaunchDate)  console.log(warn(`strategies.launch_date column missing`));

  // 3e. user_strategies — entry NAV check
  console.log(h2('user_strategies'));
  const userStratCols  = columnReport['user_strategies']?.actual || [];
  const hasEntryNav    = userStratCols.includes('entry_nav') || userStratCols.includes('entry_nav_per_unit');
  const hasUnitsBought = userStratCols.includes('units_bought');
  const hasEntryDate   = userStratCols.includes('entry_date') || userStratCols.includes('investment_date');

  if (hasEntryNav)    console.log(ok(`user_strategies has entry NAV column`));
  else                console.log(fail(`user_strategies has NO entry_nav column — client return vs public YTD cannot be computed correctly`));

  if (hasUnitsBought) console.log(ok(`user_strategies has units_bought column`));
  else                console.log(fail(`user_strategies has NO units_bought column — client portfolio value = entry_nav × units_bought cannot be computed`));

  if (hasEntryDate)   console.log(ok(`user_strategies has entry date column`));
  else                console.log(warn(`user_strategies has no entry_date/investment_date column`));

  const totalUserStrats = await count('user_strategies');
  console.log(info(`user_strategies rows: ${fmt(totalUserStrats)}`));

  // 3f. stock_holdings_c
  console.log(h2('stock_holdings_c'));
  const totalHoldings = await count('stock_holdings_c');
  const stratHoldings = await count('stock_holdings_c'); // strategy-linked

  const { data: holdingsSample } = await supabase
    .from('stock_holdings_c')
    .select('quantity, avg_fill, market_value, Status')
    .limit(200);

  const zeroQty  = (holdingsSample || []).filter(h => !h.quantity || Number(h.quantity) <= 0);
  const zeroFill = (holdingsSample || []).filter(h => !h.avg_fill || Number(h.avg_fill) <= 0);

  console.log(info(`Total stock_holding rows: ${fmt(totalHoldings)}`));
  if (zeroQty.length === 0)  console.log(ok(`All sampled holdings have quantity > 0`));
  else                       console.log(warn(`${zeroQty.length}/200 sampled holdings have zero/null quantity`));
  if (zeroFill.length === 0) console.log(ok(`All sampled holdings have avg_fill > 0 (cost basis present)`));
  else                       console.log(warn(`${zeroFill.length}/200 sampled holdings have zero avg_fill — PnL will be 0 for these`));

  // ────────────────────────────────────────────────────────────────────────────
  // SECTION 4 — Logic correctness vs spreadsheet rules
  // ────────────────────────────────────────────────────────────────────────────
  console.log(h1('SECTION 4 — LOGIC CORRECTNESS vs SPREADSHEET RULES'));

  for (const check of LOGIC_CHECKS) {
    const statusIcon = check.correct === true
      ? ok(check.title)
      : check.correct === false
        ? fail(`${check.title}  [Risk: ${check.risk}]`)
        : warn(`${check.title}  [NEEDS VERIFICATION]`);

    console.log(statusIcon);
    console.log(`     ${CYAN}Spreadsheet rule:${RESET} ${check.spreadsheet_rule}`);
    console.log(`     ${YELLOW}Current code:${RESET}     ${check.current_code}`);
    for (const line of check.detail) {
      console.log(`     → ${line}`);
    }
    if (check.fix) {
      console.log(`     ${GREEN}Fix:${RESET} ${check.fix}`);
    }
    console.log('');
  }

  // ────────────────────────────────────────────────────────────────────────────
  // SECTION 5 — Live YTD spot-check (pick one strategy, compare both methods)
  // ────────────────────────────────────────────────────────────────────────────
  console.log(h1('SECTION 5 — LIVE YTD SPOT-CHECK'));

  const { data: spotStrategy } = await supabase
    .from('strategies')
    .select('id, name, holdings')
    .eq('status', 'active')
    .not('holdings', 'is', null)
    .limit(1)
    .single();

  if (spotStrategy) {
    console.log(info(`Strategy under test: ${spotStrategy.name}`));
    const holdings = Array.isArray(spotStrategy.holdings) ? spotStrategy.holdings : [];
    const symbols  = holdings.map(h => h.symbol || h.ticker).filter(Boolean);

    if (symbols.length > 0) {
      const { data: secs } = await supabase
        .from('securities')
        .select('symbol, last_price, ytd_performance')
        .in('symbol', symbols);

      const secMap = {};
      (secs || []).forEach(s => { secMap[s.symbol] = s; });

      console.log(h2('Method A — current code (back-derive Jan 1 from ytd_performance)'));
      let todayVal = 0, jan1Val = 0, matched = 0;
      for (const h of holdings) {
        const sym = h.symbol || h.ticker;
        const sec = secMap[sym];
        if (!sec || !sec.last_price || sec.ytd_performance == null) {
          console.log(warn(`  ${sym}: skipped (missing price or ytd_performance)`));
          continue;
        }
        const lastPrice = Number(sec.last_price) / 100;
        const ytdPerf   = Number(sec.ytd_performance);
        const jan1Price = lastPrice / (1 + ytdPerf / 100);
        const shares    = Number(h.shares || h.quantity || 1);
        todayVal += shares * lastPrice;
        jan1Val  += shares * jan1Price;
        matched++;
        console.log(info(`  ${sym}: lastPrice=${lastPrice.toFixed(2)}, ytd_perf=${ytdPerf.toFixed(2)}%, derived Jan1=${jan1Price.toFixed(2)}, shares=${shares}`));
      }
      if (matched > 0 && jan1Val > 0) {
        console.log(ok(`  Method A YTD = ${pct((todayVal / jan1Val) - 1)} (todayVal=${todayVal.toFixed(0)}, jan1Val=${jan1Val.toFixed(0)})`));
      }

      console.log(h2('Method B — spreadsheet method (query actual Dec 31 price from security_prices)'));
      const ytdYear2 = new Date().getFullYear() - 1;
      let todayVal2 = 0, dec31Val2 = 0, matched2 = 0;
      for (const h of holdings) {
        const sym = h.symbol || h.ticker;
        const sec = secMap[sym];
        if (!sec) continue;

        const { data: dec31Row } = await supabase
          .from('security_prices')
          .select('close_price, ts')
          .eq('security_id', sec.id)  // NOTE: needs security_id, not symbol
          .gte('ts', `${ytdYear2}-12-28`)
          .lte('ts', `${ytdYear2}-12-31T23:59:59`)
          .order('ts', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!dec31Row) {
          console.log(warn(`  ${sym}: no Dec ${ytdYear2} price in security_prices`));
          continue;
        }

        const lastPrice  = Number(sec.last_price) / 100;
        const dec31Price = Number(dec31Row.close_price) / 100;
        const shares     = Number(h.shares || h.quantity || 1);
        todayVal2 += shares * lastPrice;
        dec31Val2 += shares * dec31Price;
        matched2++;
        console.log(info(`  ${sym}: today=${lastPrice.toFixed(2)}, dec31=${dec31Price.toFixed(2)} (${dec31Row.ts?.slice(0, 10)}), shares=${shares}`));
      }
      if (matched2 > 0 && dec31Val2 > 0) {
        console.log(ok(`  Method B YTD = ${pct((todayVal2 / dec31Val2) - 1)} (todayVal=${todayVal2.toFixed(0)}, dec31Val=${dec31Val2.toFixed(0)})`));
      } else {
        console.log(fail(`  Method B: insufficient Dec ${ytdYear2} prices in security_prices — cannot compute`));
      }

      // Compare
      const { data: storedMetrics } = await supabase
        .from('strategy_metrics')
        .select('r_ytd, as_of_date')
        .eq('strategy_id', spotStrategy.id)
        .order('as_of_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (storedMetrics) {
        console.log(info(`  Stored strategy_metrics.r_ytd = ${pct(storedMetrics.r_ytd ?? 0)} (as of ${storedMetrics.as_of_date})`));
      }
    } else {
      console.log(warn('Strategy has no holdings defined — spot-check skipped'));
    }
  } else {
    console.log(warn('No active strategy with holdings found — spot-check skipped'));
  }

  // ────────────────────────────────────────────────────────────────────────────
  // SECTION 6 — Summary & action plan
  // ────────────────────────────────────────────────────────────────────────────
  console.log(h1('SECTION 6 — ACTION PLAN'));

  const actions = [
    {
      priority: '🔴 CRITICAL',
      item: 'Add rebalancing_events table',
      why: 'Without it, rebalancing overwrites holdings JSONB and makes all pre-rebalance historical returns wrong',
      effort: 'Medium',
      sql: `CREATE TABLE rebalancing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id uuid REFERENCES strategies(id),
  effective_date date NOT NULL,
  ticker text NOT NULL,
  delta_qty numeric NOT NULL,
  event_type text CHECK (event_type IN ('increase','decrease','removal','addition')),
  rationale text,
  created_at timestamptz DEFAULT now()
);`,
    },
    {
      priority: '🔴 CRITICAL',
      item: 'Fix client return calculation',
      why: 'user_strategies currently has no entry_nav or units_bought — clients see public YTD, not their actual return since entry',
      effort: 'Medium',
      sql: `ALTER TABLE user_strategies
  ADD COLUMN IF NOT EXISTS entry_nav numeric,
  ADD COLUMN IF NOT EXISTS units_bought numeric,
  ADD COLUMN IF NOT EXISTS entry_date date;
-- On investment: entry_nav = current strategy_metrics.last_close / launch_units
-- units_bought  = investment_amount / entry_nav`,
    },
    {
      priority: '🟠 HIGH',
      item: 'Fix YTD denominator — query Dec 31 price directly',
      why: 'calculateYtdReturn() back-derives Jan 1 price from ytd_performance — circular if ytd_performance is wrong',
      effort: 'Low',
      sql: `-- In the YTD calc, replace the back-derivation with:
SELECT sp.close_price / 100.0 AS dec31_price
FROM security_prices sp
WHERE sp.security_id = $1
  AND sp.ts::date BETWEEN (date_trunc('year', CURRENT_DATE) - INTERVAL '4 days')
                       AND (date_trunc('year', CURRENT_DATE) - INTERVAL '1 day')
ORDER BY sp.ts DESC
LIMIT 1;`,
    },
    {
      priority: '🟠 HIGH',
      item: 'Add trading_calendar table',
      why: '1W and WTD period anchors use raw day offsets — wrong around holidays',
      effort: 'Low',
      sql: `CREATE TABLE trading_calendar (
  date date PRIMARY KEY,
  is_trading_day boolean NOT NULL DEFAULT true,
  week_start boolean NOT NULL DEFAULT false,
  month_start boolean NOT NULL DEFAULT false,
  quarter_start boolean NOT NULL DEFAULT false,
  year_start boolean NOT NULL DEFAULT false,
  prev_trading_day date
);
-- Populate with JSE business day calendar`,
    },
    {
      priority: '🟡 MEDIUM',
      item: 'Add strategy unitisation (launch_units, nav_per_unit in strategy_metrics)',
      why: 'Without fixed unit counts, last_close is ambiguous (total value vs per-unit NAV)',
      effort: 'Low',
      sql: `ALTER TABLE strategies
  ADD COLUMN IF NOT EXISTS launch_units numeric,
  ADD COLUMN IF NOT EXISTS launch_date  date;
ALTER TABLE strategy_metrics
  ADD COLUMN IF NOT EXISTS nav_per_unit numeric;`,
    },
    {
      priority: '🟡 MEDIUM',
      item: 'Apply management fees to strategy NAV',
      why: 'management_fee_bps column exists but is never deducted from returns',
      effort: 'Medium',
      sql: `-- In daily NAV update job:
-- nav_net_today = nav_gross_today * (1 - management_fee_bps / 10000 / 252)`,
    },
    {
      priority: '🟢 LOW',
      item: 'Document unit conventions in DB column comments',
      why: 'last_price, close_price, avg_fill, amount are cents; balance is Rands — undocumented',
      effort: 'Trivial',
      sql: `COMMENT ON COLUMN securities.last_price        IS 'Price in ZAR cents';
COMMENT ON COLUMN security_prices.close_price   IS 'Price in ZAR cents';
COMMENT ON COLUMN stock_holdings_c.avg_fill       IS 'Average fill price in ZAR cents';
COMMENT ON COLUMN transactions.amount           IS 'Amount in ZAR cents';
COMMENT ON COLUMN wallets.balance               IS 'Balance in ZAR (NOT cents)';`,
    },
  ];

  for (const a of actions) {
    console.log(`\n${BOLD}${a.priority} — ${a.item}${RESET}`);
    console.log(`  Why:    ${a.why}`);
    console.log(`  Effort: ${a.effort}`);
    console.log(`  ${CYAN}SQL:${RESET}`);
    a.sql.split('\n').forEach(line => console.log(`    ${line}`));
  }

  // ────────────────────────────────────────────────────────────────────────────
  // DONE
  // ────────────────────────────────────────────────────────────────────────────
  console.log(h1('AUDIT COMPLETE'));
  console.log(info('Run this script after any schema or data change to re-verify.'));
  console.log('');
}

main().catch(err => {
  console.error('\n❌ Audit failed:', err.message);
  process.exit(1);
});
