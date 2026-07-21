import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Briefcase, Star } from "lucide-react";
import { JobRowActions } from "@/features/jobs/components/job-row-actions";
import { JobStatusBadge } from "@/features/jobs/components/job-status-badge";
import type { JobRow } from "@/server/repositories/job.repository";

type JobsTableProps = {
  jobs: JobRow[];
  // Per-job {total, new} applicant counts — a plain Map, not serialized
  // props: both this component and its caller (app/(app)/jobs/page.tsx) are
  // Server Components rendered in the same request, so no client-boundary
  // serialization applies.
  applicantCounts: Map<string, { total: number; new: number }>;
};

export function JobsTable({ jobs, applicantCounts }: JobsTableProps) {
  if (jobs.length === 0) {
    return (
      <EmptyState icon={Briefcase} title="No jobs yet" description="Create your first job posting to get started." />
    );
  }

  return (
    <table className="w-full text-sm">
      <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
        <tr>
          <th className="px-4 py-3 font-medium">Title</th>
          <th className="px-4 py-3 font-medium">Department</th>
          <th className="px-4 py-3 font-medium">Location</th>
          <th className="px-4 py-3 font-medium">Type</th>
          <th className="px-4 py-3 font-medium">Applicants</th>
          <th className="px-4 py-3 font-medium">Status</th>
          <th className="px-4 py-3 font-medium" />
        </tr>
      </thead>
      <tbody className="divide-y">
        {jobs.map((job) => {
          const applicants = applicantCounts.get(job._id);
          return (
            <tr key={job._id} className={`hover:bg-muted/30 ${job.archivedAt ? "opacity-60" : ""}`}>
              <td className="px-4 py-3 font-medium">
                <div className="flex items-center gap-1.5">
                  {job.featured && <Star className="size-3.5 fill-[var(--warning)] text-[var(--warning)]" />}
                  <Link href={`/jobs/${job._id}`} className="hover:underline">
                    {job.title}
                  </Link>
                </div>
              </td>
              <td className="px-4 py-3 text-foreground/80">{job.department || "—"}</td>
              <td className="px-4 py-3 text-foreground/80">
                {[job.city, job.state, job.country].filter(Boolean).join(", ") || "—"}
              </td>
              <td className="px-4 py-3 text-foreground/80">{job.type ?? "—"}</td>
              <td className="px-4 py-3 text-foreground/80">
                {applicants?.total ?? 0} applicant{applicants?.total === 1 ? "" : "s"}
                {applicants && applicants.new > 0 && <span className="ml-1 text-primary">· {applicants.new} new</span>}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <JobStatusBadge status={job.status} />
                  {job.archivedAt && <Badge variant="outline">Archived</Badge>}
                </div>
              </td>
              <td className="px-4 py-3 text-right">
                <JobRowActions jobId={job._id} title={job.title} isArchived={Boolean(job.archivedAt)} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
