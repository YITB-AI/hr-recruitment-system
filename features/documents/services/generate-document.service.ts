import { randomUUID } from "node:crypto";
import { connectDB } from "@/server/db/connect";
import { documentTemplateRepository, type DocumentTemplateRow } from "@/server/repositories/document-template.repository";
import { employeeRepository } from "@/server/repositories/employee.repository";
import { applicantRepository } from "@/server/repositories/applicant.repository";
import {
  generatedDocumentRepository,
  type GeneratedDocumentRow,
} from "@/server/repositories/generated-document.repository";
import { activityLogRepository } from "@/server/repositories/activity-log.repository";
import { saveFile, readFileByKey } from "@/lib/file-storage";
import { renderTemplate, type TemplateImageValue } from "@/lib/docx";
import { resolveCalculatedValue } from "@/lib/salary-calculation";
import { getCurrentUser } from "@/lib/current-user";

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
};

// Mirrors the client-side autofill convenience in generate-document-wizard.tsx,
// but as a fallback only: an explicitly-provided value in `values` always wins
// (see generateOne below) — this only fills gaps, e.g. for bulk generation
// where one shared values map can't hold a different name per recipient.
function resolveKnownFieldValue(key: string, record: RecipientRecord): string | undefined {
  switch (key.toLowerCase()) {
    case "employee_name":
    case "applicant_name":
    case "name":
      return record.name;
    case "designation":
    case "job_title":
    case "position":
      return record.designation ?? record.currentPosition ?? undefined;
    case "department":
    case "dept":
      return record.department ?? undefined;
    case "email":
    case "employee_email":
    case "applicant_email":
      return record.email;
    case "basic_salary":
      return record.basicSalary != null ? String(record.basicSalary) : undefined;
    case "gross_salary":
      return record.grossSalary != null ? String(record.grossSalary) : undefined;
    default:
      return undefined;
  }
}

export type FieldValueMap = Record<string, string | boolean | Array<Record<string, string>>>;

async function generateOne(
  template: DocumentTemplateRow,
  recipient: DocumentRecipient,
  values: FieldValueMap,
  batchId: string,
): Promise<GeneratedDocumentRow> {
  const recipientRecord =
    recipient.type === "employee"
      ? await employeeRepository.findById(recipient.id)
      : await applicantRepository.findById(recipient.id);
  if (!recipientRecord) {
    throw new Error(recipient.type === "employee" ? "Employee not found" : "Applicant not found");
  }

  const hasCalculatedField = template.fields.some((field) => field.type === "calculated" && field.calculation);
  if (recipient.type === "applicant" && hasCalculatedField) {
    throw new Error(`Template "${template.name}" has salary-calculated field(s) and cannot be used for applicants`);
  }

  const resolvedValues: FieldValueMap = {};
  const missing: string[] = [];
  // Image fields resolve to a URL first; the real bytes are only fetched
  // once we know every field passed its required-value check below.
  const pendingImages: Record<string, { url: string; width: number; height: number }> = {};

  for (const field of template.fields) {
    if (field.type === "calculated" && field.calculation) {
      // recipient.type === "employee" here — guarded above for applicants.
      resolvedValues[field.key] = String(
        resolveCalculatedValue(field.calculation, recipientRecord as { basicSalary: number; grossSalary: number }),
      );
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
    } else {
      const raw = values[field.key];
      const provided = typeof raw === "string" ? raw.trim() : "";
      const value = provided || resolveKnownFieldValue(field.key, recipientRecord) || "";
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

  const templateBuffer = await readFileByKey(template.fileUrl.replace("/api/files/", ""));
  const outputBuffer = renderTemplate(templateBuffer, resolvedValues, images);

  const fileName = `${template.name.replace(/\s+/g, "_")}_${recipientRecord.name.replace(/\s+/g, "_")}.docx`;
  const { storageKey } = await saveFile(DOCUMENT_FOLDER, fileName, outputBuffer);

  const actor = await getCurrentUser();
  const created = await generatedDocumentRepository.create({
    templateId: template._id,
    employeeId: recipient.type === "employee" ? recipient.id : undefined,
    applicantId: recipient.type === "applicant" ? recipient.id : undefined,
    batchId,
    fileName,
    fileUrl: `/api/files/${storageKey}`,
    generatedBy: actor.id === "no-users-seeded" ? undefined : actor.id,
  });

  await activityLogRepository.create({
    actorId: actor.id === "no-users-seeded" ? undefined : actor.id,
    actorName: actor.name,
    action: "document.generated",
    entityType: "document",
    entityId: created._id,
    message: `${actor.name} generated "${template.name}" for ${recipientRecord.name}`,
  });

  return created;
}

export async function listRecentDocuments(): Promise<GeneratedDocumentRow[]> {
  await connectDB();
  return generatedDocumentRepository.findRecent();
}

export async function listTemplatesForPicker() {
  await connectDB();
  return documentTemplateRepository.findAll();
}

export async function listEmployeesForPicker() {
  await connectDB();
  return employeeRepository.findAllForPicker();
}

export async function listApplicantsForPicker() {
  await connectDB();
  return applicantRepository.findAllForPicker();
}

// Uploads an image chosen for an "image" template field at generation time
// (e.g. a signature or one-off attachment) — returns a URL the wizard stores
// as that field's value; generateOne fetches the bytes back by this URL.
export async function uploadTemplateImage(buffer: Buffer, originalName: string): Promise<string> {
  const { storageKey } = await saveFile(DOCUMENT_IMAGE_FOLDER, originalName, buffer);
  return `/api/files/${storageKey}`;
}

export async function generateDocument(
  templateId: string,
  recipient: DocumentRecipient,
  values: FieldValueMap,
): Promise<GeneratedDocumentRow> {
  await connectDB();

  const template = await documentTemplateRepository.findById(templateId);
  if (!template) throw new Error("Template not found");

  return generateOne(template, recipient, values, randomUUID());
}

export type BulkGenerateResultItem =
  | { recipient: DocumentRecipient; recipientName: string; success: true; document: GeneratedDocumentRow }
  | { recipient: DocumentRecipient; recipientName: string; success: false; error: string };

export async function generateDocumentsBulk(
  templateId: string,
  recipients: DocumentRecipient[],
  values: FieldValueMap,
): Promise<{ batchId: string; results: BulkGenerateResultItem[] }> {
  await connectDB();

  const template = await documentTemplateRepository.findById(templateId);
  if (!template) throw new Error("Template not found");

  const batchId = randomUUID();

  // allSettled, not all — one bad recipient (missing record, missing
  // required field) must not sink the rest of the batch.
  const settled = await Promise.allSettled(
    recipients.map((recipient) => generateOne(template, recipient, values, batchId)),
  );

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

  return { batchId, results };
}
