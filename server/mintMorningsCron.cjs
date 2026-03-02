const { Resend } = require('resend');

let _resend = null;
function getResend() {
  if (!_resend) {
    if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is not set');
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

const processedDocIds = new Set();
const pendingArticles = [];
const SEND_HOUR_UTC = 5;
const SEND_MINUTE_UTC = 0;
let lastSendDate = null;

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

function buildMintMorningsHtml(articles) {
  const F = 'Inter,Segoe UI,Arial,sans-serif';
  const heroArticle = articles[0];
  const heroBody = heroArticle.body_text || heroArticle.body || '';
  const heroSource = heroArticle.source || 'Alliance News South Africa';
  const heroAuthor = heroArticle.author || '';
  const parsed = parseArticleSections(heroBody);

  const marketSections = ['MARKETS'];
  const calendarSections = ['COMPANY CALENDAR', 'ECONOMIC CALENDAR'];
  const marketOpenSections = [...marketSections, ...calendarSections, 'ECONOMICS'];

  const marketData = parsed.sections.filter(s => marketSections.includes(s.name));
  const calendarData = parsed.sections.filter(s => calendarSections.includes(s.name));
  const economicsData = parsed.sections.filter(s => s.name === 'ECONOMICS');
  const newsSections = parsed.sections.filter(s => !marketOpenSections.includes(s.name));

  const topHeadlines = newsSections.length > 0
    ? newsSections.slice(0, 3).map(s => {
        const firstLine = (s.content || '').split('\n')[0].trim();
        return firstLine.length > 80 ? firstLine.substring(0, 80) + '...' : firstLine;
      }).filter(Boolean)
    : [];

  const hasMarketOpen = marketData.length > 0 || calendarData.length > 0;

  let marketOpenCard = '';
  if (hasMarketOpen) {
    let marketsBox = '';
    if (marketData.length > 0) {
      marketsBox = `
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:14px;">
<tr>
<td style="padding:12px 12px;border-radius:18px;background:#FAFAFF;border:1px solid #ECEBFF;">
<div style="font-family:${F};font-size:13px;color:#7B8194;font-weight:700;">
                              MARKETS
</div>

                            <div style="margin-top:10px;font-family:${F};font-size:14px;line-height:20px;color:#121526;">
                              ${textToHtml(marketData[0].content)}
</div>

                            <div style="margin-top:14px;font-family:${F};font-size:12px;line-height:17px;color:#7B8194;">
                              Figures reflect changes since the prior Johannesburg equities close.
</div>
</td>
</tr>
</table>`;
    }

    let calendarBox = '';
    if (calendarData.length > 0 || economicsData.length > 0) {
      const calItems = [...calendarData, ...economicsData].map(s => {
        return `
                            <div style="margin-top:14px;font-family:${F};font-size:13px;color:#7B8194;font-weight:700;">
                              ${s.name}
</div>
<div style="margin-top:8px;font-family:${F};font-size:14px;line-height:20px;color:#121526;">
                              ${textToHtml(s.content)}
</div>`;
      }).join('');

      calendarBox = `
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:14px;">
<tr>
<td style="padding:12px 12px;border-radius:18px;background:#FFFFFF;border:1px solid #F0F1F6;">
${calItems}
</td>
</tr>
</table>`;
    }

    marketOpenCard = `
            <!-- Before market open -->
<tr>
<td class="px" style="padding:16px 24px 0 24px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
                  class="card" style="background:#FFFFFF;border-radius:26px;box-shadow:0 14px 38px rgba(28,22,58,0.08);overflow:hidden;">
<tr>
<td style="padding:18px 20px;">
<div class="h2" style="font-family:${F};font-size:18px;line-height:24px;color:#121526;font-weight:800;">
                        Before the market open
</div>
<div class="muted" style="margin-top:6px;font-family:${F};font-size:13px;line-height:18px;color:#7B8194;">
                        Key levels and overnight moves
</div>
${marketsBox}
${calendarBox}

                      <div style="margin-top:16px;">
<a href="https://www.mymint.co.za" class="btn"
                          style="background:#6D28FF;border-radius:14px;color:#FFFFFF;display:inline-block;font-family:${F};font-size:14px;font-weight:700;line-height:16px;padding:12px 16px;text-decoration:none;">
                          Read more on Mint
</a>
</div>
</td>
</tr>
</table>
</td>
</tr>`;
  }

  const newsCards = newsSections.map((section) => {
    return `
            <!-- ${section.name} -->
<tr>
<td class="px" style="padding:16px 24px 0 24px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
                  class="card" style="background:#FFFFFF;border-radius:26px;box-shadow:0 14px 38px rgba(28,22,58,0.08);overflow:hidden;">
<tr>
<td style="padding:18px 20px;">
<div class="h2" style="font-family:${F};font-size:18px;line-height:24px;color:#121526;font-weight:800;">
                        ${section.name.charAt(0) + section.name.slice(1).toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
</div>

                      <div style="margin-top:10px;font-family:${F};font-size:14px;line-height:20px;color:#4B5166;">
                        ${textToHtml(section.content)}
</div>

                      <div style="margin-top:14px;">
<a href="https://www.mymint.co.za" class="btn"
                          style="background:#6D28FF;border-radius:14px;color:#FFFFFF;display:inline-block;font-family:${F};font-size:14px;font-weight:700;line-height:16px;padding:12px 16px;text-decoration:none;">
                          Read more on Mint
</a>
</div>
</td>
</tr>
</table>
</td>
</tr>`;
  }).join('\n');

  const topHeadlinesBox = topHeadlines.length > 0
    ? `
                  <tr>
<td style="padding:0 20px 18px 20px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
<tr>
<td style="padding:14px 14px;border-radius:18px;background:#F4F2FF;border:1px solid #E8E5FF;">
<div class="h2" style="font-family:${F};font-size:17px;line-height:22px;color:#121526;font-weight:800;">
                              Top side headlines
</div>
<div style="margin-top:8px;font-family:${F};font-size:14px;line-height:20px;color:#4B5166;">
                              ${topHeadlines.join('<br/>')}
</div>

                            <div style="margin-top:14px;">
<a href="https://www.mymint.co.za" class="btn"
                                style="background:#6D28FF;border-radius:14px;color:#FFFFFF;display:inline-block;font-family:${F};font-size:14px;font-weight:700;line-height:16px;padding:12px 16px;text-decoration:none;">
                                Read more on Mint
</a>
</div>
</td>
</tr>
</table>
</td>
</tr>`
    : `
                  <tr>
<td style="padding:0 20px 18px 20px;">
<div>
<a href="https://www.mymint.co.za" class="btn"
                          style="background:#6D28FF;border-radius:14px;color:#FFFFFF;display:inline-block;font-family:${F};font-size:14px;font-weight:700;line-height:16px;padding:12px 16px;text-decoration:none;">
                          Read more on Mint
</a>
</div>
</td>
</tr>`;

  function buildArticleCards(article) {
    const articleBody = article.body_text || article.body || '';
    const articleParsed = parseArticleSections(articleBody);
    const articleSource = article.source || 'Alliance News South Africa';
    const articleAuthor = article.author || '';

    const artMarketData = articleParsed.sections.filter(s => marketSections.includes(s.name));
    const artCalendarData = articleParsed.sections.filter(s => calendarSections.includes(s.name));
    const artEconomicsData = articleParsed.sections.filter(s => s.name === 'ECONOMICS');
    const artNewsSections = articleParsed.sections.filter(s => !marketOpenSections.includes(s.name));
    const artHasMarketOpen = artMarketData.length > 0 || artCalendarData.length > 0;

    let cards = '';

    cards += `
            <!-- Article Hero -->
<tr>
<td class="px" style="padding:16px 24px 0 24px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
                  class="card" style="background:#FFFFFF;border-radius:26px;box-shadow:0 14px 38px rgba(28,22,58,0.08);overflow:hidden;">
<tr>
<td style="padding:20px 20px 14px 20px;">
<div style="font-family:${F};font-size:12px;color:#7B8194;">
                        ${articleSource}, formatted for Mint
</div>

                      <div class="h2" style="margin-top:10px;font-family:${F};font-size:18px;line-height:24px;color:#121526;font-weight:800;">
                        ${article.title}
</div>

                      <div style="margin-top:10px;font-family:${F};font-size:14px;line-height:20px;color:#4B5166;">
                        ${textToHtml(articleParsed.intro)}
</div>

                      ${articleAuthor ? `<div style="margin-top:14px;font-family:${F};font-size:13px;color:#7B8194;">
                        By ${articleAuthor}
</div>` : ''}
</td>
</tr>
<tr>
<td style="padding:0 20px 18px 20px;">
<div>
<a href="https://www.mymint.co.za" class="btn"
                          style="background:#6D28FF;border-radius:14px;color:#FFFFFF;display:inline-block;font-family:${F};font-size:14px;font-weight:700;line-height:16px;padding:12px 16px;text-decoration:none;">
                          Read more on Mint
</a>
</div>
</td>
</tr>
</table>
</td>
</tr>`;

    if (artHasMarketOpen) {
      let artMarketsBox = '';
      if (artMarketData.length > 0) {
        artMarketsBox = `
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:14px;">
<tr>
<td style="padding:12px 12px;border-radius:18px;background:#FAFAFF;border:1px solid #ECEBFF;">
<div style="font-family:${F};font-size:13px;color:#7B8194;font-weight:700;">MARKETS</div>
<div style="margin-top:10px;font-family:${F};font-size:14px;line-height:20px;color:#121526;">
                              ${textToHtml(artMarketData[0].content)}
</div>
<div style="margin-top:14px;font-family:${F};font-size:12px;line-height:17px;color:#7B8194;">
                              Figures reflect changes since the prior close.
</div>
</td>
</tr>
</table>`;
      }

      let artCalendarBox = '';
      if (artCalendarData.length > 0 || artEconomicsData.length > 0) {
        const artCalItems = [...artCalendarData, ...artEconomicsData].map(s => {
          return `
<div style="margin-top:14px;font-family:${F};font-size:13px;color:#7B8194;font-weight:700;">${s.name}</div>
<div style="margin-top:8px;font-family:${F};font-size:14px;line-height:20px;color:#121526;">${textToHtml(s.content)}</div>`;
        }).join('');

        artCalendarBox = `
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:14px;">
<tr>
<td style="padding:12px 12px;border-radius:18px;background:#FFFFFF;border:1px solid #F0F1F6;">
${artCalItems}
</td>
</tr>
</table>`;
      }

      cards += `
<tr>
<td class="px" style="padding:16px 24px 0 24px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
                  class="card" style="background:#FFFFFF;border-radius:26px;box-shadow:0 14px 38px rgba(28,22,58,0.08);overflow:hidden;">
<tr>
<td style="padding:18px 20px;">
<div class="h2" style="font-family:${F};font-size:18px;line-height:24px;color:#121526;font-weight:800;">
                        Before the market open
</div>
<div class="muted" style="margin-top:6px;font-family:${F};font-size:13px;line-height:18px;color:#7B8194;">
                        Key levels and overnight moves
</div>
${artMarketsBox}
${artCalendarBox}
                      <div style="margin-top:16px;">
<a href="https://www.mymint.co.za" class="btn"
                          style="background:#6D28FF;border-radius:14px;color:#FFFFFF;display:inline-block;font-family:${F};font-size:14px;font-weight:700;line-height:16px;padding:12px 16px;text-decoration:none;">
                          Read more on Mint
</a>
</div>
</td>
</tr>
</table>
</td>
</tr>`;
    }

    artNewsSections.forEach((section) => {
      cards += `
<tr>
<td class="px" style="padding:16px 24px 0 24px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
                  class="card" style="background:#FFFFFF;border-radius:26px;box-shadow:0 14px 38px rgba(28,22,58,0.08);overflow:hidden;">
<tr>
<td style="padding:18px 20px;">
<div class="h2" style="font-family:${F};font-size:18px;line-height:24px;color:#121526;font-weight:800;">
                        ${section.name.charAt(0) + section.name.slice(1).toLowerCase().replace(/\\b\\w/g, c => c.toUpperCase())}
</div>
<div style="margin-top:10px;font-family:${F};font-size:14px;line-height:20px;color:#4B5166;">
                        ${textToHtml(section.content)}
</div>
                      <div style="margin-top:14px;">
<a href="https://www.mymint.co.za" class="btn"
                          style="background:#6D28FF;border-radius:14px;color:#FFFFFF;display:inline-block;font-family:${F};font-size:14px;font-weight:700;line-height:16px;padding:12px 16px;text-decoration:none;">
                          Read more on Mint
</a>
</div>
</td>
</tr>
</table>
</td>
</tr>`;
    });

    return cards;
  }

  const restArticleCards = articles.slice(1).map(buildArticleCards).join('\n');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<title>Mint News</title>
<style>
      @media (max-width: 620px) {
        .container { width: 100% !important; }
        .px { padding-left: 16px !important; padding-right: 16px !important; }
        .card { border-radius: 20px !important; }
        .h1 { font-size: 22px !important; line-height: 28px !important; }
        .h2 { font-size: 16px !important; line-height: 22px !important; }
        .muted { font-size: 13px !important; }
        .btn { display: block !important; width: 100% !important; }
      }
</style>
</head>

  <body style="margin:0;padding:0;background:#F6F7FB;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      Johannesburg market preview, SA news, global headlines.
</div>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#F6F7FB;">
<tr>
<td align="center" style="padding:24px 12px;">
<table role="presentation" class="container" width="600" cellspacing="0" cellpadding="0" border="0" style="width:600px;max-width:600px;">

            <!-- Header -->
<tr>
<td class="px" style="padding:6px 24px 14px 24px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
<tr>
<td align="left" style="padding:0;">
<img
                        src="https://www.mymint.co.za/assets/mint-logo.svg"
                        width="110"
                        alt="Mint"
                        style="display:block;border:0;outline:none;text-decoration:none;height:auto;"
                      />
</td>
<td align="right" style="padding:0;">
<span style="font-family:${F};font-size:13px;color:#7B8194;">
                        Market Brief
</span>
</td>
</tr>
</table>
</td>
</tr>

            <!-- Hero -->
<tr>
<td class="px" style="padding:0 24px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
                  class="card" style="background:#FFFFFF;border-radius:26px;box-shadow:0 14px 38px rgba(28,22,58,0.10);overflow:hidden;">
<tr>
<td style="padding:20px 20px 14px 20px;">
<div style="font-family:${F};font-size:12px;color:#7B8194;">
                        ${heroSource}, formatted for Mint
</div>

                      <div class="h1" style="margin-top:10px;font-family:${F};font-size:26px;line-height:32px;color:#121526;font-weight:800;">
                        ${heroArticle.title}
</div>

                      <div style="margin-top:10px;font-family:${F};font-size:14px;line-height:20px;color:#4B5166;">
                        ${textToHtml(parsed.intro)}
</div>

                      ${heroAuthor ? `<div style="margin-top:14px;font-family:${F};font-size:13px;color:#7B8194;">
                        By ${heroAuthor}
</div>` : ''}
</td>
</tr>

${topHeadlinesBox}
</table>
</td>
</tr>

${marketOpenCard}

${newsCards}

${restArticleCards}

            <!-- Footer -->
<tr>
<td class="px" style="padding:18px 24px 28px 24px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
<tr>
<td style="padding:16px 18px;background:#FFFFFF;border:1px solid #F0F1F6;border-radius:22px;">
<div style="font-family:${F};font-size:12px;line-height:17px;color:#7B8194;">
                        Alliance News South Africa covers every actively traded company listed on the Johannesburg Stock Exchange, large and small, and the global influences upon South African markets and the local economy.
<br/><br/>
                        Copyright &copy; ${new Date().getFullYear()} Alliance News Ltd. All rights reserved.
</div>
<div style="margin-top:12px;font-family:${F};font-size:12px;color:#7B8194;">
                        You're receiving this on Mint. <a href="https://www.mymint.co.za" style="color:#6D28FF;text-decoration:none;font-weight:700;">Open Mint</a>
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
  if (!process.env.RESEND_API_KEY) {
    console.error('[MINT MORNINGS] No RESEND_API_KEY configured');
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

  const batchSize = 50;
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < confirmedUsers.length; i += batchSize) {
    const batch = confirmedUsers.slice(i, i + batchSize);
    const emailPromises = batch.map(async (user) => {
      try {
        await getResend().emails.send({
          from: 'MINT MORNINGS <mornings@mymint.co.za>',
          to: [user.email],
          subject: `MINT MORNINGS — ${article.title}`,
          html: html,
        });
        successCount++;
      } catch (err) {
        console.error(`[MINT MORNINGS] Failed to send to ${user.email}:`, err.message);
        failCount++;
      }
    });

    await Promise.all(emailPromises);

    if (i + batchSize < confirmedUsers.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
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

function getTodayDateStr() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
}

async function checkScheduledSend(supabaseAdmin) {
  const now = new Date();
  const currentHour = now.getUTCHours();
  const currentMinute = now.getUTCMinutes();
  const todayStr = getTodayDateStr();

  if (currentHour === SEND_HOUR_UTC && currentMinute >= SEND_MINUTE_UTC && currentMinute < SEND_MINUTE_UTC + 2 && lastSendDate !== todayStr) {
    lastSendDate = todayStr;

    if (pendingArticles.length === 0) {
      console.log(`[MINT MORNINGS] 07:00 SAST — no pending ALLBRF articles to send`);
      return;
    }

    console.log(`[MINT MORNINGS] 07:00 SAST — sending ${pendingArticles.length} queued ALLBRF article(s)...`);
    const articlesToSend = pendingArticles.splice(0, pendingArticles.length);

    for (const article of articlesToSend) {
      await sendEmailToAllUsers(supabaseAdmin, article);
    }

    console.log(`[MINT MORNINGS] 07:00 SAST send complete`);
  }
}

function startMintMorningsListener(supabaseAdmin) {
  if (!supabaseAdmin) {
    console.error('[MINT MORNINGS] No Supabase admin client available');
    return null;
  }

  if (!process.env.RESEND_API_KEY) {
    console.error('[MINT MORNINGS] No RESEND_API_KEY — listener not started');
    return null;
  }

  pollForNewArticles(supabaseAdmin);

  pollingInterval = setInterval(() => {
    pollForNewArticles(supabaseAdmin);
  }, 30000);

  setInterval(() => {
    checkScheduledSend(supabaseAdmin);
  }, 60000);

  console.log(`[MINT MORNINGS] Listener started — polling every 30s, scheduled send at 07:00 SAST (05:00 UTC)`);
  return pollingInterval;
}

async function sendTestEmail(supabaseAdmin, testEmail) {
  if (!supabaseAdmin) {
    console.error('[MINT MORNINGS TEST] No Supabase admin client available');
    return { success: false, error: 'No database connection' };
  }
  if (!process.env.RESEND_API_KEY) {
    console.error('[MINT MORNINGS TEST] No RESEND_API_KEY configured');
    return { success: false, error: 'No RESEND_API_KEY' };
  }
  console.log(`[MINT MORNINGS TEST] Sending test email to ${testEmail}...`);

  const { data: articles, error: articlesError } = await supabaseAdmin
    .from('News_articles')
    .select('*')
    .filter('content_types', 'cs', '"ALLBRF"')
    .order('published_at', { ascending: false })
    .limit(1);

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
    const resendResponse = await getResend().emails.send({
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

module.exports = { startMintMorningsListener, sendTestEmail };
