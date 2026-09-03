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
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `${(value / 1_000).toFixed(0)}K`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  if (abs === 0) return "0";
  return abs < 1 ? value.toFixed(2) : Math.round(value).toString();
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5 shadow-lg text-[12px]">
      <p className="font-semibold mb-1.5 text-card-foreground">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="inline-block h-2 w-2 rounded-sm" style={{ background: p.fill }} />
            {p.name}
          </span>
          <span className="font-medium tabular-nums text-foreground">{formatK(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export function CashFlowChart({ data }: CashFlowChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-1 text-center">
        <p className="text-sm font-medium text-foreground">No activity yet</p>
        <p className="text-sm text-muted-foreground">Recorded income and expenses will appear here by month.</p>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    month: monthLabel(d.month),
    Income: typeof d.income === "string" ? parseFloat(d.income) : d.income,
    Expenses: typeof d.expense === "string" ? parseFloat(d.expense) : d.expense,
  }));

  return (
    <div className="w-full" style={{ height: 240 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} barCategoryGap="30%" barGap={3} margin={{ top: 4, right: 4, left: 8, bottom: 0 }}>
          <CartesianGrid
            vertical={false}
            strokeDasharray="3 3"
            stroke="var(--chart-grid)"
          />
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "var(--chart-tick)" }}
            dy={6}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "var(--chart-tick)" }}
            tickFormatter={formatK}
            width={52}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--elevated)", fillOpacity: 0.6 }} />
          <Legend
            iconType="square"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, paddingTop: 8, color: "var(--chart-tick)" }}
          />
          <Bar dataKey="Income" fill="var(--income)" radius={[3, 3, 0, 0]} maxBarSize={24} />
          <Bar dataKey="Expenses" fill="var(--expense)" radius={[3, 3, 0, 0]} maxBarSize={24} fillOpacity={0.8} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
