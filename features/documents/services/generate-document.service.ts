import { connectDB } from "@/server/db/connect";
import { documentTemplateRepository } from "@/server/repositories/document-template.repository";
import { employeeRepository } from "@/server/repositories/employee.repository";
import {
  generatedDocumentRepository,
  type GeneratedDocumentRow,
} from "@/server/repositories/generated-document.repository";
import { activityLogRepository } from "@/server/repositories/activity-log.repository";
import { saveFile, readFileByKey } from "@/lib/file-storage";
import { renderTemplate } from "@/lib/docx";
import { resolveCalculatedValue } from "@/lib/salary-calculation";
import { getCurrentUser } from "@/lib/current-user";

const DOCUMENT_FOLDER = "documents";

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

export async function generateDocument(
  templateId: string,
  employeeId: string,
  values: Record<string, string>,
): Promise<GeneratedDocumentRow> {
  await connectDB();

  const template = await documentTemplateRepository.findById(templateId);
  if (!template) throw new Error("Template not found");

  const employee = await employeeRepository.findById(employeeId);
  if (!employee) throw new Error("Employee not found");

  const resolvedValues: Record<string, string> = {};
  const missing: string[] = [];

  for (const field of template.fields) {
    if (field.type === "calculated" && field.calculation) {
      resolvedValues[field.key] = String(resolveCalculatedValue(field.calculation, employee));
    } else {
      const value = values[field.key] ?? "";
      resolvedValues[field.key] = value;
      if (field.required && value.trim() === "") missing.push(field.label);
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing required field(s): ${missing.join(", ")}`);
  }

  const templateBuffer = await readFileByKey(template.fileUrl.replace("/api/files/", ""));
  const outputBuffer = renderTemplate(templateBuffer, resolvedValues);

  const fileName = `${template.name.replace(/\s+/g, "_")}_${employee.name.replace(/\s+/g, "_")}.docx`;
  const { storageKey } = await saveFile(DOCUMENT_FOLDER, fileName, outputBuffer);

  const actor = await getCurrentUser();
  const created = await generatedDocumentRepository.create({
    templateId,
    employeeId,
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
    message: `${actor.name} generated "${template.name}" for ${employee.name}`,
  });

  return created;
}
