import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

// See models/Group.ts's header comment — one of 8 identically-shaped
// employee-record lookup lists sharing a registry-driven repository/service.
const roleTemplateSchema = new Schema(
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

roleTemplateSchema.index({ companyId: 1, name: 1 }, { unique: true });
roleTemplateSchema.index({ companyId: 1, order: 1 });

export type RoleTemplateDoc = InferSchemaType<typeof roleTemplateSchema>;

export const RoleTemplate: Model<RoleTemplateDoc> =
  models.RoleTemplate ?? model<RoleTemplateDoc>("RoleTemplate", roleTemplateSchema);
