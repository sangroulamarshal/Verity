"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Legend } from "recharts";
import type { ForecastDay } from "@/server/engines/forecast-engine";

interface ForecastChartProps {
  days: ForecastDay[];
  openingBalance: number;
  historicalDays?: { date: string; balance: number }[];
}

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function shortDate(iso: string): string {
  const d = Number(iso.slice(8, 10));
  const m = Number(iso.slice(5, 7)) - 1;
  return `${d} ${MONTH_LABELS[m] ?? ""}`;
}

function formatK(value: number) {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return String(Math.round(value));
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  if (!item) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5 shadow-lg text-[12px]">
      <p className="font-semibold mb-1 text-foreground">{label}</p>
      {payload.map((p: any) => p.value != null && (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">{p.name}</span>
          <span className="font-medium tabular-nums" style={{ color: p.value < 0 ? "#ef4444" : p.name === "Projected" ? "#3b82f6" : "#6b7280" }}>
            {formatK(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

export function ForecastChart({ days, openingBalance, historicalDays = [] }: ForecastChartProps) {
  if (days.length === 0) {
    return <div className="flex h-44 items-center justify-center text-sm text-muted-foreground">No forecast data available.</div>;
  }

  const allData = [
    ...historicalDays.map((h) => ({ date: shortDate(h.date), Actual: h.balance, Projected: null as number | null })),
    { date: shortDate(days[0].date), Actual: openingBalance, Projected: openingBalance },
    ...days.map((d) => ({ date: shortDate(d.date), Actual: null as number | null, Projected: d.projectedBalance })),
  ];

  const step = Math.max(1, Math.floor(allData.length / 6));
  const tickFormatter = (_: string, index: number) => index % step === 0 ? (allData[index]?.date ?? "") : "";

  const allBalances = [...historicalDays.map((h) => h.balance), openingBalance, ...days.map((d) => d.projectedBalance)];
  const hasNegative = Math.min(...allBalances) < 0;

  return (
    <div className="w-full" style={{ height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={allData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6b7280" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#6b7280" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradProjected" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.07} />
          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "currentColor", opacity: 0.5 }} tickFormatter={tickFormatter} interval={0} dy={6} />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "currentColor", opacity: 0.5 }} tickFormatter={formatK} width={40} />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: "currentColor", strokeOpacity: 0.15, strokeWidth: 1 }} />
          {hasNegative && <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 3" strokeOpacity={0.5} strokeWidth={1} />}
          {historicalDays.length > 0 && (
            <Area type="monotone" dataKey="Actual" stroke="#6b7280" strokeWidth={2} fill="url(#gradActual)" dot={false} connectNulls={false} name="Actual" />
          )}
          <Area type="monotone" dataKey="Projected" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 3" fill="url(#gradProjected)" dot={false} connectNulls={false} name="Projected" />
          <Legend iconType="plainline" iconSize={16} wrapperStyle={{ fontSize: 12, paddingTop: 8, opacity: 0.6 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
