import { z } from "zod";

export const generateDocumentSchema = z.object({
  templateId: z.string().min(1, "Select a template"),
  employeeId: z.string().min(1, "Select an employee"),
  values: z.record(z.string(), z.string()),
});

export type GenerateDocumentInput = z.infer<typeof generateDocumentSchema>;
