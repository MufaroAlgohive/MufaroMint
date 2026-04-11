const https = require('https');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

function apiGet(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(SUPABASE_URL + '/rest/v1/' + path);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY }
    };
    https.get(options, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

const norm = s => typeof s === 'string' ? s.split('.')[0].toUpperCase() : s;

async function main() {
  const strategies = await apiGet('strategies?select=id,name,holdings,strategy_metrics(r_ytd)');
  if (!Array.isArray(strategies)) { console.error('Failed to fetch strategies:', strategies); return; }

  const allSymbols = [...new Set(strategies.flatMap(s => {
    const h = Array.isArray(s.holdings) ? s.holdings : JSON.parse(s.holdings || '[]');
    return h.map(x => x.ticker || x.symbol).filter(Boolean);
  }))];

  const secs = await apiGet(`securities?select=symbol,last_price,ytd_performance&symbol=in.(${allSymbols.join(',')})`);
  const secMap = new Map(secs.map(s => [s.symbol, s]));
  secs.forEach(s => { if (!secMap.has(norm(s.symbol))) secMap.set(norm(s.symbol), s); });

  const inDB = allSymbols.filter(sym => secMap.has(sym) || secMap.has(norm(sym)));
  const missing = allSymbols.filter(sym => !secMap.has(sym) && !secMap.has(norm(sym)));
  console.log(`\nSecurities: ${secs.length} in DB covering ${inDB.length}/${allSymbols.length} holding tickers`);
  if (missing.length) console.log('NOT IN DB:', missing.join(', '));

  for (const strat of strategies) {
    const holdings = Array.isArray(strat.holdings) ? strat.holdings : JSON.parse(strat.holdings || '[]');
    let todayVal = 0, jan1Val = 0, matched = 0;
    const rows = [];

    for (const h of holdings) {
      const sym = h.ticker || h.symbol;
      const sec = secMap.get(sym) || secMap.get(norm(sym));
      const price = sec ? Number(sec.last_price) : 0;
      const ytdPerf = sec ? Number(sec.ytd_performance) : NaN;
      const shares = Number(h.shares || h.quantity || 1);
      let status = '';

      if (!sec)          status = 'NOT IN DB';
      else if (!price)   status = 'no price';
      else if (isNaN(ytdPerf) || ytdPerf === null) status = 'ytd=null';
      else if (ytdPerf < -90) status = `SKIPPED (ytd=${ytdPerf.toFixed(1)}%)`;
      else {
        const jan1Price = price / (1 + ytdPerf / 100);
        todayVal += price * shares;
        jan1Val  += jan1Price * shares;
        matched++;
        status = `ytd=${ytdPerf.toFixed(2)}%  price=R${(price/100).toFixed(2)}`;
      }
      rows.push({ sym, shares, status });
    }

    const liveYtd = (matched > 0 && jan1Val > 0)
      ? ((todayVal / jan1Val - 1) * 100).toFixed(2) + '%'
      : 'NO MATCH → using fallback';
    const staticYtd = strat.strategy_metrics?.[0]?.r_ytd != null
      ? (strat.strategy_metrics[0].r_ytd * 100).toFixed(2) + '%' : 'n/a';
    const using = matched > 0 ? 'LIVE' : 'FALLBACK';

    console.log(`\n▶ ${strat.name}`);
    console.log(`  Displaying [${using}]: ${liveYtd}   (static r_ytd: ${staticYtd})`);
    console.log(`  Matched ${matched}/${holdings.length} holdings`);
    rows.forEach(r => console.log(`    ${r.sym.padEnd(12)} ×${String(r.shares).padStart(5)}  ${r.status}`));
  }
}

main().catch(console.error);
