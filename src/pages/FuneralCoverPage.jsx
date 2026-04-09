import React from "react";
import { ArrowLeft, Umbrella } from "lucide-react";

export default function FuneralCoverPage({ onBack }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="bg-white border-b border-slate-100 px-4 py-4 flex items-center gap-3">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100">
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </button>
        <h1 className="text-base font-bold text-slate-900">Funeral Cover</h1>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="p-5 rounded-full bg-violet-100">
          <Umbrella className="h-10 w-10 text-violet-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Coming soon</h2>
        <p className="text-sm text-slate-500 max-w-xs">
          We're building the Mint funeral cover experience. Check back soon.
        </p>
      </div>
    </div>
  );
}
