import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

// One row per background auto-repair job (see lib/repair-throttle.ts) —
// tracks when it last actually ran, so the expensive, cross-tenant,
// unindexable $type/$or scans in data-repair.service.ts don't fire on
// every single page view of the pages that trigger them (Applicants,
// Notifications). A tiny _id-indexed lookup replacing a full collection
// scan that would otherwise run continuously across every tenant.
const repairRunStateSchema = new Schema({
  key: { type: String, required: true, unique: true },
  lastRunAt: { type: Date, required: true },
});

export type RepairRunStateDoc = InferSchemaType<typeof repairRunStateSchema>;

export const RepairRunState: Model<RepairRunStateDoc> =
  models.RepairRunState ?? model<RepairRunStateDoc>("RepairRunState", repairRunStateSchema);
