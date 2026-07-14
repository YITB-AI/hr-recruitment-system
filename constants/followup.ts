export const FOLLOWUP_TYPES = ["call", "email", "sms", "whatsapp"] as const;
export type FollowupType = (typeof FOLLOWUP_TYPES)[number];

export const FOLLOWUP_TYPE_LABELS: Record<FollowupType, string> = {
  call: "AI Call",
  email: "Email",
  sms: "SMS",
  whatsapp: "WhatsApp",
};

export const FOLLOWUP_STATUSES = ["pending", "sent", "delivered", "read", "failed"] as const;
export type FollowupStatus = (typeof FOLLOWUP_STATUSES)[number];
