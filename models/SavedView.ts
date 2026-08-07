import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

// Stores the literal URL query-param map for the applicants list (everything
// except `page`), not a typed filter object — applying a view is just
// `router.push` with these params, so this never needs a migration when a
// new filter is added later. Global/shared: there's no per-user auth yet
// (see lib/current-user.ts), so views aren't owned by anyone — `createdByName`
// is display-only, never used for permissions.
const savedViewSchema = new Schema(
  {
    // Required since the Employee/SavedView tenant-scoping fix — every row
    // was already backfilled by scripts/migrate-tenancy.ts long ago. The
    // `name` unique index below is compound `{companyId, name}`, not
    // global — two companies can legitimately both name a view "Shortlisted".
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    name: { type: String, required: true, trim: true },
    filters: { type: Map, of: String, required: true },
    createdByName: { type: String, trim: true },
  },
  { timestamps: true },
);

// Applying this to a live database also requires
// scripts/migrate-saved-view-name-index.ts's own separate --confirm run
// (Mongoose's autoIndex never drops an existing live index, only adds new
// ones).
savedViewSchema.index({ companyId: 1, name: 1 }, { unique: true });

export type SavedViewDoc = InferSchemaType<typeof savedViewSchema>;

export const SavedView: Model<SavedViewDoc> = models.SavedView ?? model<SavedViewDoc>("SavedView", savedViewSchema);
