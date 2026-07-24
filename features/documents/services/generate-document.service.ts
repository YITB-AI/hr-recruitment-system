import { randomUUID } from "node:crypto";
import { connectDB } from "@/server/db/connect";
import { documentTemplateRepository, type DocumentTemplateRow } from "@/server/repositories/document-template.repository";
import { employeeRepository } from "@/server/repositories/employee.repository";
import { applicantRepository } from "@/server/repositories/applicant.repository";
import { companyRepository } from "@/server/repositories/company.repository";
import { settingRepository } from "@/server/repositories/setting.repository";
import { letterheadRepository } from "@/server/repositories/letterhead.repository";
import {
  generatedDocumentRepository,
  type GeneratedDocumentRow,
} from "@/server/repositories/generated-document.repository";
import { activityLogRepository } from "@/server/repositories/activity-log.repository";
import { saveFile, readFileByKey } from "@/lib/file-storage";
import { convertDocxToPdf, launchSharedPdfBrowser } from "@/lib/pdf-conversion";
import type { Browser } from "puppeteer-core";
import { renderTemplate, type TemplateImageValue } from "@/lib/docx";
import { injectLetterheadHeader } from "@/lib/docx-letterhead";
import path from "node:path";
import { resolveCalculatedValue } from "@/lib/salary-calculation";
import { getEmployeeMilestones, formatMilestoneDate } from "@/lib/employee-milestones";
import { formatDateWithPreset, formatTimeWithPreset, formatProvidedDateValue, nowInTimeZone } from "@/lib/date-format";
import { EMPLOYMENT_TYPE_LABELS, type EmploymentType } from "@/constants/employee";
import type { CalculationType } from "@/constants/document-template";
import { getCurrentUser } from "@/lib/current-user";
import { requireRole } from "@/lib/auth/permissions";
import { notifyStaffForReview } from "@/lib/staff-notify";
import type { SessionUser } from "@/types/user";

const DOCUMENT_FOLDER = "documents";
const DOCUMENT_IMAGE_FOLDER = "document-images";

export type DocumentRecipient =
  | { type: "employee"; id: string; name?: string }
  | { type: "applicant"; id: string; name?: string };

type RecipientRecord = {
  name: string;
  email: string;
  department?: string | null;
  designation?: string | null;
  currentPosition?: string | null;
  basicSalary?: number | null;
  grossSalary?: number | null;
  // Only present on employee recipients (EmployeeDetailRow) — absent for
  // applicants, which naturally excludes them from the milestone-date keys.
  joiningDate?: Date | null;
  employmentType?: string | null;
  // Employee-only, all absent on an applicant recipient.
  employeeCode?: string | null;
  phone?: string | null;
  manager?: { name: string } | null;
  employmentStatus?: string | null;
  employeeType?: { name: string } | null;
  // Applicant-only, all absent on an employee recipient.
  jobId?: { title: string } | null;
  status?: string | null;
  source?: string | null;
  appliedAt?: Date | null;
  location?: string | null;
  experienceYears?: number | null;
  skills?: string[] | null;
  resumeUrl?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  portfolioUrl?: string | null;
};

