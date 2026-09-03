#!/usr/bin/env python3
"""
Run this from the root of your Verity repo:
  python apply-verity-fixes.py

Applies all UI fixes. No BOM. No PowerShell encoding issues.
"""
import os, sys

def w(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True) if os.path.dirname(path) else None
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(content)
    print(f"  wrote {path}")

# ── globals.css ────────────────────────────────────────────────────────────────
w("src/app/globals.css", """\
@import "tailwindcss";

@custom-variant dark (&:is(.dark *));

:root {
  --radius: 0.375rem;
  --background:         #f5f6f8;
  --surface:            #ffffff;
  --elevated:           #f3f4f6;
  --foreground:         #111827;
  --foreground-muted:   #374151;
  --card:               #ffffff;
  --card-foreground:    #111827;
  --sidebar:            #0d1117;
  --sidebar-foreground: #e5e9ef;
  --sidebar-border:     #1e2530;
  --sidebar-active:            #2563eb;
  --sidebar-active-foreground: #ffffff;
  --popover:            #ffffff;
  --popover-foreground: #111827;
  --primary:            #1e40af;
  --primary-hover:      #1d4ed8;
  --primary-foreground: #ffffff;
  --secondary:          #f3f4f6;
  --secondary-foreground: #111827;
  --muted:              #f3f4f6;
  --muted-foreground:   #4b5563;
  --accent:             #dbeafe;
  --accent-foreground:  #1e40af;
  --destructive:        #dc2626;
  --destructive-foreground: #ffffff;
  --border:             #e5e7eb;
  --input:              #e5e7eb;
  --ring:               #1e40af;
  --chart-grid:         #e5e7eb;
  --chart-tick:         #6b7280;
  --risk-low:           #15803d;
  --risk-medium:        #b45309;
  --risk-high:          #c2410c;
  --risk-critical:      #dc2626;
  --income:             #15803d;
  --expense:            #dc2626;
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
  --sidebar-foreground: #e5e9ef;
  --sidebar-border:     #1a1a1a;
  --sidebar-active:            #2563eb;
  --sidebar-active-foreground: #ffffff;
  --popover:            #141414;
  --popover-foreground: #fafafa;
  --primary:            #3b82f6;
  --primary-hover:      #60a5fa;
  --primary-foreground: #ffffff;
  --secondary:          #171717;
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
  --chart-tick:         #6b7280;
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
  body { @apply bg-background text-foreground; -webkit-font-smoothing: antialiased; }
  .tabular-nums { font-variant-numeric: tabular-nums; }
}

@layer utilities {
  .scrollbar-thin { scrollbar-width: thin; scrollbar-color: var(--border) transparent; }
  .scrollbar-thin::-webkit-scrollbar { width: 4px; }
  .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
  .scrollbar-thin::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
}
""")

# ── dashboard.ts: add getDailyTotals ──────────────────────────────────────────
with open("src/server/services/dashboard.ts", "r", encoding="utf-8-sig") as f:
    dashboard_ts = f.read()

if "getDailyTotals" not in dashboard_ts:
    dashboard_ts += """
export interface DailyTotal {
  date: string;
  income: number;
  expense: number;
}

export async function getDailyTotals(
  organizationId: string,
  days: number = 30
): Promise<DailyTotal[]> {
  const rows = await db
    .select({
      date: sql<string>`to_char(${transactions.date}, 'YYYY-MM-DD')`,
      income: sql<string>`coalesce(sum(${transactions.baseAmount}) filter (where ${transactions.type} = 'INCOME'), 0)`,
      expense: sql<string>`coalesce(sum(${transactions.baseAmount}) filter (where ${transactions.type} = 'EXPENSE'), 0)`,
    })
    .from(transactions)
    .where(
      sql`${transactions.organizationId} = ${organizationId}
        AND ${transactions.date} >= current_date - interval '${sql.raw(String(days))} days'`
    )
    .groupBy(sql`to_char(${transactions.date}, 'YYYY-MM-DD')`)
    .orderBy(sql`to_char(${transactions.date}, 'YYYY-MM-DD') asc`);

  return rows.map((row) => ({
    date: row.date,
    income: Number(row.income),
    expense: Number(row.expense),
  }));
}
"""
    w("src/server/services/dashboard.ts", dashboard_ts)
