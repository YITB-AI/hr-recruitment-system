import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

// Configurable master data, same shape/conventions as models/Status.ts, but
// flat (no module discriminator, no hierarchy, no color/icon — the spec only
// asks for a named list with active/inactive + ordering). Soft-deleted via
// deletedAt presence so a department still referenced by historical
// employees keeps a resolvable name.
const departmentSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", index: true },
    name: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
    order: { type: Number, required: true, default: 0 },
    deletedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

departmentSchema.index({ companyId: 1, name: 1 }, { unique: true });
departmentSchema.index({ companyId: 1, order: 1 });

export type DepartmentDoc = InferSchemaType<typeof departmentSchema>;

export const Department: Model<DepartmentDoc> =
  models.Department ?? model<DepartmentDoc>("Department", departmentSchema);
