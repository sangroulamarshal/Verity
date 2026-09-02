"use client";

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
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const r = 80;
  const thickness = 28;

  function polarToXY(angleDeg: number, radius: number) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  }

  function makeArcPath(startDeg: number, endDeg: number): string {
    const outerR = r + thickness / 2;
    const innerR = r - thickness / 2;
    const GAP = 2;
    const s = startDeg + GAP / 2;
    const e = endDeg - GAP / 2;
    if (e - s < 0.5) return "";
    const large = e - s > 180 ? 1 : 0;
    const o1 = polarToXY(s, outerR);
    const o2 = polarToXY(e, outerR);
    const i1 = polarToXY(e, innerR);
    const i2 = polarToXY(s, innerR);
    return `M${o1.x},${o1.y} A${outerR},${outerR} 0 ${large} 1 ${o2.x},${o2.y} L${i1.x},${i1.y} A${innerR},${innerR} 0 ${large} 0 ${i2.x},${i2.y} Z`;
  }

  const MIN_DEG = 8;
  const minTotal = segments.length * MIN_DEG;
  const remaining = 360 - minTotal;

  let cursor = 0;
  const arcs = segments.map((seg) => {
    const natural = (seg.value / total) * 360;
    const sweep = Math.max(MIN_DEG, (natural / 360) * remaining + MIN_DEG);
    const start = cursor;
    cursor += sweep;
    return { seg, path: makeArcPath(start, start + sweep) };
  });

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: "visible" }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeOpacity="0.08" strokeWidth={thickness} />
        {total > 0 && arcs.map(({ seg, path }, i) =>
          path ? <path key={i} d={path} fill={seg.color} /> : null
        )}
        <text x={cx} y={cy - 10} textAnchor="middle" fontSize="28" fontWeight="700" fill="currentColor">{total}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize="11" fill="currentColor" opacity="0.45" letterSpacing="0.05em">TOTAL</text>
      </svg>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 w-full px-2">
        {segments.map((seg) => {
          const pct = Math.round((seg.value / total) * 100);
          return (
            <div key={seg.label} className="flex items-center justify-between text-[12px]">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="inline-block h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                <span className="text-muted-foreground truncate">{seg.label}</span>
              </div>
              <div className="flex items-center gap-1.5 tabular-nums shrink-0 ml-2">
                <span className="font-semibold">{seg.value}</span>
                <span className="text-muted-foreground/50">{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
