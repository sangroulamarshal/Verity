import {
  pgTable,
  uuid,
  varchar,
  text,
  date,
  numeric,
  timestamp,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { customers } from "./customers";
import { transactions } from "./transactions";
import { invoiceStatusEnum } from "./enums";

export { invoiceStatusEnum };

// Invoices represent money the organization is owed (accounts receivable).
// They are a distinct concept from transactions: an invoice is a *claim*,
// a transaction is a *recorded cash movement*. When an invoice is paid,
// a new INCOME transaction should be recorded (separately); this schema
// does NOT auto-create transactions — that is an explicit user action.
//
// The primary purpose of this table in Phase 7 is to give the cash-flow
// forecast concrete, date-anchored expected income — a forecast derived
// from actual outstanding invoices is more accurate than one based solely
// on historical patterns. See server/services/invoices.ts for the
// forecast-integration queries.
//
// What this table does NOT do (deliberate scope boundaries):
//   - No line-item normalization (line_items stored as jsonb for simplicity)
//   - No automated status transitions (OVERDUE must be set explicitly or
//     via a maintenance job — no cron is built here, see Phase 7 brief)
//   - No payment terms engine (NET 30 etc.) — `dueDate` is set explicitly
//   - No tax calculation
//   - No PDF generation
//   - No email delivery
//   These are all viable Phase 8+ features.
export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // The customer this invoice is addressed to. Optional — a one-off
    // invoice can exist without a customer record. onDelete: "set null"
    // same as transactions.customerId: deleting a customer must never
    // delete invoice history (financial records must be durable).
    customerId: uuid("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),

    // Human-readable invoice number (e.g. "INV-0042"). Not a surrogate key
    // (id is) — this is the number printed on the document. Not enforced
    // unique at DB level because different orgs will share numbers and
    // manual/imported invoices may have duplicates within an org; the
    // application layer enforces uniqueness within an org when creating
    // via the form (see server/services/invoices.ts).
    invoiceNumber: varchar("invoice_number", { length: 50 }).notNull(),

    status: invoiceStatusEnum("status").notNull().default("DRAFT"),

    // The date the invoice was (or will be) issued. Format: YYYY-MM-DD.
    issueDate: date("issue_date", { mode: "string" }).notNull(),
    // The date payment is expected. Used by the forecast to anchor expected
    // income to a specific future date. Required — a due date is the
    // minimal contract this system makes with the forecast engine.
    dueDate: date("due_date", { mode: "string" }).notNull(),

    // --- Monetary fields ---
    // Same three-field pattern as transactions: original currency +
    // org-base-currency snapshot. The snapshot is computed at invoice
    // creation/update (via the same FX service as transactions) and is
    // what the forecast engine uses — no runtime conversion is needed.
    //
    // `totalAmount` is the GROSS invoice total (before any partial payment).
    totalAmount: numeric("total_amount", { precision: 14, scale: 2, mode: "string" }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    // Organization base-currency snapshot — same immutability contract as
    // transactions.baseAmount. Recomputed only when totalAmount or currency
    // is explicitly corrected, never on a display-currency change.
    baseTotalAmount: numeric("base_total_amount", { precision: 14, scale: 2, mode: "string" }).notNull(),
    baseCurrency: varchar("base_currency", { length: 3 }).notNull(),
    exchangeRate: numeric("exchange_rate", { precision: 18, scale: 6, mode: "string" }).notNull(),
    exchangeRateSource: varchar("exchange_rate_source", { length: 50 }).notNull(),
    exchangeRateTime: timestamp("exchange_rate_time", { withTimezone: true }).notNull(),

    // Amount already received (for PARTIALLY_PAID invoices).
    // Always in the same currency as `currency` / `totalAmount`.
    // 0 for unpaid invoices — this avoids NULL handling in the forecast
    // (outstanding = totalAmount - paidAmount, always computable).
    paidAmount: numeric("paid_amount", { precision: 14, scale: 2, mode: "string" }).notNull().default("0.00"),
    // Base-currency equivalent of paidAmount (same immutability contract).
    basePaidAmount: numeric("base_paid_amount", { precision: 14, scale: 2, mode: "string" }).notNull().default("0.00"),

    // The transaction that settled this invoice, when applicable.
    // onDelete: "set null" — deleting the payment transaction must not
    // delete or void the invoice record (both are durable financial records).
    // Nullable: most invoices won't have a linked transaction (manual
    // matching is a Phase 8+ feature).
    settledByTransactionId: uuid("settled_by_transaction_id").references(
      () => transactions.id,
      { onDelete: "set null" }
    ),

    // Free text visible on the invoice document.
    clientName: varchar("client_name", { length: 255 }),
    clientEmail: varchar("client_email", { length: 255 }),
    description: text("description"),
    notes: text("notes"),

    // Simple line items as jsonb — avoids a separate invoice_line_items table
    // for an MVP feature. Shape: Array<{ description: string; quantity: number;
    // unitPrice: string; lineTotal: string; }>. The totals are always derived
    // from `totalAmount` for forecast purposes, not recomputed from these.
    lineItems: text("line_items"), // JSON string — see service layer

    // When the invoice was sent to the customer (if tracked).
    sentAt: timestamp("sent_at", { withTimezone: true }),
    // When payment was received in full.
    paidAt: timestamp("paid_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),

    // Sequential number for display ordering within org — auto-increment
    // would be ideal but complicates concurrent inserts in serverless;
    // this is set to a reasonable value in the service layer (max + 1).
    // The invoiceNumber string (e.g. "INV-0042") is what users see;
    // this is just a sort key.
    sequenceNumber: integer("sequence_number").notNull().default(1),
  },
  (table) => [
    index("invoices_org_id_idx").on(table.organizationId),
    // Forecast query: outstanding invoices due within a date range
    index("invoices_org_id_status_due_date_idx").on(
      table.organizationId,
      table.status,
      table.dueDate
    ),
    // Customer invoice history
    index("invoices_customer_id_idx").on(table.customerId, table.dueDate),
  ]
);
