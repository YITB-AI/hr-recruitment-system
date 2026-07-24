import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

export const CALENDAR_PROVIDERS = ["google", "outlook"] as const;
export type CalendarProvider = (typeof CALENDAR_PROVIDERS)[number];

// Per-USER, not per-company — each HR/interviewer connects their own
// personal calendar. Conflict-checking against a shared company calendar
// wouldn't reflect any individual interviewer's real availability, and
// interviews already key off per-interview interviewerIds. accessToken/
// refreshToken are encrypted at rest via lib/crypto.ts.
const calendarConnectionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    companyId: { type: Schema.Types.ObjectId, ref: "Company", index: true },
    provider: { type: String, enum: CALENDAR_PROVIDERS, required: true },
    accessTokenEncrypted: { type: String, required: true },
    refreshTokenEncrypted: { type: String, required: true },
    tokenExpiresAt: { type: Date, required: true },
    scope: { type: String },
    providerAccountEmail: { type: String },
    // Set when a token refresh/API call fails (e.g. the user revoked
    // access) so the Profile page can prompt a reconnect; cleared on the
    // next successful call.
    lastError: { type: String },
  },
  { timestamps: true },
);

calendarConnectionSchema.index({ userId: 1, provider: 1 }, { unique: true });

export type CalendarConnectionDoc = InferSchemaType<typeof calendarConnectionSchema>;

export const CalendarConnection: Model<CalendarConnectionDoc> =
  models.CalendarConnection ?? model<CalendarConnectionDoc>("CalendarConnection", calendarConnectionSchema);
