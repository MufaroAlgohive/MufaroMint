'use client';

import React, { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge-2';
import { Card, CardContent, CardHeader, CardTitle, CardToolbar } from '@/components/ui/card';
import { ChartContainer, ChartTooltip } from '@/components/ui/line-charts-2';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { Area, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from 'recharts';

// Return data in percent points, eg 0 = 0%, 8.1 = +8.1%
const returnData = [
  { month: 'JAN', returnPct: 1.2 },
  { month: 'FEB', returnPct: 2.0 },
  { month: 'MAR', returnPct: 1.1 },
  { month: 'APR', returnPct: 3.8 },
  { month: 'MAY', returnPct: 4.4 },
  { month: 'JUN', returnPct: 6.9 },
  { month: 'JUL', returnPct: 5.7 },
  { month: 'AUG', returnPct: 6.2 },
  { month: 'SEP', returnPct: 7.4 },
  { month: 'OCT', returnPct: 7.9 },
  { month: 'NOV', returnPct: 8.1 },
  { month: 'DEC', returnPct: 8.6 },
];

const chartConfig = {
  returnPct: {
    label: 'Return',
    color: 'var(--color-mint-success, var(--color-emerald-500))',
  },
};

const formatPct = (value) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const value = payload[0].value;
    return (
      <div className="rounded-lg bg-zinc-900 px-3 py-2 text-white shadow-lg">
        <div className="mb-1 text-xs font-medium opacity-80">{label}</div>
        <div className="text-sm font-semibold">{formatPct(value)}</div>
      </div>
    );
  }
  return null;
};

const PERIODS = {
  '6m': {
    key: '6m',
    label: '6 months',
    dateRange: 'Jul 01 - Dec 31, 2024',
  },
  '12m': {
    key: '12m',
    label: '12 months',
    dateRange: 'Jan 01 - Dec 31, 2024',
  },
  '2y': {
    key: '2y',
    label: '2 years',
    dateRange: 'Jan 01, 2023 - Dec 31, 2024',
  },
};

export default function StrategyReturnChart() {
  const [selectedPeriod, setSelectedPeriod] = useState('12m');

  const filteredData = useMemo(() => {
    switch (selectedPeriod) {
      case '6m':
        return returnData.slice(-6);
      case '12m':
        return returnData;
      case '2y': {
        const prev = returnData.map((item) => ({
          month: `${item.month} '23`,
          returnPct: Number((item.returnPct * 0.75).toFixed(2)),
        }));
        const curr = returnData.map((item) => ({
          month: `${item.month} '24`,
          returnPct: item.returnPct,
        }));
        return [...prev, ...curr];
      }
      default:
        return returnData;
    }
  }, [selectedPeriod]);

  const currentPeriod = PERIODS[selectedPeriod];

  // Total return for the period: last minus first (works for cumulative return series)
  const first = filteredData[0]?.returnPct ?? 0;
  const last = filteredData[filteredData.length - 1]?.returnPct ?? 0;
  const periodReturn = last - first;

  const isUp = periodReturn >= 0;

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6 lg:p-8">
      <Card className="w-full lg:max-w-4xl">
        <CardHeader className="border-0 min-h-auto pb-4 pt-6">
          <CardTitle className="text-lg font-semibold">Strategy return</CardTitle>
          <CardToolbar>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger>{currentPeriod.label}</SelectTrigger>
              <SelectContent align="end">
                {Object.values(PERIODS).map((period) => (
                  <SelectItem key={period.key} value={period.key}>
                    {period.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardToolbar>
        </CardHeader>

        <CardContent className="px-0">
          <div className="mb-8 px-5">
            <div className="mb-2 text-xs font-medium tracking-wide text-muted-foreground">
              {currentPeriod.dateRange}
            </div>

            <div className="mb-4 flex items-center gap-3">
              <div className="text-3xl font-bold">{formatPct(periodReturn)}</div>

              <Badge variant={isUp ? 'success' : 'destructive'} appearance="light">
                {isUp ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                {formatPct(periodReturn)}
              </Badge>
            </div>
          </div>

          <div className="relative">
            <ChartContainer
              config={chartConfig}
              className="h-[300px] w-full overflow-visible ps-1.5 pe-2.5 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-initial"
            >
              <ComposedChart
                data={filteredData}
                margin={{ top: 25, right: 25, left: 0, bottom: 25 }}
                style={{ overflow: 'visible' }}
              >
                <defs>
                  <linearGradient id="returnGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartConfig.returnPct.color} stopOpacity={0.15} />
                    <stop offset="100%" stopColor={chartConfig.returnPct.color} stopOpacity={0} />
                  </linearGradient>
                  <filter id="dotShadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="2" dy="2" stdDeviation="3" floodColor="rgba(0,0,0,0.5)" />
                  </filter>
                </defs>

                <CartesianGrid
                  strokeDasharray="4 12"
                  stroke="var(--input)"
                  strokeOpacity={1}
                  horizontal
                  vertical={false}
                />

                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12 }}
                  tickMargin={12}
                  dy={10}
                />

                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `${value}%`}
                  domain={['dataMin - 1', 'dataMax + 1']}
                  tickCount={6}
                  tickMargin={12}
                />

                <ChartTooltip
                  content={<CustomTooltip />}
                  cursor={{
                    stroke: chartConfig.returnPct.color,
                    strokeWidth: 1,
                    strokeDasharray: 'none',
                  }}
                />

                <Area
                  type="linear"
                  dataKey="returnPct"
                  stroke="transparent"
                  fill="url(#returnGradient)"
                  strokeWidth={0}
                  dot={false}
                />

                <Line
                  type="linear"
                  dataKey="returnPct"
                  stroke={chartConfig.returnPct.color}
                  strokeWidth={3}
                  dot={false}
                  activeDot={{
                    r: 6,
                    fill: chartConfig.returnPct.color,
                    stroke: 'white',
                    strokeWidth: 2,
                    filter: 'url(#dotShadow)',
                  }}
                />
              </ComposedChart>
            </ChartContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
