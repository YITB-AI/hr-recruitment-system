import { RepairRunState } from "@/models/RepairRunState";

// Background auto-repair jobs (data-repair.service.ts) scan entire
// collections with a $type/$or filter shape no index can serve — cheap
// against a small dev dataset, but a real cost against production-sized
// collections. They were previously triggered unconditionally on every
// view of the pages that call them (Applicants, Notifications), meaning
// MongoDB Atlas ran these scans continuously, across every tenant, just
// from people browsing lists. This throttles each named job to running at
// most once per `intervalMs`, via a single indexed (`key`, unique)
// findOneAndUpdate — a soft throttle, not a distributed lock: a rare race
// under concurrent requests might let a job run twice in the same window,
// which is still strictly better than the previous "every request" behavior.
export async function shouldRunRepairJob(key: string, intervalMs: number): Promise<boolean> {
  const now = new Date();
  const previous = await RepairRunState.findOneAndUpdate(
    { key },
    { $set: { lastRunAt: now } },
    { upsert: true, new: false },
  ).lean<{ lastRunAt?: Date } | null>();

  if (!previous) return true; // no prior row existed — first time this job has ever run
  return now.getTime() - new Date(previous.lastRunAt ?? 0).getTime() >= intervalMs;
}
