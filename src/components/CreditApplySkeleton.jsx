import React from "react";
import Skeleton from "./Skeleton";

const CreditApplySkeleton = () => {
  return (
    <div className="animate-in fade-in duration-500 flex flex-col items-center px-6 pb-10 min-h-screen bg-white">
      <header className="w-full flex items-center justify-start pt-10 pb-6">
        <Skeleton className="h-10 w-10 rounded-full" />
      </header>

      <div className="mb-6 mt-4">
        <Skeleton className="h-20 w-20 rounded-2xl" />
      </div>

      <Skeleton className="h-8 w-48 mb-2" />
      <Skeleton className="h-4 w-36 mb-2" />
      <Skeleton className="h-4 w-56 mb-8" />

      <div className="w-full space-y-3 mb-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-3 rounded-2xl bg-slate-50 border border-slate-100"
          >
            <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-2.5 w-44" />
            </div>
          </div>
        ))}
      </div>

      <Skeleton className="h-4 w-24 mb-6" />

      <Skeleton className="w-full h-14 rounded-full" />

      <div className="mt-6 w-full space-y-4">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    </div>
  );
};

export default CreditApplySkeleton;
