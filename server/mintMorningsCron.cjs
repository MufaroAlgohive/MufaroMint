const { Resend } = require('resend');

let _resend = null;
function getResend() {
  if (!_resend) {
    if (!process.env.RESEND_API_KEY) {
      // Return null instead of throwing an error to allow the app to run.
      return null;
    }
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

const processedDocIds = new Set();
const pendingArticles = [];
const SEND_HOUR_UTC = 5;
const SEND_MINUTE_UTC = 0;
let lastSendDate = null;
let startupCatchUpDone = false;

function parseArticleSections(bodyText) {
  if (!bodyText) return { intro: '', sections: [] };
  const parts = bodyText.split(/----------/);
  const intro = (parts[0] || '').trim();
  const sections = [];
  for (let i = 1; i < parts.length; i++) {
    const chunk = (parts[i] || '').trim();
    if (!chunk) continue;
    if (/^[A-Z][A-Z0-9 &\/\-,'.]+$/m.test(chunk.split('\n')[0])) {
      const name = chunk.split('\n')[0].trim();
      sections.push({ name, content: '' });
    } else if (sections.length > 0) {
      sections[sections.length - 1].content += (sections[sections.length - 1].content ? '\n' : '') + chunk;
    }
  }
  return { intro, sections };
}

function textToHtml(text) {
  if (!text) return '';
  return text.replace(/\n/g, '<br/>');
}

function truncateNewsContent(text, maxCharsPerPara = 280, maxParas = 3) {
  if (!text) return '';
  const paras = text.split(/\n+/).map(p => p.trim()).filter(Boolean);
  const limited = paras.slice(0, maxParas).map(p => {
    if (p.length <= maxCharsPerPara) return p;
    const cut = p.lastIndexOf(' ', maxCharsPerPara);
    return (cut > 0 ? p.slice(0, cut) : p.slice(0, maxCharsPerPara)) + '\u2026';
  });
  return limited.join('\n');
}

function buildMintMorningsHtml(articles) {
  const F = `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Inter,sans-serif`;
  const LOGO = `https://mfxnghmuccevsxwcetej.supabase.co/storage/v1/object/public/Mint%20Assets/mint-logo.svg`;

  const heroArticle = articles[0];
  const heroBody = heroArticle.body_text || heroArticle.body || '';
  const parsed = parseArticleSections(heroBody);

  const marketSections = ['MARKETS'];
  const calendarSections = ['COMPANY CALENDAR', 'ECONOMIC CALENDAR'];
  const marketOpenSections = [...marketSections, ...calendarSections, 'ECONOMICS'];

  const publishedDate = heroArticle.published_at ? new Date(heroArticle.published_at) : new Date();
  const formattedDate = publishedDate.toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' });
  const formattedTime = publishedDate.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });

  function sectionTitle(name) {
    return name.charAt(0) + name.slice(1).toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  }

  function sectionHeading(label) {
    return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0 8px;">
        <tr>
          <td style="width:1px;white-space:nowrap;padding-right:10px;font-family:${F};font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:#0f172a;">${label}</td>
          <td style="border-bottom:1px solid #e2e8f0;">&nbsp;</td>
        </tr>
      </table>`;
  }

  function articleCard(article, isHero) {
    const body = article.body_text || article.body || '';
    const src = article.source || 'Alliance News South Africa';
    const author = article.author || '';
    const artParsed = isHero ? parsed : parseArticleSections(body);
    const artMarketData = artParsed.sections.filter(s => marketSections.includes(s.name));
    const artCalendarData = artParsed.sections.filter(s => calendarSections.includes(s.name));
    const artEconomicsData = artParsed.sections.filter(s => s.name === 'ECONOMICS');
    const artNewsSections = artParsed.sections.filter(s => !marketOpenSections.includes(s.name));
    const artIndustries = Array.isArray(article.industries) ? article.industries : [];
    const artMarkets = Array.isArray(article.markets) ? article.markets : [];
    const topics = [...artIndustries, ...artMarkets];

    let bodyHtml = artParsed.intro
      ? `<p style="margin:0 0 10px;font-family:${F};font-size:14px;line-height:1.6;color:#334155;">${textToHtml(artParsed.intro)}</p>`
      : '';

    if (artMarketData.length > 0) {
      bodyHtml += sectionHeading('Markets');
      bodyHtml += `
        <div style="background:#fafafa;border:1px solid #f1f5f9;border-radius:10px;padding:12px 14px;margin-bottom:8px;">
          <p style="margin:0;font-family:${F};font-size:13px;line-height:1.7;color:#334155;">${textToHtml(artMarketData[0].content)}</p>
          <p style="margin:6px 0 0;font-family:${F};font-size:11px;color:#94a3b8;">Changes since prior Johannesburg equities close.</p>
        </div>`;
    }

    [...artCalendarData, ...artEconomicsData].forEach(s => {
      bodyHtml += sectionHeading(sectionTitle(s.name));
      bodyHtml += `
        <div style="background:#fafafa;border:1px solid #f1f5f9;border-radius:10px;padding:12px 14px;margin-bottom:8px;">
          <p style="margin:0;font-family:${F};font-size:13px;line-height:1.7;color:#334155;">${textToHtml(s.content)}</p>
        </div>`;
    });

    artNewsSections.forEach(s => {
      bodyHtml += sectionHeading(sectionTitle(s.name));
      bodyHtml += `<p style="margin:0 0 10px;font-family:${F};font-size:14px;line-height:1.6;color:#334155;">${textToHtml(truncateNewsContent(s.content))}</p>`;
    });

    const authorHtml = author
      ? `<p style="margin:10px 0 0;font-family:${F};font-size:11px;color:#94a3b8;font-style:italic;">By ${author}</p>`
      : '';

    const topicsHtml = topics.length > 0 ? `
      <div style="margin-top:16px;padding-top:14px;border-top:1px solid #f1f5f9;">
        <div style="font-family:${F};font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;margin-bottom:8px;">Related Topics</div>
        <div>${topics.map(t => `<span style="display:inline-block;border:1px solid #e2e8f0;border-radius:9999px;padding:3px 10px;font-family:${F};font-size:11px;font-weight:500;color:#64748b;margin:0 5px 5px 0;">${t}</span>`).join('')}</div>
      </div>` : '';

    const cardHeader = `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-bottom:1px solid #f1f5f9;padding-bottom:16px;margin-bottom:16px;">
        <tr>
          <td style="padding-right:12px;vertical-align:middle;" width="44">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="width:44px;height:44px;border-radius:50%;background:#f1f5f9;text-align:center;vertical-align:middle;">
                  <img src="${LOGO}" height="20" alt="Mint" style="display:inline-block;height:20px;border:0;outline:none;" />
                </td>
              </tr>
            </table>
          </td>
          <td style="vertical-align:middle;">
            <div style="font-family:${F};font-size:13px;font-weight:600;color:#0f172a;line-height:1.3;">Mint News</div>
            <div style="font-family:${F};font-size:11px;color:#64748b;margin-top:2px;">${formattedDate} &bull; ${formattedTime}</div>
          </td>
        </tr>
      </table>`;

    const titleSize = isHero ? '22px' : '18px';
    const titleWeight = '700';

    return `
    <tr>
      <td style="padding:${isHero ? '0' : '12px'} 16px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
          class="card" style="max-width:600px;background:#ffffff;border-radius:24px;box-shadow:0 2px 12px rgba(0,0,0,0.08);overflow:hidden;">
          <tr>
            <td style="padding:22px 22px 0 22px;">
              ${cardHeader}
              <div style="margin-bottom:10px;">
                <span style="display:inline-block;background:#f1f5f9;border-radius:9999px;padding:3px 10px;font-family:${F};font-size:11px;font-weight:600;color:#475569;margin-right:6px;">${src}</span>
                ${article.channel ? `<span style="display:inline-block;background:#ede9fe;border-radius:9999px;padding:3px 10px;font-family:${F};font-size:11px;font-weight:600;color:#6d28d9;">${article.channel}</span>` : ''}
              </div>
              <div style="font-family:${F};font-size:${titleSize};line-height:1.25;font-weight:${titleWeight};color:#0f172a;margin-bottom:12px;letter-spacing:-0.3px;">${article.title}</div>
              ${bodyHtml}
              ${authorHtml}
              ${topicsHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 22px 22px;">
              <a href="https://www.mymint.co.za" style="background:#6d28d9;border-radius:10px;color:#ffffff;display:inline-block;font-family:${F};font-size:13px;font-weight:700;line-height:1;padding:10px 18px;text-decoration:none;">Read more on Mint</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
  }

  const heroCardHtml = articleCard(heroArticle, true);
  const restCardsHtml = articles.slice(1).map(a => articleCard(a, false)).join('\n');

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="ltr" lang="en">
<head>
  <meta content="width=device-width" name="viewport" />
  <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta content="IE=edge" http-equiv="X-UA-Compatible" />
  <style>
    @media only screen and (max-width: 600px) {
      .wrap { padding: 12px 8px !important; }
      .card { border-radius: 16px !important; }
      .card td { padding-left: 16px !important; padding-right: 16px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;">
  <div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0;">
    Johannesburg market preview, SA news, global headlines.
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f1f5f9">
    <tr>
      <td class="wrap" align="center" style="padding:32px 16px 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
          ${heroCardHtml}
          ${restCardsHtml}
          <tr>
            <td style="padding:12px 16px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:14px 18px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;">
                    <div style="font-family:${F};font-size:11px;line-height:1.6;color:#94a3b8;">
                      Alliance News South Africa covers every actively traded company listed on the Johannesburg Stock Exchange, large and small, and the global influences upon South African markets and the local economy.<br/><br/>
                      &copy; ${new Date().getFullYear()} Alliance News Ltd. All rights reserved &nbsp;&bull;&nbsp;
                      <a href="https://www.mymint.co.za" style="color:#6d28d9;text-decoration:none;font-weight:700;">Open Mint</a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function sendEmailToAllUsers(supabaseAdmin, article) {
  const resend = getResend();
  if (!resend) {
    console.warn('[MINT MORNINGS] No RESEND_API_KEY configured, cannot send emails.');
    return;
  }

  const docId = article.doc_id;
  console.log(`[MINT MORNINGS] Sending article doc_id=${docId} "${article.title}" to all users...`);
  const html = buildMintMorningsHtml([article]);

  const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();

  if (usersError) {
    console.error('[MINT MORNINGS] Error fetching users:', usersError.message);
    return;
  }

  const confirmedUsers = users.filter(u => u.email_confirmed_at && u.email);
  console.log(`[MINT MORNINGS] Sending to ${confirmedUsers.length} confirmed user(s)...`);

  if (confirmedUsers.length === 0) {
    console.log('[MINT MORNINGS] No confirmed users to send to.');
    return;
  }

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < confirmedUsers.length; i++) {
    const user = confirmedUsers[i];
    try {
      const resp = await resend.emails.send({
        from: 'MINT MORNINGS <mornings@mymint.co.za>',
        to: [user.email],
        subject: `MINT MORNINGS — ${article.title}`,
        html: html,
      });
      if (resp.error) {
        console.error(`[MINT MORNINGS] Failed to send to ${user.email}:`, resp.error.message);
        failCount++;
      } else {
        successCount++;
      }
    } catch (err) {
      console.error(`[MINT MORNINGS] Failed to send to ${user.email}:`, err.message);
      failCount++;
    }
    if (i < confirmedUsers.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 600));
    }
  }

  console.log(`[MINT MORNINGS] doc_id=${docId} complete: ${successCount} sent, ${failCount} failed.`);
}

let lastCheckedAt = null;
let pollingInterval = null;
let isInitialized = false;

async function initializeLastCheckedAt(supabaseAdmin) {
  try {
    const { data, error } = await supabaseAdmin
      .from('News_articles')
      .select('created_at')
      .filter('content_types', 'cs', '"ALLBRF"')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('[MINT MORNINGS] Failed to get last article timestamp:', error.message);
      lastCheckedAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      return;
    }

    if (data && data.length > 0) {
      lastCheckedAt = data[0].created_at;
      console.log(`[MINT MORNINGS] Initialized from latest article: ${lastCheckedAt}`);
    } else {
      lastCheckedAt = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      console.log(`[MINT MORNINGS] No existing articles, using 24h lookback: ${lastCheckedAt}`);
    }
  } catch (err) {
    console.error('[MINT MORNINGS] Init error:', err.message);
    lastCheckedAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  }
}

async function pollForNewArticles(supabaseAdmin) {
  try {
    if (!isInitialized) {
      await initializeLastCheckedAt(supabaseAdmin);
      isInitialized = true;
    }

    const { data: articles, error } = await supabaseAdmin
      .from('News_articles')
      .select('*')
      .filter('content_types', 'cs', '"ALLBRF"')
      .gt('created_at', lastCheckedAt)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[MINT MORNINGS] Polling error:', error.message);
      return;
    }

    if (!articles || articles.length === 0) return;

    for (const article of articles) {
      const docIdStr = String(article.doc_id);
      if (processedDocIds.has(docIdStr)) continue;

      processedDocIds.add(docIdStr);
      pendingArticles.push(article);
      console.log(`[MINT MORNINGS] New ALLBRF article queued: doc_id=${docIdStr} "${article.title}" (pending: ${pendingArticles.length})`);
    }

    lastCheckedAt = articles[articles.length - 1].created_at;

    if (processedDocIds.size > 10000) {
      const entries = Array.from(processedDocIds);
      entries.splice(0, entries.length - 5000).forEach(id => processedDocIds.delete(id));
    }
  } catch (err) {
    console.error('[MINT MORNINGS] Polling unexpected error:', err.message);
  }
}

