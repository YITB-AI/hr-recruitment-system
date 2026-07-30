import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

// Uploaded file attachments per employee (ID scans, passport copies, signed
// contracts, etc.) — the "Documents" column in the Employee module
// enhancement request. Distinct from GeneratedDocument (models/Document.ts),
// which is HR-generated letters/offer-letters produced by this app's own
// document-generation feature — a different concept entirely, already
// shown under the employee detail page's existing "Documents" tab. This
// gets its own, separately-labeled "Attachments" tab to avoid confusion.
const employeeDocumentSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true, index: true },
    fileName: { type: String, required: true, trim: true },
    // Private Blob storage key (lib/file-storage.ts) — never a public URL.
    fileKey: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User" },
    uploadedByName: { type: String },
  },
  { timestamps: true },
);

employeeDocumentSchema.index({ companyId: 1, employeeId: 1, createdAt: -1 });

export type EmployeeDocumentDoc = InferSchemaType<typeof employeeDocumentSchema>;

export const EmployeeDocument: Model<EmployeeDocumentDoc> =
  models.EmployeeDocument ?? model<EmployeeDocumentDoc>("EmployeeDocument", employeeDocumentSchema);
