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
  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 58;
  const strokeWidth = 22;
  const circumference = 2 * Math.PI * radius;
  const gap = total > 0 ? 2 : 0; // px gap between segments

  // Build arc segments
  type Arc = { segment: Segment; offset: number; dashArray: string };
  const arcs: Arc[] = [];

  if (total === 0) {
    // Empty grey ring
    arcs.push({
      segment: { value: 1, color: "var(--color-elevated, #e5e7eb)", label: "None" },
      offset: 0,
      dashArray: `${circumference} 0`,
    });
  } else {
    let consumed = 0;
    segments.forEach((seg) => {
      const fraction = seg.value / total;
      const arcLen = Math.max(0, fraction * circumference - gap);
      arcs.push({
        segment: seg,
        offset: circumference - consumed,
        dashArray: `${arcLen} ${circumference - arcLen}`,
      });
      consumed += fraction * circumference;
    });
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Donut */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: "rotate(-90deg)" }}
        aria-label="Risk breakdown donut chart"
      >
        {arcs.map(({ segment, offset, dashArray }, i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={segment.color}
            strokeWidth={strokeWidth}
            strokeDasharray={dashArray}
            strokeDashoffset={-offset + circumference}
            strokeLinecap="butt"
          />
        ))}
        {/* Centre label — counter-rotate so text reads normally */}
        <g style={{ transform: `rotate(90deg)`, transformOrigin: `${cx}px ${cy}px` }}>
          <text
            x={cx}
            y={cy - 6}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="22"
            fontWeight="600"
            fill="currentColor"
          >
            {total}
          </text>
          <text
            x={cx}
            y={cy + 14}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="10"
            fill="currentColor"
            opacity="0.5"
          >
            total
          </text>
        </g>
      </svg>

      {/* Legend */}
      {total > 0 && (
        <div className="flex flex-col gap-1.5 w-full px-2">
          {segments.map((seg) => {
            const pct = total > 0 ? Math.round((seg.value / total) * 100) : 0;
            return (
              <div key={seg.label} className="flex items-center justify-between text-[12px]">
                <div className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: seg.color }}
                  />
                  <span className="text-muted-foreground">{seg.label}</span>
                </div>
                <div className="flex items-center gap-2 tabular-nums">
                  <span className="font-medium">{seg.value}</span>
                  <span className="text-muted-foreground/60 w-8 text-right">{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