else:
    print("  skip src/server/services/dashboard.ts (already patched)")

# ── dashboard/page.tsx: wire daily data ───────────────────────────────────────
with open("src/app/(app)/dashboard/page.tsx", "r", encoding="utf-8-sig") as f:
    dp = f.read()

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
w("src/app/(app)/dashboard/page.tsx", dp)

# ── cash-flow-chart.tsx ───────────────────────────────────────────────────────
w("src/components/cash-flow-chart.tsx", '''\
"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { MonthlyTotal } from "@/server/services/dashboard";

interface CashFlowChartProps {
  data: MonthlyTotal[];
  daily?: boolean;
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function monthLabel(m: string) { const [,n] = m.split("-"); return MONTHS[Number(n)-1] ?? m; }
function dayLabel(d: string) { const dt = new Date(d + "T00:00:00"); return `${dt.getDate()} ${MONTHS[dt.getMonth()] ?? ""}`; }
function fmtK(v: number): string {
  const a = Math.abs(v);
  if (a >= 1_000_000_000) return `${(v/1_000_000_000).toFixed(1)}B`;
  if (a >= 1_000_000) return `${(v/1_000_000).toFixed(1)}M`;
  if (a >= 10_000) return `${(v/1_000).toFixed(0)}K`;
  if (a >= 1_000) return `${(v/1_000).toFixed(1)}K`;
  if (a === 0) return "0";
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
            <span className="font-semibold tabular-nums text-foreground">{fmtK(p.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export function CashFlowChart({ data, daily = false }: CashFlowChartProps) {
  if (!data.length) return (
    <div className="flex h-[280px] flex-col items-center justify-center gap-1.5 text-center">
      <p className="text-[13px] font-medium text-foreground">No activity recorded</p>
      <p className="text-[12px] text-muted-foreground">Income and expenses will appear here once transactions are added.</p>
    </div>
  );

  const chartData = data.map((d) => ({
    label: daily ? dayLabel((d as any).date ?? d.month) : monthLabel(d.month),
    income:  typeof d.income  === "string" ? parseFloat(d.income)  : d.income,
    expense: typeof d.expense === "string" ? parseFloat(d.expense) : d.expense,
  }));

  const tickInterval = daily && chartData.length > 15 ? Math.floor(chartData.length / 8) : 0;

  return (
    <div style={{ width: "100%", height: 280 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} barCategoryGap="32%" barGap={3} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--chart-grid)" />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--chart-tick)" }} dy={6} interval={tickInterval} />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--chart-tick)" }} tickFormatter={fmtK} width={64} />
          <Tooltip content={<Tip />} cursor={{ fill: "currentColor", fillOpacity: 0.04 }} />
          <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 10, color: "var(--chart-tick)" }} />
          <Bar dataKey="income"  name="Income"   fill="var(--income)"  radius={[3,3,0,0]} maxBarSize={daily ? 12 : 28} />
          <Bar dataKey="expense" name="Expenses" fill="var(--expense)" radius={[3,3,0,0]} maxBarSize={daily ? 12 : 28} fillOpacity={0.85} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
''')

