import React, { useState } from "react";
import { ArrowLeft, Info } from "lucide-react";

const InvestAmountPage = ({ onBack, strategy, onContinue }) => {
  const [selectedAmount, setSelectedAmount] = useState(null);

  const currentStrategy = strategy || {
    name: "Strategy",
    return: "+8.7%",
    minimum: 2500,
    tickers: [],
    description: "",
  };

  // Preset investment amounts based on minimum
  const presetAmounts = [
    currentStrategy.minimum,
    currentStrategy.minimum * 2,
    currentStrategy.minimum * 5,
    currentStrategy.minimum * 10,
  ];

  const tickers = currentStrategy.tickers || [];
  const extraHoldings = tickers.length > 3 ? tickers.length - 3 : 0;

  return (
    <div className="min-h-screen bg-slate-50 pb-8 text-slate-900">
      <div className="mx-auto flex w-full max-w-sm flex-col px-3 pt-12 md:max-w-md md:px-6">
        {/* Header */}
        <header className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm flex-shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="flex-1 text-lg font-semibold">Amount</h1>
        </header>

        {/* Strategy Card - Rich Preview */}
        <section className="mb-6 rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 p-5 shadow-sm">
          {/* Header Section */}
          <div className="mb-4">
            <h2 className="text-base font-semibold text-slate-900">{currentStrategy.name}</h2>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-semibold text-emerald-600">{currentStrategy.return}</span>
              <span className="text-xs font-semibold text-slate-600">Min. R{currentStrategy.minimum?.toLocaleString() || "2,500"}</span>
            </div>
          </div>

          {/* Placeholder for Chart */}
          <div className="mb-4 h-16 rounded-2xl border border-slate-200 bg-white flex items-center justify-center">
            <div className="text-center">
              <p className="text-xs text-slate-500">Chart</p>
            </div>
          </div>

          {/* Holdings Snapshot */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            <div className="flex items-center -space-x-3">
              {tickers.slice(0, 3).map((ticker, idx) => (
                <div
                  key={ticker}
                  className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-100 bg-gradient-to-r from-slate-300 to-slate-400 text-white text-[10px] font-bold"
                >
                  {ticker.charAt(0)}
                </div>
              ))}
              {extraHoldings > 0 && (
                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-100 bg-slate-400 text-white text-[10px] font-bold">
                  +{extraHoldings}
                </div>
              )}
            </div>
            <span className="text-xs font-semibold text-slate-600">Holdings snapshot</span>
          </div>
        </section>

        {/* Amount Selection */}
        <section className="mb-6">
          <p className="text-xs font-semibold text-slate-600 mb-3">Select investment amount</p>
          <div className="grid grid-cols-2 gap-3">
            {presetAmounts.map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => setSelectedAmount(amount)}
                className={`rounded-2xl border-2 py-4 px-3 text-center transition ${
                  selectedAmount === amount
                    ? "border-violet-600 bg-violet-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <p className={`text-sm font-semibold ${selectedAmount === amount ? "text-violet-700" : "text-slate-900"}`}>
                  R{amount?.toLocaleString() || "0"}
                </p>
              </button>
            ))}
          </div>
        </section>

        {/* Info */}
        <div className="mb-6 flex items-start gap-2 rounded-lg bg-blue-50 p-3">
          <Info className="h-4 w-4 flex-shrink-0 text-blue-600 mt-0.5" />
          <p className="text-xs text-blue-700">
            You'll be redirected to complete payment on Paystack
          </p>
        </div>

        {/* Continue Button */}
        <button
          type="button"
          onClick={() => onContinue?.(selectedAmount)}
          disabled={!selectedAmount}
          className="w-full rounded-2xl bg-gradient-to-r from-emerald-400 to-emerald-500 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200/60 disabled:opacity-50 disabled:cursor-not-allowed hover:enabled:-translate-y-0.5 transition"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default InvestAmountPage;