// Mirrors the client-side autofill convenience in generate-document-wizard.tsx,
// but as a fallback only: an explicitly-provided value in `values` always wins
// (see generateOne below) — this only fills gaps, e.g. for bulk generation
// where one shared values map can't hold a different name per recipient.
// `dateFormat` is the effective format for this field (its own override, or
// the company-wide Setting.dateFormat default) — only the milestone-date
// keys use it, since every other value here is already a plain string.
function resolveKnownFieldValue(key: string, record: RecipientRecord, dateFormat?: string): string | undefined {
  switch (key.toLowerCase()) {
    case "employee_name":
    case "applicant_name":
    case "name":
      return record.name;
    case "designation":
    case "job_title":
    case "position":
      return record.designation ?? record.currentPosition ?? record.jobId?.title ?? undefined;
    case "department":
    case "dept":
    case "department_name":
      return record.department ?? undefined;
    case "email":
    case "employee_email":
    case "applicant_email":
      return record.email;
    case "basic_salary":
      return record.basicSalary != null ? String(record.basicSalary) : undefined;
    case "gross_salary":
      return record.grossSalary != null ? String(record.grossSalary) : undefined;
    case "probation_end_date":
    case "confirmation_date":
    case "increment_eligibility_date":
    case "contract_renewal_date": {
      if (!record.joiningDate) return undefined;
      const milestones = getEmployeeMilestones(record.joiningDate, record.employmentType ?? "");
      switch (key.toLowerCase()) {
        case "probation_end_date":
          return formatMilestoneDate(milestones.probationEndDate, dateFormat);
        case "confirmation_date":
          return formatMilestoneDate(milestones.confirmationDate, dateFormat);
        case "increment_eligibility_date":
          return formatMilestoneDate(milestones.incrementEligibilityDate, dateFormat);
        case "contract_renewal_date":
          return milestones.contractRenewalDate ? formatMilestoneDate(milestones.contractRenewalDate, dateFormat) : undefined;
        default:
          return undefined;
      }
    }
    case "employee_code":
      return record.employeeCode ?? undefined;
    case "phone":
    case "applicant_phone":
      return record.phone ?? undefined;
    case "manager_name":
      return record.manager?.name ?? undefined;
    case "employment_type":
      return record.employmentType
        ? EMPLOYMENT_TYPE_LABELS[record.employmentType as EmploymentType] ?? record.employmentType
        : undefined;
    case "employment_status":
      return record.employmentStatus ?? undefined;
    case "employee_type_name":
      return record.employeeType?.name ?? undefined;
    case "joining_date":
      return record.joiningDate ? formatDateWithPreset(record.joiningDate, dateFormat) : undefined;
    case "applicant_status":
      return record.status ?? undefined;
    // Source keys are now company-managed (Status collection, module
    // "applicant_source") rather than a static label map — this helper is a
    // plain sync function with no DB access, so it returns the raw key here,
    // same as applicant_status just above.
    case "source":
      return record.source ?? undefined;
    case "applied_date":
      return record.appliedAt ? formatDateWithPreset(record.appliedAt, dateFormat) : undefined;
    case "location":
      return record.location ?? undefined;
    case "experience_years":
      return record.experienceYears != null ? String(record.experienceYears) : undefined;
    case "skills":
      return record.skills && record.skills.length > 0 ? record.skills.join(", ") : undefined;
    case "resume_url":
      return record.resumeUrl ?? undefined;
    case "linkedin_url":
      return record.linkedinUrl ?? undefined;
    case "github_url":
      return record.githubUrl ?? undefined;
    case "portfolio_url":
      return record.portfolioUrl ?? undefined;
    default:
      return undefined;
  }
}

// Company/System variables don't come from the recipient record at all —
// Company is fetched once per generate call (see generateOne's callers) and
// System values are computed at generation time.
function resolveCompanyFieldValue(key: string, company: { name: string; logoUrl: string | null }): string | undefined {
  switch (key.toLowerCase()) {
    case "company_name":
      return company.name;
    case "company_logo_url":
      return company.logoUrl ?? undefined;
    default:
      return undefined;
  }
}

function resolveSystemFieldValue(
  key: string,
  generatedByName: string,
  companyTimezone: string,
  dateFormat?: string,
  timeFormat?: string,
): string | undefined {
  switch (key.toLowerCase()) {
    case "current_date":
      return formatDateWithPreset(nowInTimeZone(companyTimezone), dateFormat);
    case "current_time":
      return formatTimeWithPreset(nowInTimeZone(companyTimezone), timeFormat ?? "h:mm A");
    case "generated_by":
      return generatedByName;
    default:
      return undefined;
  }
}

export type CalculatedFieldValue = { calculationType: CalculationType; value: number };
export type FieldValueMap = Record<string, string | boolean | Array<Record<string, string>> | CalculatedFieldValue>;

