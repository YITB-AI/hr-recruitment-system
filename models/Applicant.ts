import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { APPLICANT_SOURCES } from "@/constants/applicant-source";

export { APPLICANT_SOURCES };

const applicantSchema = new Schema(
  {
    // Optional for now — see the companyId comment in models/User.ts.
    companyId: { type: Schema.Types.ObjectId, ref: "Company", index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    phone: { type: String, trim: true },
    jobId: { type: Schema.Types.ObjectId, ref: "Job", required: true, index: true },
    // No schema-level enum — status keys are now managed per company via
    // the Status collection (Settings > Statuses), validated at the
    // service layer (see features/applicants/services/applicant.service.ts)
    // instead of a compile-time list.
    status: { type: String, default: "new", index: true },
    source: { type: String, enum: APPLICANT_SOURCES, default: "website" },
    location: { type: String, trim: true },
    resumeUrl: { type: String },
    linkedinUrl: { type: String },
    githubUrl: { type: String },
    portfolioUrl: { type: String },
    skills: { type: [String], default: [] },
    experienceYears: { type: Number },
    currentPosition: { type: String, trim: true },
    tags: { type: [String], default: [] },
    appliedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

applicantSchema.index({ status: 1, createdAt: -1 });
applicantSchema.index({ name: "text", email: "text", skills: "text" });
// Compound indexes matching applicant.repository.ts's actual tenant-scoped
// count queries (countByStatus, countCreatedBetween,
// countByStatusUpdatedBetween) — these run on every dashboard load and
// every 30s dashboard poll tick; companyId alone can't serve a
// {companyId, status}/{companyId, createdAt}/{companyId, status, updatedAt}
// filter efficiently.
applicantSchema.index({ companyId: 1, status: 1 });
applicantSchema.index({ companyId: 1, createdAt: -1 });
applicantSchema.index({ companyId: 1, status: 1, updatedAt: -1 });

export type ApplicantDoc = InferSchemaType<typeof applicantSchema>;

export const Applicant: Model<ApplicantDoc> =
  models.Applicant ?? model<ApplicantDoc>("Applicant", applicantSchema);
