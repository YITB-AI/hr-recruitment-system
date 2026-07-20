import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { connectDB } from "@/server/db/connect";
import { getInboundWebhookSecret } from "@/config/webhooks";
import {
  autoRepairResolvableOrphanedApplicants,
  autoRepairIncompleteApplicants,
  autoRepairResolvableOrphanedResumeAnalyses,
  autoRepairResolvableOrphanedJobs,
  autoRepairResolvableOrphanedNotifications,
} from "@/features/settings/services/data-repair.service";

// Same trust boundary as /api/webhooks/ai-call — n8n calling INTO this app,
// no session cookie, shared-secret auth only. Meant to be the last step of
// an n8n sync/insert workflow (Sync Jobs, Create Application, etc.): call
// this right after writing records so the type-repair (string companyId/
// jobId/etc. left by n8n's own MongoDB node, instead of a real ObjectId)
// happens immediately, deterministically, once — instead of relying on
// someone happening to load a page within the existing background repair's
// throttle window (see lib/repair-throttle.ts and job.service.ts/
// applicant.service.ts's page-load-triggered triggerAutoRepairInBackground,
// which stay in place as a safety net for edits n8n makes outside of a
// workflow this webhook is wired into).
function isAuthorized(request: Request): boolean {
  const secret = getInboundWebhookSecret();
  if (!secret) return false;

  const provided = request.headers.get("x-callback-secret") ?? "";
  const expected = Buffer.from(secret);
  const actual = Buffer.from(provided);
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(actual, expected);
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  // Applicants first — ResumeAnalyses' own repair only resolves rows whose
  // linked Applicant is already fixed (see its header comment), so running
  // it after gives this single call the best chance of fixing everything in
  // one pass rather than needing to be hit twice.
  const applicants = await autoRepairResolvableOrphanedApplicants();
  const [incompleteApplicants, resumeAnalyses, jobs, notifications] = await Promise.all([
    autoRepairIncompleteApplicants(),
    autoRepairResolvableOrphanedResumeAnalyses(),
    autoRepairResolvableOrphanedJobs(),
    autoRepairResolvableOrphanedNotifications(),
  ]);

  return NextResponse.json({
    success: true,
    results: { applicants, incompleteApplicants, resumeAnalyses, jobs, notifications },
  });
}
