import Link from "next/link";
import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { JobForm } from "@/features/jobs/components/job-form";

export const metadata: Metadata = { title: "Create Job" };
export const dynamic = "force-dynamic";

export default function NewJobPage() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/jobs" className="hover:text-foreground">
          Jobs
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="text-foreground">Create Job</span>
      </div>

      <Card className="mx-auto max-w-2xl">
        <CardContent className="pt-6">
          <JobForm />
        </CardContent>
      </Card>
    </div>
  );
}
