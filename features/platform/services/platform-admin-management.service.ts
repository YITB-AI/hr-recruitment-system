import { connectDB } from "@/server/db/connect";
import { userRepository } from "@/server/repositories/user.repository";
import { companyRepository } from "@/server/repositories/company.repository";
import { activityLogRepository } from "@/server/repositories/activity-log.repository";
import { getCurrentUser, resolveActorId } from "@/lib/current-user";
import { requirePlatformAdmin } from "@/lib/auth/permissions";

export type PlatformAdminRow = { _id: string; name: string; email: string; companyName: string | null };

// isPlatformAdmin is a global, cross-company flag (see models/User.ts) --
// there is currently no UI for granting/revoking it at all; the only way
// to create a new platform admin today is a one-off script run directly
// against the database. This is that missing, genuinely real capability,
// scoped as Platform Settings' first section.
export async function listPlatformAdmins(): Promise<PlatformAdminRow[]> {
  await connectDB();
  const actor = await getCurrentUser();
  requirePlatformAdmin(actor);

  const admins = await userRepository.findAllPlatformAdmins();
  const companies = await Promise.all(admins.map((a) => (a.companyId ? companyRepository.findById(a.companyId) : Promise.resolve(null))));
  return admins.map((a, i) => ({ _id: a._id, name: a.name, email: a.email, companyName: companies[i]?.name ?? null }));
}

export async function grantPlatformAdmin(email: string): Promise<PlatformAdminRow> {
  await connectDB();
  const actor = await getCurrentUser();
  requirePlatformAdmin(actor);

  const normalized = email.toLowerCase().trim();
  const target = await userRepository.findAnyByEmailForPlatformAdmin(normalized);
  if (!target) throw new Error(`No user found with email "${normalized}"`);
  if (target.isPlatformAdmin) throw new Error(`${target.name} is already a platform admin`);

  await userRepository.setPlatformAdmin(String(target._id), true);

  await activityLogRepository.create({
    actorId: resolveActorId(actor),
    actorName: actor.name,
    action: "platform_admin.granted",
    entityType: "user",
    entityId: target._id,
    message: `${actor.name} granted platform admin access to ${target.name} (${target.email})`,
  });

  const company = target.companyId ? await companyRepository.findById(String(target.companyId)) : null;
  return { _id: String(target._id), name: target.name, email: target.email, companyName: company?.name ?? null };
}

export async function revokePlatformAdmin(userId: string): Promise<void> {
  await connectDB();
  const actor = await getCurrentUser();
  requirePlatformAdmin(actor);

  if (userId === actor.id) throw new Error("You can't revoke your own platform admin access");

  const adminCount = await userRepository.countPlatformAdmins();
  if (adminCount <= 1) throw new Error("Cannot revoke the last platform admin — grant it to someone else first");

  const target = await userRepository.findAnyByIdForPlatformAdmin(userId);
  if (!target) throw new Error("User not found");

  await userRepository.setPlatformAdmin(userId, false);

  await activityLogRepository.create({
    actorId: resolveActorId(actor),
    actorName: actor.name,
    action: "platform_admin.revoked",
    entityType: "user",
    entityId: userId,
    message: `${actor.name} revoked platform admin access from ${target.name} (${target.email})`,
  });
}
