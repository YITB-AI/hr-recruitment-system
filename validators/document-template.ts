import { z } from "zod";
import { FIELD_TYPES, CALCULATION_TYPES } from "@/constants/document-template";

export const templateColumnSchema = z.object({
  key: z
    .string()
    .min(1, "Column key is required")
    .regex(/^[\w.]+$/, "Use letters, numbers, and underscores only"),
  label: z.string().min(1, "Column label is required"),
});

export const templateFieldSchema = z
  .object({
    key: z
      .string()
      .min(1, "Key is required")
      .regex(/^[\w.]+$/, "Use letters, numbers, and underscores only"),
    label: z.string().min(1, "Label is required"),
    type: z.enum(FIELD_TYPES),
    required: z.boolean(),
    options: z.array(z.string().min(1)).optional(),
    calculation: z
      .object({
        type: z.enum(CALCULATION_TYPES),
        value: z.number(),
      })
      .optional(),
    columns: z.array(templateColumnSchema).optional(),
    imageWidth: z.number().positive().optional(),
    imageHeight: z.number().positive().optional(),
  })
  .refine((field) => field.type !== "select" || (field.options && field.options.length > 0), {
    message: "Dropdown fields need at least one option",
    path: ["options"],
  })
  .refine((field) => field.type !== "calculated" || field.calculation != null, {
    message: "Calculated fields need a calculation type and value",
    path: ["calculation"],
  })
  .refine((field) => field.type !== "table" || (field.columns && field.columns.length > 0), {
    message: "Table fields need at least one column",
    path: ["columns"],
  });

export const documentTemplateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.string().min(1, "Category is required"),
  description: z.string().optional(),
  fields: z.array(templateFieldSchema),
});

export type TemplateFieldInput = z.infer<typeof templateFieldSchema>;
export type DocumentTemplateInput = z.infer<typeof documentTemplateSchema>;
