import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import type { TransactionPreset } from "@/server/services/transaction-presets";
import { TransactionDialog } from "../transaction-dialog";
import { PresetDialog } from "./preset-dialog";
import { DeletePresetButton } from "./delete-preset-button";

interface PresetsTableProps {
  presets: TransactionPreset[];
  canEdit: boolean;
}

export function PresetsTable({ presets, canEdit }: PresetsTableProps) {
  if (presets.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1 py-16 text-center">
        <p className="text-sm font-medium">No presets yet</p>
        <p className="text-sm text-muted-foreground">
          Create a template for a transaction you record often.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Vendor</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead className="w-0" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {presets.map((preset) => (
          <TableRow key={preset.id}>
            <TableCell className="font-medium">{preset.name}</TableCell>
            <TableCell className="text-muted-foreground">
              {preset.type === "INCOME" ? "Income" : "Expense"}
            </TableCell>
            <TableCell className="text-muted-foreground">{preset.category}</TableCell>
            <TableCell className="text-muted-foreground">{preset.counterparty ?? "\u2014"}</TableCell>
            <TableCell className="text-right tabular-nums font-medium">
              {formatCurrency(preset.amount, preset.currency)}
            </TableCell>
            <TableCell>
              <div className="flex items-center justify-end gap-1">
                {canEdit && (
                  <>
                    <TransactionDialog
                      mode="create"
                      defaultValues={{
                        amount: preset.amount,
                        currency: preset.currency,
                        type: preset.type,
                        category: preset.category,
                        counterparty: preset.counterparty ?? undefined,
                        paymentMethod: preset.paymentMethod ?? undefined,
                        description: preset.description ?? undefined,
                        presetId: preset.id,
                      }}
                      trigger={
                        <Button type="button" variant="outline" size="sm">
                          Use
                        </Button>
                      }
                    />
                    <PresetDialog
                      mode="edit"
                      presetId={preset.id}
                      defaultValues={{
                        name: preset.name,
                        type: preset.type,
                        category: preset.category,
                        amount: preset.amount,
                        currency: preset.currency,
                        counterparty: preset.counterparty ?? undefined,
                        paymentMethod: preset.paymentMethod ?? undefined,
                        description: preset.description ?? undefined,
                      }}
                      trigger={
                        <Button type="button" variant="ghost" size="sm">
                          Edit
                        </Button>
                      }
                    />
                    <DeletePresetButton id={preset.id} />
                  </>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
