import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import { formatCurrency } from "../lib/formatCurrency";

const BROKER_FEE_RATE = 0.0025;
const ISIN_FEE_PER_ASSET = 69;
const PAYSTACK_FEE_RATE = 0.035;
const MIN_INVESTMENT = 1000;

const StockBuyPage = ({ security, onBack, onContinue }) => {
  const { displayCurrency, priceValue } = useMemo(() => {
    const currency = security?.currency || "R";
    const normalizedCurrency = currency.toUpperCase() === "ZAC" ? "R" : currency;
    const currentPrice = Number(security?.currentPrice ?? 0);
    const normalizedPrice = currency.toUpperCase() === "ZAC" ? currentPrice / 100 : currentPrice;
    return {
      displayCurrency: normalizedCurrency,
      priceValue: Number.isFinite(normalizedPrice) ? normalizedPrice : 0,
    };
  }, [security]);

  const minShares = useMemo(() => {
    if (priceValue <= 0) return 1;
    return Math.ceil(MIN_INVESTMENT / priceValue);
  }, [priceValue]);

  const [shares, setShares] = useState(minShares);
  const [feeExpanded, setFeeExpanded] = useState(false);

  useEffect(() => {
    if (shares < minShares) setShares(minShares);
  }, [minShares]);

  const validShares = Number.isFinite(shares) && shares > 0 ? shares : 0;

  const totalAmount = useMemo(() => {
    const total = validShares * priceValue;
    return Number.isFinite(total) ? total : 0;
  }, [validShares, priceValue]);

  const numAssets = validShares > 0 ? 1 : 0;

  const fees = useMemo(() => {
    const brokerAmount = totalAmount * BROKER_FEE_RATE;
    const afterBroker = totalAmount + brokerAmount;
    const isinTotal = ISIN_FEE_PER_ASSET * numAssets;
    const afterIsin = afterBroker + isinTotal;
    const paystackAmount = afterIsin * PAYSTACK_FEE_RATE;
    const totalCost = afterIsin + paystackAmount;
    return { brokerAmount, isinTotal, paystackAmount, totalCost };
  }, [totalAmount, numAssets]);

  const isInvalid = !Number.isFinite(shares) || shares <= 0 || shares < minShares;

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!security || isInvalid) return;
    onContinue?.(fees.totalCost, security, totalAmount, validShares);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex w-full max-w-sm flex-col px-4 pb-10 pt-12 md:max-w-md md:px-8">
        <header className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold">Buy {security?.symbol || "Stock"}</h1>
          <div className="h-10 w-10" aria-hidden="true" />
        </header>

        <section className="mt-8 rounded-3xl bg-white p-5 shadow-md">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Price per share</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {displayCurrency}{priceValue.toFixed(2)}
          </p>
        </section>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Number of shares
            </label>
            <input
              type="number"
              min={minShares}
              step="1"
              value={shares}
              onChange={(event) => setShares(Number(event.target.value))}
              className={`mt-2 w-full rounded-2xl border bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none focus:border-violet-400 ${isInvalid ? "border-red-300" : "border-slate-200"}`}
            />
            {isInvalid && (
              <p className="mt-1.5 text-xs text-red-500">
                Minimum {minShares} share{minShares !== 1 ? "s" : ""} required ({formatCurrency(MIN_INVESTMENT, displayCurrency)} minimum investment)
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
            <div className="flex items-center justify-between">
              <span>Investment Amount</span>
              <span className="font-semibold text-slate-900">
                {displayCurrency} {totalAmount.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => setFeeExpanded(!feeExpanded)}
              className="w-full flex items-center justify-between px-4 py-3"
            >
              <span className="text-xs font-semibold text-slate-600">Fee Breakdown</span>
              {feeExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
            </button>
            {feeExpanded && (
              <div className="px-4 pb-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-600">Broker Fee (0.25%)</p>
                  <p className="text-xs font-semibold text-slate-900">{formatCurrency(fees.brokerAmount, displayCurrency)}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-600">Custody Fee ({formatCurrency(ISIN_FEE_PER_ASSET, displayCurrency)} × {numAssets} asset{numAssets !== 1 ? "s" : ""})</p>
                  <p className="text-xs font-semibold text-slate-900">{formatCurrency(fees.isinTotal, displayCurrency)}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-600">Transaction Fee (2.9%)</p>
                  <p className="text-xs font-semibold text-slate-900">{formatCurrency(fees.paystackAmount, displayCurrency)}</p>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-700">Total Cost</p>
              <p className="text-sm font-bold text-slate-900">{formatCurrency(fees.totalCost, displayCurrency)}</p>
            </div>
          </div>

          <button
            type="submit"
            disabled={isInvalid}
            className={`w-full rounded-2xl py-4 text-sm font-semibold uppercase tracking-[0.2em] text-white shadow-lg transition-all active:scale-95 ${isInvalid ? "bg-slate-300 cursor-not-allowed" : "bg-gradient-to-r from-black to-purple-600"}`}
          >
            Invest
          </button>
        </form>
      </div>
    </div>
  );
};

export default StockBuyPage;
