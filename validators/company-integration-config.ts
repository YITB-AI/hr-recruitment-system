import { z } from "zod";

// Every webhook URL field is optional and, if present, either a real URL or
// blank (blank means "clear the override" — see the repository's update
// function). z.literal("") kept alongside z.url() since this form always
// submits every field, even ones the admin left untouched.
const optionalUrlField = z.union([z.url({ message: "Enter a valid URL" }), z.literal("")]).optional();

export const updateWebhookConfigSchema = z.object({
  webhookUrls: z.object({
    "send-email": optionalUrlField,
    "send-sms": optionalUrlField,
    "ai-call": optionalUrlField,
    "create-application": optionalUrlField,
    "send-account-email": optionalUrlField,
    "sync-jobs": optionalUrlField,
    "sync-all": optionalUrlField,
  }),
  // Secret — blank means "leave unchanged", enforced at the repository layer.
  webhookAuthHeaderValue: z.string().optional(),
});
export type UpdateWebhookConfigInput = z.infer<typeof updateWebhookConfigSchema>;

export const updateEmailConfigSchema = z.object({
  senderName: z.string().max(100).optional(),
  senderEmail: z.union([z.email({ message: "Enter a valid email" }), z.literal("")]).optional(),
  smtpHost: z.string().max(255).optional(),
  smtpPort: z.coerce.number().int().min(1).max(65535).optional(),
  smtpUser: z.string().max(255).optional(),
  // Secret — blank means "leave unchanged".
  smtpPassword: z.string().optional(),
});
export type UpdateEmailConfigInput = z.infer<typeof updateEmailConfigSchema>;
