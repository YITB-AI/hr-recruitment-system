import { GraduationCap, Award } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import type { EducationHistoryEntry, CertificationHistoryEntry } from "@/server/repositories/applicant.repository";

export function ApplicantEducationTab({
  education,
  certifications,
}: {
  education: EducationHistoryEntry[];
  certifications: CertificationHistoryEntry[];
}) {
  if (education.length === 0 && certifications.length === 0) {
    return (
      <EmptyState
        icon={GraduationCap}
        title="No education history on file"
        description="Degrees and certifications from this applicant's resume will appear here."
      />
    );
  }

  return (
    <div className="space-y-8">
      {education.length > 0 && (
        <div>
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
            <GraduationCap className="size-4 text-primary" />
            Education
          </h3>
          <ul className="divide-y">
            {education.map((entry, index) => (
              <li key={index} className="py-3">
                <p className="text-sm font-medium">{entry.degree_name || "Unknown Degree"}</p>
                <p className="text-sm text-muted-foreground">
                  {entry.institution || "Unknown Institution"}
                  {entry.year ? ` · ${entry.year}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {certifications.length > 0 && (
        <div>
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
            <Award className="size-4 text-primary" />
            Certifications
          </h3>
          <ul className="divide-y">
            {certifications.map((entry, index) => (
              <li key={index} className="py-3">
                <p className="text-sm font-medium">{entry.certification_name || "Unknown Certification"}</p>
                <p className="text-sm text-muted-foreground">
                  {entry.issuer || "Unknown Issuer"}
                  {entry.year ? ` · ${entry.year}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
