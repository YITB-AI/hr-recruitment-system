"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Laptop, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listOwnSessionsAction, revokeOwnSessionAction } from "@/actions/sessions";
import { describeUserAgent } from "@/lib/user-agent-label";
import type { SessionRow } from "@/server/repositories/session.repository";

export function ActiveSessionsCard({ currentSessionId }: { currentSessionId: string | null }) {
  const [sessions, setSessions] = useState<SessionRow[] | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    listOwnSessionsAction().then(setSessions);
  }, []);

  function handleRevoke(sessionId: string) {
    startTransition(async () => {
      const result = await revokeOwnSessionAction(sessionId);
      if (result.success) {
        toast.success("Session revoked");
        setSessions((prev) => prev?.filter((s) => s._id !== sessionId) ?? null);
      } else {
        toast.error(result.error);
      }
    });
  }

  if (!sessions) {
    return <p className="text-sm text-muted-foreground">Loading active sessions...</p>;
  }

  if (sessions.length === 0) {
    return <p className="text-sm text-muted-foreground">No active sessions.</p>;
  }

  return (
    <ul className="space-y-3">
      {sessions.map((session) => {
        const isCurrent = session._id === currentSessionId;
        return (
          <li key={session._id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <div className="flex items-center gap-3">
              <Laptop className="size-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  {describeUserAgent(session.userAgent)}
                  {isCurrent && (
                    <Badge variant="outline" className="ml-2 align-middle">
                      This device
                    </Badge>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {session.ipAddress ?? "Unknown IP"} · Active {formatDistanceToNow(session.lastActiveAt, { addSuffix: true })}
                </p>
              </div>
            </div>
            {!isCurrent && (
              <Button variant="ghost" size="icon-sm" disabled={isPending} onClick={() => handleRevoke(session._id)} title="Revoke this session">
                <LogOut className="size-4" />
              </Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
