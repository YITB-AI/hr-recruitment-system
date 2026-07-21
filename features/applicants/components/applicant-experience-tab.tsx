import { Briefcase } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import type { ExperienceHistoryEntry } from "@/server/repositories/applicant.repository";

export function ApplicantExperienceTab({ entries }: { entries: ExperienceHistoryEntry[] }) {
  if (entries.length === 0) {
    return (
      <EmptyState
        icon={Briefcase}
        title="No experience history on file"
        description="Structured work history from this applicant's resume will appear here."
      />
    );
  }

  return (
    <ul className="space-y-6">
      {entries.map((entry, index) => (
        <li key={`${entry.company}-${index}`} className="relative border-l pl-6">
          <span className="absolute top-1 -left-[7px] size-3 rounded-full border-2 border-background bg-primary" />
          <p className="text-sm font-semibold">{entry.job_title || "Unknown Role"}</p>
          <p className="text-sm text-muted-foreground">
            {entry.company || "Unknown Company"}
            {entry.duration ? ` · ${entry.duration}` : ""}
          </p>
          {entry.responsibilities.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm text-foreground/80">
              {entry.responsibilities.map((point, pointIndex) => (
                <li key={pointIndex}>• {point}</li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}
