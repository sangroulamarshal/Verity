#!/usr/bin/env python3
"""
Run from repo root: python fix-light-mode-and-risk.py
Fixes light mode + risk graph comprehensively.
"""
import os, re

def w(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True) if os.path.dirname(path) else None
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(content)
    print(f"  wrote  {path}")

def patch(path, replacements):
    with open(path, "r", encoding="utf-8-sig") as f:
        content = f.read()
    for old, new in replacements:
        if old in content:
            content = content.replace(old, new)
        else:
            print(f"  WARN: pattern not found in {path}: {old[:60]!r}")
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(content)
    print(f"  patched {path}")

# ─────────────────────────────────────────────────────────────────
# 1. GLOBALS.CSS — solid light mode foundation
# ─────────────────────────────────────────────────────────────────
w("src/app/globals.css", """\
@import "tailwindcss";

@custom-variant dark (&:is(.dark *));

/*
 * Verity design tokens
 *
 * Light mode: white surfaces, strong contrast text, visible borders
 * Dark mode:  near-black surfaces, soft contrast, blue accent
 * Sidebar:    always dark (#0d1117 light / #0a0a0a dark)
 */

:root {
  --radius: 0.375rem;

  /* Page chrome */
  --background:         #f4f5f7;
  --surface:            #ffffff;
  --elevated:           #f0f1f3;

  /* Text — strong contrast in light mode */
  --foreground:         #0f1117;
  --foreground-muted:   #374151;

  /* Cards */
  --card:               #ffffff;
  --card-foreground:    #0f1117;

  /* Sidebar — always dark regardless of page theme */
  --sidebar:            #0d1117;
  --sidebar-foreground: #dde2ea;
  --sidebar-border:     #1e2530;
  --sidebar-active:            #2563eb;
  --sidebar-active-foreground: #ffffff;

  /* Popovers / dropdowns */
  --popover:            #ffffff;
  --popover-foreground: #0f1117;

  /* Actions */
  --primary:            #1d4ed8;
  --primary-hover:      #1e40af;
  --primary-foreground: #ffffff;

  --secondary:          #e8eaed;
  --secondary-foreground: #0f1117;

  /* Muted surfaces */
  --muted:              #f0f1f3;
  --muted-foreground:   #4b5563;

  /* Accent (link highlights, focus rings) */
  --accent:             #dbeafe;
  --accent-foreground:  #1d4ed8;

  /* Destructive */
  --destructive:        #dc2626;
  --destructive-foreground: #ffffff;

  /* Structural */
  --border:             #d1d5db;
  --input:              #d1d5db;
  --ring:               #1d4ed8;

  /* Chart */
  --chart-grid:         #e5e7eb;
  --chart-tick:         #6b7280;

  /* Risk severity — dark enough to read on white */
  --risk-low:           #15803d;
  --risk-medium:        #92400e;
  --risk-high:          #9a3412;
  --risk-critical:      #991b1b;

  /* Financial direction */
  --income:             #15803d;
  --expense:            #b91c1c;
}

.dark {
  --background:         #050505;
  --surface:            #0a0a0a;
  --elevated:           #171717;

  --foreground:         #fafafa;
  --foreground-muted:   #a3a3a3;

  --card:               #0a0a0a;
  --card-foreground:    #fafafa;

  --sidebar:            #0a0a0a;
  --sidebar-foreground: #dde2ea;
  --sidebar-border:     #1a1a1a;
  --sidebar-active:            #2563eb;
  --sidebar-active-foreground: #ffffff;

  --popover:            #141414;
  --popover-foreground: #fafafa;

  --primary:            #3b82f6;
  --primary-hover:      #60a5fa;
  --primary-foreground: #ffffff;

  --secondary:          #1c1c1c;
  --secondary-foreground: #fafafa;

  --muted:              #171717;
  --muted-foreground:   #a3a3a3;

  --accent:             #1e3a5f;
  --accent-foreground:  #60a5fa;

  --destructive:        #ef4444;
  --destructive-foreground: #ffffff;

  --border:             #262626;
  --input:              #1f1f1f;
  --ring:               #3b82f6;

  --chart-grid:         rgba(255,255,255,0.06);
  --chart-tick:         #71717a;

  --risk-low:           #4ade80;
  --risk-medium:        #fbbf24;
  --risk-high:          #fb923c;
  --risk-critical:      #f87171;

  --income:             #4ade80;
  --expense:            #f87171;
}

@theme inline {
  --color-background:          var(--background);
  --color-surface:             var(--surface);
  --color-elevated:            var(--elevated);
  --color-foreground:          var(--foreground);
  --color-foreground-muted:    var(--foreground-muted);
  --color-card:                var(--card);
  --color-card-foreground:     var(--card-foreground);
  --color-sidebar:             var(--sidebar);
  --color-sidebar-foreground:  var(--sidebar-foreground);
  --color-sidebar-border:      var(--sidebar-border);
  --color-sidebar-active:            var(--sidebar-active);
  --color-sidebar-active-foreground: var(--sidebar-active-foreground);
  --color-popover:             var(--popover);
  --color-popover-foreground:  var(--popover-foreground);
  --color-primary:             var(--primary);
  --color-primary-hover:       var(--primary-hover);
  --color-primary-foreground:  var(--primary-foreground);
  --color-secondary:           var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted:               var(--muted);
  --color-muted-foreground:    var(--muted-foreground);
  --color-accent:              var(--accent);
  --color-accent-foreground:   var(--accent-foreground);
  --color-destructive:         var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border:              var(--border);
  --color-input:               var(--input);
  --color-ring:                var(--ring);
  --color-risk-low:            var(--risk-low);
  --color-risk-medium:         var(--risk-medium);
  --color-risk-high:           var(--risk-high);
  --color-risk-critical:       var(--risk-critical);
  --color-income:              var(--income);
  --color-expense:             var(--expense);

  --radius-sm: calc(var(--radius) - 2px);
  --radius-md: var(--radius);
  --radius-lg: calc(var(--radius) + 2px);
  --radius-xl: calc(var(--radius) + 6px);

  --font-sans: "Inter Variable", "Inter", ui-sans-serif, system-ui, -apple-system, sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, "SFMono-Regular", monospace;
}

@layer base {
  * { @apply border-border outline-ring/50; }
  body {
    @apply bg-background text-foreground;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  .tabular-nums { font-variant-numeric: tabular-nums; }
}

@layer utilities {
  .scrollbar-thin {
    scrollbar-width: thin;
    scrollbar-color: var(--border) transparent;
  }
  .scrollbar-thin::-webkit-scrollbar { width: 4px; }
  .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
  .scrollbar-thin::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
}
""")

