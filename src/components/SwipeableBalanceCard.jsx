import React, { useState, useMemo } from "react";
import { Eye, EyeOff, TrendingUp, Trophy } from "lucide-react";
import { formatZar } from "../lib/formatCurrency";
import { motion, AnimatePresence } from "framer-motion";
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

const MiniChart = ({ data, color = "#FFD700" }) => {
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

const CardFace = ({ children }) => (
  <div
    className="absolute inset-0 rounded-[24px] overflow-hidden"
    style={{
      background: "linear-gradient(135deg, #1a0a2e 0%, #3b1b7a 35%, #5b21b6 70%, #4c1d95 100%)",
      boxShadow: "0 25px 50px -12px rgba(91, 33, 182, 0.4)",
    }}
  >
    <div
      className="absolute inset-0 opacity-15"
      style={{
        backgroundImage: `
          repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.03) 20px, rgba(255,255,255,0.03) 40px),
          repeating-linear-gradient(-45deg, transparent, transparent 20px, rgba(255,255,255,0.03) 20px, rgba(255,255,255,0.03) 40px)
        `,
      }}
    />
    <div className="absolute top-[45%] left-[40%] w-32 h-32 rounded-full border border-white/10" />
    {children}
  </div>
);

const SwipeableBalanceCard = ({
  amount = 0,
  totalInvestments = 0,
  investmentChange = 0,
  bestPerformingAssets = [],
  onPressMintBalance,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem(VISIBILITY_STORAGE_KEY);
      return stored !== "false";
    }
    return true;
  });
  const [dragStartX, setDragStartX] = useState(0);
  
  const investmentChartData = useMemo(() => 
    generateChartData(totalInvestments > 0 ? 100 : 50, investmentChange >= 0 ? "up" : "down"), 
    [totalInvestments, investmentChange]
  );
  
  const bestPerformingChartData = useMemo(() => {
    if (bestPerformingAssets.length === 0) return [];
    const avgChange = bestPerformingAssets.reduce((sum, a) => sum + (a.change || 0), 0) / bestPerformingAssets.length;
    return generateChartData(100, avgChange >= 0 ? "up" : "down");
  }, [bestPerformingAssets]);

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

  const topAssets = bestPerformingAssets.slice(0, 3);
  const avgPerformance = topAssets.length > 0 
    ? topAssets.reduce((sum, a) => sum + (a.change || 0), 0) / topAssets.length 
    : 0;

  const handleDragStart = (e) => {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    setDragStartX(clientX);
  };

  const handleDragEnd = (e) => {
    const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    const diff = dragStartX - clientX;
    const threshold = 50;
    
    if (diff > threshold && currentIndex < 2) {
      setCurrentIndex(currentIndex + 1);
    } else if (diff < -threshold && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const slideVariants = {
    enter: (direction) => ({ x: direction > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (direction) => ({ x: direction < 0 ? 300 : -300, opacity: 0 }),
  };

  const cards = [
    {
      id: "balance",
      content: (
        <CardFace>
          <div className="relative h-full p-5 flex flex-col">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/60 mb-0.5">MINT BALANCE</p>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-5 h-5 rounded-full bg-white/20" />
                <div className="w-5 h-5 rounded-full bg-white/35 -ml-2" />
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center">
              <p className="text-3xl md:text-4xl font-bold text-[#FFD700] tracking-wider">
                {isVisible ? formattedAmount : maskedAmount}
              </p>
            </div>

            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/50">MINT MEMBER</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-[#FFD700] tracking-wider">MINT</p>
                <p className="text-[9px] text-white/50">AlgoHive Money</p>
              </div>
            </div>
          </div>
        </CardFace>
      ),
    },
    {
      id: "investments",
      content: (
        <CardFace>
          <div className="relative h-full p-5 flex flex-col">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[#FFD700]" />
                <span className="text-[10px] uppercase tracking-[0.15em] text-white/60">Total Investments</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-5 h-5 rounded-full bg-white/20" />
                <div className="w-5 h-5 rounded-full bg-white/35 -ml-2" />
              </div>
            </div>

            <div className="mt-2">
              <p className="text-2xl md:text-3xl font-bold text-[#FFD700] tracking-wider">
                {isVisible ? formattedInvestments : maskedAmount}
              </p>
              <p className={`text-xs font-semibold mt-0.5 ${investmentChange >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {investmentChange >= 0 ? "+" : ""}{investmentChange.toFixed(2)}% this month
              </p>
            </div>

            <div className="flex-1 mt-2 min-h-[60px]">
              <MiniChart data={investmentChartData} color="#FFD700" />
            </div>

            <div className="flex items-center justify-between text-[9px] text-white/50 mt-1">
              <span>Swipe for more</span>
              <span className="font-bold text-[#FFD700] text-sm tracking-wider">MINT</span>
            </div>
          </div>
        </CardFace>
      ),
    },
    {
      id: "best-performing",
      content: (
        <CardFace>
          <div className="relative h-full p-5 flex flex-col">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-[#FFD700]" />
                <span className="text-[10px] uppercase tracking-[0.15em] text-white/60">Best Performers</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-5 h-5 rounded-full bg-white/20" />
                <div className="w-5 h-5 rounded-full bg-white/35 -ml-2" />
              </div>
            </div>

            <div className="mt-2">
              {topAssets.length > 0 ? (
                <div className="flex items-center gap-2">
                  {topAssets.map((asset, idx) => (
                    <div key={asset.symbol || idx} className="flex-1 text-center bg-white/5 rounded-lg py-1.5 px-1">
                      <p className="text-[10px] font-semibold text-white/70 truncate">{asset.symbol}</p>
                      <p className={`text-xs font-bold ${(asset.change || 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {(asset.change || 0) >= 0 ? "+" : ""}{(asset.change || 0).toFixed(1)}%
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-white/50">No investments yet</p>
              )}
              <p className={`text-sm font-bold mt-1.5 ${avgPerformance >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                Avg: {avgPerformance >= 0 ? "+" : ""}{avgPerformance.toFixed(2)}%
              </p>
            </div>

            <div className="flex-1 mt-1 min-h-[50px]">
              <MiniChart data={bestPerformingChartData} color="#10B981" />
            </div>

            <div className="flex items-center justify-between text-[9px] text-white/50 mt-1">
              <span>Swipe back</span>
              <span className="font-bold text-[#FFD700] text-sm tracking-wider">MINT</span>
            </div>
          </div>
        </CardFace>
      ),
    },
  ];

  return (
    <div className="relative select-none">
      <div
        className="relative w-full overflow-hidden touch-pan-y"
        style={{ aspectRatio: "1.7 / 1" }}
        onTouchStart={handleDragStart}
        onTouchEnd={handleDragEnd}
        onMouseDown={handleDragStart}
        onMouseUp={handleDragEnd}
      >
        <AnimatePresence mode="wait" custom={currentIndex}>
          <motion.div
            key={currentIndex}
            custom={currentIndex}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute inset-0 cursor-grab active:cursor-grabbing"
            onClick={onPressMintBalance}
          >
            {cards[currentIndex].content}
          </motion.div>
        </AnimatePresence>

        <button
          type="button"
          onClick={toggleVisibility}
          className="absolute top-4 right-12 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/20"
          aria-label={isVisible ? "Hide values" : "Show values"}
        >
          {isVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        </button>
      </div>

      <div className="flex justify-center gap-2 mt-3">
        {cards.map((card, idx) => (
          <button
            key={card.id}
            type="button"
            onClick={() => setCurrentIndex(idx)}
            className={`h-2 rounded-full transition-all duration-300 ${
              idx === currentIndex
                ? "w-6 bg-white"
                : "w-2 bg-white/40 hover:bg-white/60"
            }`}
            aria-label={`Go to ${card.id} card`}
          />
        ))}
      </div>
    </div>
  );
};

export default SwipeableBalanceCard;
