import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

// HR-authored custom questions the AI includes during a call. Company-wide
// (not per-job) — the example questions in the spec ("notice period",
// "willing to relocate") are generic, not job-specific; a per-job scope can
// be added later additively (an optional jobId, null = applies everywhere)
// if that turns out to be needed.
//
// Hard-deleted, unlike Department/EmployeeType/Status: nothing else in the
// codebase stores a foreign key to a question's _id (it's only ever read
// live, by text, at call-trigger time), so there's no "referenced by
// historical records" concern that soft-delete exists to solve elsewhere.
const aiCallQuestionSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", index: true },
    text: { type: String, required: true, trim: true, maxlength: 500 },
    isActive: { type: Boolean, default: true },
    order: { type: Number, required: true, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

aiCallQuestionSchema.index({ companyId: 1, order: 1 });

export type AiCallQuestionDoc = InferSchemaType<typeof aiCallQuestionSchema>;

export const AiCallQuestion: Model<AiCallQuestionDoc> =
  models.AiCallQuestion ?? model<AiCallQuestionDoc>("AiCallQuestion", aiCallQuestionSchema);
