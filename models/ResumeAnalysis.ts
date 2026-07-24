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
    // Also already written by n8n on every real analysis, never declared
    // here — a bullet-point rationale distinct from `summary`'s prose.
    statusReason: { type: String },
    // Optional, provisional shape for matching against a job's HR
    // Requirements (see Job.hrRequirements) — analogous to
    // overallScore/jdMatchPercentage above, but scoped to HR's own
    // additional requirements rather than the public job description.
    // Absent on every analysis written before this field existed and on
    // any job with no HR requirements configured — render conditionally,
    // never as a fake 0%/empty section. Swap for whatever n8n's HR-
    // requirements-matching workflow actually emits once that's built.
    hrRequirementsMatchPercentage: { type: Number },
    matchedRequirements: { type: [String], default: [] },
    missingRequirements: { type: [String], default: [] },
  },
  { timestamps: true },
);

// Makes "latest analysis per applicant" (used by the applicants list score
// column/sort/filter) a cheap indexed lookup rather than a full scan.
resumeAnalysisSchema.index({ applicantId: 1, createdAt: -1 });

export type ResumeAnalysisDoc = InferSchemaType<typeof resumeAnalysisSchema>;

export const ResumeAnalysis: Model<ResumeAnalysisDoc> =
  models.ResumeAnalysis ?? model<ResumeAnalysisDoc>("ResumeAnalysis", resumeAnalysisSchema);
