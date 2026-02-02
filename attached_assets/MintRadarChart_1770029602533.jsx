import React, { useMemo } from "react";

export const MintRadarChart = ({ score, categories, isCalculating }) => {
  const center = 100;
  const radius = 80;
  const angleStep = (Math.PI * 2) / categories.length;

  const radarPoints = useMemo(() => {
    return categories.map((c, i) => {
      const angle = (i * angleStep) - (Math.PI / 2);
      const r = (c.value / 100) * radius;
      const x = center + r * Math.cos(angle);
      const y = center + r * Math.sin(angle);
      return `${x},${y}`;
    }).join(' ');
  }, [categories, angleStep, radius]);

  const approvalStatus = useMemo(() => {
    if (score >= 80) return { label: "PRE APPROVED", color: "text-emerald-500" };
    if (score >= 70) return { label: "PRE APPROVED", color: "text-blue-500" };
    if (score >= 50) return { label: "MANUAL REVIEW", color: "text-amber-500" };
    return { label: "DECLINED", color: "text-red-500" };
  }, [score]);


  return (
    <div className="flex flex-col items-center py-6 w-full animate-in fade-in zoom-in-95 duration-700">
      <div className="relative flex items-center justify-center w-64 h-64 border-2 border-blue-100/50 bg-white/50 backdrop-blur-sm p-4 rounded-full mb-8 shadow-inner">
        <svg viewBox="0 0 200 200" className="w-full h-full">
           {/* Background Circles */}
            {[0.25, 0.5, 0.75, 1].map((m) => (
               <circle key={m} cx="100" cy="100" r={80 * m} fill="none" stroke="#f1f5f9" strokeWidth="1" />
            ))}
            
            {!isCalculating && score > 0 && (
                <polygon 
                    points={radarPoints} 
                    fill="rgba(59, 130, 246, 0.1)" 
                    stroke="#3b82f6" 
                    strokeWidth="2" 
                    strokeLinejoin="round" 
                    className="animate-in fade-in duration-1000"
                />
            )}

            {/* Labels */}
            {!isCalculating && categories.map((f, i) => {
                const angle = (i * angleStep) - (Math.PI / 2);
                const x = 100 + 105 * Math.cos(angle);
                const y = 100 + 105 * Math.sin(angle);
                return (
                <text 
                    key={i} 
                    x={x} 
                    y={y} 
                    textAnchor="middle" 
                    dominantBaseline="middle"
                    className="text-[6px] font-bold fill-slate-400 uppercase tracking-wider"
                >
                    {f.label}
                </text>
                );
            })}
        </svg>

        {/* Center Content */}
        <div className="absolute inset-0 flex items-center justify-center">
             {isCalculating ? (
                <div className="flex flex-col items-center">
                     <div className="h-16 w-16 mb-2 rounded-full border-4 border-slate-200 border-t-emerald-500 animate-spin" />
                     <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 animate-pulse">Analyzing...</p>
                </div>
             ) : (
                <div className="text-center animate-in zoom-in-50 duration-500">
                    <h3 className="text-5xl font-light tracking-tighter text-slate-900">{score}</h3>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Trust Score</p>
                </div>
             )}
        </div>
      </div>
      
       {!isCalculating && score > 0 && (
            <h3 className={`text-xl font-black tracking-tight uppercase ${approvalStatus.color}`}>
                {approvalStatus.label}
            </h3>
       )}
    </div>
  );
};
