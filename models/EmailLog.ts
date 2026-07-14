import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { EMAIL_TEMPLATES, EMAIL_LOG_STATUSES } from "@/constants/email";

export { EMAIL_TEMPLATES, EMAIL_LOG_STATUSES };

const emailLogSchema = new Schema(
  {
    // Optional for now — see the companyId comment in models/User.ts.
    companyId: { type: Schema.Types.ObjectId, ref: "Company", index: true },
    applicantId: { type: Schema.Types.ObjectId, ref: "Applicant", required: true, index: true },
    // Only set when this email was sent from an interview context.
    interviewId: { type: Schema.Types.ObjectId, ref: "Interview" },
    // The address it was actually sent to — kept even if the applicant's
    // email later changes, so the log stays historically accurate.
    to: { type: String, required: true, trim: true, lowercase: true },
    subject: { type: String, required: true },
    template: { type: String, enum: EMAIL_TEMPLATES, required: true },
    status: { type: String, enum: EMAIL_LOG_STATUSES, required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    userName: { type: String },
    // Best-effort text snippet of the n8n webhook's response body — not the
    // full raw payload (avoids storing an unbounded arbitrary blob).
    response: { type: String },
    error: { type: String },
  },
  { timestamps: true },
);

emailLogSchema.index({ applicantId: 1, createdAt: -1 });

export type EmailLogDoc = InferSchemaType<typeof emailLogSchema>;

export const EmailLog: Model<EmailLogDoc> = models.EmailLog ?? model<EmailLogDoc>("EmailLog", emailLogSchema);
