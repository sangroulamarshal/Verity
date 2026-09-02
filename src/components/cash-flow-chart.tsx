"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { MonthlyTotal } from "@/server/services/dashboard";

interface CashFlowChartProps {
  data: MonthlyTotal[];
}

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function monthLabel(month: string) {
  const [, m] = month.split("-");
  return MONTH_LABELS[Number(m) - 1] ?? month;
}

function formatK(value: number) {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return String(value);
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5 shadow-lg text-[12px]">
      <p className="font-semibold mb-1.5 text-foreground">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="inline-block h-2 w-2 rounded-sm" style={{ background: p.fill }} />
            {p.name}
          </span>
          <span className="font-medium tabular-nums">{formatK(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export function CashFlowChart({ data }: CashFlowChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-1 text-center">
        <p className="text-sm font-medium">No activity yet</p>
        <p className="text-sm text-muted-foreground">Recorded income and expenses will appear here by month.</p>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    month: monthLabel(d.month),
    Income: d.income,
    Expenses: d.expense,
  }));

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} barCategoryGap="30%" barGap={3} margin={{ top: 4, right: 4, left: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.07} />
          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "currentColor", opacity: 0.5 }} dy={6} />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "currentColor", opacity: 0.5 }} tickFormatter={formatK} width={52} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "currentColor", fillOpacity: 0.04 }} />
          <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8, opacity: 0.6 }} />
          <Bar dataKey="Income" fill="#22c55e" radius={[3, 3, 0, 0]} maxBarSize={24} />
          <Bar dataKey="Expenses" fill="#ef4444" radius={[3, 3, 0, 0]} maxBarSize={24} fillOpacity={0.7} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
