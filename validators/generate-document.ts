import { z } from "zod";
import { CALCULATION_TYPES } from "@/constants/document-template";

// A flat field's value is a string; a "table" field's is an array of row
// objects; a "conditional" field's is a boolean — see lib/docx.ts. A
// "calculated" field's value is the calculation type/value the admin chose
// on the generation wizard (no longer stored on the template itself — see
// the note in validators/document-template.ts).
const calculatedFieldValueSchema = z.object({
  calculationType: z.enum(CALCULATION_TYPES),
  value: z.number(),
});

const fieldValueSchema = z.union([
  z.string(),
  z.boolean(),
  z.array(z.record(z.string(), z.string())),
  calculatedFieldValueSchema,
]);

export const generateDocumentSchema = z.object({
  templateId: z.string().min(1, "Select a template"),
  employeeId: z.string().min(1, "Select an employee"),
  values: z.record(z.string(), fieldValueSchema),
});

export type GenerateDocumentInput = z.infer<typeof generateDocumentSchema>;

export const bulkGenerateDocumentSchema = z.object({
  templateId: z.string().min(1, "Select a template"),
  recipients: z
    .array(
      z.object({
        type: z.enum(["employee", "applicant"]),
        id: z.string().min(1),
        name: z.string().optional(),
      }),
    )
    .min(1, "Select at least one recipient"),
  values: z.record(z.string(), fieldValueSchema),
});

export type BulkGenerateDocumentInput = z.infer<typeof bulkGenerateDocumentSchema>;
