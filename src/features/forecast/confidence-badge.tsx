import { cn } from "@/lib/utils";
import type { ForecastConfidence } from "@/server/engines/forecast-engine";

const STYLES: Record<ForecastConfidence, string> = {
  HIGH: "bg-income/15 text-green-700 dark:text-green-400",
  MEDIUM: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  LOW: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  INSUFFICIENT: "bg-secondary text-muted-foreground",
};

const LABELS: Record<ForecastConfidence, string> = {
  HIGH: "High confidence",
  MEDIUM: "Medium confidence",
  LOW: "Low confidence",
  INSUFFICIENT: "Insufficient data",
};

export function ConfidenceBadge({
  confidence,
  className,
}: {
  confidence: ForecastConfidence;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium",
        STYLES[confidence],
        className
      )}
    >
      {LABELS[confidence]}
    </span>
  );
}
