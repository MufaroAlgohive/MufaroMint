import React, { useState } from "react";
import { ArrowLeft, Info, Plus, Minus } from "lucide-react";

const companyLogos = {
  AAPL: "https://s3-symbol-logo.tradingview.com/apple--big.svg",
  MSFT: "https://s3-symbol-logo.tradingview.com/microsoft--big.svg",
  NVDA: "https://s3-symbol-logo.tradingview.com/nvidia--big.svg",
  TSLA: "https://s3-symbol-logo.tradingview.com/tesla--big.svg",
  AMZN: "https://s3-symbol-logo.tradingview.com/amazon--big.svg",
  KO: "https://s3-symbol-logo.tradingview.com/coca-cola--big.svg",
  PG: "https://s3-symbol-logo.tradingview.com/procter-gamble--big.svg",
  V: "https://s3-symbol-logo.tradingview.com/visa--big.svg",
  JNJ: "https://s3-symbol-logo.tradingview.com/johnson-johnson--big.svg",
};

const InvestAmountPage = ({ onBack, strategy, onContinue }) => {
  const currentStrategy = strategy || {
    name: "Strategy",
    return: "+8.7%",
    minimum: 2500,
    tickers: [],
    description: "",
  };

  const [amount, setAmount] = useState(currentStrategy.minimum);
  const [agreementChecked, setAgreementChecked] = useState(false);

  const tickers = currentStrategy.tickers || [];
  const extraHoldings = tickers.length > 3 ? tickers.length - 3 : 0;

  const handleIncrement = () => {
    setAmount(amount + currentStrategy.minimum);
  };

  const handleDecrement = () => {
    if (amount > currentStrategy.minimum) {
      setAmount(amount - currentStrategy.minimum);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-8 text-slate-900">
      <div className="mx-auto flex w-full max-w-sm flex-col px-3 pt-12 md:max-w-md md:px-6">
        {/* Header */}
        <header className="flex items-center justify-center gap-3 mb-6 relative">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="absolute left-0 flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm flex-shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold">Complete Investment</h1>
        </header>

        {/* Strategy Card - White Background */}
        <section className="mb-6 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          {/* Header Section with Flag Logo */}
          <div className="mb-4 flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 overflow-hidden">
              <img
                src="https://s3-symbol-logo.tradingview.com/country/ZA--big.svg"
                alt="South Africa"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex-1">
              <h2 className="text-base font-semibold text-slate-900">{currentStrategy.name}</h2>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-semibold text-emerald-600">{currentStrategy.return}</span>
                <span className="text-xs font-semibold text-slate-600">Min. R{currentStrategy.minimum?.toLocaleString() || "2,500"}</span>
              </div>
            </div>
          </div>

          {/* Holdings Snapshot with Logos */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <div className="flex items-center -space-x-2">
              {tickers.slice(0, 3).map((ticker) => (
                <div
                  key={ticker}
                  className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-slate-100 overflow-hidden flex-shrink-0"
                >
                  <img
                    src={companyLogos[ticker] || `https://s3-symbol-logo.tradingview.com/${ticker.toLowerCase()}--big.svg`}
                    alt={ticker}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.target.style.display = "none";
                      e.target.parentElement.textContent = ticker.charAt(0);
                    }}
                  />
                </div>
              ))}
              {extraHoldings > 0 && (
                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-slate-300 text-white text-[10px] font-bold flex-shrink-0">
                  +{extraHoldings}
                </div>
              )}
            </div>
            <span className="text-xs font-semibold text-slate-600">Holdings snapshot</span>
          </div>
        </section>

        {/* Number Input - Increment/Decrement */}
        <section className="mb-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleDecrement}
                disabled={amount <= currentStrategy.minimum}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:enabled:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <Minus className="h-5 w-5" />
              </button>
              
              <div className="text-center flex-1">
                <p className="text-xs font-semibold text-slate-600 mb-1">Investment Amount</p>
                <p className="text-3xl font-bold text-slate-900">R{amount.toLocaleString()}</p>
              </div>

              <button
                type="button"
                onClick={handleIncrement}
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-[#5b21b6] to-[#7c3aed] text-white hover:shadow-lg transition"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
          </div>
        </section>

        {/* Fee Breakdown */}
        <section className="mb-6 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <h3 className="text-xs font-semibold text-slate-600 mb-3">Fee Breakdown</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-600">Brokerage Fee</p>
              <p className="text-xs font-semibold text-slate-900">0.25%</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-600">Custody Fee</p>
              <p className="text-xs font-semibold text-slate-900">0.005%</p>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 pt-2">
              <p className="text-xs text-slate-600">Transaction Fee</p>
              <p className="text-xs font-semibold text-slate-900">2.9%</p>
            </div>
          </div>
        </section>

        {/* Agreement Checkbox */}
        <section className="mb-6 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreementChecked}
              onChange={(e) => setAgreementChecked(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500 flex-shrink-0"
            />
            <div className="flex-1">
              <p className="text-xs font-semibold text-slate-900">
                I agree to Risk Disclosure, Fee Schedule & Mandate
              </p>
              <p className="text-xs text-slate-600 mt-1">
                By continuing, you confirm you have reviewed and agree to all terms and conditions
              </p>
            </div>
          </label>
        </section>

        {/* Info */}
        <div className="mb-6 flex items-start gap-2 rounded-lg bg-violet-50 p-3">
          <Info className="h-4 w-4 flex-shrink-0 text-violet-600 mt-0.5" />
          <p className="text-xs text-violet-700">
            You'll be redirected to complete payment on Paystack
          </p>
        </div>

        {/* Continue Button */}
        <button
          type="button"
          onClick={() => onContinue?.(amount)}
          disabled={!agreementChecked}
          className="w-full rounded-2xl bg-gradient-to-r from-[#5b21b6] to-[#7c3aed] py-3 text-sm font-semibold text-white shadow-lg shadow-violet-200/60 disabled:opacity-50 disabled:cursor-not-allowed hover:enabled:-translate-y-0.5 transition"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default InvestAmountPage;
