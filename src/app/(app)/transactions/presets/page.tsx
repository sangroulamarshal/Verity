import type { Metadata } from "next";
import { verifySession } from "@/server/services/session";
import { listPresets } from "@/server/services/transaction-presets";
import { canWriteTransactions } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TransactionTabs } from "@/features/transactions/transaction-tabs";
import { PresetDialog } from "@/features/transactions/presets/preset-dialog";
import { PresetsTable } from "@/features/transactions/presets/presets-table";

export const metadata: Metadata = {
  title: "Presets",
};

export default async function PresetsPage() {
  const session = await verifySession();
  const canEdit = canWriteTransactions(session.role);
  const presets = await listPresets(session.organizationId);

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-8 md:px-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Transaction presets</h1>
          <p className="text-sm text-muted-foreground">
            Reusable templates for transactions you record often. Using one pre-fills the
            transaction form for you to review — it never saves a transaction by itself.
          </p>
        </div>
        {canEdit && (
          <PresetDialog
            mode="create"
            trigger={<Button type="button">New preset</Button>}
          />
        )}
      </div>

      <Card className="overflow-hidden py-0">
        <TransactionTabs />
        <CardContent className="p-0">
          <PresetsTable presets={presets} canEdit={canEdit} />
        </CardContent>
      </Card>
    </div>
  );
}
