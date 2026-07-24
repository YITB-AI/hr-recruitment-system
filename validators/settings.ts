import { z } from "zod";
import { FONT_OPTIONS } from "@/constants/appearance";

export const generalSettingsSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  timezone: z.string().min(1),
  dateFormat: z.string().min(1),
});
export type GeneralSettingsInput = z.infer<typeof generalSettingsSchema>;

export const notificationSettingsSchema = z.object({
  emailNotifications: z.boolean(),
  smsNotifications: z.boolean(),
  aiResumeAnalysis: z.boolean(),
});
export type NotificationSettingsInput = z.infer<typeof notificationSettingsSchema>;

const fontKeys = FONT_OPTIONS.map((f) => f.key) as [string, ...string[]];

export const appearanceSettingsSchema = z.object({
  primaryColor: z
    .string()
    .regex(/^(#[0-9a-fA-F]{6}|oklch\(.+\))$/, "Enter a hex color (#4f46e5) or an oklch() value"),
  fontKey: z.enum(fontKeys),
});
export type AppearanceSettingsInput = z.infer<typeof appearanceSettingsSchema>;
