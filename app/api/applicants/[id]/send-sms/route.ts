import { NextResponse } from "next/server";
import { sendApplicantSms } from "@/features/applicants/services/applicant-notification.service";

export async function POST(_req: Request, ctx: RouteContext<"/api/applicants/[id]/send-sms">) {
  const { id } = await ctx.params;
  const result = await sendApplicantSms(id);

  if (!result.success) {
    const status = result.error === "Applicant not found" ? 404 : result.error === "Applicant has no phone number on file" ? 422 : 502;
    return NextResponse.json({ success: false, error: { message: result.error } }, { status });
  }

  return NextResponse.json({ success: true, data: result.data });
}
