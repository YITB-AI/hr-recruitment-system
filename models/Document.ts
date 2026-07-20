import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

export const GENERATED_DOCUMENT_STATUSES = ["generated", "sent", "signed"] as const;
export const PDF_STATUSES = ["none", "pending", "ready", "failed"] as const;

// One entry per status transition, oldest first — the current `status` field
// always mirrors the last entry's status. Kept as a subdocument (not a
// separate collection) since it's always read/written alongside its parent.
const statusHistoryEntrySchema = new Schema(
  {
    status: { type: String, enum: GENERATED_DOCUMENT_STATUSES, required: true },
    changedAt: { type: Date, required: true, default: Date.now },
    changedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { _id: false },
);

const documentSchema = new Schema(
  {
    // Optional for now — see the companyId comment in models/User.ts.
    companyId: { type: Schema.Types.ObjectId, ref: "Company", index: true },
    templateId: { type: Schema.Types.ObjectId, ref: "DocumentTemplate", required: true },
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee" },
    applicantId: { type: Schema.Types.ObjectId, ref: "Applicant" },
    // Groups documents written by one bulk-generate call; set to a fresh id
    // for single-generate too, so the concept is uniform across both paths.
    batchId: { type: String, index: true },
    fileName: { type: String, required: true },
    fileUrl: { type: String },
    // Best-effort PDF copy, converted right after the .docx is generated
    // (see lib/pdf-conversion.ts) — "failed" never blocks the .docx itself
    // from being available; the UI falls back to it when this isn't "ready".
    pdfUrl: { type: String },
    pdfStatus: { type: String, enum: PDF_STATUSES, default: "none" },
    status: { type: String, enum: GENERATED_DOCUMENT_STATUSES, default: "generated", index: true },
    statusHistory: { type: [statusHistoryEntrySchema], default: [] },
    generatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

documentSchema.index({ createdAt: -1 });
documentSchema.index({ applicantId: 1, createdAt: -1 });
// Compound indexes matching generated-document.repository.ts's actual
// query shapes (findByEmployeeId, findByBatchId) — companyId alone (or
// employeeId/batchId alone) can't serve a {companyId, employeeId}/
// {companyId, batchId} filter efficiently.
documentSchema.index({ companyId: 1, employeeId: 1, createdAt: -1 });
documentSchema.index({ companyId: 1, batchId: 1 });

export type DocumentRowDoc = InferSchemaType<typeof documentSchema>;

export const GeneratedDocument: Model<DocumentRowDoc> =
  models.GeneratedDocument ?? model<DocumentRowDoc>("GeneratedDocument", documentSchema, "documents");
