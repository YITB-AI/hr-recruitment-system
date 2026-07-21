import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ChevronRight, Users, CalendarClock, Pencil } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { StatusConfigProvider } from "@/components/shared/status-config-provider";
import { JobRowActions } from "@/features/jobs/components/job-row-actions";
import { JobStatusBadge } from "@/features/jobs/components/job-status-badge";
import { getJobDetail } from "@/features/jobs/services/job.service";
import { listActiveStatuses } from "@/features/settings/services/status-management.service";
import { activityLogRepository } from "@/server/repositories/activity-log.repository";
import { getCurrentUser } from "@/lib/current-user";

export const metadata: Metadata = { title: "Job Details" };
export const dynamic = "force-dynamic";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function JobDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getJobDetail(id);
  if (!detail) notFound();

  const { job, applicantCount, interviewCount, recentApplicants } = detail;
  const { companyId } = await getCurrentUser();
  const [activity, applicantStatuses] = await Promise.all([
    activityLogRepository.findByEntity(companyId, "job", id, 30),
    listActiveStatuses("applicant"),
  ]);

  return (
    <StatusConfigProvider statuses={applicantStatuses}>
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/jobs" className="hover:text-foreground">
          Jobs
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="text-foreground">Job Details</span>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{job.title}</h1>
            <JobStatusBadge status={job.status} />
            {job.archivedAt && <Badge variant="outline">Archived</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {[job.department, [job.city, job.state, job.country].filter(Boolean).join(", ")].filter(Boolean).join(" · ") || "—"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" nativeButton={false} render={<Link href={`/jobs/${job._id}/edit`} />}>
            <Pencil className="size-4" />
            Edit Job
          </Button>
          <JobRowActions jobId={job._id} title={job.title} isArchived={Boolean(job.archivedAt)} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="pt-6">
              <Tabs defaultValue="overview">
                <TabsList className="w-full justify-start overflow-x-auto overflow-y-hidden">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="applicants">Applicants</TabsTrigger>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4 pt-6">
                  <div>
                    <h3 className="mb-1 text-sm font-medium">Description</h3>
                    <p className="text-sm text-muted-foreground">{job.description || "No description provided."}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Job Type</p>
                      <p className="text-sm font-medium">{job.type ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Job ID</p>
                      <p className="text-sm font-medium">{job.job_id}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Posted On</p>
                      <p className="text-sm font-medium">{formatDate(job.createdAt)}</p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="applicants" className="pt-6">
                  {recentApplicants.length === 0 ? (
                    <EmptyState icon={Users} title="No applicants yet" description="Applicants for this job will show up here." />
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2 font-medium">Applicant</th>
                          <th className="px-3 py-2 font-medium">Status</th>
                          <th className="px-3 py-2 font-medium">Applied</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {recentApplicants.map((applicant) => (
                          <tr key={applicant._id} className="hover:bg-muted/30">
                            <td className="px-3 py-2">
                              <Link href={`/applicants/${applicant._id}`} className="font-medium hover:underline">
                                {applicant.name}
                              </Link>
                            </td>
                            <td className="px-3 py-2">
                              <StatusBadge status={applicant.status} />
                            </td>
                            <td className="px-3 py-2 text-foreground/80">
                              {new Date(applicant.appliedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </TabsContent>

                <TabsContent value="activity" className="pt-6">
                  {activity.length === 0 ? (
                    <EmptyState icon={CalendarClock} title="No activity yet" description="Changes to this job will show up here." />
                  ) : (
                    <ul className="divide-y">
                      {activity.map((entry) => (
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
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="space-y-4 pt-6">
              <h3 className="text-sm font-semibold">Job Stats</h3>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Users className="size-4" />
                  Applicants
                </span>
                <span className="font-medium">{applicantCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <CalendarClock className="size-4" />
                  Interviews
                </span>
                <span className="font-medium">{interviewCount}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    </StatusConfigProvider>
  );
}
