import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { STATUS_MODULES } from "@/constants/status-module";

export { STATUS_MODULES };

// Replaces the old constants-file (Mongoose schema enum) approach for
// Applicant.status / Employee.employmentStatus — every company manages its
// own status list per module through the Settings > Statuses admin screen.
// `key` is the literal value stored on Applicant.status/Employee.
// employmentStatus (never renamed once created, existing data depends on
// it); `name`/`color`/`icon`/`order` are purely presentational and freely
// editable. Soft-deleted rather than hard-deleted so historical records
// still referencing a removed status keep a resolvable label.
const statusSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    module: { type: String, enum: STATUS_MODULES, required: true, index: true },
    key: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    color: { type: String, required: true },
    icon: { type: String },
    order: { type: Number, required: true, default: 0 },
    isActive: { type: Boolean, default: true },
    isDefault: { type: Boolean, default: false },
    deletedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

statusSchema.index({ companyId: 1, module: 1, key: 1 }, { unique: true });
statusSchema.index({ companyId: 1, module: 1, order: 1 });

export type StatusDoc = InferSchemaType<typeof statusSchema>;

export const Status: Model<StatusDoc> = models.Status ?? model<StatusDoc>("Status", statusSchema);
