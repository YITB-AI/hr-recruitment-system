import { cookies } from "next/headers";
import { connectDB } from "@/server/db/connect";
import { User } from "@/models/User";
import { activityLogRepository } from "@/server/repositories/activity-log.repository";
import { getCurrentUser } from "@/lib/current-user";
import { requireRole } from "@/lib/auth/permissions";
import { startImpersonation, endImpersonation, verifySession, verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";

export type ImpersonationResult = { success: true } | { success: false; error: string };

// Admin-only, and deliberately narrower than requireRole alone: an admin
// can impersonate a non-admin user in their own company, never another
// admin (privilege-escalation guard) and never themselves. Every start/end
// is audit-logged as its own activity-log entry — separate from whatever
// the impersonated session does afterward, which is attributed to the
// impersonated user like any other action (see the comment on
// models/Session.ts's impersonatedBy field for why that split is intentional).
export async function requestStartImpersonation(targetUserId: string): Promise<ImpersonationResult> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "user.impersonate");

  if (targetUserId === actor.id) return { success: false, error: "You can't impersonate yourself" };

  const target = await User.findOne({ _id: targetUserId, companyId: actor.companyId }).select("name role").lean<{
    _id: unknown;
    name: string;
    role: string;
  } | null>();
  if (!target) return { success: false, error: "User not found" };
  if (target.role === "admin") return { success: false, error: "Admins can't be impersonated" };

  try {
    await startImpersonation(targetUserId, actor.companyId);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to start impersonation" };
  }

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: actor.id,
    actorName: actor.name,
    action: "auth.impersonation_started",
    entityType: "auth",
    entityId: targetUserId,
    message: `${actor.name} started impersonating ${target.name}`,
  });

  return { success: true };
}

export async function requestEndImpersonation(): Promise<ImpersonationResult> {
  const impersonatedUser = await verifySession();

  try {
    await endImpersonation();
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to end impersonation" };
  }

  // Deliberately NOT verifySession() here — it's wrapped in React's cache()
  // and would return the pre-mutation (impersonated) result for the rest of
  // this render pass. Read the now-restored cookie and verify it directly.
  await connectDB();
  const cookieStore = await cookies();
  const restoredToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const restoredUser = restoredToken ? await verifySessionToken(restoredToken) : null;
  if (restoredUser) {
    await activityLogRepository.create({
      companyId: restoredUser.companyId,
      actorId: restoredUser.id,
      actorName: restoredUser.name,
      action: "auth.impersonation_ended",
      entityType: "auth",
      entityId: impersonatedUser?.id ?? restoredUser.id,
      message: `${restoredUser.name} stopped impersonating ${impersonatedUser?.name ?? "a user"}`,
    });
  }

  return { success: true };
}
