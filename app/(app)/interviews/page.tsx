import Link from "next/link";
import type { Metadata } from "next";
import { CalendarClock } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { listInterviews } from "@/features/interviews/services/interview.service";
import { InterviewActions } from "@/features/interviews/components/interview-actions";
import { emailLogRepository } from "@/server/repositories/email-log.repository";
import { activityLogRepository } from "@/server/repositories/activity-log.repository";
import { getCurrentUser } from "@/lib/current-user";

export const metadata: Metadata = { title: "Interviews" };
export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = {
  technical: "Technical",
  hr: "HR",
  managerial: "Managerial",
  final: "Final",
  ai_screening: "AI Screening",
};

export default async function InterviewsPage() {
  const [interviews, { companyId }] = await Promise.all([listInterviews(), getCurrentUser()]);
  const [latestEmails, activityLists] = await Promise.all([
    emailLogRepository.findLatestByInterviewIds(companyId, interviews.map((i) => i._id)),
    Promise.all(interviews.map((i) => activityLogRepository.findByEntity(companyId, "interview", i._id, 20))),
  ]);
  const activityByInterview = new Map(interviews.map((i, idx) => [i._id, activityLists[idx]]));

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader title="Interviews" description="All scheduled and past interviews." />

      <div className="overflow-hidden rounded-2xl border bg-card">
        {interviews.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="No interviews scheduled"
            description="Interviews you schedule from an applicant's profile will show up here."
          />
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Applicant</th>
                <th className="px-4 py-3 font-medium">Job</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Scheduled</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {interviews.map((interview) => (
                <tr key={interview._id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    {interview.applicantId ? (
                      <Link href={`/applicants/${interview.applicantId._id}`} className="font-medium hover:underline">
                        {interview.applicantId.name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-foreground/80">{interview.jobId?.title ?? "—"}</td>
                  <td className="px-4 py-3 text-foreground/80">{TYPE_LABELS[interview.type] ?? interview.type}</td>
                  <td className="px-4 py-3 text-foreground/80">
                    {new Date(interview.scheduledAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="capitalize">
                      {interview.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <InterviewActions
                      interview={interview}
                      latestEmail={latestEmails.get(interview._id) ?? null}
                      activity={activityByInterview.get(interview._id) ?? []}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
