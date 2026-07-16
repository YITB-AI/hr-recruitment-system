import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getApplicantDetail } from "@/features/applicants/services/applicant.service";
import { listInterviewers } from "@/features/interviews/services/interview.service";
import { interviewRepository } from "@/server/repositories/interview.repository";
import { getCurrentUser } from "@/lib/current-user";
import { ScheduleInterviewForm, type RescheduleSeed } from "@/features/interviews/components/schedule-interview-form";
import type { InterviewType } from "@/constants/interview";

export const metadata: Metadata = { title: "Schedule Interview" };
export const dynamic = "force-dynamic";

export default async function ScheduleInterviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ rescheduleFrom?: string }>;
}) {
  const { id } = await params;
  const { rescheduleFrom } = await searchParams;
  const [applicant, interviewers] = await Promise.all([getApplicantDetail(id), listInterviewers()]);

  if (!applicant) notFound();

  let reschedule: RescheduleSeed | undefined;
  if (rescheduleFrom) {
    const { companyId } = await getCurrentUser();
    const oldInterview = await interviewRepository.findById(companyId, rescheduleFrom);
    if (oldInterview && oldInterview.applicantId?._id === id) {
      reschedule = {
        oldInterviewId: oldInterview._id,
        type: oldInterview.type as InterviewType,
        interviewerIds: oldInterview.interviewerIds,
        durationMinutes: oldInterview.durationMinutes,
        meetingLink: oldInterview.meetingLink ?? "",
        notes: oldInterview.notes ?? "",
      };
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/applicants" className="hover:text-foreground">
          Applicants
        </Link>
        <ChevronRight className="size-3.5" />
        <Link href={`/applicants/${id}`} className="hover:text-foreground">
          {applicant.name}
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="text-foreground">{reschedule ? "Reschedule Interview" : "Schedule Interview"}</span>
      </div>

      <Card className="mx-auto max-w-xl">
        <CardHeader>
          <CardTitle>{reschedule ? "Reschedule Interview" : "Schedule Interview"}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {applicant.name} — {applicant.jobId?.title ?? "No job linked"}
          </p>
        </CardHeader>
        <CardContent>
          <ScheduleInterviewForm applicantId={id} interviewers={interviewers} reschedule={reschedule} />
        </CardContent>
      </Card>
    </div>
  );
}
