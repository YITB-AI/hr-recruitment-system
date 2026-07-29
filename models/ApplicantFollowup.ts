import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { FOLLOWUP_TYPES, FOLLOWUP_STATUSES, FOLLOWUP_OUTCOMES } from "@/constants/followup";
import { AI_CALL_TYPES, AI_CALL_INTERVIEW_MODES } from "@/constants/ai-call";

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
    // Links an AI-call attempt (type:"call") to the real Interview record
    // backing it — see requestAiCall in features/applicants/services/ai-call.service.ts,
    // which reuses an existing non-cancelled Interview for the applicant if
    // one exists, or auto-creates an "ai_screening"-typed one. Undefined for
    // email/sms/whatsapp rows, same convention as message/requestedAt below.
    interviewId: { type: Schema.Types.ObjectId, ref: "Interview" },
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
    // The call's purpose (screening/HR/technical/etc.), selected by HR
    // before triggering — call-only, same convention as message/meetingLink.
    callType: { type: String, enum: AI_CALL_TYPES },
    // The requester's target budget for this role, set BEFORE the call —
    // distinct from salaryExpectation below, which is the candidate's own
    // stated number, reported back BY the call.
    salaryBudget: { type: Number },
    // Online vs. onsite — call-only, same convention as callType above.
    // "onsite" is what triggers the onsiteAddress/onsiteContact* snapshot
    // below, sourced from Company Profile settings at request time (never
    // typed into the Request AI Call form itself).
    interviewMode: { type: String, enum: AI_CALL_INTERVIEW_MODES },
    // A snapshot of Company Profile's address/contact at the moment this
    // call was requested — kept alongside the live Setting so a historical
    // record survives even if the company's settings change later. Only
    // ever populated when interviewMode is "onsite".
    onsiteAddress: { type: String },
    onsiteContactPhone: { type: String },
    onsiteContactEmail: { type: String },
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
    // The candidate's stated salary expectation and whether it falls within
    // the job's posted salaryMin/salaryMax — n8n's AI just asks and reports
    // the raw number back; the range comparison is backend business logic
    // (computed in call-outcome.service.ts). salaryWithinRange is left
    // undefined (not false) when the job has no configured range at all, or
    // no expectation was reported — "can't determine" is not "out of range".
    salaryExpectation: { type: Number },
    salaryWithinRange: { type: Boolean },
  },
  { timestamps: true, collection: "applicant_followup_status" },
);

applicantFollowupSchema.index({ applicantId: 1, createdAt: -1 });

export type ApplicantFollowupDoc = InferSchemaType<typeof applicantFollowupSchema>;

export const ApplicantFollowup: Model<ApplicantFollowupDoc> =
  models.ApplicantFollowup ?? model<ApplicantFollowupDoc>("ApplicantFollowup", applicantFollowupSchema);
