"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Legend } from "recharts";
import type { ForecastDay } from "@/server/engines/forecast-engine";

interface ForecastChartProps {
  days: ForecastDay[];
  openingBalance: number;
  historicalDays?: { date: string; balance: number }[];
}

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function shortDate(iso: string): string { const d = Number(iso.slice(8,10)); const m = Number(iso.slice(5,7))-1; return `${d} ${MONTH_LABELS[m]??""}`; }

function formatBalance(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value/1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${(value/1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `${(value/1_000).toFixed(0)}K`;
  if (abs >= 1_000) return `${(value/1_000).toFixed(1)}K`;
  return String(Math.round(value));
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card shadow-lg text-[12px] overflow-hidden">
      <div className="border-b border-border px-3 py-2"><p className="font-semibold text-card-foreground">{label}</p></div>
      <div className="px-3 py-2 flex flex-col gap-1.5">
        {payload.map((p: any) => p.value != null && (
          <div key={p.name} className="flex items-center justify-between gap-6">
            <span className="text-muted-foreground">{p.name}</span>
            <span className="font-semibold tabular-nums" style={{ color: p.value < 0 ? "var(--expense)" : p.name === "Projected" ? "var(--primary)" : "var(--foreground-muted)" }}>
              {formatBalance(p.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export function ForecastChart({ days, openingBalance, historicalDays = [] }: ForecastChartProps) {
  if (days.length === 0) return <div className="flex h-[300px] items-center justify-center text-[13px] text-muted-foreground">No forecast data available.</div>;

  const allData = [
    ...historicalDays.map((h) => ({ date: shortDate(h.date), Actual: h.balance, Projected: null as number | null })),
    { date: shortDate(days[0].date), Actual: openingBalance, Projected: openingBalance },
    ...days.map((d) => ({ date: shortDate(d.date), Actual: null as number | null, Projected: d.projectedBalance })),
  ];

  const step = Math.max(1, Math.floor(allData.length / 7));
  const tickFormatter = (_: string, index: number) => index % step === 0 ? (allData[index]?.date ?? "") : "";

  const allBalances = [...historicalDays.map((h) => h.balance), openingBalance, ...days.map((d) => d.projectedBalance)];
  const hasNegative = Math.min(...allBalances) < 0;
  const minBal = Math.min(...allBalances);
  const maxBal = Math.max(...allBalances);
  const range = maxBal - minBal;
  const padding = Math.max(range * 0.12, maxBal * 0.03);
  const yMin = hasNegative ? minBal - padding : Math.max(0, minBal - Math.max(padding, minBal * 0.15));
  const yMax = maxBal + padding;
  const longestLabel = formatBalance(Math.abs(yMin) > Math.abs(yMax) ? yMin : yMax);
  const yAxisWidth = Math.max(52, longestLabel.length * 8 + 12);

  return (
    <div style={{ width: "100%", height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={allData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--foreground-muted)" stopOpacity={0.18} />
              <stop offset="95%" stopColor="var(--foreground-muted)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradProjected" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.22} />
              <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--chart-grid, #e5e7eb)" />
          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--chart-tick, #4b5563)" }} tickFormatter={tickFormatter} interval={0} dy={6} />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--chart-tick, #4b5563)" }} tickFormatter={formatBalance} width={yAxisWidth} domain={[yMin, yMax]} />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: "var(--chart-tick, #4b5563)", strokeOpacity: 0.25, strokeWidth: 1 }} />
          {hasNegative && <ReferenceLine y={0} stroke="var(--expense)" strokeDasharray="4 3" strokeOpacity={0.5} strokeWidth={1} />}
          {historicalDays.length > 0 && <Area type="monotone" dataKey="Actual" stroke="var(--foreground-muted)" strokeWidth={2} fill="url(#gradActual)" dot={false} connectNulls={false} name="Actual" />}
          <Area type="monotone" dataKey="Projected" stroke="var(--primary)" strokeWidth={2} strokeDasharray="6 3" fill="url(#gradProjected)" dot={false} connectNulls={false} name="Projected" />
          <Legend iconType="plainline" iconSize={18} wrapperStyle={{ fontSize: 12, paddingTop: 12, color: "var(--chart-tick, #4b5563)" }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
