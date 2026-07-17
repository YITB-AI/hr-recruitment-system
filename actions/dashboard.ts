"use server";

import { getDashboardCounters } from "@/features/dashboard/services/dashboard.service";
import type { DashboardStats, ApplicantStatusSlice, CommunicationStats } from "@/types/dashboard";

export type DashboardCountersResult = {
  stats: DashboardStats;
  applicantsByStatus: ApplicantStatusSlice[];
  communication: CommunicationStats;
};

// Polled by dashboard-live-refresh.tsx every ~30s — deliberately returns
// only the cheap, frequently-changing counters subset (see
// dashboard.service.ts's computeCounters), not the full DashboardData, so a
// tick never re-runs the more expensive recentActivity/upcomingInterviews/
// nextActions/upcomingEmployeeActions queries.
export async function getDashboardCountersAction(): Promise<DashboardCountersResult> {
  return getDashboardCounters();
}
