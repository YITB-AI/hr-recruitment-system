"use server";

import { revalidatePath } from "next/cache";
import { disconnectOwnCalendar } from "@/features/calendar/services/calendar-connection.service";
import type { CalendarProvider } from "@/models/CalendarConnection";

export type CalendarActionResult = { success: true } | { success: false; error: string };

export async function disconnectCalendarAction(provider: CalendarProvider): Promise<CalendarActionResult> {
  try {
    await disconnectOwnCalendar(provider);
    revalidatePath("/profile");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to disconnect calendar" };
  }
}
