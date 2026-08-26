"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();

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
            onClick={() =>
              startTransition(async () => {
                // This button has no local state of its own — `value`
                // is purely a server-passed prop. setDisplayCurrencyAction's
                // revalidatePath() marks the server cache stale, but
                // doesn't itself repaint this already-mounted client
                // tree; without an explicit refresh, the button kept
                // showing whatever it showed on the page's original
                // load until a manual browser reload forced a fresh
                // server render.
                await setDisplayCurrencyAction(code);
                router.refresh();
              })
            }
          >
            {code}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
