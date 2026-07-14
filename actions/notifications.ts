"use server";

import { revalidatePath } from "next/cache";
import { markNotificationRead, markAllNotificationsRead } from "@/features/notifications/services/notification.service";
import { getCurrentUser } from "@/lib/current-user";

export type ActionResult = { success: true } | { success: false; error: string };

export async function markNotificationReadAction(id: string): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    await markNotificationRead(id, user.id);
    revalidatePath("/notifications");
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update notification" };
  }
}

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    await markAllNotificationsRead(user.id);
    revalidatePath("/notifications");
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update notifications" };
  }
}
