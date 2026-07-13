import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { INTERVIEW_TYPES, INTERVIEW_STATUSES } from "@/constants/interview";

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
  },
  { timestamps: true },
);

interviewSchema.index({ status: 1, scheduledAt: 1 });

export type InterviewDoc = InferSchemaType<typeof interviewSchema>;

export const Interview: Model<InterviewDoc> =
  models.Interview ?? model<InterviewDoc>("Interview", interviewSchema);