function getSASTDateStr() {
  const now = new Date();
  const sast = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  return `${sast.getUTCFullYear()}-${String(sast.getUTCMonth() + 1).padStart(2, '0')}-${String(sast.getUTCDate()).padStart(2, '0')}`;
}

async function fetchTodaysArticles(supabaseAdmin) {
  const now = new Date();
  const sastNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const todayStart = new Date(Date.UTC(sastNow.getUTCFullYear(), sastNow.getUTCMonth(), sastNow.getUTCDate()));
  const startUTC = new Date(todayStart.getTime() - 2 * 60 * 60 * 1000).toISOString();

  const { data: articles, error } = await supabaseAdmin
    .from('News_articles')
    .select('*')
    .filter('content_types', 'cs', '"ALLBRF"')
    .gte('published_at', startUTC)
    .order('published_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('[MINT MORNINGS] Error fetching today\'s articles:', error.message);
    return [];
  }
  return articles || [];
}

async function checkScheduledSend(supabaseAdmin) {
  const now = new Date();
  const currentHour = now.getUTCHours();
  const currentMinute = now.getUTCMinutes();
  const todayStr = getSASTDateStr();

  const isScheduledTime = currentHour === SEND_HOUR_UTC && currentMinute >= SEND_MINUTE_UTC && currentMinute < SEND_MINUTE_UTC + 2;
  const isCatchUp = !startupCatchUpDone && currentHour >= SEND_HOUR_UTC;

  if ((isScheduledTime || isCatchUp) && lastSendDate !== todayStr) {
    if (isCatchUp) {
      startupCatchUpDone = true;
      console.log(`[MINT MORNINGS] Server started after 07:00 SAST — checking for unsent articles...`);
    }

    const articles = await fetchTodaysArticles(supabaseAdmin);

    if (articles.length === 0) {
      console.log(`[MINT MORNINGS] ${isScheduledTime ? '07:00 SAST' : 'Catch-up'} — no ALLBRF articles found for today`);
      if (isScheduledTime) lastSendDate = todayStr;
      return;
    }

    lastSendDate = todayStr;
    console.log(`[MINT MORNINGS] ${isScheduledTime ? '07:00 SAST' : 'Catch-up'} — sending ${articles.length} ALLBRF article(s)...`);

    for (const article of articles) {
      await sendEmailToAllUsers(supabaseAdmin, article);
    }

    console.log(`[MINT MORNINGS] ${isScheduledTime ? '07:00 SAST' : 'Catch-up'} send complete`);
  }
}

