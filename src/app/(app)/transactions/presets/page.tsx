import type { Metadata } from "next";
import { LayoutList } from "lucide-react";
import { verifySession } from "@/server/services/session";
import { listPresets } from "@/server/services/transaction-presets";
import { canWriteTransactions } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { TransactionTabs } from "@/features/transactions/transaction-tabs";
import { PresetDialog } from "@/features/transactions/presets/preset-dialog";
import { DeletePresetButton } from "@/features/transactions/presets/delete-preset-button";
import { TransactionDialog } from "@/features/transactions/transaction-dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";

export const metadata: Metadata = { title: "Presets" };

export default async function PresetsPage() {
  const session = await verifySession();
  const canEdit = canWriteTransactions(session.role);
  const presets = await listPresets(session.organizationId);

  return (
    <div className="mx-auto w-full max-w-[1280px] px-6 py-6">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[18px] font-semibold tracking-tight">Transaction Presets</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Quickly create recurring transaction structures.
          </p>
        </div>
        {canEdit && (
          <PresetDialog mode="create" trigger={<Button size="sm">+ New Preset</Button>} />
        )}
      </div>

      <div className="rounded-[6px] border border-border bg-surface overflow-hidden">
        <TransactionTabs />
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead className="border-b border-border bg-elevated/20">
              <tr>
                <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Preset Name</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Type</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Category</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Currency</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Default Amount</th>
                <th className="w-32 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Actions</th>
              </tr>
            </thead>
            <tbody>
              {presets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <LayoutList className="size-8 text-muted-foreground/30" />
                      <p className="text-[13px] font-medium">No presets yet</p>
                      <p className="text-[12px] text-muted-foreground">
                        Create templates for transactions you record often.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                presets.map((preset) => (
                  <tr key={preset.id} className="border-b border-border/50 hover:bg-elevated/40 transition-colors last:border-0">
                    <td className="px-5 py-2.5 font-medium">{preset.name}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant={preset.type === "INCOME" ? "income" : "expense"}>
                        {preset.type === "INCOME" ? "Income" : "Expense"}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{preset.category}</td>
                    <td className="px-4 py-2.5 font-mono text-[12px] text-muted-foreground">{preset.currency}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-medium">
                      {formatCurrency(preset.amount, preset.currency)}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1">
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
                                <Button type="button" variant="outline" size="sm">Use</Button>
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
                                <Button type="button" variant="ghost" size="sm">Edit</Button>
                              }
                            />
                            <DeletePresetButton id={preset.id} />
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
