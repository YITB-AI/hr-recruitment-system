import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

export const GENERATED_DOCUMENT_STATUSES = ["generated", "sent", "signed"] as const;

const documentSchema = new Schema(
  {
    templateId: { type: Schema.Types.ObjectId, ref: "DocumentTemplate", required: true },
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee" },
    applicantId: { type: Schema.Types.ObjectId, ref: "Applicant" },
    fileName: { type: String, required: true },
    fileUrl: { type: String },
    status: { type: String, enum: GENERATED_DOCUMENT_STATUSES, default: "generated", index: true },
    generatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

documentSchema.index({ createdAt: -1 });

export type DocumentRowDoc = InferSchemaType<typeof documentSchema>;

export const GeneratedDocument: Model<DocumentRowDoc> =
  models.GeneratedDocument ?? model<DocumentRowDoc>("GeneratedDocument", documentSchema, "documents");
