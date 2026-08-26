import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { transactionPresets } from "@/db/schema";

export type TransactionPreset = typeof transactionPresets.$inferSelect;

export interface PresetInput {
  name: string;
  type: "INCOME" | "EXPENSE";
  category: string;
  amount: number;
  currency: string;
  counterparty?: string;
  paymentMethod?: string;
  description?: string;
}

export async function listPresets(organizationId: string): Promise<TransactionPreset[]> {
  return db
    .select()
    .from(transactionPresets)
    .where(eq(transactionPresets.organizationId, organizationId))
    .orderBy(asc(transactionPresets.name));
}

export async function getPresetById(
  organizationId: string,
  id: string
): Promise<TransactionPreset | null> {
  const [row] = await db
    .select()
    .from(transactionPresets)
    .where(and(eq(transactionPresets.id, id), eq(transactionPresets.organizationId, organizationId)))
    .limit(1);
  return row ?? null;
}

export async function createPreset(
  organizationId: string,
  input: PresetInput
): Promise<TransactionPreset> {
  const [row] = await db
    .insert(transactionPresets)
    .values({
      organizationId,
      name: input.name,
      type: input.type,
      category: input.category,
      amount: input.amount.toFixed(2),
      currency: input.currency,
      counterparty: input.counterparty ?? null,
      paymentMethod: input.paymentMethod ?? null,
      description: input.description ?? null,
    })
    .returning();
  return row;
}

export async function updatePreset(
  organizationId: string,
  id: string,
  input: PresetInput
): Promise<TransactionPreset | null> {
  const [row] = await db
    .update(transactionPresets)
    .set({
      name: input.name,
      type: input.type,
      category: input.category,
      amount: input.amount.toFixed(2),
      currency: input.currency,
      counterparty: input.counterparty ?? null,
      paymentMethod: input.paymentMethod ?? null,
      description: input.description ?? null,
      updatedAt: new Date(),
    })
    .where(and(eq(transactionPresets.id, id), eq(transactionPresets.organizationId, organizationId)))
    .returning();
  return row ?? null;
}

export async function deletePreset(
  organizationId: string,
  id: string
): Promise<TransactionPreset | null> {
  const [row] = await db
    .delete(transactionPresets)
    .where(and(eq(transactionPresets.id, id), eq(transactionPresets.organizationId, organizationId)))
    .returning();
  return row ?? null;
}