function startMintMorningsListener(supabaseAdmin) {
  if (!supabaseAdmin) {
    console.error('[MINT MORNINGS] No Supabase admin client available');
    return null;
  }

  if (!getResend()) {
    console.warn('[MINT MORNINGS] No RESEND_API_KEY configured. Mint Mornings email listener will not start.');
    return null;
  }

  pollForNewArticles(supabaseAdmin);

  pollingInterval = setInterval(() => {
    pollForNewArticles(supabaseAdmin);
  }, 30000);

  setInterval(() => {
    checkScheduledSend(supabaseAdmin);
  }, 60000);

  setTimeout(() => {
    checkScheduledSend(supabaseAdmin);
  }, 5000);

  console.log(`[MINT MORNINGS] Listener started — polling every 30s, scheduled send at 07:00 SAST (05:00 UTC), catch-up enabled`);
  return pollingInterval;
}

async function sendTestEmail(supabaseAdmin, testEmail, titleSearch) {
  if (!supabaseAdmin) {
    console.error('[MINT MORNINGS TEST] No Supabase admin client available');
    return { success: false, error: 'No database connection' };
  }
  const resend = getResend();
  if (!resend) {
    console.error('[MINT MORNINGS TEST] No RESEND_API_KEY configured');
    return { success: false, error: 'No RESEND_API_KEY' };
  }
  console.log(`[MINT MORNINGS TEST] Sending test email to ${testEmail}${titleSearch ? ` (search: "${titleSearch}")` : ''}...`);

  let query = supabaseAdmin
    .from('News_articles')
    .select('*')
    .filter('content_types', 'cs', '"ALLBRF"')
    .order('published_at', { ascending: false })
    .limit(titleSearch ? 50 : 1);

  if (titleSearch) {
    query = query.ilike('title', `%${titleSearch}%`);
  }

  const { data: articles, error: articlesError } = await query;

  if (articlesError) {
    console.error('[MINT MORNINGS TEST] Error fetching articles:', articlesError.message);
    return { success: false, error: articlesError.message };
  }

  if (!articles || articles.length === 0) {
    return { success: false, error: 'No ALLBRF articles found in the database' };
  }

  const article = articles[0];
  console.log(`[MINT MORNINGS TEST] Using article doc_id=${article.doc_id} "${article.title}"`);
  const html = buildMintMorningsHtml([article]);

  try {
    const resendResponse = await resend.emails.send({
      from: 'MINT MORNINGS <mornings@mymint.co.za>',
      to: [testEmail],
      subject: `MINT MORNINGS — ${article.title}`,
      html: html,
    });
    console.log(`[MINT MORNINGS TEST] Resend API response:`, JSON.stringify(resendResponse));
    console.log(`[MINT MORNINGS TEST] Test email sent to ${testEmail}`);
    return { success: true, doc_id: article.doc_id, title: article.title, resendResponse };
  } catch (err) {
    console.error(`[MINT MORNINGS TEST] Failed:`, err.message, err);
    return { success: false, error: err.message };
  }
}

module.exports = { startMintMorningsListener, sendTestEmail, buildMintMorningsHtml };
