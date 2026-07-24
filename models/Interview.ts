import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { INTERVIEW_TYPES, INTERVIEW_STATUSES } from "@/constants/interview";
import { CALENDAR_PROVIDERS } from "@/models/CalendarConnection";

export { INTERVIEW_TYPES, INTERVIEW_STATUSES };

const interviewSchema = new Schema(
  {
    // Optional for now — see the companyId comment in models/User.ts.
    companyId: { type: Schema.Types.ObjectId, ref: "Company", index: true },
    applicantId: { type: Schema.Types.ObjectId, ref: "Applicant", required: true, index: true },
    jobId: { type: Schema.Types.ObjectId, ref: "Job", required: true },
    interviewerIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    type: { type: String, enum: INTERVIEW_TYPES, default: "technical" },
    status: { type: String, enum: INTERVIEW_STATUSES, default: "scheduled", index: true },
    scheduledAt: { type: Date, required: true, index: true },
    durationMinutes: { type: Number, default: 60 },
    meetingLink: { type: String },
    notes: { type: String },
    feedback: { type: String },
    // Real calendar events created on each connected interviewer's calendar
    // (features/calendar/services/calendar.service.ts) — best-effort, never
    // required for the interview itself to exist. One entry per connected
    // interviewer this event was actually created for.
    calendarEvents: {
      type: [
        {
          userId: { type: Schema.Types.ObjectId, ref: "User" },
          provider: { type: String, enum: CALENDAR_PROVIDERS },
          externalEventId: { type: String },
        },
      ],
      default: [],
    },
    // Set when scheduling this interview found a conflict on a connected
    // interviewer's calendar and the scheduler proceeded anyway (a
    // dismissible warning, not a hard block — see interview.service.ts).
    hadConflictWarning: { type: Boolean, default: false },
    // Soft delete — same convention as models/Status.ts: presence/absence
    // of this field is the flag, no boolean companion. Every read in
    // interview.repository.ts filters deletedAt: { $exists: false }.
    deletedAt: { type: Date },
  },
  { timestamps: true },
);

interviewSchema.index({ status: 1, scheduledAt: 1 });

export type InterviewDoc = InferSchemaType<typeof interviewSchema>;

export const Interview: Model<InterviewDoc> =
  models.Interview ?? model<InterviewDoc>("Interview", interviewSchema);
