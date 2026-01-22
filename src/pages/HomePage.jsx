import React from "react";

const HomePage = () => {
  return (
    <div className="min-h-screen bg-slate-50 px-4 pb-8 pt-10 text-slate-900 md:px-8 md:pt-12">
      <div className="mx-auto flex w-full max-w-sm flex-col gap-6 md:max-w-md">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500">Welcome Back</p>
            <h1 className="text-lg font-semibold">Ms Thando Chiloane</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold">
              TC
            </div>
            <button
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm"
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
          </div>
        </header>

        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
            Cash Available
          </span>
          <div className="mt-3">
            <p className="text-2xl font-semibold">R239,900.54</p>
            <div className="mt-2 flex items-center gap-2 text-xs text-emerald-600">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Cashback Today: 5%</span>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 text-sm font-medium">
            <button
              className="rounded-full bg-emerald-500 py-2 text-white shadow-sm"
              type="button"
            >
              Invest
            </button>
            <button
              className="rounded-full border border-slate-200 bg-white py-2 text-slate-700 shadow-sm"
              type="button"
            >
              Make a Deposit
            </button>
          </div>
        </section>

        <div className="flex items-center justify-center gap-2">
          <span className="h-2 w-2 rounded-full bg-slate-300" />
          <span className="h-2 w-2 rounded-full bg-slate-900" />
          <span className="h-2 w-2 rounded-full bg-slate-300" />
        </div>

        <section className="rounded-3xl bg-white px-4 py-5 shadow-sm">
          <div className="grid grid-cols-4 gap-3 text-center text-xs font-medium text-slate-600">
            {[
              { label: "Invest", icon: "I" },
              { label: "Repay Loan", icon: "R" },
              { label: "Deposit", icon: "D" },
              { label: "Withdraw", icon: "W" },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
                  {item.icon}
                </div>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Recent Activity</h2>
            <button className="text-xs font-semibold text-emerald-600" type="button">
              View All
            </button>
          </div>
          <div className="mt-4 grid gap-3 text-xs">
            <div className="grid grid-cols-[1.2fr_1fr_0.8fr] text-[10px] font-semibold text-slate-400">
              <span>Type</span>
              <span>Amount</span>
              <span className="text-right">Date</span>
            </div>
            {[
              { type: "Cash Deposit", amount: "+R20,400", date: "11 Jan" },
              { type: "Investment", amount: "-R45,900", date: "11 Jan" },
              { type: "Investment", amount: "-R45,900", date: "11 Jan" },
              { type: "Cash Deposit", amount: "+R20,400", date: "11 Jan" },
              { type: "Cash Deposit", amount: "+R20,400", date: "11 Jan" },
            ].map((row, index) => (
              <div
                key={`${row.type}-${index}`}
                className="grid grid-cols-[1.2fr_1fr_0.8fr] items-center rounded-xl border border-slate-100 px-3 py-2 text-slate-600"
              >
                <span className="font-medium text-slate-700">{row.type}</span>
                <span className={row.amount.startsWith("+") ? "text-emerald-600" : "text-rose-500"}>
                  {row.amount}
                </span>
                <span className="text-right text-slate-500">{row.date}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default HomePage;
