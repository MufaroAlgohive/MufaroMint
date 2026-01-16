import React from "react";

const OnboardingPage = ({ onGetStarted }) => {
  return (
    <div className="min-h-screen bg-white">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
        <div className="order-2 flex flex-col px-6 pb-16 pt-10 lg:order-1 lg:px-16 lg:pt-12">
          <div className="flex items-center justify-between">
            <img src="/assets/mint-logo.svg" alt="Mint logo" className="h-6 w-auto" />
          </div>

          <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center space-y-8 pt-10 lg:pt-0">
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold text-slate-900 sm:text-5xl">
                Welcome to <span className="mint-brand">Mint</span>
              </h1>
              <p className="text-lg text-slate-600">
                Let’s get your account ready in a few minutes.
              </p>
            </div>

            <div className="space-y-4">
              <button
                type="button"
                onClick={onGetStarted}
                className="inline-flex w-full items-center justify-center rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5 sm:w-auto"
              >
                Continue
              </button>
            </div>
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <div className="relative h-[38vh] w-full overflow-hidden rounded-b-[3rem] lg:h-full lg:rounded-none">
            <img
              src="https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1200&q=80"
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
