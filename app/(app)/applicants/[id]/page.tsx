import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ChevronRight, Sparkles, CalendarClock, History } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import {
  getApplicantDetail,
  getApplicantResumeAnalysis,
  getApplicantDocuments,
  getApplicantHistory,
  getApplicantCommunicationHistory,
  getApplicantLatestFollowup,
} from "@/features/applicants/services/applicant.service";
import { listNotes } from "@/features/applicants/services/note.service";
import { ApplicantOverview } from "@/features/applicants/components/applicant-overview";
import { ApplicantProfileCard } from "@/features/applicants/components/applicant-profile-card";
import { AiAnalysisPanel } from "@/features/applicants/components/ai-analysis-panel";
import { QuickActionsPanel } from "@/features/applicants/components/quick-actions-panel";
import { ApplicantDocumentsTab } from "@/features/applicants/components/applicant-documents-tab";
import { ApplicantHistoryTab } from "@/features/applicants/components/applicant-history-tab";
import { ApplicantCommunicationHistoryTab } from "@/features/applicants/components/applicant-communication-history-tab";
import { ApplicantNotesTab } from "@/features/applicants/components/applicant-notes-tab";
import { FollowupStatusIndicator } from "@/features/applicants/components/followup-status-indicator";
import { CvViewerTab } from "@/features/applicants/components/cv-viewer-tab";
import { StatusConfigProvider } from "@/components/shared/status-config-provider";
import { InterviewActions } from "@/features/interviews/components/interview-actions";
import { interviewRepository } from "@/server/repositories/interview.repository";
import { emailLogRepository } from "@/server/repositories/email-log.repository";
import { activityLogRepository } from "@/server/repositories/activity-log.repository";
import { listActiveStatuses } from "@/features/settings/services/status-management.service";
import { getCurrentUser } from "@/lib/current-user";

export const metadata: Metadata = { title: "Applicant Details" };
export const dynamic = "force-dynamic";

// "Timeline" is the applicant's full cross-entity feed (status changes,
// comms, notes — one line each); "Communication" is the richer per-channel
// detail view (full email body, full call transcript/summary); "Documents"
// is generated offer/appointment letters. Experience/Education still have
// no backing data model.
const PLACEHOLDER_TABS = [
  { value: "experience", label: "Experience", description: "Structured work history will appear here." },
  { value: "education", label: "Education", description: "Education history will appear here." },
];

export default async function ApplicantDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [applicant, resumeAnalysis, documents, history, communicationHistory, notes, latestFollowup] = await Promise.all([
    getApplicantDetail(id),
    getApplicantResumeAnalysis(id),
    getApplicantDocuments(id),
    getApplicantHistory(id),
    getApplicantCommunicationHistory(id),
    listNotes(id),
    getApplicantLatestFollowup(id),
  ]);

  if (!applicant) notFound();

  const { companyId } = await getCurrentUser();
  const [interviews, applicantStatuses, applicantActivity] = await Promise.all([
    interviewRepository.findByApplicantId(companyId, id),
    listActiveStatuses("applicant"),
    activityLogRepository.findByEntity(companyId, "applicant", id, 50),
  ]);
  const latestInterviewId = interviews[0]?._id ?? null;
  const [latestEmails, interviewActivityLists] = await Promise.all([
    emailLogRepository.findLatestByInterviewIds(companyId, interviews.map((i) => i._id)),
    Promise.all(interviews.map((i) => activityLogRepository.findByEntity(companyId, "interview", i._id, 20))),
  ]);
  const interviewActivityById = new Map(interviews.map((i, idx) => [i._id, interviewActivityLists[idx]]));

  return (
    <StatusConfigProvider statuses={applicantStatuses}>
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/applicants" className="hover:text-foreground">
          Applicants
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="text-foreground">Applicant Details</span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <ApplicantProfileCard applicant={applicant} />

          <FollowupStatusIndicator latest={latestFollowup} />

          <Card>
            <CardContent className="pt-6">
              <h3 className="mb-3 text-sm font-semibold">Quick Actions</h3>
              <QuickActionsPanel
                applicantId={applicant._id}
                name={applicant.name}
                status={applicant.status}
                email={applicant.email}
                phone={applicant.phone ?? ""}
                jobTitle={applicant.jobId?.title ?? null}
                latestInterviewId={latestInterviewId}
              />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue="overview">
              <TabsList className="w-full justify-start overflow-x-auto overflow-y-hidden">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="ai-analysis">AI Analysis</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="interviews">Interviews</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="communication">Communication</TabsTrigger>
                <TabsTrigger value="resume">Resume</TabsTrigger>
                {PLACEHOLDER_TABS.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value}>
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="overview" className="pt-6">
                <ApplicantOverview applicant={applicant} />
              </TabsContent>

              <TabsContent value="ai-analysis" className="pt-6">
                <AiAnalysisPanel analysis={resumeAnalysis} />
              </TabsContent>

              <TabsContent value="documents" className="pt-6">
                <ApplicantDocumentsTab documents={documents} />
              </TabsContent>

              <TabsContent value="interviews" className="pt-6">
                {interviews.length === 0 ? (
                  <EmptyState
                    icon={CalendarClock}
                    title="No interviews scheduled"
                    description="Interviews scheduled for this applicant will show up here."
                  />
                ) : (
                  <ul className="divide-y">
                    {interviews.map((interview) => (
                      <li key={interview._id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                        <div>
                          <p className="text-sm font-medium capitalize">{interview.type.replace("_", " ")} Interview</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(interview.scheduledAt).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                            {" · "}
                            <span className="capitalize">{interview.status}</span>
                          </p>
                        </div>
                        <InterviewActions
                          interview={interview}
                          latestEmail={latestEmails.get(interview._id) ?? null}
                          activity={interviewActivityById.get(interview._id) ?? []}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>

              <TabsContent value="notes" className="pt-6">
                <ApplicantNotesTab applicantId={applicant._id} notes={notes} />
              </TabsContent>

              <TabsContent value="activity" className="pt-6">
                {applicantActivity.length === 0 ? (
                  <EmptyState icon={History} title="No activity yet" description="Changes to this applicant will show up here." />
                ) : (
                  <ul className="divide-y">
                    {applicantActivity.map((entry) => (
                      <li key={entry._id} className="py-3">
                        <p className="text-sm">{entry.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(entry.createdAt).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                          {entry.actorName ? ` · ${entry.actorName}` : ""}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>

              <TabsContent value="timeline" className="pt-6">
                <ApplicantHistoryTab applicantId={applicant._id} entries={history} />
              </TabsContent>

              <TabsContent value="communication" className="pt-6">
                <ApplicantCommunicationHistoryTab entries={communicationHistory} />
              </TabsContent>

              <TabsContent value="resume" className="pt-6">
                <CvViewerTab resumeUrl={applicant.resumeUrl} />
              </TabsContent>

              {PLACEHOLDER_TABS.map((tab) => (
                <TabsContent key={tab.value} value={tab.value} className="pt-6">
                  <EmptyState icon={Sparkles} title={`${tab.label} not available yet`} description={tab.description} />
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
    </StatusConfigProvider>
  );
}
