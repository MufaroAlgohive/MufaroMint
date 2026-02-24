const cron = require('node-cron');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

function buildMintMorningsHtml(articles) {
  const articleCards = articles.map(article => {
    const publishedDate = new Date(article.published_at);
    const formattedDate = publishedDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const formattedTime = publishedDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const sourceBadge = article.source
      ? `<span style="display:inline-block;background-color:#f1f5f9;color:#475569;font-size:11px;font-weight:600;padding:4px 12px;border-radius:9999px;margin-right:6px;margin-bottom:6px;">${article.source}</span>`
      : '';

    const channelBadge = article.channel
      ? `<span style="display:inline-block;background-color:#ede9fe;color:#6d28d9;font-size:11px;font-weight:600;padding:4px 12px;border-radius:9999px;margin-bottom:6px;">${article.channel}</span>`
      : '';

    const industries = (article.industries || []).map(t =>
      `<span style="display:inline-block;border:1px solid #e2e8f0;background:#fff;color:#475569;font-size:11px;font-weight:500;padding:4px 12px;border-radius:9999px;margin-right:6px;margin-bottom:6px;">${t}</span>`
    ).join('');

    const markets = (article.markets || []).map(t =>
      `<span style="display:inline-block;border:1px solid #e2e8f0;background:#fff;color:#475569;font-size:11px;font-weight:500;padding:4px 12px;border-radius:9999px;margin-right:6px;margin-bottom:6px;">${t}</span>`
    ).join('');

    const topics = (article.topics || []).map(t =>
      `<span style="display:inline-block;border:1px solid #e2e8f0;background:#fff;color:#475569;font-size:11px;font-weight:500;padding:4px 12px;border-radius:9999px;margin-right:6px;margin-bottom:6px;">${t}</span>`
    ).join('');

    const tagsSection = (industries || markets || topics)
      ? `<div style="margin-top:24px;padding-top:20px;border-top:1px solid #f1f5f9;">
           <p style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;margin:0 0 10px 0;">Related Topics</p>
           <div>${industries}${markets}${topics}</div>
         </div>`
      : '';

    return `
      <div style="background:#ffffff;border-radius:24px;padding:28px;margin-bottom:24px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid #f1f5f9;">
          <tr>
            <td width="48" style="vertical-align:middle;">
              <div style="width:48px;height:48px;background-color:#f1f5f9;border-radius:50%;text-align:center;line-height:48px;">
                <span style="font-size:20px;font-weight:700;color:#581ba4;">M</span>
              </div>
            </td>
            <td style="padding-left:12px;vertical-align:middle;">
              <p style="margin:0;font-size:14px;font-weight:600;color:#0f172a;">Mint News</p>
              <p style="margin:2px 0 0 0;font-size:12px;color:#64748b;">${formattedDate} &bull; ${formattedTime}</p>
            </td>
          </tr>
        </table>

        <h2 style="margin:0 0 16px 0;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;">${article.title}</h2>

        ${(sourceBadge || channelBadge) ? `<div style="margin-bottom:20px;">${sourceBadge}${channelBadge}</div>` : ''}

        ${article.body_text ? `<div style="font-size:14px;line-height:1.7;color:#334155;white-space:pre-wrap;">${article.body_text}</div>` : ''}
        ${article.body && !article.body_text ? `<div style="font-size:14px;line-height:1.7;color:#334155;white-space:pre-wrap;">${article.body}</div>` : ''}

        ${tagsSection}
      </div>`;
  }).join('');

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MINT MORNINGS</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f8fafc;">
    <tr>
      <td align="center" style="padding:0;">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="padding:40px 24px 24px 24px;text-align:center;">
              <div style="width:56px;height:56px;background:linear-gradient(135deg,#000 0%,#581ba4 100%);border-radius:16px;margin:0 auto 16px auto;text-align:center;line-height:56px;">
                <span style="font-size:24px;font-weight:800;color:#ffffff;">M</span>
              </div>
              <h1 style="margin:0 0 4px 0;font-size:28px;font-weight:800;color:#0f172a;letter-spacing:-0.02em;">MINT MORNINGS</h1>
              <p style="margin:0;font-size:14px;color:#64748b;">${today}</p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 24px;">
              <div style="height:1px;background:linear-gradient(90deg,transparent,#cbd5e1,transparent);"></div>
            </td>
          </tr>

          <!-- Articles -->
          <tr>
            <td style="padding:24px;">
              ${articleCards}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:0 24px 40px 24px;text-align:center;">
              <div style="height:1px;background:linear-gradient(90deg,transparent,#cbd5e1,transparent);margin-bottom:24px;"></div>
              <p style="margin:0 0 4px 0;font-size:13px;font-weight:600;color:#0f172a;">MINT</p>
              <p style="margin:0 0 16px 0;font-size:12px;color:#94a3b8;">Your money tools are ready when you are.</p>
              <p style="margin:0;font-size:11px;color:#cbd5e1;">You're receiving this because you have a Mint account.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function sendMintMorningsEmail(supabaseAdmin) {
  if (!supabaseAdmin) {
    console.error('[MINT MORNINGS] No Supabase admin client available');
    return;
  }

  if (!process.env.RESEND_API_KEY) {
    console.error('[MINT MORNINGS] No RESEND_API_KEY configured');
    return;
  }

  console.log('[MINT MORNINGS] Starting daily email send...');

  try {
    const today = new Date();
    const oneDayAgo = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    const { data: articles, error: articlesError } = await supabaseAdmin
      .from('News_articles')
      .select('*')
      .filter('content_types', 'cs', '"ALLBRF"')
      .gte('published_at', oneDayAgo.toISOString())
      .order('published_at', { ascending: false });

    if (articlesError) {
      console.error('[MINT MORNINGS] Error fetching articles:', articlesError.message);
      return;
    }

    if (!articles || articles.length === 0) {
      console.log('[MINT MORNINGS] No ALLBRF articles in the last 24 hours. Skipping email.');
      return;
    }

    console.log(`[MINT MORNINGS] Found ${articles.length} ALLBRF article(s) to send.`);

    const html = buildMintMorningsHtml(articles);

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
          await resend.emails.send({
            from: 'MINT MORNINGS <mornings@thealgohive.com>',
            to: [user.email],
            subject: `MINT MORNINGS — ${articles[0].title}`,
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

    console.log(`[MINT MORNINGS] Complete: ${successCount} sent, ${failCount} failed.`);

  } catch (error) {
    console.error('[MINT MORNINGS] Unexpected error:', error.message);
  }
}

function startMintMorningsCron(supabaseAdmin) {
  cron.schedule('0 7 * * *', () => {
    console.log('[MINT MORNINGS] Cron triggered at 07:00 SAST');
    sendMintMorningsEmail(supabaseAdmin);
  }, {
    timezone: 'Africa/Johannesburg'
  });

  console.log('[MINT MORNINGS] Cron scheduled: daily at 07:00 SAST (Africa/Johannesburg)');
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

  const today = new Date();
  const oneDayAgo = new Date(today.getTime() - 24 * 60 * 60 * 1000);

  const { data: articles, error: articlesError } = await supabaseAdmin
    .from('News_articles')
    .select('*')
    .filter('content_types', 'cs', '"ALLBRF"')
    .gte('published_at', oneDayAgo.toISOString())
    .order('published_at', { ascending: false });

  if (articlesError) {
    console.error('[MINT MORNINGS TEST] Error fetching articles:', articlesError.message);
    return { success: false, error: articlesError.message };
  }

  if (!articles || articles.length === 0) {
    const { data: recentArticles, error: recentError } = await supabaseAdmin
      .from('News_articles')
      .select('*')
      .filter('content_types', 'cs', '"ALLBRF"')
      .order('published_at', { ascending: false })
      .limit(5);

    if (recentError || !recentArticles || recentArticles.length === 0) {
      return { success: false, error: 'No ALLBRF articles found in the database' };
    }

    console.log(`[MINT MORNINGS TEST] No ALLBRF articles in last 24h, using ${recentArticles.length} most recent ALLBRF articles instead`);
    const html = buildMintMorningsHtml(recentArticles);

    try {
      await resend.emails.send({
        from: 'MINT MORNINGS <mornings@thealgohive.com>',
        to: [testEmail],
        subject: `MINT MORNINGS — ${recentArticles[0].title}`,
        html: html,
      });
      console.log(`[MINT MORNINGS TEST] Test email sent to ${testEmail}`);
      return { success: true, articlesCount: recentArticles.length, note: 'Used most recent articles (none in last 24h)' };
    } catch (err) {
      console.error(`[MINT MORNINGS TEST] Failed:`, err.message);
      return { success: false, error: err.message };
    }
  }

  const html = buildMintMorningsHtml(articles);

  try {
    await resend.emails.send({
      from: 'MINT MORNINGS <mornings@thealgohive.com>',
      to: [testEmail],
      subject: `MINT MORNINGS — ${articles[0].title}`,
      html: html,
    });
    console.log(`[MINT MORNINGS TEST] Test email sent to ${testEmail}`);
    return { success: true, articlesCount: articles.length };
  } catch (err) {
    console.error(`[MINT MORNINGS TEST] Failed:`, err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { startMintMorningsCron, sendMintMorningsEmail, sendTestEmail };
