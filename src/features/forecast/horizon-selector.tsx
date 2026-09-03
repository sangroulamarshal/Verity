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
