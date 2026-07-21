import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Briefcase } from "lucide-react";
import { JobRowActions } from "@/features/jobs/components/job-row-actions";
import { JobStatusBadge } from "@/features/jobs/components/job-status-badge";
import type { JobRow } from "@/server/repositories/job.repository";

export function JobsTable({ jobs }: { jobs: JobRow[] }) {
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
          <th className="px-4 py-3 font-medium">Status</th>
          <th className="px-4 py-3 font-medium" />
        </tr>
      </thead>
      <tbody className="divide-y">
        {jobs.map((job) => (
          <tr key={job._id} className={`hover:bg-muted/30 ${job.archivedAt ? "opacity-60" : ""}`}>
            <td className="px-4 py-3 font-medium">
              <Link href={`/jobs/${job._id}`} className="hover:underline">
                {job.title}
              </Link>
            </td>
            <td className="px-4 py-3 text-foreground/80">{job.department || "—"}</td>
            <td className="px-4 py-3 text-foreground/80">
              {[job.city, job.state, job.country].filter(Boolean).join(", ") || "—"}
            </td>
            <td className="px-4 py-3 text-foreground/80">{job.type ?? "—"}</td>
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
        ))}
      </tbody>
    </table>
  );
}
