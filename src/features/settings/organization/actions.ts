"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/server/services/session";
import { updateOrganization } from "@/server/services/organizations";
import { auditLogSafely } from "@/server/services/audit-log";
import { canManageOrganization } from "@/lib/permissions";
import { organizationSchema } from "./schema";

export interface OrganizationFormState {
  errors?: Record<string, string[]>;
  message?: string;
  success?: boolean;
}

export async function updateOrganizationAction(
  _prevState: OrganizationFormState | undefined,
  formData: FormData
): Promise<OrganizationFormState> {
  const session = await verifySession();

  if (!canManageOrganization(session.role)) {
    return { message: "Only owners and admins can change organization settings." };
  }

  const parsed = organizationSchema.safeParse({
    name: formData.get("name"),
    industry: formData.get("industry"),
    country: formData.get("country"),
    baseCurrency: formData.get("baseCurrency"),
    timezone: formData.get("timezone"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const row = await updateOrganization(session.organizationId, {
    name: parsed.data.name,
    industry: parsed.data.industry ?? null,
    country: parsed.data.country ?? null,
    baseCurrency: parsed.data.baseCurrency,
    timezone: parsed.data.timezone,
  });

  if (!row) {
    return { message: "Organization not found." };
  }

  await auditLogSafely({
    action: "ORGANIZATION_UPDATED",
    organizationId: session.organizationId,
    userId: session.userId,
    entityType: "organization",
    entityId: session.organizationId,
    metadata: { name: row.name, baseCurrency: row.baseCurrency },
  });

  revalidatePath("/", "layout");
  return { success: true };
}
