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
