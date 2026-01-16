import React from "react";

import { LoaderOne } from "./ui/unique-loader-components";

const Preloader = () => {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white">
      <div className="pointer-events-none absolute -left-24 top-0 h-96 w-96 rounded-full bg-purple-200/50 blur-[140px]" />
      <div className="pointer-events-none absolute -right-32 top-24 h-96 w-96 rounded-full bg-fuchsia-200/50 blur-[160px]" />
      <div className="pointer-events-none absolute bottom-0 left-1/4 h-96 w-96 rounded-full bg-indigo-100/60 blur-[160px]" />
      <div className="relative z-10 flex justify-center">
        <LoaderOne />
      </div>
    </div>
  );
};

export default Preloader;
