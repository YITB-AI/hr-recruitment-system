import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { EXPERIENCE_LEVELS, WORK_MODES, PROMOTION_CHANNELS } from "@/constants/job";

// A single self-reported "we posted this job to X" log line — Promote tab.
// No real job-board/social API integration exists, so this is a manual
// audit trail, not automated distribution tracking.
const promotionLogEntrySchema = new Schema(
  {
    channel: { type: String, enum: PROMOTION_CHANNELS, required: true },
    // Only meaningful when channel === "other" — the fixed enum above
    // covers the known channels, this covers everything else.
    customChannel: { type: String, trim: true },
    postedAt: { type: Date, required: true, default: Date.now },
    url: { type: String, trim: true },
    notes: { type: String, trim: true },
    loggedBy: { type: Schema.Types.ObjectId, ref: "User" },
    loggedByName: { type: String },
  },
  { timestamps: true },
);

// Shape mirrors what the existing n8n pipeline already writes into
// hr_master_db.jobs — job_id (custom string, not _id), flat address fields,
// free-text status/type strings, and createdAt/updatedAt stored as ISO
// strings (not BSON dates). Timestamps are left un-managed by Mongoose so we
// never overwrite n8n's own values.
const jobSchema = new Schema(
  {
    // Deliberately NOT required, even after migration — rows arrive from an
    // external n8n pipeline outside this codebase's control. Each company
    // gets its own n8n workflow going forward, tagging new rows with its
    // companyId; existing untagged rows get one-time manual assignment via
    // an admin screen (never an automatic guess). Any row with no companyId
    // is excluded from every tenant-scoped query — fail-closed, not shown to
    // anyone rather than shown to the wrong company.
    companyId: { type: Schema.Types.ObjectId, ref: "Company", index: true },
    job_id: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String },
    department: { type: String, trim: true, default: "" },
    city: { type: String, trim: true, default: "" },
    state: { type: String, trim: true, default: "" },
    country: { type: String, trim: true, default: "" },
    zip: { type: String, trim: true, default: "" },
    status: { type: String, default: "Open", index: true },
    type: { type: String, trim: true },
    original_open_date: { type: String },
    note: { type: String, default: null },
    createdAt: { type: String },
    updatedAt: { type: String },
    // Soft delete — an archived job stops showing in the default jobs list
    // but keeps every Applicant/Interview reference intact. Kept as its own
    // field rather than overloading `status` (a free-text string n8n also
    // writes to) so "archived" is never confused with n8n's own status values.
    archivedAt: { type: Date },
    // Everything below is 100%-app-authored — n8n never sets these, so they
    // get real enum constraints (unlike status/type above). Always optional/
    // defaulted: an n8n-synced job predates all of them and must render
    // gracefully with none set (handled in job.repository.ts's serializer).
    salaryMin: { type: Number, min: 0 },
    salaryMax: { type: Number, min: 0 },
    salaryCurrency: { type: String, trim: true, default: "USD" },
    experienceLevel: { type: String, enum: EXPERIENCE_LEVELS, trim: true },
    workMode: { type: String, enum: WORK_MODES, trim: true },
    skills: { type: [String], default: [] },
    responsibilities: { type: [String], default: [] },
    featured: { type: Boolean, default: false },
    // Hiring team assigned to this specific job — plain user references, no
    // per-job role tagging (kept intentionally simple; a person's system
    // role, e.g. recruiter/interviewer, already carries most of that meaning).
    teamMemberIds: { type: [{ type: Schema.Types.ObjectId, ref: "User" }], default: [] },
    promotionLog: { type: [promotionLogEntrySchema], default: [] },
  },
  { timestamps: false },
);

// Compound indexes matching job.repository.ts's actual tenant-scoped query
// shapes (findAllForCompanyPaginated's {companyId, archivedAt, status?}) —
// companyId alone can't serve these efficiently. (countCreatedBetween's
// $expr/$convert comparison on the string-typed createdAt/updatedAt fields
// can't use any index regardless — that's an n8n data-shape constraint,
// not something an index can fix.)
jobSchema.index({ companyId: 1, archivedAt: 1 });
jobSchema.index({ companyId: 1, status: 1 });

export type JobDoc = InferSchemaType<typeof jobSchema>;

export const Job: Model<JobDoc> = models.Job ?? model<JobDoc>("Job", jobSchema);
