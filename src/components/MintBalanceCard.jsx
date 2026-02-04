import React, { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Info } from "lucide-react";
import { formatZar } from "../lib/formatCurrency";
import { formatRelativeTime } from "../lib/formatRelativeTime";

const VISIBILITY_STORAGE_KEY = "mintBalanceVisible";

const MintLogoWhite = ({ className = "" }) => (
  <svg viewBox="0 0 1826.64 722.72" className={className}>
    <g>
      <path fill="#FFFFFF" d="M1089.47,265.13c25.29,12.34,16.69,50.37-11.45,50.63h0s-512.36,0-512.36,0c-14.73,0-26.67,11.94-26.67,26.67v227.94c0,14.73-11.94,26.67-26.67,26.67H26.67c-14.73,0-26.67-11.94-26.67-26.67v-248.55c0-9.54,5.1-18.36,13.38-23.12L526.75,3.55c7.67-4.41,17.03-4.73,24.99-.85l537.73,262.43Z"/>
      <path fill="#FFFFFF" d="M737.17,457.58c-25.29-12.34-16.69-50.37,11.45-50.63h0s512.36,0,512.36,0c14.73,0,26.67-11.94,26.67-26.67v-227.94c0-14.73,11.94-26.67,26.67-26.67h485.66c14.73,0,26.67,11.94,26.67,26.67v248.55c0,9.54-5.1,18.36-13.38,23.12l-513.38,295.15c-7.67,4.41-17.03,4.73-24.99.85l-537.73-262.43Z"/>
    </g>
  </svg>
);

const MintLogoSilver = ({ className = "" }) => (
  <svg viewBox="0 0 1826.64 722.72" className={className}>
    <g opacity="0.12">
      <path fill="#C0C0C0" d="M1089.47,265.13c25.29,12.34,16.69,50.37-11.45,50.63h0s-512.36,0-512.36,0c-14.73,0-26.67,11.94-26.67,26.67v227.94c0,14.73-11.94,26.67-26.67,26.67H26.67c-14.73,0-26.67-11.94-26.67-26.67v-248.55c0-9.54,5.1-18.36,13.38-23.12L526.75,3.55c7.67-4.41,17.03-4.73,24.99-.85l537.73,262.43Z"/>
      <path fill="#C0C0C0" d="M737.17,457.58c-25.29-12.34-16.69-50.37,11.45-50.63h0s512.36,0,512.36,0c14.73,0,26.67-11.94,26.67-26.67v-227.94c0-14.73,11.94-26.67,26.67-26.67h485.66c14.73,0,26.67,11.94,26.67,26.67v248.55c0,9.54-5.1,18.36-13.38,23.12l-513.38,295.15c-7.67,4.41-17.03,4.73-24.99.85l-537.73-262.43Z"/>
    </g>
  </svg>
);

const MintBalanceCard = ({
  amount,
  changeText,
  updatedAt,
  isLoading = false,
  error = false,
  isEmpty = false,
  isInteractive = true,
  showVisibilityToggle = true,
  showBreakdownHint = true,
  onPressMintBalance,
  onRetry,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const stored = window.localStorage.getItem(VISIBILITY_STORAGE_KEY);
    if (stored === "false") {
      setIsVisible(false);
    }
  }, []);

  const toggleVisibility = () => {
    setIsVisible((prev) => {
      const next = !prev;
      window.localStorage.setItem(VISIBILITY_STORAGE_KEY, String(next));
      return next;
    });
  };

  const formattedAmount = useMemo(() => formatZar(amount), [amount]);
  const updatedLabel = useMemo(
    () => formatRelativeTime(updatedAt, { isLoading }),
    [updatedAt, isLoading],
  );

  const shouldShowChange = Boolean(changeText) && isVisible && !isLoading && !error && !isEmpty;
  const maskedAmount = "••••••••";

  const handleCardPress = () => {
    if (!isInteractive) {
      return;
    }
    if (error && onRetry) {
      onRetry();
      return;
    }
    if (onPressMintBalance) {
      onPressMintBalance();
    }
  };

  const cardProps = isInteractive
    ? {
        role: "button",
        tabIndex: 0,
        onClick: handleCardPress,
        onKeyDown: (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleCardPress();
          }
        },
      }
    : {};

  return (
    <div
      className="relative rounded-[24px] overflow-hidden p-5 text-white"
      style={{
        background: "linear-gradient(135deg, #2d1052 0%, #4a1d7a 25%, #6b2fa0 50%, #5a2391 75%, #3d1a6d 100%)",
        boxShadow: "0 25px 50px -12px rgba(91, 33, 182, 0.5)",
      }}
      {...cardProps}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            repeating-linear-gradient(
              45deg,
              transparent,
              transparent 8px,
              rgba(255,255,255,0.02) 8px,
              rgba(255,255,255,0.02) 9px
            ),
            repeating-linear-gradient(
              -45deg,
              transparent,
              transparent 8px,
              rgba(255,255,255,0.02) 8px,
              rgba(255,255,255,0.02) 9px
            ),
            repeating-linear-gradient(
              60deg,
              transparent,
              transparent 15px,
              rgba(255,255,255,0.015) 15px,
              rgba(255,255,255,0.015) 16px
            ),
            repeating-linear-gradient(
              -60deg,
              transparent,
              transparent 15px,
              rgba(255,255,255,0.015) 15px,
              rgba(255,255,255,0.015) 16px
            )
          `,
        }}
      />
      
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <MintLogoSilver className="w-52 h-auto" />
      </div>

      <div className="relative">
        <div className="flex items-start justify-between">
          <MintLogoWhite className="h-8 w-auto" />
          {showVisibilityToggle ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                toggleVisibility();
              }}
              aria-label={isVisible ? "Hide balance" : "Show balance"}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/20"
            >
              {isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
          ) : null}
        </div>

        <div className="mt-6">
          {isLoading ? (
            <div className="h-9 w-40 rounded-full bg-white/20 animate-pulse" />
          ) : error ? (
            <p className="text-lg font-semibold text-white" style={{ fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
              Mint Balance unavailable
            </p>
          ) : isEmpty ? (
            <p className="text-lg font-semibold text-white" style={{ fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
              No balance yet
            </p>
          ) : (
            <p className="text-3xl md:text-4xl font-bold text-white tracking-wider" style={{ fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
              {isVisible ? formattedAmount : maskedAmount}
            </p>
          )}
        </div>

        {error ? (
          <p className="mt-2 text-xs text-white/70" style={{ fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
            Tap to retry
          </p>
        ) : shouldShowChange ? (
          <div className="mt-3 inline-flex rounded-full bg-white/15 px-3 py-1 text-[11px] font-medium text-white/80" style={{ fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
            {changeText}
          </div>
        ) : (
          <div className="mt-3 h-6" />
        )}

        <p className="mt-4 flex items-center gap-2 text-xs text-white/70" style={{ fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
          <span className="flex h-5 w-5 items-center justify-center rounded-full border border-white/30 text-white/70">
            <Info className="h-3 w-3" />
          </span>
          <span>Across your investments and available credit</span>
        </p>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-[10px] text-white/60" style={{ fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
            {updatedLabel || ""}
          </span>
          <div className="text-right">
            <p className="text-xl font-bold text-white tracking-wider" style={{ fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", fontStyle: "italic" }}>
              VISA
            </p>
            <p className="text-xs text-white/90 tracking-widest font-medium" style={{ fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
              Mint
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MintBalanceCard;
