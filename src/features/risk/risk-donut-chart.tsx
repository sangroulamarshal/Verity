"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface Segment {
  value: number;
  color: string;
  label: string;
}

interface RiskDonutChartProps {
  total: number;
  segments: Segment[];
}

export function RiskDonutChart({ total, segments }: RiskDonutChartProps) {
  if (total === 0) {
    return (
      <div className="flex flex-col items-center gap-4 w-full">
        <div className="relative flex items-center justify-center" style={{ width: 160, height: 160 }}>
          <svg width={160} height={160} viewBox="0 0 160 160">
            <circle cx={80} cy={80} r={60} fill="none" stroke="currentColor" strokeOpacity="0.08" strokeWidth={24} />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-2xl font-bold">0</span>
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider">total</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <div className="relative" style={{ width: 160, height: 160 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={segments}
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={72}
              paddingAngle={2}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
              strokeWidth={0}
            >
              {segments.map((seg, i) => (
                <Cell key={i} fill={seg.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[22px] font-bold leading-none">{total}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">total</span>
        </div>
      </div>
      <div className="flex flex-col gap-1.5 w-full">
        {segments.map((seg) => {
          const pct = Math.round((seg.value / total) * 100);
          return (
            <div key={seg.label} className="flex items-center justify-between text-[12px]">
              <div className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                <span className="text-muted-foreground">{seg.label}</span>
              </div>
              <div className="flex items-center gap-2 tabular-nums">
                <span className="font-semibold">{seg.value}</span>
                <span className="text-muted-foreground/50 w-7 text-right">{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
