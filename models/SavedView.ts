import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

// Stores the literal URL query-param map for the applicants list (everything
// except `page`), not a typed filter object — applying a view is just
// `router.push` with these params, so this never needs a migration when a
// new filter is added later. Global/shared: there's no per-user auth yet
// (see lib/current-user.ts), so views aren't owned by anyone — `createdByName`
// is display-only, never used for permissions.
const savedViewSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    filters: { type: Map, of: String, required: true },
    createdByName: { type: String, trim: true },
  },
  { timestamps: true },
);

export type SavedViewDoc = InferSchemaType<typeof savedViewSchema>;

export const SavedView: Model<SavedViewDoc> = models.SavedView ?? model<SavedViewDoc>("SavedView", savedViewSchema);
