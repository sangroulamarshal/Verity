import { cn } from "@/lib/utils";
import type { RiskLevel } from "@/server/services/risk";

// Semantic colors only, matching the app's existing income/expense token
// pattern (globals.css) rather than introducing a decorative palette.
// LOW intentionally reads as neutral, not "green/positive" — a LOW risk
// transaction isn't an achievement, it's simply unremarkable.
const LEVEL_STYLES: Record<RiskLevel, string> = {
  LOW: "bg-secondary text-muted-foreground",
  MEDIUM: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  HIGH: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  CRITICAL: "bg-destructive/15 text-destructive",
};

export function RiskLevelBadge({ level, className }: { level: RiskLevel; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium",
        LEVEL_STYLES[level],
        className
      )}
    >
      {level}
    </span>
  );
}
