import Link from "next/link";
import type { Metadata } from "next";
import { Users } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { listApplicants } from "@/features/applicants/services/applicant.service";

export const metadata: Metadata = { title: "Applicants" };
export const dynamic = "force-dynamic";

export default async function ApplicantsPage() {
  const applicants = await listApplicants();

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader title="Applicants" description="Manage and review all applicants." />

      <div className="overflow-hidden rounded-2xl border bg-card">
        {applicants.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No applicants yet"
            description="Applicants who apply to your open roles will show up here."
          />
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Applicant</th>
                <th className="px-4 py-3 font-medium">Job</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Applied On</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {applicants.map((applicant) => (
                <tr key={applicant._id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <Link href={`/applicants/${applicant._id}`} className="font-medium hover:underline">
                      {applicant.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{applicant.email}</p>
                  </td>
                  <td className="px-4 py-3 text-foreground/80">{applicant.jobId?.title ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={applicant.status} />
                  </td>
                  <td className="px-4 py-3 capitalize text-foreground/80">{applicant.source.replace("_", " ")}</td>
                  <td className="px-4 py-3 text-foreground/80">
                    {new Date(applicant.appliedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
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
