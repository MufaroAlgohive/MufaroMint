import { supabase, supabaseAdmin, authenticateUser } from "./_lib/supabase.js";
import { buildOrderConfirmationHtml } from "./_lib/order-email-templates.js";
import { Resend } from "resend";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

async function verifyPaystackPayment(reference) {
  if (!PAYSTACK_SECRET_KEY) {
    return { verified: false, error: "Paystack secret key not configured" };
  }
  const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
    },
  });
  const result = await response.json();
  if (!result.status || result.data?.status !== "success") {
    return { verified: false, error: "Payment not successful", data: result.data };
  }
  return { verified: true, data: result.data };
}

async function sendOrderConfirmationEmail(db, { userId, userEmail, assetName, assetSymbol, strategyName, amountCents, quantity, priceCents, reference, orderDate }) {
  try {
    const resend = getResend();
    if (!resend) {
      console.log("[order-email] RESEND_API_KEY not set — skipping confirmation email");
      return;
    }

    const isStrategy = !!strategyName;
    const subject = isStrategy
      ? `Order Confirmed — ${strategyName}`
      : `Order Confirmed — ${assetName || assetSymbol || "Stock"}`;

    const html = buildOrderConfirmationHtml({
      assetName,
      assetSymbol,
      strategyName,
      amountCents,
      quantity,
      priceCents,
      reference,
      orderDate,
    });

    const resp = await resend.emails.send({
      from: "Mint <orders@mymint.co.za>",
      to: [userEmail],
      subject,
      html,
    });

    const resendId = resp?.data?.id || null;
    if (resp.error) {
      console.error("[order-email] Resend error:", resp.error.message);
    }

    await db.from("order_emails").insert({
      user_id: userId,
      email: userEmail,
      asset_name: assetName || null,
      asset_symbol: assetSymbol || null,
      strategy_name: strategyName || null,
      amount_cents: amountCents,
      quantity: quantity || null,
      reference: reference || null,
      order_date: orderDate,
      confirmation_status: resp.error ? "failed" : "sent",
      confirmation_resend_id: resendId,
      confirmation_sent_at: new Date().toISOString(),
      confirmation_price_cents: priceCents || null,
    }).then(() => {}).catch((err) => {
      console.warn("[order-email] Failed to log email:", err?.message);
    });

    console.log(`[order-email] Confirmation sent to ${userEmail} for ${displayNameFor(assetName, assetSymbol, strategyName)}`);
  } catch (err) {
    console.error("[order-email] Failed to send confirmation:", err.message);
  }
}