# ── forecast-chart.tsx ────────────────────────────────────────────────────────
w("src/components/forecast-chart.tsx", '''\
"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Legend } from "recharts";
import type { ForecastDay } from "@/server/engines/forecast-engine";

interface ForecastChartProps {
  days: ForecastDay[];
  openingBalance: number;
  historicalDays?: { date: string; balance: number }[];
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function sd(iso: string) { const d=Number(iso.slice(8,10)),m=Number(iso.slice(5,7))-1; return `${d} ${MONTHS[m]??""}`; }
function fmt(v: number): string {
  const a=Math.abs(v);
  if(a>=1_000_000_000) return `${(v/1_000_000_000).toFixed(1)}B`;
  if(a>=1_000_000) return `${(v/1_000_000).toFixed(1)}M`;
  if(a>=10_000) return `${(v/1_000).toFixed(0)}K`;
  if(a>=1_000) return `${(v/1_000).toFixed(1)}K`;
  return String(Math.round(v));
}

const Tip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[6px] border border-border bg-card shadow-md text-[12px] overflow-hidden min-w-[140px]">
      <div className="border-b border-border px-3 py-2"><p className="font-semibold text-card-foreground">{label}</p></div>
      <div className="px-3 py-2 space-y-1.5">
        {payload.map((p: any) => p.value!=null && (
          <div key={p.name} className="flex items-center justify-between gap-6">
            <span className="text-muted-foreground">{p.name}</span>
            <span className="font-semibold tabular-nums" style={{color:p.value<0?"var(--expense)":p.name==="Projected"?"var(--primary)":"var(--foreground-muted)"}}>{fmt(p.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export function ForecastChart({ days, openingBalance, historicalDays=[] }: ForecastChartProps) {
  if (!days.length) return <div className="flex h-[300px] items-center justify-center text-[13px] text-muted-foreground">No forecast data available.</div>;
  const allData = [
    ...historicalDays.map(h => ({ date: sd(h.date), Actual: h.balance, Projected: null as number|null })),
    { date: sd(days[0].date), Actual: openingBalance, Projected: openingBalance },
    ...days.map(d => ({ date: sd(d.date), Actual: null as number|null, Projected: d.projectedBalance })),
  ];
  const step = Math.max(1, Math.floor(allData.length/7));
  const tf = (_: string, i: number) => i%step===0 ? (allData[i]?.date??"") : "";
  const allB = [...historicalDays.map(h=>h.balance), openingBalance, ...days.map(d=>d.projectedBalance)];
  const hasNeg=Math.min(...allB)<0, minB=Math.min(...allB), maxB=Math.max(...allB);
  const pad=Math.max((maxB-minB)*0.12, Math.abs(maxB)*0.03);
  const yMin=hasNeg?minB-pad:Math.max(0,minB-Math.max(pad,minB*0.15)), yMax=maxB+pad;
  const longest=fmt(Math.abs(yMin)>Math.abs(yMax)?yMin:yMax);
  const yW=Math.max(48, longest.length*7+16);
  return (
    <div style={{ width:"100%", height:300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={allData} margin={{top:8,right:8,left:0,bottom:0}}>
          <defs>
            <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--foreground-muted)" stopOpacity={0.15}/><stop offset="95%" stopColor="var(--foreground-muted)" stopOpacity={0}/></linearGradient>
            <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2}/><stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/></linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--chart-grid)" />
          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize:11,fill:"var(--chart-tick)"}} tickFormatter={tf} interval={0} dy={6} />
          <YAxis axisLine={false} tickLine={false} tick={{fontSize:11,fill:"var(--chart-tick)"}} tickFormatter={fmt} width={yW} domain={[yMin,yMax]} />
          <Tooltip content={<Tip />} cursor={{stroke:"var(--chart-tick)",strokeOpacity:0.2,strokeWidth:1}} />
          {hasNeg && <ReferenceLine y={0} stroke="var(--expense)" strokeDasharray="4 3" strokeOpacity={0.5} strokeWidth={1} />}
          {historicalDays.length>0 && <Area type="monotone" dataKey="Actual" stroke="var(--foreground-muted)" strokeWidth={1.5} fill="url(#gA)" dot={false} connectNulls={false} name="Actual" />}
          <Area type="monotone" dataKey="Projected" stroke="var(--primary)" strokeWidth={2} strokeDasharray="6 3" fill="url(#gP)" dot={false} connectNulls={false} name="Projected" />
          <Legend iconType="plainline" iconSize={16} wrapperStyle={{fontSize:12,paddingTop:10,color:"var(--chart-tick)"}} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
''')

# ── risk-donut-chart.tsx ──────────────────────────────────────────────────────
w("src/features/risk/risk-donut-chart.tsx", '''\
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
''')

# ── risk/page.tsx: pass compact, fix card padding ─────────────────────────────
with open("src/app/(app)/risk/page.tsx", "r", encoding="utf-8-sig") as f:
    rp = f.read()
