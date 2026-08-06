"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

// The branded fallback UI rendered by every route-group error.tsx, so an
// unhandled exception looks like part of the product instead of falling
// back to Next's default error screen. reset() re-renders the segment that
// threw, matching Next's own documented error.tsx contract.
export function ErrorState({ reset }: { reset: () => void }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="size-6" />
      </div>
      <div className="space-y-1">
        <p className="text-base font-semibold">Something went wrong</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          An unexpected error occurred while loading this page. You can try again, or head back to the dashboard.
        </p>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Button variant="outline" onClick={reset}>
          Try again
        </Button>
        <Button onClick={() => window.location.assign("/")}>Go to dashboard</Button>
      </div>
    </div>
  );
}
