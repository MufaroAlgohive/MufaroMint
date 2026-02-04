import React, { useState, useMemo, useRef } from "react";
import { Eye, EyeOff, TrendingUp } from "lucide-react";
import { formatZar } from "../lib/formatCurrency";
import { Area, ComposedChart, Line, ResponsiveContainer } from "recharts";

const VISIBILITY_STORAGE_KEY = "mintBalanceVisible";

const generateChartData = (baseValue = 100, trend = "up", points = 20) => {
  const data = [];
  let value = baseValue;
  for (let i = 0; i < points; i++) {
    const change = trend === "up" 
      ? Math.random() * 6 - 1.5 
      : Math.random() * 5 - 3;
    value = Math.max(baseValue * 0.7, value + change);
    data.push({ x: i, value: Number(value.toFixed(2)) });
  }
  return data;
};

const MiniChart = ({ data, color = "#FFFFFF" }) => {
  const gradientId = useMemo(() => `gradient-${Math.random().toString(36).substr(2, 9)}`, []);
  
  if (!data || data.length === 0) {
    return <div className="h-full w-full flex items-center justify-center text-white/40 text-xs">No data</div>;
  }
  
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke="transparent"
          fill={`url(#${gradientId})`}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2.5}
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
};

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

const CardContent = ({ children, style }) => (
  <div
    className="absolute inset-0 rounded-[24px] overflow-hidden"
    style={{
      background: "linear-gradient(135deg, #2d1052 0%, #4a1d7a 25%, #6b2fa0 50%, #5a2391 75%, #3d1a6d 100%)",
      boxShadow: "0 25px 50px -12px rgba(91, 33, 182, 0.5)",
      backfaceVisibility: "hidden",
      ...style,
    }}
  >
    <div
      className="absolute inset-0"
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
    {children}
  </div>
);

