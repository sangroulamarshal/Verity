import type { MonthlyTotal } from "@/server/services/dashboard";

interface CashFlowChartProps {
  data: MonthlyTotal[];
}

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function monthLabel(month: string) {
  const [, m] = month.split("-");
  const index = Number(m) - 1;
  return MONTH_LABELS[index] ?? month;
}

const CHART_HEIGHT = 160;
const BAR_GAP = 28;

export function CashFlowChart({ data }: CashFlowChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-1 text-center">
        <p className="text-sm font-medium">No activity yet</p>
        <p className="text-sm text-muted-foreground">
          Recorded income and expenses will appear here by month.
        </p>
      </div>
    );
  }

  const max = Math.max(1, ...data.map((d) => Math.max(d.income, d.expense)));
  const width = data.length * BAR_GAP + 16;

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${width} ${CHART_HEIGHT + 24}`}
        className="w-full"
        style={{ height: CHART_HEIGHT + 24 }}
        role="img"
        aria-label="Monthly income and expense totals"
      >
        {/* baseline */}
        <line
          x1={0}
          y1={CHART_HEIGHT}
          x2={width}
          y2={CHART_HEIGHT}
          className="stroke-border"
          strokeWidth={1}
        />
        {data.map((d, i) => {
          const x = 8 + i * BAR_GAP;
          const incomeH = (d.income / max) * (CHART_HEIGHT - 8);
          const expenseH = (d.expense / max) * (CHART_HEIGHT - 8);
          return (
            <g key={d.month}>
              <rect
                x={x}
                y={CHART_HEIGHT - incomeH}
                width={8}
                height={incomeH}
                rx={1.5}
                className="fill-income"
              />
              <rect
                x={x + 10}
                y={CHART_HEIGHT - expenseH}
                width={8}
                height={expenseH}
                rx={1.5}
                className="fill-expense/60"
              />
              <text
                x={x + 9}
                y={CHART_HEIGHT + 16}
                textAnchor="middle"
                className="fill-muted-foreground text-[9px]"
              >
                {monthLabel(d.month)}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-sm bg-income" /> Income
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-sm bg-expense/60" /> Expenses
        </span>
      </div>
    </div>
  );
}