function displayNameFor(assetName, assetSymbol, strategyName) {
  return strategyName || assetName || assetSymbol || "Unknown";
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    if (!supabase) {
      return res.status(500).json({ success: false, error: "Database not connected" });
    }

    const { user, error: authError } = await authenticateUser(req);
    if (authError || !user) {
      return res.status(401).json({ success: false, error: authError || "Unauthorized" });
    }

    const db = supabaseAdmin || supabase;
    const userId = user.id;
    const { securityId, symbol, name, amount, baseAmount, strategyId, paymentReference } = req.body;
    // baseAmount = investment amount excluding fees (used for holdings/quantity calculations)
    // amount = total charged including fees (used for transaction records)
    const investAmount = (baseAmount && baseAmount > 0) ? baseAmount : amount;

    if (!securityId || !amount || !paymentReference) {
      return res.status(400).json({ success: false, error: "Missing required fields: securityId, amount, paymentReference" });
    }

    const { verified, error: payError, data: payData } = await verifyPaystackPayment(paymentReference);
    if (!verified) {
      return res.status(400).json({ success: false, error: payError || "Payment verification failed" });
    }

    const { data: existingTx } = await db
      .from("transactions")
      .select("id")
      .eq("store_reference", paymentReference)
      .maybeSingle();
    if (existingTx) {
      return res.status(200).json({ success: true, message: "Already recorded", duplicate: true });
    }

    const paidAmount = payData.amount / 100;
    if (Math.abs(paidAmount - amount) > 1) {
      return res.status(400).json({ success: false, error: `Amount mismatch: paid ${paidAmount}, expected ${amount}` });
    }

    const isStrategyInvestment = !!strategyId;

    const { data: securityCheck } = await db
      .from("securities")
      .select("id")
      .eq("id", securityId)
      .maybeSingle();

    let holdingResult = { data: null, error: null };
    let currentPriceCents = null;
    let quantity = null;

    if (isStrategyInvestment) {
      const { data: strategyData, error: stratError } = await db
        .from("strategies")
        .select("holdings")
        .eq("id", strategyId)
        .maybeSingle();

      if (stratError || !strategyData?.holdings?.length) {
        console.warn("[record-investment] Could not fetch strategy holdings:", stratError?.message);
        return res.status(500).json({ success: false, error: "Could not load strategy holdings to record positions" });
      }

      const strategyHoldings = strategyData.holdings;
      const symbols = strategyHoldings.map(h => h.symbol).filter(Boolean);

      const { data: securitiesData, error: secLookupError } = await db
        .from("securities")
        .select("id, symbol, last_price")
        .in("symbol", symbols);

      if (secLookupError) {
        return res.status(500).json({ success: false, error: "Could not look up securities for strategy" });
      }

      const secBySymbol = {};
      (securitiesData || []).forEach(s => { secBySymbol[s.symbol] = s; });

      const now = new Date().toISOString();
      const today = now.split("T")[0];
      const insertedHoldings = [];
      const skippedSymbols = [];

      // Pre-compute execution total so we can scale avg_fill to match investAmount (baseAmount)
      let executionTotalRands = 0;
      for (const holding of strategyHoldings) {
        const sec = secBySymbol[holding.symbol];
        if (!sec) continue;
        const qty = Number(holding.quantity || holding.shares || 0);
        const price = Number(sec.last_price || 0);
        if (qty > 0 && price > 0) executionTotalRands += (price * qty) / 100;
      }
      const scaleFactor = (investAmount > 0 && executionTotalRands > 0)
        ? investAmount / executionTotalRands
        : 1;

      for (const holding of strategyHoldings) {
        const sec = secBySymbol[holding.symbol];
        if (!sec) {
          console.warn("[record-investment] Security not found for symbol:", holding.symbol);
          skippedSymbols.push(holding.symbol);
          continue;
        }

        const holdingQty = Number(holding.quantity || holding.shares || 0);
        if (holdingQty <= 0) {
          skippedSymbols.push(holding.symbol);
          continue;
        }

        const rawPriceCents = Number(sec.last_price || 0);
        if (rawPriceCents <= 0) {
          console.warn("[record-investment] No price found for:", holding.symbol);
          skippedSymbols.push(holding.symbol);
          continue;
        }
        // Scale price proportionally so total cost basis = investAmount (the displayed min investment)
        const priceCents = Math.round(rawPriceCents * scaleFactor);

        const { data: existing, error: lookupErr } = await db
          .from("stock_holdings")
          .select("id, quantity, avg_fill")
          .eq("user_id", userId)
          .eq("security_id", sec.id)
          .eq("strategy_id", strategyId)
          .maybeSingle();

        if (lookupErr) {
          console.error("[record-investment] Error looking up holding for", holding.symbol, lookupErr.message);
          return res.status(500).json({ success: false, error: `Failed to look up holding for ${holding.symbol}` });
        }

        if (existing) {
          const oldQty = Number(existing.quantity || 0);
          const oldAvgFill = Number(existing.avg_fill || 0);
          const newQty = oldQty + holdingQty;
          const newAvgFill = newQty > 0
            ? ((oldAvgFill * oldQty) + (priceCents * holdingQty)) / newQty
            : priceCents;

          const { error: updateErr } = await db.from("stock_holdings").update({
            quantity: newQty,
            avg_fill: Math.round(newAvgFill),
            market_value: Math.round(newQty * priceCents),
            as_of_date: today,
            updated_at: now,
          }).eq("id", existing.id);

          if (updateErr) {
            console.error("[record-investment] Failed to update holding for", holding.symbol, updateErr.message);
            return res.status(500).json({ success: false, error: `Failed to update holding for ${holding.symbol}` });
          }
        } else {
          const { error: insertErr } = await db.from("stock_holdings").insert({
            user_id: userId,
            security_id: sec.id,
            strategy_id: strategyId,
            quantity: holdingQty,
            avg_fill: priceCents,
            market_value: Math.round(holdingQty * priceCents),
            unrealized_pnl: 0,
            as_of_date: today,
            Status: "active",
          });

          if (insertErr) {
            console.error("[record-investment] Failed to insert holding for", holding.symbol, insertErr.message);
            return res.status(500).json({ success: false, error: `Failed to record holding for ${holding.symbol}` });
          }
        }

        insertedHoldings.push({ symbol: holding.symbol, quantity: holdingQty, priceCents });
      }

      if (skippedSymbols.length > 0) {
        console.warn("[record-investment] Skipped symbols (no security/price):", skippedSymbols.join(", "));
      }

      holdingResult = { data: { strategyHoldingsRecorded: insertedHoldings.length, skipped: skippedSymbols }, error: null };
    }

    if (securityCheck && !isStrategyInvestment) {
      const { data: securityData, error: secError } = await db
        .from("securities")
        .select("last_price")
        .eq("id", securityId)
        .maybeSingle();

      if (!secError && securityData?.last_price) {
        currentPriceCents = Number(securityData.last_price);
      } else {
        const { data: priceData, error: priceError } = await db
          .from("security_prices")
          .select("close_price")
          .eq("security_id", securityId)
          .order("price_date", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!priceError && priceData?.close_price) {
          currentPriceCents = Number(priceData.close_price);
        }
      }

      const currentPriceRands = currentPriceCents ? currentPriceCents / 100 : investAmount;
      quantity = currentPriceRands > 0 ? investAmount / currentPriceRands : 1;
      const avgFillCents = currentPriceCents || Math.round(investAmount * 100);
      const marketValueCents = Math.round(quantity * (currentPriceCents || investAmount * 100));

      const { data: existing, error: fetchError } = await db
        .from("stock_holdings")
        .select("id, quantity, avg_fill, market_value")
        .eq("user_id", userId)
        .eq("security_id", securityId)
        .maybeSingle();

      if (fetchError) {
        return res.status(500).json({ success: false, error: fetchError.message });
      }

      if (existing) {
        const oldQty = Number(existing.quantity || 0);
        const oldAvgFill = Number(existing.avg_fill || 0);
        const newQty = oldQty + quantity;
        const newAvgFill = newQty > 0 ? ((oldAvgFill * oldQty) + (avgFillCents * quantity)) / newQty : avgFillCents;
        const newMarketValue = Math.round(newQty * (currentPriceCents || newAvgFill));
        const { data, error } = await db
          .from("stock_holdings")
          .update({
            quantity: newQty,
            avg_fill: Math.round(newAvgFill),
            market_value: newMarketValue,
            as_of_date: new Date().toISOString().split("T")[0],
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
          .select();
        holdingResult = { data, error };
      } else {
        const { data, error } = await db
          .from("stock_holdings")
          .insert({
            user_id: userId,
            security_id: securityId,
            quantity: quantity,
            avg_fill: avgFillCents,
            market_value: marketValueCents,
            unrealized_pnl: 0,
            as_of_date: new Date().toISOString().split("T")[0],
            Status: "active",
            strategy_id: strategyId || null,
          })
          .select();
        holdingResult = { data, error };
      }

      if (holdingResult.error) {
        return res.status(500).json({ success: false, error: holdingResult.error.message });
      }
    } else if (isStrategyInvestment) {
      // Fetch the strategy to get its holdings
      const { data: stratData, error: stratError } = await db
        .from("strategies")
        .select("holdings")
        .eq("id", strategyId)
        .maybeSingle();
      
      if (!stratError && stratData?.holdings && Array.isArray(stratData.holdings) && stratData.holdings.length > 0) {
        const holdingsArr = stratData.holdings;
        const holdingSymbols = holdingsArr.map(h => h.symbol).filter(Boolean);
        
        if (holdingSymbols.length > 0) {
          const { data: secs } = await db
            .from("securities")
            .select("id, symbol, last_price")
            .in("symbol", holdingSymbols);
            
          if (secs && secs.length > 0) {
            const amountPerSecurityCents = Math.round((investAmount * 100) / secs.length);
            const amountPerSecurityRands = investAmount / secs.length;
            
            for (const sec of secs) {
              const secId = sec.id;
              const secCurrentPriceCents = sec.last_price ? Number(sec.last_price) : null;
              const secCurrentPriceRands = secCurrentPriceCents ? secCurrentPriceCents / 100 : amountPerSecurityRands;
              
              const secQty = secCurrentPriceRands > 0 ? amountPerSecurityRands / secCurrentPriceRands : 1;
              const secAvgFillCents = secCurrentPriceCents || amountPerSecurityCents;
              const secMarketValueCents = Math.round(secQty * secAvgFillCents);
              
              const { data: existingSecHolding } = await db
                .from("stock_holdings")
                .select("id, quantity, avg_fill")
                .eq("user_id", userId)
                .eq("security_id", secId)
                .maybeSingle();
                
              if (existingSecHolding) {
                const oldQty = Number(existingSecHolding.quantity || 0);
                const oldAvgFill = Number(existingSecHolding.avg_fill || 0);
                const newQty = oldQty + secQty;
                const newAvgFill = newQty > 0 ? ((oldAvgFill * oldQty) + (secAvgFillCents * secQty)) / newQty : secAvgFillCents;
                const newMarketValue = Math.round(newQty * (secCurrentPriceCents || newAvgFill));
                
                await db.from("stock_holdings").update({
                  quantity: newQty,
                  avg_fill: Math.round(newAvgFill),
                  market_value: newMarketValue,
                  as_of_date: new Date().toISOString().split("T")[0],
                  updated_at: new Date().toISOString(),
                }).eq("id", existingSecHolding.id);
              } else {
                await db.from("stock_holdings").insert({
                  user_id: userId,
                  security_id: secId,
                  quantity: secQty,
                  avg_fill: secAvgFillCents,
                  market_value: secMarketValueCents,
                  unrealized_pnl: 0,
                  as_of_date: new Date().toISOString().split("T")[0],
                  Status: "active",
                  strategy_id: strategyId,
                });
              }
            }
          }
        }
      }
    }

    const descriptionText = isStrategyInvestment
      ? `Invested in strategy ${name || "Strategy"}`
      : `Purchased ${(holdingResult.data ? "shares" : "units")} of ${name || symbol || "Unknown"}`;

    const orderDate = new Date().toISOString();

    const { error: txError } = await db
      .from("transactions")
      .insert({
        user_id: userId,
        direction: "debit",
        name: isStrategyInvestment ? `Strategy Investment: ${name || symbol || "Strategy"}` : `Purchased ${name || symbol || "Stock"}`,
        description: descriptionText,
        amount: Math.round(amount * 100),
        store_reference: paymentReference || null,
        currency: "ZAR",
        status: "posted",
        transaction_date: orderDate,
        created_at: orderDate,
      })
      .select();

    if (txError) {
      console.error("[record-investment] Transaction insert error:", txError);
      return res.status(500).json({ success: false, error: "Failed to record transaction" });
    }

    sendOrderConfirmationEmail(db, {
      userId,
      userEmail: user.email,
      assetName: name || null,
      assetSymbol: symbol || null,
      strategyName: isStrategyInvestment ? (name || symbol || "Strategy") : null,
      amountCents: Math.round(amount * 100),
      quantity: quantity,
      priceCents: currentPriceCents,
      reference: paymentReference,
      orderDate,
    }).catch(() => {});

    return res.status(200).json({ success: true, holding: holdingResult.data });
  } catch (error) {
    console.error("[record-investment] Error:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to record investment" });
  }
}
