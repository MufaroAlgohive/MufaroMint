import React, { useMemo, useState } from "react";
import { ArrowLeft, TrendingDown, Check, X } from "lucide-react";
import { supabase } from "../lib/supabase";

const BROKER_FEE_RATE = 0.0025;
const TRANSACTION_FEE_RATE = 0.038;

const StockSellPage = ({ security, holding, onBack, onSuccess }) => {
  const ownedShares = Math.floor(Number(holding?.quantity || 0));
  const currentPriceRands = useMemo(() => {
    const p = Number(security?.currentPrice ?? 0);
    const currency = (security?.currency || "").toUpperCase();
    return currency === "ZAC" ? p / 100 : p;
  }, [security]);

  const [shares, setShares] = useState(ownedShares > 0 ? 1 : 0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const validShares = Math.max(0, Math.min(Math.floor(Number(shares) || 0), ownedShares));
  const grossProceeds = validShares * currentPriceRands;
  const brokerFee = grossProceeds * BROKER_FEE_RATE;
  const txFee = grossProceeds * TRANSACTION_FEE_RATE;
  const netProceeds = Math.max(0, grossProceeds - brokerFee - txFee);

  const avgCostRands = Number(holding?.avg_fill || 0) / 100;
  const costBasis = validShares * avgCostRands;
  const estimatedPnL = netProceeds - costBasis;
  const isProfit = estimatedPnL >= 0;

  const fmtR = (val) =>
    `R${Math.abs(val).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  async function handleSell() {
    if (validShares <= 0 || validShares > ownedShares) {
      setError("Please enter a valid number of shares.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const headers = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch("/api/record-sell", {
        method: "POST",
        headers,
        body: JSON.stringify({
          securityId: security?.id,
          symbol: security?.symbol,
          name: security?.name || security?.symbol,
          shares: validShares,
          pricePerShareCents: Math.round(currentPriceRands * 100),
          netProceedsCents: Math.round(netProceeds * 100),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Sell order failed. Please try again.");
        return;
      }
      setSuccess(true);
      setTimeout(() => onSuccess?.(), 2000);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 pb-32 pt-20 bg-white">
        <div className="h-20 w-20 rounded-3xl flex items-center justify-center mb-6"
          style={{ background: "linear-gradient(135deg,#d1fae5,#a7f3d0)" }}>
          <Check className="h-10 w-10 text-emerald-600" />
        </div>
        <p className="text-2xl font-bold text-slate-900 mb-2">Order Placed</p>
        <p className="text-sm text-slate-500 text-center leading-relaxed max-w-xs">
          Your sell order for <strong>{validShares} {validShares === 1 ? "share" : "shares"}</strong> of{" "}
          <strong>{security?.name || security?.symbol}</strong> has been submitted and is being processed.
        </p>
        <p className="text-xs text-slate-400 mt-3 text-center">
          Settlement typically takes T+3 business days.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col px-4 pb-32 pt-12 md:max-w-md md:px-6">
      {/* Header */}
      <header className="flex items-center gap-3 mb-8">
        <button
          type="button"
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm text-slate-700 flex-shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-3">
          {security?.logo_url && (
            <img
              src={security.logo_url}
              alt={security.symbol}
              className="h-9 w-9 rounded-xl object-contain border border-slate-100 bg-white p-1"
            />
          )}
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-tight">
              Sell {security?.name || security?.symbol}
            </h1>
            <p className="text-xs text-slate-400">{security?.symbol}</p>
          </div>
        </div>
      </header>

      {/* Holding summary */}
      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 mb-6">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold mb-1">You Own</p>
            <p className="text-base font-bold text-slate-900">{ownedShares} shares</p>
          </div>
          <div>
            <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold mb-1">Avg Cost</p>
            <p className="text-base font-bold text-slate-900">{fmtR(avgCostRands)}</p>
          </div>
          <div>
            <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold mb-1">Current</p>
            <p className="text-base font-bold text-slate-900">{fmtR(currentPriceRands)}</p>
          </div>
        </div>
      </div>

      {/* Shares input */}
      <div className="mb-6">
        <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Shares to Sell
        </label>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShares(Math.max(1, validShares - 1))}
            className="h-12 w-12 rounded-xl border border-slate-200 bg-white text-slate-700 text-lg font-bold flex items-center justify-center flex-shrink-0 active:scale-95 transition"
          >−</button>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={ownedShares}
            value={shares}
            onChange={(e) => {
              setShares(e.target.value);
              setError("");
            }}
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-xl font-bold text-slate-900 focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-100"
          />
          <button
            onClick={() => setShares(Math.min(ownedShares, validShares + 1))}
            className="h-12 w-12 rounded-xl border border-slate-200 bg-white text-slate-700 text-lg font-bold flex items-center justify-center flex-shrink-0 active:scale-95 transition"
          >+</button>
        </div>
        <button
          onClick={() => setShares(ownedShares)}
          className="mt-2 text-xs text-violet-600 font-semibold hover:text-violet-700 transition"
        >
          Sell all {ownedShares} shares
        </button>
      </div>

      {/* Proceeds breakdown */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 mb-4 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Gross proceeds</span>
          <span className="font-semibold text-slate-900">{fmtR(grossProceeds)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Broker fee (0.25%)</span>
          <span className="text-slate-500">−{fmtR(brokerFee)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Transaction fee (3.8%)</span>
          <span className="text-slate-500">−{fmtR(txFee)}</span>
        </div>
        <div className="h-px bg-slate-100" />
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-slate-900">Net proceeds</span>
          <span className="text-lg font-bold text-emerald-600">{fmtR(netProceeds)}</span>
        </div>
        {validShares > 0 && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Estimated P&L</span>
            <span className={isProfit ? "text-emerald-600 font-semibold" : "text-red-500 font-semibold"}>
              {isProfit ? "+" : "−"}{fmtR(Math.abs(estimatedPnL))}
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 border border-red-100 mb-4">
          <X className="h-3.5 w-3.5 text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-red-500">{error}</p>
        </div>
      )}

      <p className="text-[11px] text-slate-400 text-center mb-4 leading-relaxed">
        This is a sell order submitted to your broker. Settlement takes T+3 business days.
      </p>

      <button
        onClick={handleSell}
        disabled={submitting || validShares <= 0 || validShares > ownedShares || ownedShares === 0}
        className="w-full rounded-2xl py-4 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
        style={{ background: "linear-gradient(135deg,#059669,#047857)" }}
      >
        <TrendingDown className="h-4 w-4" />
        {submitting ? "Placing order…" : `Sell ${validShares} ${validShares === 1 ? "share" : "shares"} · ${fmtR(netProceeds)}`}
      </button>
    </div>
  );
};

export default StockSellPage;