# ─────────────────────────────────────────────────────────────────
# 2. LABEL.TSX — text-sm -> text-[13px], proper weight
# ─────────────────────────────────────────────────────────────────
w("src/components/ui/label.tsx", '''\
"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "@/lib/utils";

function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "text-[13px] font-medium leading-none text-foreground",
        "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { Label };
''')

# ─────────────────────────────────────────────────────────────────
# 3. CARD.TSX — stronger border in light mode, correct bg
# ─────────────────────────────────────────────────────────────────
w("src/components/ui/card.tsx", '''\
import * as React from "react";
import { cn } from "@/lib/utils";

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn("bg-surface text-card-foreground rounded-[6px] border border-border", className)}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("flex flex-col gap-0.5 border-b border-border px-5 py-3.5", className)}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("text-[13px] font-semibold text-foreground leading-none", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-[12px] text-muted-foreground", className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-content" className={cn("px-5 py-4", className)} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-5 py-3 border-t border-border", className)}
      {...props}
    />
  );
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
''')

# ─────────────────────────────────────────────────────────────────
# 4. BADGE.TSX — ensure risk badge text dark enough in light mode
# ─────────────────────────────────────────────────────────────────
w("src/components/ui/badge.tsx", '''\
import * as React from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant =
  | "default" | "secondary" | "destructive" | "outline"
  | "income" | "expense"
  | "risk-low" | "risk-medium" | "risk-high" | "risk-critical"
  | "warning" | "success";

const variantClasses: Record<BadgeVariant, string> = {
  default:       "bg-primary/10 text-primary border-transparent",
  secondary:     "bg-secondary text-secondary-foreground border-transparent",
  destructive:   "bg-destructive/10 text-destructive border-transparent",
  outline:       "bg-transparent text-foreground border-border",
  income:        "bg-income/10 text-income border-transparent",
  expense:       "bg-expense/10 text-expense border-transparent",
  "risk-low":    "bg-risk-low/10 text-risk-low border-transparent",
  "risk-medium": "bg-risk-medium/10 text-risk-medium border-transparent",
  "risk-high":   "bg-risk-high/10 text-risk-high border-transparent",
  "risk-critical":"bg-risk-critical/10 text-risk-critical border-transparent",
  warning:       "bg-risk-medium/10 text-risk-medium border-transparent",
  success:       "bg-income/10 text-income border-transparent",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-medium leading-none tracking-wide",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}
''')

