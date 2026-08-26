"use client";

import { useTransition } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { DISPLAY_CURRENCIES } from "@/lib/currency";
import { setDisplayCurrencyAction } from "@/features/settings/account/actions";

interface CurrencySelectorProps {
  value: string;
}

/**
 * Global display-currency control (brief section 23), placed near the
 * appearance toggle. Changing this only affects how amounts are
 * *displayed* — server/services/fx.ts and the transactions table never
 * touch a transaction's stored original/base amount because of it.
 */
export function CurrencySelector({ value }: CurrencySelectorProps) {
  const [pending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1 px-2.5 font-medium tabular-nums"
          disabled={pending}
          aria-label="Display currency"
        >
          {value}
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {DISPLAY_CURRENCIES.map((code) => (
          <DropdownMenuItem
            key={code}
            onClick={() => startTransition(() => setDisplayCurrencyAction(code))}
          >
            {code}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
