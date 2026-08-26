import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { organizations } from "@/db/schema";

export type Organization = typeof organizations.$inferSelect;

export async function getOrganization(organizationId: string): Promise<Organization | null> {
  const [row] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);
  return row ?? null;
}

export interface UpdateOrganizationInput {
  name: string;
  industry?: string | null;
  country?: string | null;
  baseCurrency: string;
  timezone: string;
  logoUrl?: string | null;
}

/**
 * Deliberately does NOT touch any transaction's stored baseAmount/
 * baseCurrency when the organization's base currency changes — those are
 * point-in-time snapshots (brief section 22). Changing the org's base
 * currency only affects the conversion target for *new* transactions and
 * the dashboard's aggregation currency going forward.
 */
export async function updateOrganization(
  organizationId: string,
  input: UpdateOrganizationInput
): Promise<Organization | null> {
  const [row] = await db
    .update(organizations)
    .set({
      name: input.name,
      industry: input.industry ?? null,
      country: input.country ?? null,
      baseCurrency: input.baseCurrency,
      timezone: input.timezone,
      logoUrl: input.logoUrl ?? null,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, organizationId))
    .returning();

  return row ?? null;
}
