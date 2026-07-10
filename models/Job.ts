import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

// Shape mirrors what the existing n8n pipeline already writes into
// hr_master_db.jobs — job_id (custom string, not _id), flat address fields,
// free-text status/type strings, and createdAt/updatedAt stored as ISO
// strings (not BSON dates). Timestamps are left un-managed by Mongoose so we
// never overwrite n8n's own values.
const jobSchema = new Schema(
  {
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
  },
  { timestamps: false },
);

export type JobDoc = InferSchemaType<typeof jobSchema>;

export const Job: Model<JobDoc> = models.Job ?? model<JobDoc>("Job", jobSchema);
