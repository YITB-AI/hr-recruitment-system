import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { APPLICANT_SOURCES } from "@/constants/applicant-source";

export { APPLICANT_SOURCES };

// n8n's resume-parsing pipeline writes these three sub-documents directly
// into MongoDB (its own driver, not through this schema) — field names
// (job_title/degree_name/certification_name, snake_case) match exactly what
// it actually emits, confirmed against real production data, not guessed.
const experienceHistoryEntrySchema = new Schema(
  {
    job_title: { type: String, trim: true },
    company: { type: String, trim: true },
    duration: { type: String, trim: true },
    responsibilities: { type: [String], default: [] },
  },
  { _id: false },
);

const educationHistoryEntrySchema = new Schema(
  {
    degree_name: { type: String, trim: true },
    institution: { type: String, trim: true },
    year: { type: String, trim: true },
  },
  { _id: false },
);

const certificationHistoryEntrySchema = new Schema(
  {
    certification_name: { type: String, trim: true },
    issuer: { type: String, trim: true },
    year: { type: String, trim: true },
  },
  { _id: false },
);

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
    // Discovered directly against real production data — n8n's own
    // MongoDB writes already included these on every applicant, but
    // nothing in this schema declared them, so they were never exposed by
    // the repository layer or shown anywhere in the app.
    languages: { type: [String], default: [] },
    achievements: { type: [String], default: [] },
    socialMediaUrls: { type: [String], default: [] },
    experienceHistory: { type: [experienceHistoryEntrySchema], default: [] },
    educationHistory: { type: [educationHistoryEntrySchema], default: [] },
    certificationsHistory: { type: [certificationHistoryEntrySchema], default: [] },
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