async function generateOne(
  actor: SessionUser,
  template: DocumentTemplateRow,
  templateBuffer: Buffer,
  recipient: DocumentRecipient,
  values: FieldValueMap,
  batchId: string,
  company: { name: string; logoUrl: string | null },
  companyDateFormat: string,
  companyTimezone: string,
  // Bulk generation launches one Chromium instance for the whole batch and
  // passes it in here (see generateDocumentsBulk) instead of every recipient
  // paying its own ~1-2s cold-start cost.
  sharedPdfBrowser?: Browser,
  // Raw letterhead bytes for the PDF-conversion step only — the .docx
  // buffer already has the letterhead baked into its own header (see
  // withLetterhead); PDF conversion can't read that, so it needs these
  // bytes separately. Null/undefined when no letterhead applies.
  letterheadImage?: { buffer: Buffer; extension: string } | null,
): Promise<GeneratedDocumentRow> {
  const recipientRecord =
    recipient.type === "employee"
      ? await employeeRepository.findById(actor.companyId, recipient.id)
      : await applicantRepository.findById(actor.companyId, recipient.id);
  if (!recipientRecord) {
    throw new Error(recipient.type === "employee" ? "Employee not found" : "Applicant not found");
  }

  const hasCalculatedField = template.fields.some((field) => field.type === "calculated");
  if (recipient.type === "applicant" && hasCalculatedField) {
    throw new Error(`Template "${template.name}" has salary-calculated field(s) and cannot be used for applicants`);
  }

  const resolvedValues: Record<string, string | boolean | Array<Record<string, string>>> = {};
  const missing: string[] = [];
  // Image fields resolve to a URL first; the real bytes are only fetched
  // once we know every field passed its required-value check below.
  const pendingImages: Record<string, { url: string; width: number; height: number }> = {};

  for (const field of template.fields) {
    if (field.type === "calculated") {
      // recipient.type === "employee" here — guarded above for applicants.
      // The calculation type/value is chosen per-generation (wizard/bulk
      // payload), not stored on the template — see the note in
      // validators/document-template.ts.
      const raw = values[field.key];
      const calc =
        raw && typeof raw === "object" && !Array.isArray(raw) && "calculationType" in raw && "value" in raw
          ? (raw as CalculatedFieldValue)
          : null;
      if (calc) {
        resolvedValues[field.key] = String(
          resolveCalculatedValue(
            { type: calc.calculationType, value: calc.value },
            recipientRecord as { basicSalary: number; grossSalary: number },
          ),
        );
      } else {
        resolvedValues[field.key] = "";
        if (field.required) missing.push(field.label);
      }
    } else if (field.type === "table") {
      const rows = Array.isArray(values[field.key]) ? (values[field.key] as Array<Record<string, string>>) : [];
      resolvedValues[field.key] = rows;
      if (field.required && rows.length === 0) missing.push(field.label);
    } else if (field.type === "conditional") {
      resolvedValues[field.key] = Boolean(values[field.key]);
    } else if (field.type === "image") {
      const raw = values[field.key];
      const url = typeof raw === "string" ? raw.trim() : "";
      if (url) {
        pendingImages[field.key] = { url, width: field.imageWidth ?? 150, height: field.imageHeight ?? 150 };
        resolvedValues[field.key] = field.key; // truthy marker; image module reads bytes from `images`, not this value
      } else {
        resolvedValues[field.key] = "";
        if (field.required) missing.push(field.label);
      }
    } else if (field.type === "date") {
      const raw = values[field.key];
      const provided = typeof raw === "string" ? raw.trim() : "";
      const effectiveDateFormat = field.dateFormat ?? companyDateFormat;
      const value = provided
        ? formatProvidedDateValue(provided, effectiveDateFormat, field.timeFormat)
        : resolveSystemFieldValue(field.key, actor.name, companyTimezone, effectiveDateFormat, field.timeFormat) ||
          resolveCompanyFieldValue(field.key, company) ||
          resolveKnownFieldValue(field.key, recipientRecord, effectiveDateFormat) ||
          "";
      resolvedValues[field.key] = value;
      if (field.required && value.trim() === "") missing.push(field.label);
    } else {
      const raw = values[field.key];
      const provided = typeof raw === "string" ? raw.trim() : "";
      const value =
        provided ||
        resolveSystemFieldValue(field.key, actor.name, companyTimezone, companyDateFormat) ||
        resolveCompanyFieldValue(field.key, company) ||
        resolveKnownFieldValue(field.key, recipientRecord, companyDateFormat) ||
        "";
      resolvedValues[field.key] = value;
      if (field.required && value.trim() === "") missing.push(field.label);
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing required field(s): ${missing.join(", ")}`);
  }

  const images: Record<string, TemplateImageValue> = {};
  for (const [key, pending] of Object.entries(pendingImages)) {
    const buffer = await readFileByKey(pending.url.replace("/api/files/", ""));
    images[key] = { buffer, width: pending.width, height: pending.height };
  }

  // templateBuffer already has the company letterhead header fully baked
  // in (once, by the caller, before this per-recipient path runs — see
  // withLetterhead) whenever the company has one configured — no
  // per-recipient work needed for it here.
  const outputBuffer = renderTemplate(templateBuffer, resolvedValues, images);

  // Employee name + template name + date, per the requested naming
  // convention — sanitized the same way template.name/recipient.name
  // already were, so nothing downstream (storage, download links) needs
  // to special-case this format.
  const generatedDateStamp = new Date().toISOString().slice(0, 10);
  const fileName = `${recipientRecord.name.replace(/\s+/g, "_")}_${template.name.replace(/\s+/g, "_")}_${generatedDateStamp}.docx`;
  const { storageKey } = await saveFile(DOCUMENT_FOLDER, fileName, outputBuffer);

  const created = await generatedDocumentRepository.create(actor.companyId, {
    templateId: template._id,
    employeeId: recipient.type === "employee" ? recipient.id : undefined,
    applicantId: recipient.type === "applicant" ? recipient.id : undefined,
    batchId,
    fileName,
    fileUrl: `/api/files/${storageKey}`,
    generatedBy: actor.id === "system" ? undefined : actor.id,
  });

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: actor.id === "system" ? undefined : actor.id,
    actorName: actor.name,
    action: "document.generated",
    entityType: "document",
    entityId: created._id,
    message: `${actor.name} generated "${template.name}" for ${recipientRecord.name}`,
  });

  // Best-effort — a conversion failure must never fail the document
  // generation itself (the .docx is already saved and usable). The
  // download UI falls back to the .docx whenever pdfStatus isn't "ready".
  try {
    const pdfBuffer = await convertDocxToPdf(outputBuffer, sharedPdfBrowser, letterheadImage);
    const pdfFileName = fileName.replace(/\.docx$/, ".pdf");
    const { storageKey: pdfStorageKey } = await saveFile(DOCUMENT_FOLDER, pdfFileName, pdfBuffer);
    await generatedDocumentRepository.updatePdfInfo(actor.companyId, created._id, {
      pdfStatus: "ready",
      pdfUrl: `/api/files/${pdfStorageKey}`,
    });
    created.pdfStatus = "ready";
    created.pdfUrl = `/api/files/${pdfStorageKey}`;
  } catch (error) {
    await generatedDocumentRepository.updatePdfInfo(actor.companyId, created._id, { pdfStatus: "failed" });
    created.pdfStatus = "failed";
    await activityLogRepository.create({
      companyId: actor.companyId,
      actorId: actor.id === "system" ? undefined : actor.id,
      actorName: actor.name,
      action: "document.pdf_conversion_failed",
      entityType: "document",
      entityId: created._id,
      message: `PDF conversion failed for "${template.name}" (${recipientRecord.name}): ${error instanceof Error ? error.message : "unknown error"}`,
    });
  }

  return created;
}

export async function listRecentDocuments(): Promise<GeneratedDocumentRow[]> {
  await connectDB();
  const { companyId } = await getCurrentUser();
  return generatedDocumentRepository.findRecent(companyId);
}

export async function listTemplatesForPicker() {
  await connectDB();
  const { companyId } = await getCurrentUser();
  return documentTemplateRepository.findAll(companyId);
}

export async function listEmployeesForPicker() {
  await connectDB();
  const { companyId } = await getCurrentUser();
  return employeeRepository.findAllForPicker(companyId);
}

export async function listApplicantsForPicker() {
  await connectDB();
  const { companyId } = await getCurrentUser();
  return applicantRepository.findAllForPicker(companyId);
}

// Uploads an image chosen for an "image" template field at generation time
// (e.g. a signature or one-off attachment) — returns a URL the wizard stores
// as that field's value; generateOne fetches the bytes back by this URL.
export async function uploadTemplateImage(buffer: Buffer, originalName: string): Promise<string> {
  requireRole(await getCurrentUser(), "document.generate");
  const { storageKey } = await saveFile(DOCUMENT_IMAGE_FOLDER, originalName, buffer);
  return `/api/files/${storageKey}`;
}

// Resolves which letterhead (if any) applies to this generate call.
// Explicit letterheadId wins when given (and belongs to this company);
// otherwise, if exactly one letterhead exists for the company, it's used
// automatically — the UI only needs to ask the admin to pick when there's
// real ambiguity (more than one uploaded). No letterheads at all is a
// silent no-op, matching this app's "never fabricate/guess" convention.
async function resolveLetterhead(companyId: string, letterheadId?: string): Promise<{ buffer: Buffer; extension: string } | null> {
  let letterhead;
  if (letterheadId) {
    letterhead = await letterheadRepository.findById(companyId, letterheadId);
  } else {
    const all = await letterheadRepository.findAllForCompany(companyId);
    letterhead = all.length === 1 ? all[0] : null; // ambiguous with no explicit choice — don't guess
  }
  if (!letterhead) return null;

  return {
    buffer: await readFileByKey(letterhead.imageUrl.replace("/api/files/", "")),
    extension: path.extname(letterhead.imageUrl).replace(".", "") || "png",
  };
}

// Computed once per generate call (single or whole bulk batch), never per
// recipient — injecting the header is pure/recipient-independent, and
// re-fetching the same image bytes N times for an N-recipient batch would
// be wasted work. Returns templateBuffer unchanged, and letterheadImage
// null, when no letterhead applies — documents (and their PDF previews)
// render exactly as before in that case. letterheadImage is returned
// alongside the injected buffer (not just the buffer) because the PDF
// conversion step below can't read a .docx header at all — it needs the
// raw image bytes to reproduce the same letterhead a different way.
async function withLetterhead(
  templateBuffer: Buffer,
  companyId: string,
  letterheadId?: string,
): Promise<{ buffer: Buffer; letterheadImage: { buffer: Buffer; extension: string } | null }> {
  const letterhead = await resolveLetterhead(companyId, letterheadId);
  if (!letterhead) return { buffer: templateBuffer, letterheadImage: null };
  return { buffer: injectLetterheadHeader(templateBuffer, letterhead), letterheadImage: letterhead };
}

export async function generateDocument(
  templateId: string,
  recipient: DocumentRecipient,
  values: FieldValueMap,
  letterheadId?: string,
): Promise<GeneratedDocumentRow> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "document.generate");

  const [template, company, setting] = await Promise.all([
    documentTemplateRepository.findById(actor.companyId, templateId),
    companyRepository.findById(actor.companyId),
    settingRepository.get(actor.companyId),
  ]);
  if (!template) throw new Error("Template not found");
  const rawTemplateBuffer = await readFileByKey(template.fileUrl.replace("/api/files/", ""));
  const { buffer: templateBuffer, letterheadImage } = await withLetterhead(rawTemplateBuffer, actor.companyId, letterheadId);

  const created = await generateOne(actor, template, templateBuffer, recipient, values, randomUUID(), {
    name: company?.name ?? "",
    logoUrl: company?.logoUrl ?? null,
  }, setting.dateFormat, setting.timezone, undefined, letterheadImage);

  const recipientName = created.employee?.name ?? created.applicant?.name ?? "the recipient";
  await notifyStaffForReview(actor.companyId, "Document generated", `"${template.name}" was generated for ${recipientName}.`, {
    type: "document",
    priority: "low",
    entityType: "document",
    entityId: created._id,
  });

  return created;
}

export type BulkGenerateResultItem =
  | { recipient: DocumentRecipient; recipientName: string; success: true; document: GeneratedDocumentRow }
  | { recipient: DocumentRecipient; recipientName: string; success: false; error: string };

export async function generateDocumentsBulk(
  templateId: string,
  recipients: DocumentRecipient[],
  values: FieldValueMap,
  letterheadId?: string,
): Promise<{ batchId: string; results: BulkGenerateResultItem[] }> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "document.generate");

  const [template, company, setting] = await Promise.all([
    documentTemplateRepository.findById(actor.companyId, templateId),
    companyRepository.findById(actor.companyId),
    settingRepository.get(actor.companyId),
  ]);
  if (!template) throw new Error("Template not found");
  // Fetched once for the whole batch — every recipient renders against the
  // same template file, so there's no reason to re-fetch it from Blob
  // storage per recipient (previously: N identical network fetches for an
  // N-recipient batch).
  const rawTemplateBuffer = await readFileByKey(template.fileUrl.replace("/api/files/", ""));
  const { buffer: templateBuffer, letterheadImage } = await withLetterhead(rawTemplateBuffer, actor.companyId, letterheadId);

  const batchId = randomUUID();
  const companyInfo = { name: company?.name ?? "", logoUrl: company?.logoUrl ?? null };

  // One shared Chromium instance for the whole batch's PDF conversions,
  // instead of every recipient paying its own launch cost — if it fails to
  // launch at all, PDF conversion best-effort-fails for the whole batch
  // (generateOne's own try/catch still lets every .docx generate normally).
  const sharedPdfBrowser = await launchSharedPdfBrowser().catch(() => undefined);

  // allSettled, not all — one bad recipient (missing record, missing
  // required field) must not sink the rest of the batch.
  const settled = await Promise.allSettled(
    recipients.map((recipient) =>
      generateOne(
        actor,
        template,
        templateBuffer,
        recipient,
        values,
        batchId,
        companyInfo,
        setting.dateFormat,
        setting.timezone,
        sharedPdfBrowser,
        letterheadImage,
      ),
    ),
  );

  if (sharedPdfBrowser) await sharedPdfBrowser.close();

  const results: BulkGenerateResultItem[] = settled.map((outcome, index) => {
    const recipient = recipients[index];
    if (outcome.status === "fulfilled") {
      return {
        recipient,
        recipientName: recipient.name ?? outcome.value.employee?.name ?? outcome.value.applicant?.name ?? recipient.id,
        success: true,
        document: outcome.value,
      };
    }
    return {
      recipient,
      recipientName: recipient.name ?? recipient.id,
      success: false,
      error: outcome.reason instanceof Error ? outcome.reason.message : "Failed to generate document",
    };
  });

  // One summary notification for the whole batch, not one per recipient —
  // a large bulk batch would otherwise fan out N x (admin+hr+recruiter)
  // notifications. No single natural record to deep-link a whole batch to
  // (batchId is a UUID, not an ObjectId), so entityType/entityId are omitted.
  const succeededCount = results.filter((r) => r.success).length;
  await notifyStaffForReview(
    actor.companyId,
    "Documents generated",
    `${succeededCount} of ${recipients.length} document(s) generated from "${template.name}".`,
    { type: "document", priority: "low" },
  );

  return { batchId, results };
}
