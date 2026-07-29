"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { connectDB } from "@/server/db/connect";
import { sessionRepository, type SessionRow } from "@/server/repositories/session.repository";
import { activityLogRepository } from "@/server/repositories/activity-log.repository";

export async function listOwnSessionsAction(): Promise<SessionRow[]> {
  const actor = await requireSession();
  await connectDB();
  return sessionRepository.findActiveForUser(actor.id);
}

export type RevokeSessionResult = { success: true } | { success: false; error: string };

export async function revokeOwnSessionAction(sessionId: string): Promise<RevokeSessionResult> {
  const actor = await requireSession();
  await connectDB();

  if (sessionId === actor.sessionId) {
    return { success: false, error: "Use “Log out” for your current session." };
  }

  const revoked = await sessionRepository.revokeOne(actor.id, sessionId);
  if (!revoked) return { success: false, error: "Session not found" };

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: actor.id,
    actorName: actor.name,
    action: "auth.session_revoked",
    entityType: "auth",
    entityId: actor.id,
    message: `${actor.name} revoked one of their own active sessions`,
  });

  revalidatePath("/profile");
  return { success: true };
}