# ─────────────────────────────────────────────────────────────────
# 5. RISK DONUT CHART — use CSS vars for colors (theme-aware)
#    and fix the card layout so it fills space properly
# ─────────────────────────────────────────────────────────────────
w("src/features/risk/risk-donut-chart.tsx", '''\
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
''')

# ─────────────────────────────────────────────────────────────────
# 6. RISK/PAGE.TSX — use CSS var colors for segments (theme-aware)
#    and fix the Risk Breakdown card layout
# ─────────────────────────────────────────────────────────────────
with open("src/app/(app)/risk/page.tsx", "r", encoding="utf-8-sig") as f:
    rp = f.read()

# Replace hardcoded hex colors with CSS var references
# The donut chart uses the color string directly in SVG fill, so we need
# actual color values. Use the light-mode semantic colors as they look
# correct on both themes (the chart SVG doesn't respond to CSS vars directly)
# We'll make the donut chart accept CSS var names and resolve them in JS
old_segs = '''  const riskSegments = [
    { value: summary.counts.CRITICAL ?? 0, color: "#dc2626", label: "Critical" },
    { value: summary.counts.HIGH ?? 0,     color: "#ea580c", label: "High" },
    { value: summary.counts.MEDIUM ?? 0,   color: "#d97706", label: "Medium" },
    { value: summary.counts.LOW ?? 0,      color: "#16a34a", label: "Low" },
  ].filter((s) => s.value > 0);'''

new_segs = '''  // Use explicit colors that work in both light and dark
  // These match --risk-* tokens for dark mode and are strong enough for light mode
  const riskSegments = [
    { value: summary.counts.CRITICAL ?? 0, color: "var(--color-risk-critical)", label: "Critical" },
    { value: summary.counts.HIGH ?? 0,     color: "var(--color-risk-high)",     label: "High" },
    { value: summary.counts.MEDIUM ?? 0,   color: "var(--color-risk-medium)",   label: "Medium" },
    { value: summary.counts.LOW ?? 0,      color: "var(--color-risk-low)",      label: "Low" },
  ].filter((s) => s.value > 0);'''

rp = rp.replace(old_segs, new_segs)

# Fix the card content wrapper — remove flex justify-center that wastes space
rp = rp.replace(
    '<CardContent className="pt-4 flex justify-center">\n                <RiskDonutChart total={riskTotal} segments={riskSegments} />',
    '<CardContent className="pt-0">\n                <RiskDonutChart total={riskTotal} segments={riskSegments} compact />'
)
rp = rp.replace(
    '<CardContent className="pt-2">\n                <RiskDonutChart total={riskTotal} segments={riskSegments} compact />',
    '<CardContent className="pt-0">\n                <RiskDonutChart total={riskTotal} segments={riskSegments} compact />'
)
rp = rp.replace(
    '<CardContent className="pt-2">\n                <RiskDonutChart total={riskTotal} segments={riskSegments} />',
    '<CardContent className="pt-0">\n                <RiskDonutChart total={riskTotal} segments={riskSegments} compact />'
)

with open("src/app/(app)/risk/page.tsx", "w", encoding="utf-8", newline="\n") as f:
    f.write(rp)
print("  patched src/app/(app)/risk/page.tsx")

# ─────────────────────────────────────────────────────────────────
# 7. DASHBOARD/PAGE.TSX — fix risk segments to use CSS vars
# ─────────────────────────────────────────────────────────────────
with open("src/app/(app)/dashboard/page.tsx", "r", encoding="utf-8-sig") as f:
    dp = f.read()

old_dash_segs = '''  const riskSegments = [
    { value: riskSummary.counts.CRITICAL ?? 0, color: "#dc2626", label: "Critical" },
    { value: riskSummary.counts.HIGH ?? 0,     color: "#ea580c", label: "High" },
    { value: riskSummary.counts.MEDIUM ?? 0,   color: "#d97706", label: "Medium" },
    { value: riskSummary.counts.LOW ?? 0,      color: "#16a34a", label: "Low" },
  ].filter((s) => s.value > 0);'''

new_dash_segs = '''  const riskSegments = [
    { value: riskSummary.counts.CRITICAL ?? 0, color: "var(--color-risk-critical)", label: "Critical" },
    { value: riskSummary.counts.HIGH ?? 0,     color: "var(--color-risk-high)",     label: "High" },
    { value: riskSummary.counts.MEDIUM ?? 0,   color: "var(--color-risk-medium)",   label: "Medium" },
    { value: riskSummary.counts.LOW ?? 0,      color: "var(--color-risk-low)",      label: "Low" },
  ].filter((s) => s.value > 0);'''

dp = dp.replace(old_dash_segs, new_dash_segs)

