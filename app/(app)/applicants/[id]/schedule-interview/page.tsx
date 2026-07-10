import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getApplicantDetail } from "@/features/applicants/services/applicant.service";
import { listInterviewers } from "@/features/interviews/services/interview.service";
import { ScheduleInterviewForm } from "@/features/interviews/components/schedule-interview-form";

export const metadata: Metadata = { title: "Schedule Interview" };
export const dynamic = "force-dynamic";

export default async function ScheduleInterviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [applicant, interviewers] = await Promise.all([getApplicantDetail(id), listInterviewers()]);

  if (!applicant) notFound();

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
        <span className="text-foreground">Schedule Interview</span>
      </div>

      <Card className="mx-auto max-w-xl">
        <CardHeader>
          <CardTitle>Schedule Interview</CardTitle>
          <p className="text-sm text-muted-foreground">
            {applicant.name} — {applicant.jobId?.title ?? "No job linked"}
          </p>
        </CardHeader>
        <CardContent>
          <ScheduleInterviewForm applicantId={id} interviewers={interviewers} />
        </CardContent>
      </Card>
    </div>
  );
}
