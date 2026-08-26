import type { AuditLogEntry } from "@/server/services/audit-log";
import { formatCurrency } from "@/lib/format";

const ACTION_LABELS: Record<string, string> = {
  TRANSACTION_CREATED: "Created transaction",
  TRANSACTION_UPDATED: "Edited transaction",
  TRANSACTION_DELETED: "Deleted transaction",
  TRANSACTION_PRESET_CREATED: "Created preset",
  TRANSACTION_PRESET_UPDATED: "Edited preset",
  TRANSACTION_PRESET_DELETED: "Deleted preset",
};

const FIELD_LABELS: Record<string, string> = {
  date: "Date",
  amount: "Amount",
  currency: "Currency",
  baseAmount: "Base amount",
  baseCurrency: "Base currency",
  type: "Type",
  category: "Category",
  counterparty: "Customer/Vendor",
  paymentMethod: "Payment method",
  description: "Description",
  referenceId: "Reference",
};

function formatChangeValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "\u2014";
  if (field === "amount" || field === "baseAmount") return String(value);
  return String(value);
}

interface AuditLogListProps {
  entries: AuditLogEntry[];
}

export function AuditLogList({ entries }: AuditLogListProps) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1 py-16 text-center">
        <p className="text-sm font-medium">No activity recorded yet</p>
        <p className="text-sm text-muted-foreground">
          Transaction creates, edits, and deletes will show up here.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {entries.map((entry) => {
        const metadata = entry.metadata as
          | { changes?: Record<string, { from: unknown; to: unknown }> }
          | Record<string, unknown>
          | null;
        const changes =
          metadata && typeof metadata === "object" && "changes" in metadata
            ? (metadata as { changes?: Record<string, { from: unknown; to: unknown }> }).changes
            : undefined;

        return (
          <li key={entry.id} className="flex flex-col gap-1.5 px-4 py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <p className="text-sm">
                <span className="font-medium text-foreground">
                  {entry.userEmail ?? "Unknown user"}
                </span>{" "}
                <span className="text-muted-foreground">
                  {ACTION_LABELS[entry.action] ?? entry.action.replaceAll("_", " ").toLowerCase()}
                </span>
              </p>
              <time className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                {new Date(entry.createdAt).toLocaleString(undefined, {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
            </div>

            {changes && Object.keys(changes).length > 0 && (
              <dl className="grid grid-cols-1 gap-x-6 gap-y-1 rounded-md bg-muted/50 px-3 py-2 text-xs sm:grid-cols-2">
                {Object.entries(changes).map(([field, change]) => (
                  <div key={field} className="flex items-baseline gap-1.5">
                    <dt className="font-medium text-muted-foreground">
                      {FIELD_LABELS[field] ?? field}:
                    </dt>
                    <dd className="tabular-nums">
                      {formatChangeValue(field, change.from)}
                      {" \u2192 "}
                      <span className="font-medium text-foreground">
                        {formatChangeValue(field, change.to)}
                      </span>
                    </dd>
                  </div>
                ))}
              </dl>
            )}

            {!changes && metadata && "amount" in (metadata as Record<string, unknown>) && (
              <p className="text-xs text-muted-foreground">
                {formatCurrency(
                  String((metadata as Record<string, unknown>).amount),
                  String((metadata as Record<string, unknown>).currency ?? "")
                )}{" "}
                &middot; {String((metadata as Record<string, unknown>).category ?? "")}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
