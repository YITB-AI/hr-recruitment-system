import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { DEFAULT_CONTENT_TOP_MARGIN_IN, DEFAULT_CONTENT_BOTTOM_MARGIN_IN } from "@/lib/docx-letterhead";

// A complete, pre-designed letterhead image (logo + name + address +
// decoration, however the admin designed it) uploaded once and reused on
// generated documents — see lib/docx-letterhead.ts. Deliberately not a
// small logo + separately-composed text: the admin's own image already
// carries whatever branding it needs.
const letterheadSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    name: { type: String, required: true, trim: true },
    imageUrl: { type: String, required: true },
    // How much of the top/bottom of the page real body text must stay
    // clear of, so it doesn't visually collide with this specific image's
    // own baked-in header/footer bands (logo, title, contact bar) — every
    // uploaded letterhead can differ, so this is tunable per-letterhead
    // rather than a single global constant. See lib/docx-letterhead.ts.
    contentTopMarginIn: { type: Number, default: DEFAULT_CONTENT_TOP_MARGIN_IN },
    contentBottomMarginIn: { type: Number, default: DEFAULT_CONTENT_BOTTOM_MARGIN_IN },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export type LetterheadDoc = InferSchemaType<typeof letterheadSchema>;

export const Letterhead: Model<LetterheadDoc> = models.Letterhead ?? model<LetterheadDoc>("Letterhead", letterheadSchema);
