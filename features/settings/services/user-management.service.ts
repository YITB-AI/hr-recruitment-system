import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { connectDB } from "@/server/db/connect";
import { userRepository, type CompanyUserRow } from "@/server/repositories/user.repository";
import { companyRepository } from "@/server/repositories/company.repository";
import { roleRepository } from "@/server/repositories/role.repository";
import { activityLogRepository } from "@/server/repositories/activity-log.repository";
import { revokeAllSessionsForUser } from "@/lib/auth/session";
import { getCurrentUser, resolveActorId } from "@/lib/current-user";
import { requireRole } from "@/lib/auth/permissions";
import { sendEmail } from "@/lib/email";
import { welcomeEmailHtml } from "@/lib/email-templates";
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
  const existing = await userRepository.findByEmail(actor.companyId, email);
  if (existing) throw new Error(`A user with email "${email}" already exists`);

  if (!(await roleRepository.findByKey(input.role))) throw new Error(`Role "${input.role}" doesn't exist`);

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
    actorId: resolveActorId(actor),
    actorName: actor.name,
    action: "user.created",
    entityType: "auth",
    entityId: user._id,
    message: `${actor.name} added ${user.name} (${user.role}) to the team`,
  });

  // Best-effort — the credentials are still returned below regardless, so
  // whoever added this user can always relay them manually if delivery fails.
  try {
    const company = await companyRepository.findById(actor.companyId);
    const result = await sendEmail(
      {
        to: email,
        subject: "🎉 Welcome to HR Platform — your account details",
        html: welcomeEmailHtml({
          recipientName: user.name,
          companyName: company?.name ?? "your company",
          companySlug: company?.slug ?? "",
          email,
          tempPassword,
        }),
      },
      actor.companyId,
    );
    if (!result.ok) console.error(`Welcome email failed to send: ${result.error}`);
  } catch (error) {
    console.error("Welcome email failed to send:", error);
  }

  return { user, tempPassword };
}

export async function updateCompanyUser(input: UpdateUserInput): Promise<CompanyUserRow> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "user.manage");

  const [target, newRole] = await Promise.all([
    userRepository.findById(actor.companyId, input.userId),
    roleRepository.findByKey(input.role),
  ]);
  if (!target) throw new Error("User not found");
  if (!newRole) throw new Error(`Role "${input.role}" doesn't exist`);

  // Guard: don't let the last full-access user of a company be demoted out
  // of full access — that would leave the company with no one able to
  // manage users/settings at all. "Full access" = the ROLE's wildcard
  // flag, not the literal key "admin" — a custom role created with
  // isWildcard:true (see /platform/roles) must be protected identically.
  if (target.role !== input.role) {
    const wildcardKeys = await roleRepository.findWildcardKeys();
    if (wildcardKeys.includes(target.role) && !newRole.isWildcard) {
      const wildcardCount = await userRepository.countByRoleKeys(actor.companyId, wildcardKeys);
      if (wildcardCount <= 1) {
        throw new Error("Cannot change the role of the last user with full administrative access — promote another user to a full-access role first");
      }
    }
  }

  const updated = await userRepository.update(actor.companyId, input.userId, { name: input.name, role: input.role });
  if (!updated) throw new Error("User not found");

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: resolveActorId(actor),
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

  const wildcardKeys = await roleRepository.findWildcardKeys();
  if (wildcardKeys.includes(target.role)) {
    const wildcardCount = await userRepository.countByRoleKeys(actor.companyId, wildcardKeys);
    if (wildcardCount <= 1) throw new Error("Cannot delete the last user with full administrative access");
  }

  await userRepository.delete(actor.companyId, userId);
  await revokeAllSessionsForUser(userId);

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: resolveActorId(actor),
    actorName: actor.name,
    action: "user.deleted",
    entityType: "auth",
    entityId: userId,
    message: `${actor.name} removed ${target.name} from the team`,
  });
}
