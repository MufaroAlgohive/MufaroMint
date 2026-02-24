const cron = require('node-cron');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

function buildMintMorningsHtml(articles) {
  const articleCards = articles.map((article, index) => {
    const bodyContent = article.body_text || article.body || '';
    const source = article.source || 'Alliance News South Africa';
    const author = article.author || '';

    return `
                                        <tr>
                                          <td class="px" style="padding:${index === 0 ? '0' : '16px'} 24px 0 24px;">
                                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="card" style="background:#FFFFFF;border-radius:26px;box-shadow:0 14px 38px rgba(28,22,58,${index === 0 ? '0.10' : '0.08'});overflow:hidden;">
                                              <tbody>
                                                <tr>
                                                  <td style="padding:${index === 0 ? '20px 20px 14px 20px' : '18px 20px'};">
                                                    <div style="font-family:Inter,Segoe UI,Arial,sans-serif;font-size:12px;color:#7B8194;">
                                                      ${source}, formatted for Mint
                                                    </div>

                                                    <div class="${index === 0 ? 'h1' : 'h2'}" style="margin-top:10px;font-family:Inter,Segoe UI,Arial,sans-serif;font-size:${index === 0 ? '26' : '18'}px;line-height:${index === 0 ? '32' : '24'}px;color:#121526;font-weight:800;">
                                                      ${article.title}
                                                    </div>

                                                    <div style="margin-top:10px;font-family:Inter,Segoe UI,Arial,sans-serif;font-size:14px;line-height:20px;color:#4B5166;">
                                                      ${bodyContent}
                                                    </div>

                                                    ${author ? `<div style="margin-top:14px;font-family:Inter,Segoe UI,Arial,sans-serif;font-size:13px;color:#7B8194;">
                                                      By ${author}
                                                    </div>` : ''}

                                                    <div style="margin-top:16px;">
                                                      <a href="https://www.mymint.co.za" class="btn" style="background:#6D28FF;border-radius:14px;color:#FFFFFF;display:inline-block;font-family:Inter,Segoe UI,Arial,sans-serif;font-size:14px;font-weight:700;line-height:16px;padding:12px 16px;text-decoration:none;">
                                                        Read more on Mint
                                                      </a>
                                                    </div>
                                                  </td>
                                                </tr>
                                              </tbody>
                                            </table>
                                          </td>
                                        </tr>`;
  }).join('');

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="ltr" lang="en">

<head>
  <meta content="width=device-width" name="viewport" />
  <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta content="IE=edge" http-equiv="X-UA-Compatible" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta content="telephone=no,address=no,email=no,date=no,url=no" name="format-detection" />
</head>

<body>
  <table border="0" width="100%" cellpadding="0" cellspacing="0" role="presentation" align="center">
    <tbody>
      <tr>
        <td>
          <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="font-family:-apple-system, BlinkMacSystemFont, &#x27;Segoe UI&#x27;, &#x27;Roboto&#x27;, &#x27;Oxygen&#x27;, &#x27;Ubuntu&#x27;, &#x27;Cantarell&#x27;, &#x27;Fira Sans&#x27;, &#x27;Droid Sans&#x27;, &#x27;Helvetica Neue&#x27;, sans-serif;font-size:1.0769230769230769em;min-height:100%;line-height:155%">
            <tbody>
              <tr>
                <td>
                  <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="align:center;padding-left:0px;padding-right:0px;line-height:155%;width:100%;font-family:-apple-system, BlinkMacSystemFont, &#x27;Segoe UI&#x27;, &#x27;Roboto&#x27;, &#x27;Oxygen&#x27;, &#x27;Ubuntu&#x27;, &#x27;Cantarell&#x27;, &#x27;Fira Sans&#x27;, &#x27;Droid Sans&#x27;, &#x27;Helvetica Neue&#x27;, sans-serif">
                    <tbody>
                      <tr>
                        <td>
                          <div>
                            <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
                              Johannesburg market preview, SA news, global headlines.
                            </div>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#F6F7FB;">
                              <tbody>
                                <tr>
                                  <td align="center" style="padding:24px 12px;">
                                    <table role="presentation" class="container" width="600" cellspacing="0" cellpadding="0" border="0" style="width:600px;max-width:600px;">
                                      <tbody>
                                        <tr>
                                          <td class="px" style="padding:6px 24px 14px 24px;">
                                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                              <tbody>
                                                <tr>
                                                  <td align="left" style="padding:0;">
                                                    <img src="https://www.mymint.co.za/assets/mint-logo.svg" width="110" alt="Mint" style="display:block;border:0;outline:none;text-decoration:none;height:auto;" />
                                                  </td>
                                                  <td align="right" style="padding:0;">
                                                    <span style="font-family:Inter,Segoe UI,Arial,sans-serif;font-size:13px;color:#7B8194;">
                                                      Market Brief
                                                    </span>
                                                  </td>
                                                </tr>
                                              </tbody>
                                            </table>
                                          </td>
                                        </tr>

${articleCards}

                                        <tr>
                                          <td class="px" style="padding:18px 24px 28px 24px;">
                                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                              <tbody>
                                                <tr>
                                                  <td style="padding:16px 18px;background:#FFFFFF;border:1px solid #F0F1F6;border-radius:22px;">
                                                    <div style="font-family:Inter,Segoe UI,Arial,sans-serif;font-size:12px;line-height:17px;color:#7B8194;">
                                                      Alliance News South Africa covers every actively traded company listed on the Johannesburg Stock Exchange, large and small, and the global influences upon South African markets and the local economy.
                                                      <br /><br />
                                                      Copyright &copy; ${new Date().getFullYear()} Alliance News Ltd. All rights reserved.
                                                    </div>
                                                    <div style="margin-top:12px;font-family:Inter,Segoe UI,Arial,sans-serif;font-size:12px;color:#7B8194;">
                                                      You're receiving this on Mint.
                                                      <a href="https://www.mymint.co.za" style="color:#6D28FF;text-decoration:none;font-weight:700;">Open Mint</a>
                                                    </div>
                                                  </td>
                                                </tr>
                                              </tbody>
                                            </table>
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                          <p style="margin:0;padding:0;font-size:1em;padding-top:0.5em;padding-bottom:0.5em">
                            <br />
                          </p>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>
        </td>
      </tr>
    </tbody>
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
