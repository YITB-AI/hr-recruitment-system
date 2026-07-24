"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { CalendarDays, ExternalLink, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { disconnectCalendarAction } from "@/actions/calendar";
import type { CalendarConnectionRow } from "@/server/repositories/calendar-connection.repository";
import type { CalendarProvider } from "@/models/CalendarConnection";

const PROVIDER_LABELS: Record<CalendarProvider, string> = { google: "Google Calendar", outlook: "Outlook Calendar" };
const PROVIDERS: CalendarProvider[] = ["google", "outlook"];

export function CalendarConnectionsCard({ connections }: { connections: CalendarConnectionRow[] }) {
  const [isPending, startTransition] = useTransition();
  const byProvider = new Map(connections.map((c) => [c.provider, c]));

  function handleDisconnect(provider: CalendarProvider) {
    startTransition(async () => {
      const result = await disconnectCalendarAction(provider);
      if (result.success) toast.success(`${PROVIDER_LABELS[provider]} disconnected`);
      else toast.error(result.error);
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium">Calendar Connections</h3>
        <p className="text-xs text-muted-foreground">
          Connect your calendar so interview scheduling can check for conflicts and add real events to it.
        </p>
      </div>
      <div className="divide-y rounded-xl border">
        {PROVIDERS.map((provider) => {
          const connection = byProvider.get(provider);
          return (
            <div key={provider} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <CalendarDays className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">{PROVIDER_LABELS[provider]}</p>
                  {connection ? (
                    <p className="text-xs text-muted-foreground">{connection.providerAccountEmail ?? "Connected"}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Not connected</p>
                  )}
                  {connection?.lastError && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-destructive">
                      <AlertTriangle className="size-3" />
                      {connection.lastError} — reconnect below.
                    </p>
                  )}
                </div>
              </div>
              {connection ? (
                <Button variant="outline" size="sm" disabled={isPending} onClick={() => handleDisconnect(provider)}>
                  Disconnect
                </Button>
              ) : (
                <Button size="sm" nativeButton={false} render={<a href={`/api/calendar/${provider}/connect`} />}>
                  <ExternalLink className="size-4" />
                  Connect
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
