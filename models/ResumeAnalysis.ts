import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

// Provisional shape based on the fields visible in the AI Analysis mockup
// (overall score, JD match, strengths/missing skills, summary). n8n will be
// the real writer of this collection once its CV-analysis workflow is
// finalized — swap these field names for whatever it actually emits.
const resumeAnalysisSchema = new Schema(
  {
    // Optional for now — see the companyId comment in models/User.ts.
    companyId: { type: Schema.Types.ObjectId, ref: "Company", index: true },
    applicantId: { type: Schema.Types.ObjectId, ref: "Applicant", required: true, index: true },
    jobId: { type: Schema.Types.ObjectId, ref: "Job", required: true },
    overallScore: { type: Number, required: true },
    jdMatchPercentage: { type: Number, required: true },
    strengths: { type: [String], default: [] },
    missingSkills: { type: [String], default: [] },
    weaknesses: { type: [String], default: [] },
    summary: { type: String },
    recommendation: { type: String },
  },
  { timestamps: true },
);

// Makes "latest analysis per applicant" (used by the applicants list score
// column/sort/filter) a cheap indexed lookup rather than a full scan.
resumeAnalysisSchema.index({ applicantId: 1, createdAt: -1 });

export type ResumeAnalysisDoc = InferSchemaType<typeof resumeAnalysisSchema>;

export const ResumeAnalysis: Model<ResumeAnalysisDoc> =
  models.ResumeAnalysis ?? model<ResumeAnalysisDoc>("ResumeAnalysis", resumeAnalysisSchema);
