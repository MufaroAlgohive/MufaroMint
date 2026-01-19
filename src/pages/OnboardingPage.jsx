import React from "react";

const OnboardingPage = ({ onCreateAccount, onLogin }) => {
  return (
    <div className="min-h-screen bg-white">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
        <div className="order-2 flex flex-col px-6 pb-16 pt-10 lg:order-1 lg:px-16 lg:pt-12">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 animate-on-load delay-1">
              <img src="/assets/mint-logo.svg" alt="Mint logo" className="h-6 w-auto" />
              <span className="mint-brand text-lg font-semibold tracking-[0.12em]">MINT</span>
            </div>
          </div>

          <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center space-y-8 pt-10 lg:pt-0">
            <div className="space-y-3 animate-on-load delay-2">
              <h1 className="text-4xl font-semibold text-slate-900 sm:text-5xl">
                Welcome to <span className="mint-brand">Mint</span>
              </h1>
              <p className="text-lg text-slate-600">
                Let’s get your account ready in a few minutes.
              </p>
            </div>

            <div className="flex flex-wrap gap-4 animate-on-load delay-3">
              <button
                type="button"
                onClick={onCreateAccount}
                className="inline-flex flex-1 items-center justify-center rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5 sm:flex-none"
              >
                Create Account
              </button>
              <button
                type="button"
                onClick={onLogin}
                className="inline-flex flex-1 items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 sm:flex-none"
              >
                Login
              </button>
            </div>
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <div className="relative h-[65vh] w-full overflow-hidden rounded-b-[3.5rem] [clip-path:ellipse(140%_90%_at_50%_0%)] lg:h-full lg:rounded-none lg:[clip-path:none]">
            <img
              src="/assets/images/onboarding-hero.png"
              alt="Person using a phone"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
