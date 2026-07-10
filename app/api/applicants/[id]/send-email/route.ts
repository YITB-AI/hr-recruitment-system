import { NextResponse } from "next/server";
import { getApplicantDetail } from "@/features/applicants/services/applicant.service";
import { activityLogRepository } from "@/server/repositories/activity-log.repository";
import { getCurrentUser } from "@/lib/current-user";
import { triggerWebhook } from "@/lib/webhook";

export async function POST(_req: Request, ctx: RouteContext<"/api/applicants/[id]/send-email">) {
  const { id } = await ctx.params;

  const applicant = await getApplicantDetail(id);
  if (!applicant) {
    return NextResponse.json({ success: false, error: { message: "Applicant not found" } }, { status: 404 });
  }

  const result = await triggerWebhook("send-email", {
    applicantId: applicant._id,
    name: applicant.name,
    email: applicant.email,
    jobTitle: applicant.jobId?.title ?? null,
    status: applicant.status,
  });

  if (!result.ok) {
    return NextResponse.json({ success: false, error: { message: result.error } }, { status: 502 });
  }

  const actor = await getCurrentUser();
  await activityLogRepository.create({
    actorId: actor.id === "no-users-seeded" ? undefined : actor.id,
    actorName: actor.name,
    action: "applicant.email_sent",
    entityType: "applicant",
    entityId: applicant._id,
    message: `Email sent to ${applicant.name}`,
  });

  return NextResponse.json({ success: true, data: result.data });
}