rp = rp.replace(
    '<CardContent className="pt-4 flex justify-center">\n                <RiskDonutChart total={riskTotal} segments={riskSegments} />',
    '<CardContent className="pt-2">\n                <RiskDonutChart total={riskTotal} segments={riskSegments} compact />'
)
# In case it was already partially patched
rp = rp.replace(
    '<CardContent className="pt-2">\n                <RiskDonutChart total={riskTotal} segments={riskSegments} />',
    '<CardContent className="pt-2">\n                <RiskDonutChart total={riskTotal} segments={riskSegments} compact />'
)
w("src/app/(app)/risk/page.tsx", rp)

# ── theme-toggle.tsx ──────────────────────────────────────────────────────────
w("src/components/theme-toggle.tsx", '''\
"use client";

import * as React from "react";
import { Moon, Sun, Monitor, ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAccountTheme } from "@/components/use-account-theme";

const OPTIONS = [
  { value: "light",  label: "Light",  Icon: Sun },
  { value: "dark",   label: "Dark",   Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useAccountTheme();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label="Toggle theme" className="flex h-8 items-center gap-0.5 rounded-md px-2 text-muted-foreground hover:bg-elevated hover:text-foreground transition-colors">
          <Sun className="size-[15px] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <Moon className="absolute size-[15px] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          <ChevronDown className="size-3 opacity-50 mt-px ml-2" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        {OPTIONS.map(({ value, label, Icon }) => {
          const active = theme === value;
          return (
            <DropdownMenuItem key={value} onClick={() => setTheme(value)} className={active ? "text-primary font-medium" : ""}>
              <Icon className="mr-2 size-4 shrink-0" /><span className="flex-1">{label}</span>
              {active && <span className="ml-2 size-1.5 rounded-full bg-primary inline-block shrink-0" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
''')

# ── user-menu.tsx ─────────────────────────────────────────────────────────────
w("src/components/user-menu.tsx", '''\
"use client";

import Link from "next/link";
import { ChevronDown, LogOut, Settings } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ROLE_LABELS, type UserRole } from "@/lib/permissions";

interface UserMenuProps { email: string; fullName: string | null; role: UserRole; logoutAction: () => void | Promise<void>; sidebar?: boolean; }

function initialsFor(n: string | null, e: string): string {
  if (n) { const p=n.trim().split(/\\s+/); return (p[0]?.[0]??"").concat(p.length>1?p[p.length-1]?.[0]??"":"").toUpperCase(); }
  return e.slice(0,2).toUpperCase();
}

export function UserMenu({ email, fullName, role, logoutAction, sidebar }: UserMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {sidebar ? (
          <button type="button" aria-label="Account menu" className="flex w-full items-center gap-2.5 rounded-md px-0 py-1 text-left transition-colors hover:bg-sidebar-foreground/[0.06]">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sidebar-active/25 text-[11px] font-semibold text-sidebar-active-foreground">{initialsFor(fullName,email)}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-medium text-sidebar-foreground/85">{fullName||email}</p>
              <p className="truncate text-[11px] text-sidebar-foreground/40">{ROLE_LABELS[role]}</p>
            </div>
            <ChevronDown className="size-3 shrink-0 text-sidebar-foreground/30" />
          </button>
        ) : (
          <button type="button" aria-label="Account menu" className="flex size-8 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/25">{initialsFor(fullName,email)}</button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <span className="truncate text-[13px] font-medium text-foreground">{fullName||email}</span>
          <span className="block truncate text-[12px] text-muted-foreground">{email}</span>
          <span className="mt-1 inline-flex w-fit items-center rounded-sm bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">{ROLE_LABELS[role]}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild><Link href="/settings/account" className="flex items-center gap-2 cursor-pointer"><Settings className="size-3.5 text-muted-foreground" />Settings</Link></DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => logoutAction()} className="flex items-center gap-2 text-destructive focus:text-destructive cursor-pointer"><LogOut className="size-3.5" />Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
''')

