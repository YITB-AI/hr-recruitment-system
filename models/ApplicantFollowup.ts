import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { FOLLOWUP_TYPES, FOLLOWUP_STATUSES, FOLLOWUP_OUTCOMES } from "@/constants/followup";

export { FOLLOWUP_TYPES, FOLLOWUP_STATUSES, FOLLOWUP_OUTCOMES };

// A lighter, cross-channel companion to EmailLog — one row per outbound
// AI Call/Email/SMS/WhatsApp attempt, used for the unified applicant
// communication timeline and the dashboard's communication counters. Email
// also gets a full-detail row in EmailLog (subject/template); this
// collection is intentionally forced to `applicant_followup_status` rather
// than the pluralized default Mongoose would pick.
const applicantFollowupSchema = new Schema(
  {
    // Optional for now — see the companyId comment in models/User.ts.
    companyId: { type: Schema.Types.ObjectId, ref: "Company", index: true },
    applicantId: { type: Schema.Types.ObjectId, ref: "Applicant", required: true, index: true },
    type: { type: String, enum: FOLLOWUP_TYPES, required: true, index: true },
    // The webhook action (or "manual") that produced this row — traceability
    // for which integration actually sent it.
    source: { type: String, required: true },
    status: { type: String, enum: FOLLOWUP_STATUSES, required: true, index: true },
    response: { type: String },
    error: { type: String },
    // The AI Call prompt / message content, when applicable.
    message: { type: String },
    // The requested call date/time, when applicable.
    requestedAt: { type: Date },
    // AI Call only, same convention as message/requestedAt above.
    interviewerNames: [{ type: String }],
    meetingLink: { type: String },
    retryCount: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    createdByName: { type: String },

    // Call-only fields, populated by the n8n callback (app/api/webhooks/ai-call).
    // Undefined for email/sms/whatsapp rows, same convention as message/requestedAt above.
    outcome: { type: String, enum: FOLLOWUP_OUTCOMES },
    transcript: { type: String },
    summary: { type: String },
    recordingUrl: { type: String },
    startedAt: { type: Date },
    completedAt: { type: Date },
    proposedInterviewAt: { type: Date },
  },
  { timestamps: true, collection: "applicant_followup_status" },
);

applicantFollowupSchema.index({ applicantId: 1, createdAt: -1 });

export type ApplicantFollowupDoc = InferSchemaType<typeof applicantFollowupSchema>;

export const ApplicantFollowup: Model<ApplicantFollowupDoc> =
  models.ApplicantFollowup ?? model<ApplicantFollowupDoc>("ApplicantFollowup", applicantFollowupSchema);
