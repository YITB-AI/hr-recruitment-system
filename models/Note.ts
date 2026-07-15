import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

// Internal HR notes about an applicant — never sent to the applicant, so
// this is deliberately separate from ApplicantFollowup/EmailLog (which are
// both outbound-communication ledgers). authorName is a snapshot (same
// pattern as createdByName elsewhere) so a note still reads correctly if
// the author's account is later renamed or removed.
const noteSchema = new Schema(
  {
    // Optional for now — see the companyId comment in models/User.ts.
    companyId: { type: Schema.Types.ObjectId, ref: "Company", index: true },
    applicantId: { type: Schema.Types.ObjectId, ref: "Applicant", required: true, index: true },
    authorId: { type: Schema.Types.ObjectId, ref: "User" },
    authorName: { type: String, required: true },
    body: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

noteSchema.index({ applicantId: 1, createdAt: -1 });

export type NoteDoc = InferSchemaType<typeof noteSchema>;

export const Note: Model<NoteDoc> = models.Note ?? model<NoteDoc>("Note", noteSchema);
