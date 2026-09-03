"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { MonthlyTotal } from "@/server/services/dashboard";

interface CashFlowChartProps { data: MonthlyTotal[]; }

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function monthLabel(m: string) { const [,n] = m.split("-"); return MONTHS[Number(n)-1] ?? m; }
function formatK(v: number): string {
  const a = Math.abs(v);
  if (a >= 1_000_000_000) return `${(v/1_000_000_000).toFixed(1)}B`;
  if (a >= 1_000_000)     return `${(v/1_000_000).toFixed(1)}M`;
  if (a >= 10_000)        return `${(v/1_000).toFixed(0)}K`;
  if (a >= 1_000)         return `${(v/1_000).toFixed(1)}K`;
  if (a === 0)            return "0";
  return a < 1 ? v.toFixed(2) : Math.round(v).toString();
}

const Tip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[6px] border border-border bg-card shadow-md text-[12px] overflow-hidden min-w-[140px]">
      <div className="border-b border-border px-3 py-2"><p className="font-semibold text-card-foreground">{label}</p></div>
      <div className="px-3 py-2 space-y-1.5">
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
  if (data.length === 0) return (
    <div className="flex h-[280px] flex-col items-center justify-center gap-1.5 text-center">
      <p className="text-[13px] font-medium text-foreground">No activity recorded</p>
      <p className="text-[12px] text-muted-foreground">Income and expenses will appear here once transactions are added.</p>
    </div>
  );
  const chartData = data.map((d) => ({
    month: monthLabel(d.month),
    Income:   typeof d.income  === "string" ? parseFloat(d.income)  : d.income,
    Expenses: typeof d.expense === "string" ? parseFloat(d.expense) : d.expense,
  }));
  return (
    <div style={{ width: "100%", height: 280 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} barCategoryGap="32%" barGap={3} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--chart-grid)" />
          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--chart-tick)" }} dy={6} />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--chart-tick)" }} tickFormatter={formatK} width={64} />
          <Tooltip content={<Tip />} cursor={{ fill: "currentColor", fillOpacity: 0.04 }} />
          <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 10, color: "var(--chart-tick)" }} />
          <Bar dataKey="Income"   fill="var(--income)"  radius={[3,3,0,0]} maxBarSize={28} />
          <Bar dataKey="Expenses" fill="var(--expense)" radius={[3,3,0,0]} maxBarSize={28} fillOpacity={0.85} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
