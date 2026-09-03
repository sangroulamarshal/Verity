"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { MonthlyTotal } from "@/server/services/dashboard";

interface CashFlowChartProps { data: MonthlyTotal[]; }

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function monthLabel(month: string) { const [, m] = month.split("-"); return MONTH_LABELS[Number(m) - 1] ?? month; }

function formatK(value: number) {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `${(value / 1_000).toFixed(0)}K`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  if (abs === 0) return "0";
  return abs < 1 ? value.toFixed(2) : Math.round(value).toString();
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card shadow-lg text-[12px] overflow-hidden">
      <div className="border-b border-border px-3 py-2"><p className="font-semibold text-card-foreground">{label}</p></div>
      <div className="px-3 py-2 flex flex-col gap-1.5">
        {payload.map((p: any) => (
          <div key={p.name} className="flex items-center justify-between gap-6">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="inline-block size-2 rounded-sm shrink-0" style={{ background: p.fill }} />{p.name}
            </span>
            <span className="font-semibold tabular-nums text-foreground">{formatK(p.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export function CashFlowChart({ data }: CashFlowChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[300px] flex-col items-center justify-center gap-2 text-center">
        <p className="text-[14px] font-medium text-foreground">No activity yet</p>
        <p className="text-[13px] text-muted-foreground">Income and expenses will appear here once transactions are recorded.</p>
      </div>
    );
  }
  const chartData = data.map((d) => ({
    month: monthLabel(d.month),
    Income: typeof d.income === "string" ? parseFloat(d.income) : d.income,
    Expenses: typeof d.expense === "string" ? parseFloat(d.expense) : d.expense,
  }));
  return (
    <div style={{ width: "100%", height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} barCategoryGap="32%" barGap={3} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--chart-grid, #e5e7eb)" />
          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--chart-tick, #4b5563)" }} dy={6} />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--chart-tick, #4b5563)" }} tickFormatter={formatK} width={64} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--elevated, #f3f4f6)", fillOpacity: 0.7 }} />
          <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 12, color: "var(--chart-tick, #4b5563)" }} />
          <Bar dataKey="Income" fill="var(--income, #15803d)" radius={[3, 3, 0, 0]} maxBarSize={28} />
          <Bar dataKey="Expenses" fill="var(--expense, #dc2626)" radius={[3, 3, 0, 0]} maxBarSize={28} fillOpacity={0.85} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
