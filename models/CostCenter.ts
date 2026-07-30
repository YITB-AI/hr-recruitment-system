import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

// See models/Group.ts's header comment. The one exception among the 8
// employee-record lookup lists: pairs an optional short `code` alongside
// `name` (matching Department's own new "code" field) — see
// constants/employee-lookup.ts's EMPLOYEE_LOOKUP_SUPPORTS_CODE.
const costCenterSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    order: { type: Number, required: true, default: 0 },
    deletedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

costCenterSchema.index({ companyId: 1, name: 1 }, { unique: true });
costCenterSchema.index({ companyId: 1, order: 1 });

export type CostCenterDoc = InferSchemaType<typeof costCenterSchema>;

export const CostCenter: Model<CostCenterDoc> = models.CostCenter ?? model<CostCenterDoc>("CostCenter", costCenterSchema);
