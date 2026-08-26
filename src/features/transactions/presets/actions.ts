"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/server/services/session";
import {
  createPreset,
  updatePreset,
  deletePreset,
} from "@/server/services/transaction-presets";
import { auditLogSafely } from "@/server/services/audit-log";
import { canWriteTransactions } from "@/lib/permissions";
import { presetSchema } from "./schema";

export interface PresetFormState {
  errors?: Record<string, string[]>;
  message?: string;
  success?: boolean;
  values?: Record<string, string | undefined>;
}

function parsePresetFormData(formData: FormData) {
  return presetSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    category: formData.get("category"),
    amount: formData.get("amount"),
    currency: formData.get("currency"),
    counterparty: formData.get("counterparty"),
    paymentMethod: formData.get("paymentMethod"),
    description: formData.get("description"),
  });
}

function rawFormValues(formData: FormData): Record<string, string | undefined> {
  return {
    name: formData.get("name")?.toString(),
    type: formData.get("type")?.toString(),
    category: formData.get("category")?.toString(),
    amount: formData.get("amount")?.toString(),
    currency: formData.get("currency")?.toString(),
    counterparty: formData.get("counterparty")?.toString(),
    paymentMethod: formData.get("paymentMethod")?.toString(),
    description: formData.get("description")?.toString(),
  };
}

export async function createPresetAction(
  _prevState: PresetFormState | undefined,
  formData: FormData
): Promise<PresetFormState> {
  const session = await verifySession();
  if (!canWriteTransactions(session.role)) {
    return { message: "Your role doesn't have permission to manage presets." };
  }

  const parsed = parsePresetFormData(formData);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, values: rawFormValues(formData) };
  }

  const row = await createPreset(session.organizationId, parsed.data);

  await auditLogSafely({
    action: "TRANSACTION_PRESET_CREATED",
    organizationId: session.organizationId,
    userId: session.userId,
    entityType: "transaction_preset",
    entityId: row.id,
    metadata: { name: row.name },
  });

  revalidatePath("/transactions/presets");
  return { success: true };
}

export async function updatePresetAction(
  id: string,
  _prevState: PresetFormState | undefined,
  formData: FormData
): Promise<PresetFormState> {
  const session = await verifySession();
  if (!canWriteTransactions(session.role)) {
    return { message: "Your role doesn't have permission to manage presets." };
  }

  const parsed = parsePresetFormData(formData);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, values: rawFormValues(formData) };
  }

  const row = await updatePreset(session.organizationId, id, parsed.data);
  if (!row) {
    return { message: "Preset not found." };
  }

  await auditLogSafely({
    action: "TRANSACTION_PRESET_UPDATED",
    organizationId: session.organizationId,
    userId: session.userId,
    entityType: "transaction_preset",
    entityId: row.id,
    metadata: { name: row.name },
  });

  revalidatePath("/transactions/presets");
  return { success: true };
}

export async function deletePresetAction(id: string): Promise<void> {
  const session = await verifySession();
  if (!canWriteTransactions(session.role)) return;

  const row = await deletePreset(session.organizationId, id);
  if (!row) return;

  await auditLogSafely({
    action: "TRANSACTION_PRESET_DELETED",
    organizationId: session.organizationId,
    userId: session.userId,
    entityType: "transaction_preset",
    entityId: id,
    metadata: { name: row.name },
  });

  revalidatePath("/transactions/presets");
}
