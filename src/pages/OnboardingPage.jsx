import React, { useState, useRef, startTransition } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

const OriginButton = ({ children, onClick, className, circleColor }) => {
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const scale = useMotionValue(0);
  const smoothScale = useSpring(scale, { stiffness: 85, damping: 18, restDelta: 0.001 });

  const handleMouseEnter = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    startTransition(() => setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top }));
    scale.set(1);
  };

  const handleMouseLeave = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    startTransition(() => setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top }));
    scale.set(0);
  };

  return (
    <button
      ref={containerRef}
      type="button"
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={className}
      style={{ position: "relative", overflow: "hidden" }}
    >
      <motion.span
        style={{
          position: "absolute",
          left: cursorPos.x,
          top: cursorPos.y,
          width: 400,
          height: 400,
          borderRadius: "50%",
          backgroundColor: circleColor,
          scale: smoothScale,
          x: "-50%",
          y: "-50%",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <span style={{ position: "relative", zIndex: 1 }}>{children}</span>
    </button>
  );
};

const OnboardingPage = ({ onCreateAccount, onLogin }) => {
  return (
    <div className="h-screen overflow-hidden bg-white">
      <div className="grid h-full grid-rows-2 lg:grid-cols-[1.05fr_1fr] lg:grid-rows-none">
        <div className="order-2 flex h-full flex-col px-6 py-8 lg:order-1 lg:px-16 lg:py-12">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 animate-on-load delay-1">
              <img src="/assets/mint-logo.svg" alt="Mint logo" className="h-6 w-auto" />
              <span className="mint-brand text-lg font-semibold tracking-[0.12em]">MINT</span>
            </div>
          </div>

          <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center space-y-8">
            <div className="space-y-3 animate-on-load delay-2">
              <h1 className="text-4xl font-semibold text-slate-900 sm:text-5xl">
                Welcome to <span className="mint-brand">Mint</span>
              </h1>
              <p className="text-lg text-slate-600">
                Your money tools are ready when you are.
              </p>
            </div>

            <div className="flex flex-col gap-4 animate-on-load delay-3 sm:items-start">
              <OriginButton
                onClick={onLogin}
                circleColor="rgba(148,163,184,0.18)"
                className="inline-flex w-full items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-900 shadow-sm sm:w-auto"
              >
                Login
              </OriginButton>

              <OriginButton
                onClick={onCreateAccount}
                circleColor="rgba(255,255,255,0.12)"
                className="inline-flex w-full items-center justify-center rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white shadow-lg shadow-slate-900/20 sm:w-auto"
              >
                Create Account
              </OriginButton>
            </div>
          </div>
        </div>

        <div className="order-1 h-full lg:order-2">
          <div className="relative h-full w-full overflow-hidden rounded-b-[3.5rem] [clip-path:ellipse(140%_90%_at_50%_0%)] lg:rounded-none lg:[clip-path:none]">
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
