import Link from "next/link";
import { Mail, Phone, MapPin, Briefcase, Clock, CalendarPlus, Download } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ApplicantStatusSelect } from "@/features/applicants/components/applicant-status-select";
import { SendEmailDialog } from "@/features/applicants/components/send-email-dialog";
import type { ApplicantDetailRow } from "@/server/repositories/applicant.repository";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

export function ApplicantProfileCard({ applicant }: { applicant: ApplicantDetailRow }) {
  return (
    <Card>
      <CardContent className="space-y-5 pt-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <Avatar className="size-24">
            <AvatarFallback className="bg-primary/10 text-xl font-semibold text-primary">
              {initials(applicant.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-lg font-semibold">{applicant.name}</p>
            <p className="text-sm text-muted-foreground">{applicant.jobId?.title ?? "No job linked"}</p>
          </div>
          <div className="w-full">
            <ApplicantStatusSelect applicantId={applicant._id} status={applicant.status} />
          </div>
        </div>

        <div className="space-y-2 border-t pt-4">
          <Button className="w-full justify-start" nativeButton={false} render={<Link href={`/applicants/${applicant._id}/schedule-interview`} />}>
            <CalendarPlus className="size-4" />
            Schedule Interview
          </Button>
          <SendEmailDialog applicantId={applicant._id} applicantEmail={applicant.email} template="general_notification" />
          {applicant.resumeUrl && (
            <Button
              variant="outline"
              className="w-full justify-start"
              nativeButton={false}
              render={<a href={applicant.resumeUrl} download />}
            >
              <Download className="size-4" />
              Download Resume
            </Button>
          )}
        </div>

        <div className="space-y-3 border-t pt-4">
          <h3 className="text-sm font-semibold">Contact Information</h3>
          <InfoRow icon={Mail} label="Email" value={applicant.email} />
          <InfoRow icon={Phone} label="Phone" value={applicant.phone ?? "Not provided"} />
          <InfoRow icon={MapPin} label="Location" value={applicant.location ?? "Not provided"} />
          <InfoRow icon={Briefcase} label="Current Position" value={applicant.currentPosition ?? "Not provided"} />
          {applicant.experienceYears != null && (
            <InfoRow icon={Clock} label="Total Experience" value={`${applicant.experienceYears} years`} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