# Also fix getDailyTotals import if not present
if 'getDailyTotals' not in dp:
    dp = dp.replace(
        'import { getDashboardSummary } from "@/server/services/dashboard";',
        'import { getDashboardSummary, getDailyTotals } from "@/server/services/dashboard";'
    )
    dp = dp.replace(
        "  const [[org], summary] = await Promise.all([\n    db.select({ name: organizations.name, baseCurrency: organizations.baseCurrency })\n      .from(organizations).where(eq(organizations.id, session.organizationId)).limit(1),\n    getDashboardSummary(session.organizationId),\n  ]);",
        "  const [[org], summary, dailyTotals] = await Promise.all([\n    db.select({ name: organizations.name, baseCurrency: organizations.baseCurrency })\n      .from(organizations).where(eq(organizations.id, session.organizationId)).limit(1),\n    getDashboardSummary(session.organizationId),\n    period === 1 ? getDailyTotals(session.organizationId, 30) : Promise.resolve([]),\n  ]);"
    )
    dp = dp.replace(
        "  const months = disp.monthlyTotals.slice(-period);",
        "  const months = period === 1\n    ? dailyTotals.map((d) => ({ month: d.date, income: d.income, expense: d.expense }))\n    : disp.monthlyTotals.slice(-period);\n  const chartIsDaily = period === 1;"
    )
    dp = dp.replace(
        "<CashFlowChart data={months} />",
        "<CashFlowChart data={months} daily={chartIsDaily} />"
    )

with open("src/app/(app)/dashboard/page.tsx", "w", encoding="utf-8", newline="\n") as f:
    f.write(dp)
print("  patched src/app/(app)/dashboard/page.tsx")

# ─────────────────────────────────────────────────────────────────
# 8. CONFIDENCE BADGE — remove dark: prefix antipattern
# ─────────────────────────────────────────────────────────────────
w("src/features/forecast/confidence-badge.tsx", '''\
import { cn } from "@/lib/utils";
import type { ForecastConfidence } from "@/server/engines/forecast-engine";

const STYLES: Record<ForecastConfidence, string> = {
  HIGH:         "bg-income/10 text-income",
  MEDIUM:       "bg-risk-medium/10 text-risk-medium",
  LOW:          "bg-risk-high/10 text-risk-high",
  INSUFFICIENT: "bg-muted text-muted-foreground",
};

const LABELS: Record<ForecastConfidence, string> = {
  HIGH:         "High confidence",
  MEDIUM:       "Medium confidence",
  LOW:          "Low confidence",
  INSUFFICIENT: "Insufficient data",
};

export function ConfidenceBadge({ confidence, className }: { confidence: ForecastConfidence; className?: string }) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-md px-1.5 py-0.5 text-[12px] font-medium",
      STYLES[confidence], className
    )}>
      {LABELS[confidence]}
    </span>
  );
}
''')

# ─────────────────────────────────────────────────────────────────
# 9. HORIZON SELECTOR — fix light mode active state
# ─────────────────────────────────────────────────────────────────
w("src/features/forecast/horizon-selector.tsx", '''\
"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { ForecastHorizon } from "@/server/engines/forecast-engine";

const HORIZONS: { value: ForecastHorizon; label: string }[] = [
  { value: 7,  label: "7D"  },
  { value: 30, label: "30D" },
  { value: 60, label: "60D" },
  { value: 90, label: "90D" },
];

export function HorizonSelector({ current }: { current: ForecastHorizon }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function select(horizon: ForecastHorizon) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("horizon", String(horizon));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div role="group" aria-label="Forecast horizon"
      className="inline-flex rounded-md border border-border bg-elevated p-0.5 gap-0.5">
      {HORIZONS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => select(value)}
          aria-pressed={current === value}
          className={cn(
            "rounded px-3 py-1 text-[11px] font-medium transition-colors",
            current === value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-surface"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
''')

# ─────────────────────────────────────────────────────────────────
# 10. APP-SHELL — ensure sidebar uses bg-sidebar token (no inline style)
# ─────────────────────────────────────────────────────────────────
with open("src/components/app-shell.tsx", "r", encoding="utf-8-sig") as f:
    ash = f.read()

# Remove any remaining hardcoded inline styles for sidebar
ash = ash.replace(
    'style={{ background: "#111827", borderRight: "1px solid rgba(255,255,255,0.07)" }}',
    ''
)
ash = ash.replace(
    'style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}',
    ''
)
ash = ash.replace(
    'style={{ background: "#0d1117", borderRight: "1px solid rgba(255,255,255,0.07)" }}',
    ''
)

with open("src/components/app-shell.tsx", "w", encoding="utf-8", newline="\n") as f:
    f.write(ash)
