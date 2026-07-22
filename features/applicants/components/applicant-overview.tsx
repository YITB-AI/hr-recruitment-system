import {
  Link as LinkIcon,
  FolderGit2,
  Globe,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  ExternalLink,
  Languages as LanguagesIcon,
  Trophy,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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

function resumeFileName(url: string): string {
  try {
    const pathname = new URL(url, "http://localhost").pathname;
    return pathname.split("/").pop() || "Resume";
  } catch {
    return "Resume";
  }
}

export function ApplicantOverview({ applicant, sourceLabel }: { applicant: ApplicantDetailRow; sourceLabel: string }) {
  const hasLinks = applicant.linkedinUrl || applicant.githubUrl || applicant.portfolioUrl || applicant.socialMediaUrls.length > 0;
  const companyCount = applicant.experienceHistory.length;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-sm font-semibold">Application Details</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
          <Field icon={Globe} label="Source" value={sourceLabel} />
        </div>
      </div>

      {applicant.skills.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold">Skills</h3>
          <div className="flex flex-wrap gap-2">
            {applicant.skills.map((skill) => (
              <span
                key={skill}
                className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground/80"
              >
                <CheckCircle2 className="size-3 text-primary" />
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {applicant.tags.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold">Tags</h3>
          <div className="flex flex-wrap gap-2">
            {applicant.tags.map((tag) => (
              <span key={tag} className="rounded-full border px-2.5 py-1 text-xs font-medium text-foreground/80">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="space-y-3 pt-5">
            <h4 className="flex items-center gap-2 text-sm font-semibold">
              <Clock className="size-4 text-primary" />
              Experience Summary
            </h4>
            {applicant.experienceYears != null && (
              <div>
                <p className="text-lg font-semibold">{applicant.experienceYears} years</p>
                <p className="text-xs text-muted-foreground">Total Experience</p>
              </div>
            )}
            {companyCount > 0 && (
              <div>
                <p className="text-lg font-semibold">{companyCount}</p>
                <p className="text-xs text-muted-foreground">{companyCount === 1 ? "Company" : "Companies"} Worked With</p>
              </div>
            )}
            {applicant.currentPosition && (
              <div>
                <p className="text-sm font-medium">{applicant.currentPosition}</p>
                <p className="text-xs text-muted-foreground">Current Position</p>
              </div>
            )}
            {applicant.experienceYears == null && companyCount === 0 && !applicant.currentPosition && (
              <p className="text-sm text-muted-foreground">No experience details on file.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 pt-5">
            <h4 className="flex items-center gap-2 text-sm font-semibold">
              <FileText className="size-4 text-primary" />
              Resume
            </h4>
            {applicant.resumeUrl ? (
              <>
                <p className="truncate text-sm font-medium">{resumeFileName(applicant.resumeUrl)}</p>
                <a
                  href={applicant.resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  <ExternalLink className="size-3.5" />
                  Preview Resume
                </a>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No resume on file.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {applicant.languages.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold">Languages</h3>
          <div className="flex flex-wrap gap-2">
            {applicant.languages.map((language) => (
              <span
                key={language}
                className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground/80"
              >
                <LanguagesIcon className="size-3 text-primary" />
                {language}
              </span>
            ))}
          </div>
        </div>
      )}

      {applicant.achievements.length > 0 && (
        <div>
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
            <Trophy className="size-4 text-[var(--warning)]" />
            Achievements
          </h3>
          <ul className="space-y-1.5 text-sm text-foreground/80">
            {applicant.achievements.map((achievement) => (
              <li key={achievement}>• {achievement}</li>
            ))}
          </ul>
        </div>
      )}

      {hasLinks && (
        <div>
          <h3 className="mb-3 text-sm font-semibold">Links</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {applicant.linkedinUrl && <Field icon={LinkIcon} label="LinkedIn" value={applicant.linkedinUrl} />}
            {applicant.githubUrl && <Field icon={FolderGit2} label="GitHub" value={applicant.githubUrl} />}
            {applicant.portfolioUrl && <Field icon={Globe} label="Portfolio" value={applicant.portfolioUrl} />}
            {applicant.socialMediaUrls.map((url, index) => (
              <Field key={`${url}-${index}`} icon={Globe} label="Other Link" value={url} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
