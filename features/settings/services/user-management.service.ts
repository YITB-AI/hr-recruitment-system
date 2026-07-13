import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { connectDB } from "@/server/db/connect";
import { userRepository, type CompanyUserRow } from "@/server/repositories/user.repository";
import { activityLogRepository } from "@/server/repositories/activity-log.repository";
import { revokeAllSessionsForUser } from "@/lib/auth/session";
import { getCurrentUser } from "@/lib/current-user";
import { requireRole } from "@/lib/auth/permissions";
import type { CreateUserInput, UpdateUserInput } from "@/validators/user-management";

function generateTempPassword(): string {
  return crypto.randomBytes(9).toString("base64url");
}

export async function listCompanyUsers(): Promise<CompanyUserRow[]> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "user.manage");
  return userRepository.findAllForCompany(actor.companyId);
}

export type CreateCompanyUserResult = { user: CompanyUserRow; tempPassword: string };

export async function createCompanyUser(input: CreateUserInput): Promise<CreateCompanyUserResult> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "user.manage");

  const email = input.email.toLowerCase().trim();
  const existing = await userRepository.findByEmail(email);
  if (existing) throw new Error(`A user with email "${email}" already exists`);

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);
  const user = await userRepository.create(actor.companyId, {
    name: input.name,
    email,
    role: input.role,
    passwordHash,
    mustChangePassword: true,
  });

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: actor.id === "system" ? undefined : actor.id,
    actorName: actor.name,
    action: "user.created",
    entityType: "auth",
    entityId: user._id,
    message: `${actor.name} added ${user.name} (${user.role}) to the team`,
  });

  return { user, tempPassword };
}

export async function updateCompanyUser(input: UpdateUserInput): Promise<CompanyUserRow> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "user.manage");

  const target = await userRepository.findById(actor.companyId, input.userId);
  if (!target) throw new Error("User not found");

  // Guard: don't let the last admin of a company demote themselves (or be
  // demoted) out of the admin role — that would leave the company with no
  // one able to manage users/settings at all.
  if (target.role === "admin" && input.role !== "admin") {
    const adminCount = await userRepository.countByRole(actor.companyId, "admin");
    if (adminCount <= 1) {
      throw new Error("Cannot change the role of the last admin — promote another user to admin first");
    }
  }

  const updated = await userRepository.update(actor.companyId, input.userId, { name: input.name, role: input.role });
  if (!updated) throw new Error("User not found");

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: actor.id === "system" ? undefined : actor.id,
    actorName: actor.name,
    action: "user.updated",
    entityType: "auth",
    entityId: updated._id,
    message: `${actor.name} updated ${updated.name} (now ${updated.role})`,
  });

  return updated;
}

export async function deleteCompanyUser(userId: string): Promise<void> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "user.manage");

  if (userId === actor.id) throw new Error("You can't delete your own account");

  const target = await userRepository.findById(actor.companyId, userId);
  if (!target) throw new Error("User not found");

  if (target.role === "admin") {
    const adminCount = await userRepository.countByRole(actor.companyId, "admin");
    if (adminCount <= 1) throw new Error("Cannot delete the last admin");
  }

  await userRepository.delete(actor.companyId, userId);
  await revokeAllSessionsForUser(userId);

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: actor.id === "system" ? undefined : actor.id,
    actorName: actor.name,
    action: "user.deleted",
    entityType: "auth",
    entityId: userId,
    message: `${actor.name} removed ${target.name} from the team`,
  });
}
