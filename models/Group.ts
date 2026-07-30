import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

// Employee-record lookup list — see constants/employee-lookup.ts for why
// this and 7 sibling collections (Region/Station/CostCenter/Vendor/
// RoleTemplate/PayrollSetup/Area) share one identical shape and one
// registry-driven repository/service instead of 8 bespoke stacks. Same
// conventions as models/Department.ts.
const groupSchema = new Schema(
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

groupSchema.index({ companyId: 1, name: 1 }, { unique: true });
groupSchema.index({ companyId: 1, order: 1 });

export type GroupDoc = InferSchemaType<typeof groupSchema>;

export const Group: Model<GroupDoc> = models.Group ?? model<GroupDoc>("Group", groupSchema);
