import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

// See models/Group.ts's header comment — one of 8 identically-shaped
// employee-record lookup lists sharing a registry-driven repository/service.
const stationSchema = new Schema(
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

stationSchema.index({ companyId: 1, name: 1 }, { unique: true });
stationSchema.index({ companyId: 1, order: 1 });

export type StationDoc = InferSchemaType<typeof stationSchema>;

export const Station: Model<StationDoc> = models.Station ?? model<StationDoc>("Station", stationSchema);
