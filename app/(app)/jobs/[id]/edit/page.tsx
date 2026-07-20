import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { JobForm } from "@/features/jobs/components/job-form";
import { getJob } from "@/features/jobs/services/job.service";
import { listActiveDepartments } from "@/features/settings/services/department.service";

export const metadata: Metadata = { title: "Edit Job" };
export const dynamic = "force-dynamic";

export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [job, departments] = await Promise.all([getJob(id), listActiveDepartments()]);
  if (!job) notFound();

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader title="Edit Job" description={`Update the details for "${job.title}".`} />
      <Card className="max-w-2xl">
        <CardContent className="pt-6">
          <JobForm job={job} departments={departments} />
        </CardContent>
      </Card>
    </div>
  );
}
