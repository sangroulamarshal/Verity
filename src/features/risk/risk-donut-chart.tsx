"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface Segment { value: number; color: string; label: string; }
interface RiskDonutChartProps { total: number; segments: Segment[]; compact?: boolean; }

export function RiskDonutChart({ total, segments, compact = false }: RiskDonutChartProps) {
  if (total === 0) return (
    <div className="flex flex-col items-center gap-2 py-4">
      <div className="relative flex items-center justify-center" style={{width:120,height:120}}>
        <svg width={120} height={120} viewBox="0 0 120 120">
          <circle cx={60} cy={60} r={44} fill="none" stroke="currentColor" strokeOpacity="0.08" strokeWidth={18} />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-[20px] font-bold leading-none tabular-nums">0</span>
          <span className="mt-0.5 text-[9px] font-medium uppercase tracking-widest text-muted-foreground">total</span>
        </div>
      </div>
      <p className="text-[13px] text-muted-foreground">No risk data</p>
    </div>
  );

  const sz = compact ? 140 : 180;
  const iR = compact ? 44 : 56;
  const oR = compact ? 62 : 78;

  return (
    <div className={compact ? "flex items-center gap-8 w-full px-2 py-2" : "flex flex-col items-center gap-4 w-full py-2"}>
      <div className="relative shrink-0" style={{width:sz,height:sz}}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={segments} cx="50%" cy="50%" innerRadius={iR} outerRadius={oR} paddingAngle={2} dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0}>
              {segments.map((s,i) => <Cell key={i} fill={s.color} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className={`font-bold leading-none tabular-nums ${compact?"text-[22px]":"text-[26px]"}`}>{total}</span>
          <span className="mt-1 text-[9px] font-medium uppercase tracking-widest text-muted-foreground">total</span>
        </div>
      </div>
      <div className={`space-y-2 ${compact?"flex-1":""}`}>
        {segments.map(s => {
          const pct = Math.round((s.value/total)*100);
          return (
            <div key={s.label} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="size-2 shrink-0 rounded-full" style={{background:s.color}} />
                <span className="text-[13px] text-muted-foreground">{s.label}</span>
              </div>
              <div className="flex items-center gap-2 tabular-nums">
                <span className="text-[13px] font-semibold text-foreground">{s.value}</span>
                <span className="text-[11px] text-muted-foreground/60 w-7 text-right">{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