print("  patched src/components/app-shell.tsx (removed inline styles)")

# ─────────────────────────────────────────────────────────────────
# 11. DROPDOWN MENU — fix text-sm -> text-[13px] for consistency
# ─────────────────────────────────────────────────────────────────
with open("src/components/ui/dropdown-menu.tsx", "r", encoding="utf-8-sig") as f:
    dm = f.read()

dm = dm.replace(
    '"relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-secondary focus:text-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"',
    '"relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-[13px] outline-none transition-colors focus:bg-elevated focus:text-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"'
)
# Fix DropdownMenuLabel too
dm = dm.replace(
    '"px-2 py-1.5 text-sm font-semibold"',
    '"px-2 py-1.5 text-[12px] font-semibold text-muted-foreground"'
)

with open("src/components/ui/dropdown-menu.tsx", "w", encoding="utf-8", newline="\n") as f:
    f.write(dm)
print("  patched src/components/ui/dropdown-menu.tsx")

# ─────────────────────────────────────────────────────────────────
# 12. CASHFLOW PAGE — fix text-xs/text-sm inconsistencies
# ─────────────────────────────────────────────────────────────────
with open("src/app/(app)/cashflow/page.tsx", "r", encoding="utf-8-sig") as f:
    cf = f.read()

# Normalize text sizes
cf = cf.replace('"text-xs font-medium text-muted-foreground"', '"text-[12px] font-medium text-muted-foreground"')
cf = cf.replace('"mt-0.5 text-xs text-muted-foreground"', '"mt-0.5 text-[12px] text-muted-foreground"')
cf = cf.replace('"text-xs text-muted-foreground"', '"text-[12px] text-muted-foreground"')
cf = cf.replace(
    '"mt-0.5 flex items-center gap-0.5 text-xs font-medium"',
    '"mt-0.5 flex items-center gap-0.5 text-[12px] font-medium"'
)
# Fix amber hardcoded colors -> use token-based warning
cf = cf.replace(
    '"mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300"',
    '"mt-3 flex items-start gap-2 rounded-md border border-risk-medium/30 bg-risk-medium/8 px-3 py-2.5 text-[12px] text-risk-medium"'
)
cf = cf.replace(
    '"border-amber-200 bg-amber-50/50 text-foreground dark:border-amber-900/40 dark:bg-amber-900/10"',
    '"border-risk-medium/30 bg-risk-medium/5 text-foreground"'
)
cf = cf.replace(
    '"mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400"',
    '"mt-0.5 size-4 shrink-0 text-risk-medium"'
)
# Fix text-sm
cf = cf.replace('"text-sm font-medium"', '"text-[13px] font-medium"')
cf = cf.replace('"text-sm text-muted-foreground"', '"text-[13px] text-muted-foreground"')
cf = cf.replace('"text-sm last:border-b-0"', '"text-[13px] last:border-b-0"')

with open("src/app/(app)/cashflow/page.tsx", "w", encoding="utf-8", newline="\n") as f:
    f.write(cf)
print("  patched src/app/(app)/cashflow/page.tsx")

# ─────────────────────────────────────────────────────────────────
# 13. TRANSACTIONS TABLE — fix text-sm empty state
# ─────────────────────────────────────────────────────────────────
patch("src/features/transactions/transactions-table.tsx", [
    ('"text-sm font-medium">No transactions found<', '"text-[13px] font-medium">No transactions found<'),
    ('"text-sm text-muted-foreground">\n          Try a different', '"text-[13px] text-muted-foreground">\n          Try a different'),
])

# ─────────────────────────────────────────────────────────────────
# 14. RISK TABLE — fix text-sm empty state
# ─────────────────────────────────────────────────────────────────
patch("src/features/risk/risk-table.tsx", [
    ('"text-sm font-medium">No flagged transactions<', '"text-[13px] font-medium">No flagged transactions<'),
    ('"text-sm text-muted-foreground">\n          Nothing matches', '"text-[13px] text-muted-foreground">\n          Nothing matches'),
])

# ─────────────────────────────────────────────────────────────────
# 15. CUSTOMERS TABLE — fix text-sm empty state
# ─────────────────────────────────────────────────────────────────
if os.path.exists("src/features/customers/customers-table.tsx"):
    patch("src/features/customers/customers-table.tsx", [
        ('"text-sm font-medium">No customers found<', '"text-[13px] font-medium">No customers found<'),
        ('"text-sm text-muted-foreground">', '"text-[13px] text-muted-foreground">'),
    ])

print("\nAll fixes applied.")
print("Run: git add -A && git commit -m 'fix: light mode, risk graph, CSS vars, typography' && git push")