const SwipeableBalanceCard = ({
  amount = 0,
  totalInvestments = 0,
  investmentChange = 0,
  bestPerformingAssets = [],
  userName = "",
  onPressMintBalance,
}) => {
  const [rotation, setRotation] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem(VISIBILITY_STORAGE_KEY);
      return stored !== "false";
    }
    return true;
  });
  const dragStartX = useRef(0);
  
  const chartColor = investmentChange >= 0 ? "#10B981" : "#F43F5E";
  
  const investmentChartData = useMemo(() => 
    generateChartData(totalInvestments > 0 ? 100 : 50, investmentChange >= 0 ? "up" : "down"), 
    [totalInvestments, investmentChange]
  );

  const toggleVisibility = (e) => {
    e.stopPropagation();
    setIsVisible((prev) => {
      const next = !prev;
      window.localStorage.setItem(VISIBILITY_STORAGE_KEY, String(next));
      return next;
    });
  };

  const formattedAmount = useMemo(() => formatZar(amount), [amount]);
  const formattedInvestments = useMemo(() => formatZar(totalInvestments), [totalInvestments]);
  const maskedAmount = "••••••••";

  const bestAsset = bestPerformingAssets.length > 0 ? bestPerformingAssets[0] : null;
  const investmentCount = bestPerformingAssets.length;

  const currentIndex = Math.round(rotation / 180) % 2 === 0 ? 0 : 1;
  const normalizedIndex = Math.abs(currentIndex);

  const handleDragStart = (e) => {
    if (isAnimating) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    dragStartX.current = clientX;
  };

  const handleDragEnd = (e) => {
    if (isAnimating) return;
    const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    const diff = dragStartX.current - clientX;
    const threshold = 50;
    
    if (Math.abs(diff) > threshold) {
      setIsAnimating(true);
      if (diff > 0) {
        setRotation(prev => prev - 180);
      } else {
        setRotation(prev => prev + 180);
      }
      setTimeout(() => setIsAnimating(false), 700);
    }
  };

  const handleDotClick = (idx) => {
    if (isAnimating) return;
    const currentCard = normalizedIndex;
    if (idx !== currentCard) {
      setIsAnimating(true);
      if (idx > currentCard) {
        setRotation(prev => prev - 180);
      } else {
        setRotation(prev => prev + 180);
      }
      setTimeout(() => setIsAnimating(false), 700);
    }
  };

  const frontRotation = rotation;
  const backRotation = rotation + 180;

  return (
    <div className="relative select-none">
      <div
        className="relative w-full touch-pan-y"
        style={{ 
          aspectRatio: "1.7 / 1",
          perspective: "1000px",
        }}
        onTouchStart={handleDragStart}
        onTouchEnd={handleDragEnd}
        onMouseDown={handleDragStart}
        onMouseUp={handleDragEnd}
      >
        <CardContent 
          style={{ 
            transform: `rotateY(${frontRotation}deg)`,
            transition: "transform 0.7s ease-out",
          }}
        >
          <div className="relative h-full p-5 flex flex-col">
            <div className="flex items-start justify-between">
              <MintLogoWhite className="h-8 w-auto" />
            </div>

            <div className="flex-1 flex items-center justify-center">
              <p className="text-3xl md:text-4xl font-bold text-white tracking-wider" style={{ fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
                {isVisible ? formattedAmount : maskedAmount}
              </p>
            </div>

            <div className="flex items-end justify-between">
              <div>
                <p className="text-base md:text-lg uppercase tracking-[0.2em] text-white font-semibold" style={{ fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", letterSpacing: "0.15em" }}>
                  {userName || "MINT MEMBER"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl md:text-3xl font-bold text-white tracking-wider" style={{ fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", fontStyle: "italic" }}>
                  VISA
                </p>
                <p className="text-sm md:text-base text-white/90 tracking-widest font-medium" style={{ fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
                  Mint
                </p>
              </div>
            </div>
          </div>
        </CardContent>

        <CardContent 
          style={{ 
            transform: `rotateY(${backRotation}deg)`,
            transition: "transform 0.7s ease-out",
          }}
        >
          <div className="relative h-full p-5 flex flex-col">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-white" />
                <span className="text-xs uppercase tracking-[0.15em] text-white/80 font-medium" style={{ fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
                  Total Investments
                </span>
              </div>
            </div>

            <div className="mt-2">
              <p className="text-2xl md:text-3xl font-bold text-white tracking-wider" style={{ fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
                {isVisible ? formattedInvestments : maskedAmount}
              </p>
              <p className="text-sm font-semibold mt-0.5" style={{ color: chartColor, fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
                {investmentChange >= 0 ? "+" : ""}{investmentChange.toFixed(2)}% this month
              </p>
            </div>

            <div className="flex-1 mt-2 min-h-[60px]">
              <MiniChart data={investmentChartData} color={chartColor} />
            </div>

            <div className="flex items-end justify-between mt-1">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-white/60 font-medium" style={{ fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
                  Total Investments
                </p>
                <p className="text-lg font-bold text-white" style={{ fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
                  {investmentCount}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-white/60 font-medium" style={{ fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
                  Best Performing
                </p>
                {bestAsset ? (
                  <div className="flex items-center justify-end gap-1">
                    <span className="text-lg font-bold text-white" style={{ fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
                      {bestAsset.symbol}
                    </span>
                    <span className="text-sm font-semibold" style={{ color: chartColor }}>
                      +{(bestAsset.change || 0).toFixed(1)}%
                    </span>
                  </div>
                ) : (
                  <p className="text-sm text-white/50">—</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>

        <button
          type="button"
          onClick={toggleVisibility}
          className="absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/20"
          aria-label={isVisible ? "Hide values" : "Show values"}
        >
          {isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>
      </div>

      <div className="flex justify-center gap-2 mt-3">
        {[0, 1].map((idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleDotClick(idx)}
            className={`h-2 rounded-full transition-all duration-300 ${
              normalizedIndex === idx
                ? "w-6 bg-white"
                : "w-2 bg-white/40 hover:bg-white/60"
            }`}
            aria-label={`Go to card ${idx + 1}`}
          />
        ))}
      </div>

      {onPressMintBalance && (
        <button
          type="button"
          onClick={onPressMintBalance}
          className="mt-4 py-2.5 px-5 rounded-lg text-sm font-medium text-white/90 transition-all duration-300 hover:text-white hover:bg-white/10 active:scale-[0.98] mx-auto flex items-center gap-2"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.15)",
            fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        >
          View Investment Breakdown
        </button>
      )}
    </div>
  );
};

export default SwipeableBalanceCard;
