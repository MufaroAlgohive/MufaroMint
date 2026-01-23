import React from "react";
import Skeleton from "./Skeleton";

const HomeSkeleton = () => {
  return (
    <div className="min-h-screen bg-slate-50 pb-[env(safe-area-inset-bottom)]">
      <div className="rounded-b-[36px] bg-gradient-to-b from-[#111111] via-[#3b1b7a] to-[#5b21b6] px-4 pb-12 pt-12 text-white md:px-8">
        <div className="mx-auto flex w-full max-w-sm flex-col gap-6 md:max-w-md">
          <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-10 rounded-full bg-white/40" />
            <Skeleton className="h-10 w-10 rounded-full bg-white/40" />
          </div>
          <div className="rounded-3xl bg-white/10 p-5">
            <Skeleton className="h-3 w-24 bg-white/40" />
            <Skeleton className="mt-3 h-8 w-32 bg-white/40" />
            <div className="mt-5 grid grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-14 w-full rounded-2xl bg-white/40" />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto -mt-10 flex w-full max-w-sm flex-col gap-6 px-4 pb-10 md:max-w-md md:px-8">
        <Skeleton className="h-20 w-full rounded-3xl" />
        <div className="flex items-center justify-center gap-2">
          <Skeleton className="h-1.5 w-1.5 rounded-full" />
          <Skeleton className="h-1.5 w-4 rounded-full" />
          <Skeleton className="h-1.5 w-1.5 rounded-full" />
        </div>
      </div>
    </div>
  );
};

export default HomeSkeleton;
