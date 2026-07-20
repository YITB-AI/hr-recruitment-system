"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCw, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { syncJobsAction, syncAllAction } from "@/actions/jobs";

// The webhook only confirms n8n accepted the trigger, not that it finished
// pulling/inserting jobs — there's no callback contract for "sync done" the
// way the AI-call flow has one. So this refresh is a best-effort nudge, not
// a guarantee: it re-renders the Jobs page (which is what actually runs the
// throttled auto-repair check for any already-inserted-but-mistyped rows —
// see data-repair.service.ts's autoRepairResolvableOrphanedJobs), and often
// catches a fast sync too. A slow sync may still need a manual reload after.
const REFRESH_DELAY_MS = 5_000;

export function SyncJobsButtons() {
  const router = useRouter();
  const [isSyncingJobs, startSyncJobs] = useTransition();
  const [isSyncingAll, startSyncAll] = useTransition();

  function handleSyncJobs() {
    startSyncJobs(async () => {
      const result = await syncJobsAction();
      if (result.success) {
        toast.success("Job sync triggered — refreshing shortly");
        setTimeout(() => router.refresh(), REFRESH_DELAY_MS);
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleSyncAll() {
    startSyncAll(async () => {
      const result = await syncAllAction();
      if (result.success) {
        toast.success("Full sync triggered — refreshing shortly");
        setTimeout(() => router.refresh(), REFRESH_DELAY_MS);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <>
      <Button variant="outline" onClick={handleSyncJobs} disabled={isSyncingJobs || isSyncingAll}>
        <RefreshCw className={isSyncingJobs ? "size-4 animate-spin" : "size-4"} />
        {isSyncingJobs ? "Syncing..." : "Sync Jobs"}
      </Button>
      <Button variant="outline" onClick={handleSyncAll} disabled={isSyncingJobs || isSyncingAll}>
        <Zap className={isSyncingAll ? "size-4 animate-spin" : "size-4"} />
        {isSyncingAll ? "Syncing..." : "Sync All"}
      </Button>
    </>
  );
}
