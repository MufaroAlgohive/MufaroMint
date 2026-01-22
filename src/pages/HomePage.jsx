import React from "react";

const HomePage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#31005e] via-purple-200 to-white px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-12 text-slate-900 md:px-8 md:pt-14">
      <div className="mx-auto flex w-full max-w-sm flex-col gap-6 md:max-w-md">
        <header className="flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-xs font-semibold text-slate-700">
              RR
            </div>
            <div>
              <p className="text-lg font-semibold">Good Afternoon, Riyad</p>
              <p className="text-xs text-white/80">Welcome Back</p>
            </div>
          </div>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/85 text-slate-700 shadow-sm"
            aria-label="Notifications"
            type="button"
          >
            <svg
              aria-hidden="true"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0a3 3 0 1 1-6 0"
              />
            </svg>
          </button>
        </header>

        <section className="rounded-3xl bg-white/15 p-5 text-center text-white shadow-sm backdrop-blur">
          <p className="text-xs text-white/70">Total Balance</p>
          <p className="mt-2 text-3xl font-semibold">$24,806.03</p>
          <div className="mt-5 grid grid-cols-4 gap-3 text-[11px] font-medium">
            {[
              { label: "Transfer", icon: "↗" },
              { label: "Deposit", icon: "↓" },
              { label: "Pay", icon: "▢" },
              { label: "Scan", icon: "⌁" },
            ].map((item) => (
              <button
                key={item.label}
                className="flex flex-col items-center gap-2 rounded-2xl bg-white/80 px-2 py-3 text-slate-700 shadow-sm"
                type="button"
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="flex items-center justify-between gap-3 rounded-3xl bg-white px-4 py-3 shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-200 text-lg">
              ✨
            </div>
            <div>
              <p className="text-[11px] text-slate-500">Personal Balance</p>
              <p className="text-sm font-semibold">$206.03</p>
            </div>
          </div>
          <button className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100" type="button">
            →
          </button>
        </section>

        <div className="flex items-center justify-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
          <span className="h-1.5 w-4 rounded-full bg-white/90" />
          <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
        </div>

        <section className="rounded-3xl bg-white p-5 shadow-lg">
          <h2 className="text-sm font-semibold text-slate-800">Transactions</h2>
          <div className="mt-4 grid gap-4 text-xs">
            {[
              {
                title: "Subscribed to Dribbble pro",
                amount: "-$25",
                date: "12/06/24",
                initials: "DR",
                accent: "bg-slate-900 text-white",
              },
              {
                title: "Received from Nix",
                amount: "+$100",
                date: "12/06/24",
                initials: "NX",
                accent: "bg-emerald-100 text-emerald-700",
              },
            ].map((row) => (
              <div key={row.title} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${row.accent}`}>
                    {row.initials}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{row.title}</p>
                    <p className="text-[11px] text-slate-400">{row.date}</p>
                  </div>
                </div>
                <span className={row.amount.startsWith("+") ? "text-emerald-500" : "text-rose-500"}>
                  {row.amount}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default HomePage;
