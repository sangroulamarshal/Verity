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
