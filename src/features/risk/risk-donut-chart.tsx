"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface Segment { value: number; color: string; label: string; }
interface RiskDonutChartProps { total: number; segments: Segment[]; }

export function RiskDonutChart({ total, segments }: RiskDonutChartProps) {
  if (total === 0) return (
    <div className="flex flex-col items-center gap-4 w-full py-4">
      <div className="relative flex items-center justify-center" style={{ width:180, height:180 }}>
        <svg width={180} height={180} viewBox="0 0 180 180">
          <circle cx={90} cy={90} r={68} fill="none" stroke="currentColor" strokeOpacity="0.08" strokeWidth={24} />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-[28px] font-bold leading-none tabular-nums">0</span>
          <span className="mt-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">total</span>
        </div>
      </div>
      <p className="text-[13px] text-muted-foreground">No risk data available</p>
    </div>
  );
  return (
    <div className="flex flex-col items-center gap-4 w-full py-2">
      <div className="relative" style={{ width:180, height:180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={segments} cx="50%" cy="50%" innerRadius={60} outerRadius={82} paddingAngle={2} dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0}>
              {segments.map((s, i) => <Cell key={i} fill={s.color} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[26px] font-bold leading-none tabular-nums">{total}</span>
          <span className="mt-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">total</span>
        </div>
      </div>
      <div className="w-full space-y-1">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-2">
              <span className="size-2 shrink-0 rounded-full" style={{ background: s.color }} />
              <span className="text-[12px] text-muted-foreground">{s.label}</span>
            </div>
            <div className="flex items-center gap-2 tabular-nums">
              <span className="text-[12px] font-medium text-foreground">{s.value}</span>
              <span className="text-[11px] text-muted-foreground/60">{Math.round((s.value/total)*100)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
