import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { connectDB } from "@/server/db/connect";
import { Company } from "@/models/Company";
import { User } from "@/models/User";
import { companyRepository, type CompanyRow, type CompanyListFilters } from "@/server/repositories/company.repository";
import { userRepository, type CompanyUserRow } from "@/server/repositories/user.repository";
import { jobRepository, type JobRow } from "@/server/repositories/job.repository";
import { activityLogRepository, type ActivityLogRow } from "@/server/repositories/activity-log.repository";
import { settingRepository } from "@/server/repositories/setting.repository";
import { saveFile, deleteFileByKey } from "@/lib/file-storage";
import { getCurrentUser, resolveActorId } from "@/lib/current-user";
import { requirePlatformAdmin } from "@/lib/auth/permissions";
import { sendEmail } from "@/lib/email";
import { welcomeEmailHtml } from "@/lib/email-templates";
import { DEFAULT_ENABLED_COMPANY_FEATURES, isValidCompanyFeatureKey } from "@/constants/company-features";
import type { CompanyStatus } from "@/models/Company";

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

export async function getCompaniesPageData(filters: CompanyListFilters) {
  await connectDB();
  const actor = await getCurrentUser();
  requirePlatformAdmin(actor);
  return companyRepository.findAllPaginated(filters);
}

export type CompanyDetail = {
  company: CompanyRow;
  userCount: number;
  jobCount: number;
  users: CompanyUserRow[];
  jobs: JobRow[];
  activity: ActivityLogRow[];
};

// Deliberately reads an ARBITRARY company's users/jobs/activity, not the
// caller's own — this is the one place in the app that's expected to do a
// genuine cross-tenant read, which is exactly why it's gated by
// requirePlatformAdmin rather than the per-company "admin" role.
export async function getCompanyDetail(companyId: string): Promise<CompanyDetail | null> {
  await connectDB();
  const actor = await getCurrentUser();
  requirePlatformAdmin(actor);

  const company = await companyRepository.findById(companyId);
  if (!company) return null;

  const [userCount, jobCount, users, jobs, activity] = await Promise.all([
    companyRepository.countUsers(companyId),
    companyRepository.countJobs(companyId),
    userRepository.findAllForCompany(companyId),
    jobRepository.findAllForCompany(companyId),
    activityLogRepository.findRecent(companyId, 30),
  ]);

  return { company, userCount, jobCount, users, jobs, activity };
}

export type CompanyActionResult = { success: true } | { success: false; error: string };

export async function updateCompany(companyId: string, input: { name: string }): Promise<CompanyRow> {
  await connectDB();
  const actor = await getCurrentUser();
  requirePlatformAdmin(actor);

  const company = await companyRepository.update(companyId, { name: input.name });
  if (!company) throw new Error("Company not found");

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: resolveActorId(actor),
    actorName: actor.name,
    action: "company.updated",
    entityType: "setting",
    entityId: company._id,
    message: `${actor.name} updated company "${company.name}"`,
  });

  return company;
}

export async function updateCompanyFeatures(companyId: string, enabledFeatures: string[]): Promise<CompanyRow> {
  await connectDB();
  const actor = await getCurrentUser();
  requirePlatformAdmin(actor);

  const filtered = enabledFeatures.filter(isValidCompanyFeatureKey);
  const company = await companyRepository.update(companyId, { enabledFeatures: filtered, featureAccessConfigured: true });
  if (!company) throw new Error("Company not found");

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: resolveActorId(actor),
    actorName: actor.name,
    action: "company.updated",
    entityType: "setting",
    entityId: company._id,
    message: `${actor.name} updated Model Access for company "${company.name}"`,
  });

  return company;
}

export async function setCompanyStatus(companyId: string, status: CompanyStatus): Promise<CompanyRow> {
  await connectDB();
  const actor = await getCurrentUser();
  requirePlatformAdmin(actor);

  const company = await companyRepository.setStatus(companyId, status);
  if (!company) throw new Error("Company not found");

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: resolveActorId(actor),
    actorName: actor.name,
    action: status === "active" ? "company.activated" : "company.suspended",
    entityType: "setting",
    entityId: company._id,
    message: `${actor.name} ${status === "active" ? "reactivated" : "suspended"} company "${company.name}"`,
  });

  return company;
}

const MAX_LOGO_BYTES = 5 * 1024 * 1024;
const ALLOWED_LOGO_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const LOGO_FOLDER = "company-logos";

export async function uploadCompanyLogo(companyId: string, file: File): Promise<CompanyRow> {
  if (!ALLOWED_LOGO_TYPES.has(file.type)) throw new Error("Only PNG, JPEG, or WEBP images are supported");
  if (file.size > MAX_LOGO_BYTES) throw new Error("Logo must be smaller than 5MB");

  await connectDB();
  const actor = await getCurrentUser();
  requirePlatformAdmin(actor);

  const existing = await companyRepository.findById(companyId);
  if (!existing) throw new Error("Company not found");

  const buffer = Buffer.from(await file.arrayBuffer());
  const { storageKey } = await saveFile(LOGO_FOLDER, file.name, buffer);
  const logoUrl = `/api/files/${storageKey}`;

  const company = await companyRepository.update(companyId, { logoUrl });
  if (existing.logoUrl) await deleteFileByKey(existing.logoUrl.replace("/api/files/", ""));

  return company!;
}

