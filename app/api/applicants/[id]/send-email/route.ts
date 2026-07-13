import { NextResponse } from "next/server";
import { sendApplicantEmail } from "@/features/applicants/services/applicant-notification.service";

export async function POST(_req: Request, ctx: RouteContext<"/api/applicants/[id]/send-email">) {
  const { id } = await ctx.params;
  const result = await sendApplicantEmail(id);

  if (!result.success) {
    const status = result.error === "Applicant not found" ? 404 : 502;
    return NextResponse.json({ success: false, error: { message: result.error } }, { status });
  }

  return NextResponse.json({ success: true, data: result.data });
}
