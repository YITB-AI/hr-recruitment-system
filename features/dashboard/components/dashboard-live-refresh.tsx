"use client";

import { useEffect, useRef, useState } from "react";
import { StatsGrid } from "@/features/dashboard/components/stats-grid";
import { CommunicationStatsRow } from "@/features/dashboard/components/communication-stats-row";
import { getDashboardCountersAction } from "@/actions/dashboard";
import type { DashboardStats, CommunicationStats } from "@/types/dashboard";

const POLL_INTERVAL_MS = 30_000;

type DashboardLiveRefreshProps = {
  initialStats: DashboardStats;
  initialCommunication: CommunicationStats;
};

// Lightweight polling, no SWR/React Query/WebSockets — matches this
// project's convention of avoiding new client-state dependencies. Pauses
// while the tab is hidden so a backgrounded dashboard tab doesn't keep
// firing requests, resumes (and refreshes immediately) when it regains
// focus.
export function DashboardLiveRefresh({ initialStats, initialCommunication }: DashboardLiveRefreshProps) {
  const [stats, setStats] = useState(initialStats);
  const [communication, setCommunication] = useState(initialCommunication);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    async function refresh() {
      if (isFetchingRef.current || document.visibilityState !== "visible") return;
      isFetchingRef.current = true;
      try {
        const counters = await getDashboardCountersAction();
        setStats(counters.stats);
        setCommunication(counters.communication);
      } catch {
        // Transient failure — the next poll (or the current values) is fine, no toast needed for a background refresh.
      } finally {
        isFetchingRef.current = false;
      }
    }

    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") refresh();
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return (
    <>
      <StatsGrid stats={stats} />
      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Communication</h2>
        <CommunicationStatsRow stats={communication} />
      </div>
    </>
  );
}
