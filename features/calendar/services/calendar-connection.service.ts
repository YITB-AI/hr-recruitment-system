import { connectDB } from "@/server/db/connect";
import { calendarConnectionRepository, type CalendarConnectionRow } from "@/server/repositories/calendar-connection.repository";
import { requireSession } from "@/lib/auth/session";
import type { CalendarProvider } from "@/models/CalendarConnection";

export async function listOwnCalendarConnections(): Promise<CalendarConnectionRow[]> {
  const actor = await requireSession();
  await connectDB();
  return calendarConnectionRepository.findByUserId(actor.id);
}

// Self-service, no requireRole gate — disconnecting one's OWN calendar,
// same reasoning as the connect routes.
export async function disconnectOwnCalendar(provider: CalendarProvider): Promise<void> {
  const actor = await requireSession();
  await connectDB();
  await calendarConnectionRepository.delete(actor.id, provider);
}
