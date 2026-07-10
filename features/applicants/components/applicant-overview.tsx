import { Link as LinkIcon, FolderGit2, Globe, Briefcase, Calendar } from "lucide-react";
import type { ApplicantDetailRow } from "@/server/repositories/applicant.repository";

function Field({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
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

export function ApplicantOverview({ applicant }: { applicant: ApplicantDetailRow }) {
  const hasLinks = applicant.linkedinUrl || applicant.githubUrl || applicant.portfolioUrl;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-sm font-semibold">Application Details</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field icon={Briefcase} label="Job Applied For" value={applicant.jobId?.title ?? "No job linked"} />
          <Field
            icon={Calendar}
            label="Applied On"
            value={new Date(applicant.appliedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          />
        </div>
      </div>

      {applicant.skills.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold">Skills</h3>
          <div className="flex flex-wrap gap-2">
            {applicant.skills.map((skill) => (
              <span
                key={skill}
                className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground/80"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {hasLinks && (
        <div>
          <h3 className="mb-3 text-sm font-semibold">Links</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {applicant.linkedinUrl && <Field icon={LinkIcon} label="LinkedIn" value={applicant.linkedinUrl} />}
            {applicant.githubUrl && <Field icon={FolderGit2} label="GitHub" value={applicant.githubUrl} />}
            {applicant.portfolioUrl && <Field icon={Globe} label="Portfolio" value={applicant.portfolioUrl} />}
          </div>
        </div>
      )}
    </div>
  );
}
