import { z } from "zod";
import { NOTIFICATION_TYPES } from "@/constants/notification";

export const updateNotificationPreferencesSchema = z.object(
  Object.fromEntries(NOTIFICATION_TYPES.map((type) => [type, z.boolean()])) as Record<
    (typeof NOTIFICATION_TYPES)[number],
    z.ZodBoolean
  >,
);
export type UpdateNotificationPreferencesInput = z.infer<typeof updateNotificationPreferencesSchema>;
