import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { connectDB } from "@/server/db/connect";
import { Company } from "@/models/Company";
import { User } from "@/models/User";
import { companyRepository, type CompanyRow } from "@/server/repositories/company.repository";
import { activityLogRepository } from "@/server/repositories/activity-log.repository";
import { getCurrentUser } from "@/lib/current-user";
import { requirePlatformAdmin } from "@/lib/auth/permissions";

// Platform-admin-only — see the isPlatformAdmin comment on models/User.ts.
// Mirrors scripts/create-company.ts exactly (same temp-password + forced
// password-change flow), just reachable from the UI instead of a terminal.

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || `company-${Date.now()}`
  );
}

function generateTempPassword(): string {
  return crypto.randomBytes(9).toString("base64url");
}

export async function listCompanies(): Promise<CompanyRow[]> {
  await connectDB();
  const actor = await getCurrentUser();
  requirePlatformAdmin(actor);
  return companyRepository.findAll();
}

export type CreateCompanyResult = {
  company: CompanyRow;
  adminEmail: string;
  tempPassword: string;
};

export async function createCompanyWithAdmin(input: {
  name: string;
  adminName: string;
  adminEmail: string;
}): Promise<CreateCompanyResult> {
  await connectDB();
  const actor = await getCurrentUser();
  requirePlatformAdmin(actor);

  const slug = slugify(input.name);
  const existing = await Company.findOne({ slug });
  if (existing) throw new Error(`A company with ID "${slug}" already exists`);

  const email = input.adminEmail.toLowerCase().trim();
  const existingUser = await User.findOne({ email });
  if (existingUser) throw new Error(`A user with email "${email}" already exists`);

  const companyDoc = await Company.create({ name: input.name, slug });

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);
  await User.create({
    companyId: companyDoc._id,
    name: input.adminName,
    email,
    passwordHash,
    role: "admin",
    mustChangePassword: true,
  });

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: actor.id === "system" ? undefined : actor.id,
    actorName: actor.name,
    action: "company.created",
    entityType: "setting",
    entityId: companyDoc._id,
    message: `${actor.name} created company "${input.name}"`,
  });

  const company = await companyRepository.findById(String(companyDoc._id));
  return { company: company!, adminEmail: email, tempPassword };
}
