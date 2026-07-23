import { z } from "zod";
import { FOLLOWUP_OUTCOMES } from "@/constants/followup";

// Payload n8n POSTs to app/api/webhooks/ai-call as an AI call progresses.
// followupId is the ApplicantFollowup._id returned to n8n in the original
// outbound ai-call trigger payload (see ai-call.service.ts) — echoing it
// back is the precise, preferred way to identify which row a callback
// refers to. It's optional here because some n8n workflows can't reliably
// generate/carry a MongoDB ObjectId through every branch; when omitted (or
// when it doesn't resolve to a real row), the route falls back to
// resolving the most recent active call for applicantId instead — see
// applicantFollowupRepository.findLatestActiveCallByApplicantId.
const MAX_TEXT_LENGTH = 10_000;

const baseSchema = z.object({
  followupId: z.string().min(1).optional(),
  // Always required — n8n already has this in every outbound trigger
  // payload, and it's the fallback identifier when followupId is absent.
  // Cross-checked against the resolved row's own applicantId in the route
  // handler when followupId IS provided, since a client-supplied id alone
  // is never trusted for tenant/record resolution.
  applicantId: z.string().min(1),
});

export const aiCallWebhookSchema = z.discriminatedUnion("event", [
  baseSchema.extend({ event: z.literal("started") }),
  baseSchema.extend({
    event: z.literal("completed"),
    outcome: z.enum(FOLLOWUP_OUTCOMES),
    transcript: z.string().max(MAX_TEXT_LENGTH).optional(),
    summary: z.string().max(MAX_TEXT_LENGTH).optional(),
    recordingUrl: z.string().url().optional(),
    proposedInterviewAt: z.string().datetime().optional(),
    notes: z.string().max(MAX_TEXT_LENGTH).optional(),
    // Some AI-call platforms report the outcome as freeform text n8n
    // couldn't map to one of the known values — kept for audit visibility,
    // never used to drive a status change (that's what "other" is for).
    outcomeDetail: z.string().max(2000).optional(),
  }),
  baseSchema.extend({
    event: z.literal("failed"),
    error: z.string().max(2000).optional(),
  }),
]);

export type AiCallWebhookInput = z.infer<typeof aiCallWebhookSchema>;
