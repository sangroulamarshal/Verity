"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/server/services/session";
import { updateRiskReviewStatus } from "@/server/services/risk";
import { auditLogSafely } from "@/server/services/audit-log";
import { logServerError } from "@/server/log";
import { canReviewRisk } from "@/lib/permissions";

export interface RiskReviewActionState {
  message?: string;
  success?: boolean;
}

async function setRiskStatus(
  transactionId: string,
  status: "REVIEWED" | "DISMISSED"
): Promise<RiskReviewActionState> {
  const session = await verifySession();

  if (!canReviewRisk(session.role)) {
    return { message: "Your role doesn't have permission to review risk alerts." };
  }

  try {
    const updated = await updateRiskReviewStatus(session.organizationId, transactionId, session.userId, status);
    if (!updated) {
      return { message: "This transaction has no risk evaluation to review." };
    }

    await auditLogSafely({
      action: status === "REVIEWED" ? "TRANSACTION_RISK_REVIEWED" : "TRANSACTION_RISK_DISMISSED",
      organizationId: session.organizationId,
      userId: session.userId,
      entityType: "transaction",
      entityId: transactionId,
    });

    revalidatePath("/risk");
    revalidatePath(`/risk/${transactionId}`);
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    logServerError(
      "risk",
      "Risk review status update failed",
      { organizationId: session.organizationId, transactionId },
      error
    );
    return { message: "Something went wrong updating this alert. Please try again." };
  }
}

export async function markRiskReviewedAction(transactionId: string): Promise<RiskReviewActionState> {
  return setRiskStatus(transactionId, "REVIEWED");
}

export async function markRiskDismissedAction(transactionId: string): Promise<RiskReviewActionState> {
  return setRiskStatus(transactionId, "DISMISSED");
}
