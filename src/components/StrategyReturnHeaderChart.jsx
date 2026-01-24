'use client';

import React, { useMemo, useState } from "react";
import { Badge } from './ui/badge-2'
import { TrendingDown, TrendingUp } from "lucide-react";
import { ChartContainer, ChartTooltip } from './ui/line-charts-2'
import { Area, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";

/** @type {ChartConfig} */
const chartConfig = {
  returnPct: {
    label: "Return",
    color: "var(--color-mint-success, var(--color-emerald-500))",
  },
};

const formatPct = (value) => `${value >= 0 ? "+" : ""}${Number(value).toFixed(2)}%`;

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const value = payload[0].value;
  return (
    <div className="rounded-lg bg-zinc-900 px-3 py-2 text-white shadow-lg">
      <div className="mb-1 text-xs font-medium opacity-80">{label}</div>
      <div className="text-sm font-semibold">{formatPct(value)}</div>
    </div>
  );
};

const TF_ORDER = ["1D", "1W", "1M", "3M", "6M", "YTD", "1Y"];

const sliceForTF = (data, tf) => {
  const n = data.length;
  if (tf === "1D") return data.slice(Math.max(0, n - 2));
  if (tf === "1W") return data.slice(Math.max(0, n - 7));
  if (tf === "1M") return data.slice(Math.max(0, n - 30));
  if (tf === "3M") return data.slice(Math.max(0, n - 90));
  if (tf === "6M") return data.slice(Math.max(0, n - 180));
  if (tf === "1Y") return data.slice(Math.max(0, n - 365));
  if (tf === "YTD") return data.slice(Math.max(0, n - 120));
  return data;
};

export function StrategyReturnHeaderChart({ series }) {
  const [tf, setTf] = useState("6M");
  const filtered = useMemo(() => sliceForTF(series, tf), [series, tf]);

  const first = filtered[0]?.returnPct ?? 0;
  const last = filtered[filtered.length - 1]?.returnPct ?? 0;
  const periodReturn = last - first;
  const isUp = periodReturn >= 0;

  return (
    <div className="overflow-hidden rounded-3xl border border-black/5 bg-white/70 shadow-sm backdrop-blur">
      <div className="px-5 pt-5">
        <div className="flex items-center gap-3">
          <div className="text-3xl font-semibold">{formatPct(periodReturn)}</div>
          <Badge variant={isUp ? "success" : "destructive"} appearance="light">
            {isUp ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
            {formatPct(periodReturn)}
          </Badge>
        </div>
      </div>

      <div className="px-5 pt-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {TF_ORDER.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTf(key)}
              className={[
                "whitespace-nowrap rounded-full border px-3 py-1.5 text-sm",
                tf === key
                  ? "border-black bg-black text-white"
                  : "border-black/10 bg-white/60 text-black/70",
              ].join(" ")}
            >
              {key}
            </button>
          ))}
        </div>
      </div>

      <div className="px-2 pb-3">
        <ChartContainer
          config={chartConfig}
          className="h-[220px] w-full overflow-visible [&_.recharts-curve.recharts-tooltip-cursor]:stroke-initial"
        >
          <ComposedChart data={filtered} margin={{ top: 12, right: 14, left: 6, bottom: 8 }}>
            <defs>
              <linearGradient id="returnGradientMint" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={chartConfig.returnPct.color} stopOpacity={0.16} />
                <stop offset="100%" stopColor={chartConfig.returnPct.color} stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="4 12"
              stroke="var(--input)"
              strokeOpacity={1}
              horizontal
              vertical={false}
            />

            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12 }}
              tickMargin={10}
            />

            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `${value}%`}
              domain={["dataMin - 1", "dataMax + 1"]}
              tickCount={5}
              tickMargin={10}
            />

            <ChartTooltip
              content={<CustomTooltip />}
              cursor={{
                stroke: chartConfig.returnPct.color,
                strokeWidth: 1,
                strokeDasharray: "none",
              }}
            />

            <Area
              type="linear"
              dataKey="returnPct"
              stroke="transparent"
              fill="url(#returnGradientMint)"
              dot={false}
            />

            <Line
              type="linear"
              dataKey="returnPct"
              stroke={chartConfig.returnPct.color}
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6, fill: chartConfig.returnPct.color, stroke: "white", strokeWidth: 2 }}
            />
          </ComposedChart>
        </ChartContainer>
      </div>
    </div>
  );
}
