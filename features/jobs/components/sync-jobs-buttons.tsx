"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { RefreshCw, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { syncJobsAction, syncAllAction } from "@/actions/jobs";

export function SyncJobsButtons() {
  const [isSyncingJobs, startSyncJobs] = useTransition();
  const [isSyncingAll, startSyncAll] = useTransition();

  function handleSyncJobs() {
    startSyncJobs(async () => {
      const result = await syncJobsAction();
      if (result.success) toast.success("Job sync triggered");
      else toast.error(result.error);
    });
  }

  function handleSyncAll() {
    startSyncAll(async () => {
      const result = await syncAllAction();
      if (result.success) toast.success("Full sync triggered");
      else toast.error(result.error);
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
