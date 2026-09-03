"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Legend } from "recharts";
import type { ForecastDay } from "@/server/engines/forecast-engine";

interface ForecastChartProps {
  days: ForecastDay[];
  openingBalance: number;
  historicalDays?: { date: string; balance: number }[];
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function shortDate(iso: string): string { const d=Number(iso.slice(8,10)); const m=Number(iso.slice(5,7))-1; return `${d} ${MONTHS[m]??""}`; }
function fmt(v: number): string {
  const a=Math.abs(v);
  if (a>=1_000_000_000) return `${(v/1_000_000_000).toFixed(1)}B`;
  if (a>=1_000_000)     return `${(v/1_000_000).toFixed(1)}M`;
  if (a>=10_000)        return `${(v/1_000).toFixed(0)}K`;
  if (a>=1_000)         return `${(v/1_000).toFixed(1)}K`;
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
            <span className="font-semibold tabular-nums" style={{ color: p.value<0?"var(--expense)":p.name==="Projected"?"var(--primary)":"var(--foreground-muted)" }}>{fmt(p.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export function ForecastChart({ days, openingBalance, historicalDays=[] }: ForecastChartProps) {
  if (!days.length) return <div className="flex h-[300px] items-center justify-center text-[13px] text-muted-foreground">No forecast data available.</div>;
  const allData = [
    ...historicalDays.map((h) => ({ date: shortDate(h.date), Actual: h.balance, Projected: null as number|null })),
    { date: shortDate(days[0].date), Actual: openingBalance, Projected: openingBalance },
    ...days.map((d) => ({ date: shortDate(d.date), Actual: null as number|null, Projected: d.projectedBalance })),
  ];
  const step = Math.max(1, Math.floor(allData.length/7));
  const tickFmt = (_: string, i: number) => i%step===0?(allData[i]?.date??""):"";
  const allBal = [...historicalDays.map(h=>h.balance), openingBalance, ...days.map(d=>d.projectedBalance)];
  const hasNeg = Math.min(...allBal)<0;
  const minB=Math.min(...allBal), maxB=Math.max(...allBal);
  const pad=Math.max((maxB-minB)*0.12, Math.abs(maxB)*0.03);
  const yMin=hasNeg?minB-pad:Math.max(0,minB-Math.max(pad,minB*0.15));
  const yMax=maxB+pad;
  const longest=fmt(Math.abs(yMin)>Math.abs(yMax)?yMin:yMax);
  const yW=Math.max(48, longest.length*7+16);
  return (
    <div style={{ width:"100%", height:300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={allData} margin={{ top:8, right:8, left:0, bottom:0 }}>
          <defs>
            <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--foreground-muted)" stopOpacity={0.15}/><stop offset="95%" stopColor="var(--foreground-muted)" stopOpacity={0}/></linearGradient>
            <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2}/><stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/></linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--chart-grid)" />
          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize:11, fill:"var(--chart-tick)" }} tickFormatter={tickFmt} interval={0} dy={6} />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize:11, fill:"var(--chart-tick)" }} tickFormatter={fmt} width={yW} domain={[yMin,yMax]} />
          <Tooltip content={<Tip />} cursor={{ stroke:"var(--chart-tick)", strokeOpacity:0.2, strokeWidth:1 }} />
          {hasNeg && <ReferenceLine y={0} stroke="var(--expense)" strokeDasharray="4 3" strokeOpacity={0.5} strokeWidth={1} />}
          {historicalDays.length>0 && <Area type="monotone" dataKey="Actual" stroke="var(--foreground-muted)" strokeWidth={1.5} fill="url(#gA)" dot={false} connectNulls={false} name="Actual" />}
          <Area type="monotone" dataKey="Projected" stroke="var(--primary)" strokeWidth={2} strokeDasharray="6 3" fill="url(#gP)" dot={false} connectNulls={false} name="Projected" />
          <Legend iconType="plainline" iconSize={16} wrapperStyle={{ fontSize:12, paddingTop:10, color:"var(--chart-tick)" }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
