import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ChevronRight, Users, UserPlus, ListChecks, CalendarClock, Pencil, MapPin, Briefcase, DollarSign, Building2, Star, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/shared/stat-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { StatusConfigProvider } from "@/components/shared/status-config-provider";
import { JobRowActions } from "@/features/jobs/components/job-row-actions";
import { JobStatusBadge } from "@/features/jobs/components/job-status-badge";
import { ShareJobButton } from "@/features/jobs/components/share-job-button";
import { HiringPipeline } from "@/features/jobs/components/hiring-pipeline";
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

function formatSalary(min: number | null, max: number | null, currency: string) {
  if (min == null && max == null) return "Not specified";
  if (min != null && max != null) return `${currency} ${min.toLocaleString()} – ${max.toLocaleString()}`;
  return `${currency} ${(min ?? max)!.toLocaleString()}+`;
}

export default async function JobDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getJobDetail(id);
  if (!detail) notFound();

  const { job, applicantCount, newApplicantCount, interviewCount, recentApplicants, pipeline, conversionRate } = detail;
  const { companyId } = await getCurrentUser();
  const [activity, applicantStatuses] = await Promise.all([
    activityLogRepository.findByEntity(companyId, "job", id, 30),
    listActiveStatuses("applicant"),
  ]);

  const statusLabel = new Map(applicantStatuses.map((s) => [s.key, s.name]));
  const pipelineStages = pipeline.map((stage) => ({ label: statusLabel.get(stage.status) ?? stage.status, count: stage.count }));
  const inReviewCount = pipeline.find((s) => s.status === "screening")?.count ?? 0;
  const shortlistedCount = pipeline.find((s) => s.status === "shortlisted")?.count ?? 0;

  const visibleSkills = job.skills.slice(0, 3);
  const extraSkillCount = job.skills.length - visibleSkills.length;

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
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{job.title}</h1>
            <JobStatusBadge status={job.status} />
            {job.featured && (
              <Badge className="border-0 bg-[var(--warning)]/10 font-medium text-[var(--warning)]">
                <Star className="size-3 fill-current" />
                Featured
              </Badge>
            )}
            {job.archivedAt && <Badge variant="outline">Archived</Badge>}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {job.department && (
              <span className="flex items-center gap-1.5">
                <Building2 className="size-3.5" />
                {job.department}
              </span>
            )}
            {[job.city, job.state, job.country].filter(Boolean).length > 0 && (
              <span className="flex items-center gap-1.5">
                <MapPin className="size-3.5" />
                {[job.city, job.state, job.country].filter(Boolean).join(", ")}
              </span>
            )}
            {job.type && (
              <span className="flex items-center gap-1.5">
                <Briefcase className="size-3.5" />
                {job.type}
              </span>
            )}
            {job.workMode && (
              <span className="flex items-center gap-1.5">
                <Users className="size-3.5" />
                {job.workMode}
              </span>
            )}
          </div>
          {job.skills.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {visibleSkills.map((skill) => (
                <Badge key={skill} variant="secondary">
                  {skill}
                </Badge>
              ))}
              {extraSkillCount > 0 && <Badge variant="outline">+{extraSkillCount} more</Badge>}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ShareJobButton jobId={job._id} />
          <Button variant="outline" nativeButton={false} render={<Link href={`/jobs/${job._id}/edit`} />}>
            <Pencil className="size-4" />
            Edit Job
          </Button>
          <JobRowActions jobId={job._id} title={job.title} isArchived={Boolean(job.archivedAt)} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Applications" value={applicantCount} icon={Users} iconClassName="bg-primary/10 text-primary" />
        <StatCard
          label="New Applications"
          value={newApplicantCount}
          icon={UserPlus}
          iconClassName="bg-[var(--status-new)]/10 text-[var(--status-new)]"
        />
        <StatCard
          label="In Review"
          value={inReviewCount}
          icon={ListChecks}
          iconClassName="bg-[var(--status-interview)]/10 text-[var(--status-interview)]"
        />
        <StatCard label="Shortlisted" value={shortlistedCount} icon={CheckCircle2} iconClassName="bg-[var(--success)]/10 text-[var(--success)]" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="pt-6">
              <Tabs defaultValue="overview">
                <TabsList className="w-full justify-start overflow-x-auto overflow-y-hidden">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="applicants">Applicants</TabsTrigger>
                  <TabsTrigger value="job-details">Job Details</TabsTrigger>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                  <TabsTrigger value="analytics">Analytics</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4 pt-6">
                  <div>
                    <h3 className="mb-1 text-sm font-medium">Description</h3>
                    <p className="text-sm text-muted-foreground">{job.description || "No description provided."}</p>
                  </div>
                  <div>
                    <h3 className="mb-2 text-sm font-medium">Responsibilities</h3>
                    {job.responsibilities.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No responsibilities listed.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {job.responsibilities.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--success)]" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    )}
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

                <TabsContent value="job-details" className="pt-6">
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
                    <div>
                      <p className="text-xs text-muted-foreground">Department</p>
                      <p className="text-sm font-medium">{job.department || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Work Mode</p>
                      <p className="text-sm font-medium">{job.workMode ?? "Not specified"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Experience Level</p>
                      <p className="text-sm font-medium">{job.experienceLevel ?? "Not specified"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Salary Range</p>
                      <p className="text-sm font-medium">{formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Featured</p>
                      <p className="text-sm font-medium">{job.featured ? "Yes" : "No"}</p>
                    </div>
                  </div>
                  {job.skills.length > 0 && (
                    <div className="mt-4">
                      <p className="mb-2 text-xs text-muted-foreground">Skills</p>
                      <div className="flex flex-wrap gap-1.5">
                        {job.skills.map((skill) => (
                          <Badge key={skill} variant="secondary">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
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

                <TabsContent value="analytics" className="space-y-6 pt-6">
                  <div>
                    <h3 className="mb-4 text-sm font-medium">Hiring Pipeline</h3>
                    <HiringPipeline stages={pipelineStages} total={applicantCount} />
                  </div>
                  <div className="rounded-xl bg-primary/5 p-4">
                    <p className="text-xs text-muted-foreground">Conversion Rate (reached interview stage)</p>
                    <p className="text-2xl font-semibold tabular-nums">{conversionRate}%</p>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="space-y-4 pt-6">
              <h3 className="text-sm font-semibold">Job Information</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Job Title</span>
                  <span className="max-w-[60%] truncate text-right font-medium">{job.title}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Department</span>
                  <span className="font-medium">{job.department || "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Employment Type</span>
                  <span className="font-medium">{job.type ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Location</span>
                  <span className="max-w-[60%] truncate text-right font-medium">
                    {[job.city, job.state, job.country].filter(Boolean).join(", ") || "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Experience Level</span>
                  <span className="font-medium">{job.experienceLevel ?? "Not specified"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Salary Range</span>
                  <span className="flex items-center gap-1 font-medium">
                    <DollarSign className="size-3.5" />
                    {formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Posted On</span>
                  <span className="font-medium">{formatDate(job.createdAt)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

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

          <Card>
            <CardContent className="space-y-4 pt-6">
              <h3 className="text-sm font-semibold">Hiring Pipeline</h3>
              <HiringPipeline stages={pipelineStages} total={applicantCount} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    </StatusConfigProvider>
  );
}
