import { NextResponse } from "next/server";
import { getApplicantDetail } from "@/features/applicants/services/applicant.service";
import { activityLogRepository } from "@/server/repositories/activity-log.repository";
import { getCurrentUser } from "@/lib/current-user";
import { triggerWebhook } from "@/lib/webhook";

export async function POST(_req: Request, ctx: RouteContext<"/api/applicants/[id]/send-sms">) {
  const { id } = await ctx.params;

  const applicant = await getApplicantDetail(id);
  if (!applicant) {
    return NextResponse.json({ success: false, error: { message: "Applicant not found" } }, { status: 404 });
  }
  if (!applicant.phone) {
    return NextResponse.json(
      { success: false, error: { message: "Applicant has no phone number on file" } },
      { status: 422 },
    );
  }

  const result = await triggerWebhook("send-sms", {
    applicantId: applicant._id,
    name: applicant.name,
    phone: applicant.phone,
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
    action: "applicant.sms_sent",
    entityType: "applicant",
    entityId: applicant._id,
    message: `SMS sent to ${applicant.name}`,
  });

  return NextResponse.json({ success: true, data: result.data });
}
