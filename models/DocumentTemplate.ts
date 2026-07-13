import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { FIELD_TYPES, CALCULATION_TYPES } from "@/constants/document-template";

const calculationSchema = new Schema(
  {
    type: { type: String, enum: CALCULATION_TYPES, required: true },
    value: { type: Number, required: true },
  },
  { _id: false },
);

const tableColumnSchema = new Schema(
  {
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const templateFieldSchema = new Schema(
  {
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    type: { type: String, enum: FIELD_TYPES, required: true },
    required: { type: Boolean, default: false },
    options: { type: [String], default: undefined },
    calculation: { type: calculationSchema, default: undefined },
    // "table" fields only: the row shape repeated inside a docxtemplater
    // {{#section}} loop — each row's keys must match a column's `key`.
    columns: { type: [tableColumnSchema], default: undefined },
  },
  { _id: false },
);

const documentTemplateSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true, index: true },
    description: { type: String },
    fileName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    fields: { type: [templateFieldSchema], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type DocumentTemplateDoc = InferSchemaType<typeof documentTemplateSchema>;

export const DocumentTemplate: Model<DocumentTemplateDoc> =
  models.DocumentTemplate ?? model<DocumentTemplateDoc>("DocumentTemplate", documentTemplateSchema);
