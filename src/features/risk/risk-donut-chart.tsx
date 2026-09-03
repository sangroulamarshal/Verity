"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface Segment { value: number; color: string; label: string; }
interface RiskDonutChartProps {
  total: number;
  segments: Segment[];
  compact?: boolean;
}

export function RiskDonutChart({ total, segments, compact = false }: RiskDonutChartProps) {
  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-8">
        <div className="relative flex items-center justify-center" style={{ width: 120, height: 120 }}>
          <svg width={120} height={120} viewBox="0 0 120 120">
            <circle cx={60} cy={60} r={44} fill="none" stroke="currentColor"
              strokeOpacity="0.08" strokeWidth={18} />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-[22px] font-bold leading-none tabular-nums">0</span>
            <span className="mt-0.5 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">total</span>
          </div>
        </div>
        <p className="text-[13px] text-muted-foreground">No risk data available</p>
      </div>
    );
  }

  const donutSize = compact ? 160 : 200;
  const innerR   = compact ? 50  : 65;
  const outerR   = compact ? 72  : 90;

  return (
    <div className={compact
      ? "flex items-center gap-8 w-full py-3 px-2"
      : "flex flex-col items-center gap-5 w-full py-3"
    }>
      {/* Donut */}
      <div className="relative shrink-0" style={{ width: donutSize, height: donutSize }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={segments}
              cx="50%" cy="50%"
              innerRadius={innerR} outerRadius={outerR}
              paddingAngle={2} dataKey="value"
              startAngle={90} endAngle={-270}
              strokeWidth={0}
            >
              {segments.map((s, i) => <Cell key={i} fill={s.color} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className={`font-bold leading-none tabular-nums ${compact ? "text-[24px]" : "text-[30px]"}`}>
            {total}
          </span>
          <span className="mt-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            total
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className={compact ? "flex-1 space-y-2.5" : "w-full max-w-[220px] space-y-2.5"}>
        {segments.map(s => {
          const pct = Math.round((s.value / total) * 100);
          return (
            <div key={s.label} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
                <span className="text-[13px] text-muted-foreground truncate">{s.label}</span>
              </div>
              <div className="flex items-center gap-3 tabular-nums shrink-0">
                <span className="text-[13px] font-semibold text-foreground">{s.value}</span>
                <span className="text-[11px] text-muted-foreground/60 w-8 text-right">{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