// Deliberately much stricter than deleteJob's guard: a company can carry an
// entire client's worth of users/jobs/applicants/documents, so this only
// ever allows deleting one that's genuinely empty (e.g. created by
// mistake). Anything with real data must be suspended instead — irreversibly
// deleting a live client's tenant is exactly the kind of action this
// project's own standards call for extra caution around.
export async function deleteCompany(companyId: string): Promise<void> {
  await connectDB();
  const actor = await getCurrentUser();
  requirePlatformAdmin(actor);

  const company = await companyRepository.findById(companyId);
  if (!company) throw new Error("Company not found");

  const [userCount, jobCount] = await Promise.all([
    companyRepository.countUsers(companyId),
    companyRepository.countJobs(companyId),
  ]);
  if (userCount > 0 || jobCount > 0) {
    throw new Error(
      `"${company.name}" has ${userCount} user(s) and ${jobCount} job(s) — suspend it instead of deleting, so their records aren't orphaned.`,
    );
  }

  await companyRepository.delete(companyId);

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: resolveActorId(actor),
    actorName: actor.name,
    action: "company.deleted",
    entityType: "setting",
    entityId: companyId,
    message: `${actor.name} deleted company "${company.name}"`,
  });
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
  legalName?: string;
  industry?: string;
  companySize?: string;
  adminPhone?: string;
  country?: string;
  defaultLanguage?: string;
  enabledFeatures?: string[];
  timezone?: string;
  weekStartsOn?: "sunday" | "monday";
  dateFormat?: string;
  timeFormat?: "12h" | "24h";
  currency?: string;
  numberFormat?: string;
  multiLanguageEnabled?: boolean;
  primaryColor?: string;
  secondaryColor?: string;
}): Promise<CreateCompanyResult> {
  await connectDB();
  const actor = await getCurrentUser();
  requirePlatformAdmin(actor);

  const slug = slugify(input.name);
  const existing = await Company.findOne({ slug });
  if (existing) throw new Error(`A company with ID "${slug}" already exists`);

  const email = input.adminEmail.toLowerCase().trim();
  // Only real, validated non-core feature keys are ever persisted — silently
  // drop anything else rather than trusting client input (defense in depth,
  // on top of the validator's own zod refine).
  const enabledFeatures = (input.enabledFeatures ?? DEFAULT_ENABLED_COMPANY_FEATURES).filter(isValidCompanyFeatureKey);

  // No cross-company email-existence check here: the same email can
  // legitimately be an admin at two different client companies (compound
  // {companyId, email} unique index on User), and this new company has no
  // users yet regardless — a global check here would only ever function as
  // a cross-tenant existence oracle, never a real duplicate-prevention rule.
  const companyDoc = await Company.create({
    name: input.name,
    slug,
    legalName: input.legalName,
    industry: input.industry,
    companySize: input.companySize,
    adminPhone: input.adminPhone,
    country: input.country,
    defaultLanguage: input.defaultLanguage,
    enabledFeatures,
    // Every company created through the wizard has made a real, explicit
    // Model Access choice (even one that resolves to zero optional
    // modules) -- see the comment on Company.featureAccessConfigured for
    // why this can't be left to infer from enabledFeatures alone.
    featureAccessConfigured: true,
  });

  // One Setting row created up front (Configurations step), rather than
  // waiting for settingRepository.get()'s lazy-create-on-first-read default
  // — a new company's platform config/branding choices from the wizard
  // should be live from the moment the company exists, not overwritten by
  // generic defaults the first time anyone visits Settings.
  await settingRepository.update(String(companyDoc._id), {
    companyName: input.name,
    timezone: input.timezone,
    dateFormat: input.dateFormat,
    weekStartsOn: input.weekStartsOn,
    timeFormat: input.timeFormat,
    currency: input.currency,
    numberFormat: input.numberFormat,
    multiLanguageEnabled: input.multiLanguageEnabled,
    appearance: {
      primaryColor: input.primaryColor,
      secondaryColor: input.secondaryColor,
    },
  });

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);
  await User.create({
    companyId: companyDoc._id,
    name: input.adminName,
    email,
    passwordHash,
    role: "admin",
    mustChangePassword: true,
    emailVerified: false,
  });

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: resolveActorId(actor),
    actorName: actor.name,
    action: "company.created",
    entityType: "setting",
    entityId: companyDoc._id,
    message: `${actor.name} created company "${input.name}"`,
  });

  // Best-effort — the credentials are still returned below regardless, so
  // the platform admin can always relay them manually if delivery fails.
  try {
    // The NEW company's id, not actor.companyId (the platform admin's own
    // company) — this email is on behalf of the company just created.
    const result = await sendEmail(
      {
        to: email,
        subject: "🎉 Welcome to HR Platform — your account details",
        html: welcomeEmailHtml({
          recipientName: input.adminName,
          companyName: input.name,
          companySlug: slug,
          email,
          tempPassword,
        }),
      },
      companyDoc._id.toString(),
    );
    if (!result.ok) console.error(`Welcome email failed to send: ${result.error}`);
  } catch (error) {
    console.error("Welcome email failed to send:", error);
  }

  const company = await companyRepository.findById(String(companyDoc._id));
  return { company: company!, adminEmail: email, tempPassword };
}
