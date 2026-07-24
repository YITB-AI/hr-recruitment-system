import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

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
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export type LetterheadDoc = InferSchemaType<typeof letterheadSchema>;

export const Letterhead: Model<LetterheadDoc> = models.Letterhead ?? model<LetterheadDoc>("Letterhead", letterheadSchema);