# ── settings-nav.tsx ──────────────────────────────────────────────────────────
w("src/components/settings-nav.tsx", '''\
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Building2, Users, Shield, Bell, Sliders } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/permissions";
import { canManageOrganization, canManageMembers } from "@/lib/permissions";

interface SettingsNavProps { role: UserRole; }

const NAV_ITEMS = [
  { href: "/settings/account",       label: "Profile",       icon: User,      guard: () => true },
  { href: "/settings/organization",  label: "Organisation",  icon: Building2, guard: canManageOrganization },
  { href: "/settings/members",       label: "Members",       icon: Users,     guard: canManageMembers },
  { href: "/settings/security",      label: "Security",      icon: Shield,    guard: () => true },
  { href: "/settings/notifications", label: "Notifications", icon: Bell,      guard: () => true },
  { href: "/settings/preferences",   label: "Preferences",   icon: Sliders,   guard: () => true },
];

export function SettingsNav({ role }: SettingsNavProps) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter(item => item.guard(role));
  return (
    <nav aria-label="Settings" className="flex flex-row flex-wrap gap-1 sm:w-44 sm:shrink-0 sm:flex-col sm:flex-nowrap sm:gap-0.5">
      {items.map(item => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link key={item.href} href={item.href} aria-current={active?"page":undefined}
            className={cn("group flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] transition-colors duration-150",
              active ? "bg-elevated text-foreground font-medium" : "text-muted-foreground hover:bg-elevated hover:text-foreground")}>
            <Icon className={cn("size-[14px] shrink-0", active?"text-foreground/70":"text-muted-foreground/50 group-hover:text-muted-foreground")} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
''')

# ── ui/input.tsx ──────────────────────────────────────────────────────────────
w("src/components/ui/input.tsx", '''\
import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input type={type} data-slot="input"
      className={cn(
        "flex h-8 w-full appearance-none rounded-md border border-input bg-transparent",
        "px-3 py-1.5 text-[13px] shadow-none transition-colors",
        "placeholder:text-muted-foreground/50",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "[&::-webkit-calendar-picker-indicator]:cursor-pointer",
        "dark:[&::-webkit-calendar-picker-indicator]:invert dark:[&::-webkit-calendar-picker-indicator]:opacity-80",
        "aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive",
        className
      )} {...props} />
  );
}

export { Input };
''')

# ── categories/loading.tsx ────────────────────────────────────────────────────
w("src/app/(app)/transactions/categories/loading.tsx", '''\
import { Skeleton } from "@/components/ui/skeleton";

export default function CategoriesLoading() {
  return (
    <div className="w-full px-4 py-4 sm:px-6">
      <div className="mb-4">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="mt-2 h-3.5 w-64" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-[6px] border border-border bg-surface overflow-hidden">
          <div className="border-b border-border px-4 py-3">
            <Skeleton className="h-4 w-32" /><Skeleton className="mt-1.5 h-3 w-48" />
          </div>
          <ul className="divide-y divide-border">
            {Array.from({length:12}).map((_,i) => (
              <li key={i} className="flex items-center justify-between px-4 py-2">
                <Skeleton className="h-3.5 w-28" /><Skeleton className="h-5 w-14 rounded" />
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-[6px] border border-border bg-surface p-4">
          <Skeleton className="h-4 w-36 mb-1" /><Skeleton className="h-3 w-52 mb-4" />
          <div className="flex gap-2 mb-4">
            <Skeleton className="h-8 flex-1 rounded-md" /><Skeleton className="h-8 w-20 rounded-md" /><Skeleton className="h-8 w-24 rounded-md" />
          </div>
          <ul className="divide-y divide-border">
            {Array.from({length:5}).map((_,i) => (
              <li key={i} className="flex items-center justify-between py-2">
                <Skeleton className="h-3.5 w-24" />
                <div className="flex items-center gap-2"><Skeleton className="h-5 w-14 rounded" /><Skeleton className="h-6 w-6 rounded" /></div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
''')

print("\nDone. All files written without BOM.")
print("Now run: git add -A && git commit -m 'fix: all UI issues' && git push")
