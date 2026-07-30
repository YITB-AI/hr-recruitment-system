import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

// See models/Group.ts's header comment — one of 8 identically-shaped
// employee-record lookup lists sharing a registry-driven repository/service.
const regionSchema = new Schema(
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

regionSchema.index({ companyId: 1, name: 1 }, { unique: true });
regionSchema.index({ companyId: 1, order: 1 });

export type RegionDoc = InferSchemaType<typeof regionSchema>;

export const Region: Model<RegionDoc> = models.Region ?? model<RegionDoc>("Region", regionSchema);
