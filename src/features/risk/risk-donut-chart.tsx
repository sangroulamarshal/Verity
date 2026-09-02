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
      <div className="flex flex-col items-center gap-4 w-full py-4">
        <div className="relative flex items-center justify-center" style={{ width: 200, height: 200 }}>
          <svg width={200} height={200} viewBox="0 0 200 200">
            <circle cx={100} cy={100} r={75} fill="none" stroke="currentColor" strokeOpacity="0.08" strokeWidth={28} />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-3xl font-bold">0</span>
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider">total</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5 w-full py-2">
      {/* Donut */}
      <div className="relative" style={{ width: 200, height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={segments}
              cx="50%"
              cy="50%"
              innerRadius={66}
              outerRadius={90}
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
          <span className="text-[28px] font-bold leading-none">{total}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1.5">total</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-2 w-full max-w-[220px]">
        {segments.map((seg) => {
          const pct = Math.round((seg.value / total) * 100);
          return (
            <div key={seg.label} className="flex items-center gap-2 text-[13px]">
              <span className="inline-block h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
              <span className="text-muted-foreground flex-1">{seg.label}</span>
              <span className="font-semibold tabular-nums">{seg.value}</span>
              <span className="text-muted-foreground/50 tabular-nums w-8 text-right">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
