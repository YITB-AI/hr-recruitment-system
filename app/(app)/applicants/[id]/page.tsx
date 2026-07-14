import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ChevronRight, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import {
  getApplicantDetail,
  getApplicantResumeAnalysis,
  getApplicantDocuments,
  getApplicantHistory,
} from "@/features/applicants/services/applicant.service";
import { ApplicantOverview } from "@/features/applicants/components/applicant-overview";
import { ApplicantProfileCard } from "@/features/applicants/components/applicant-profile-card";
import { AiAnalysisPanel } from "@/features/applicants/components/ai-analysis-panel";
import { QuickActionsPanel } from "@/features/applicants/components/quick-actions-panel";
import { ApplicantDocumentsTab } from "@/features/applicants/components/applicant-documents-tab";
import { ApplicantHistoryTab } from "@/features/applicants/components/applicant-history-tab";
import { interviewRepository } from "@/server/repositories/interview.repository";
import { getCurrentUser } from "@/lib/current-user";

export const metadata: Metadata = { title: "Applicant Details" };
export const dynamic = "force-dynamic";

// "History" means the applicant's full timeline (status changes + emails
// sent), distinct from the "Documents" tab (generated offer/appointment
// letters, etc.).
const PLACEHOLDER_TABS = [
  { value: "resume", label: "Resume", description: "Resume preview will appear here once the Resume Viewer is built." },
  { value: "experience", label: "Experience", description: "Structured work history will appear here." },
  { value: "education", label: "Education", description: "Education history will appear here." },
  { value: "notes", label: "Notes", description: "Internal notes about this applicant will appear here." },
];

export default async function ApplicantDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [applicant, resumeAnalysis, documents, history] = await Promise.all([
    getApplicantDetail(id),
    getApplicantResumeAnalysis(id),
    getApplicantDocuments(id),
    getApplicantHistory(id),
  ]);

  if (!applicant) notFound();

  const { companyId } = await getCurrentUser();
  const interviews = await interviewRepository.findByApplicantId(companyId, id, 1);
  const latestInterviewId = interviews[0]?._id ?? null;

  return (
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
              <TabsList className="w-full justify-start overflow-x-auto">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="ai-analysis">AI Analysis</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
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

              <TabsContent value="history" className="pt-6">
                <ApplicantHistoryTab applicantId={applicant._id} entries={history} />
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
  );
}
