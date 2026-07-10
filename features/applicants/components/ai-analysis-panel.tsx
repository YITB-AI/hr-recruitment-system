import { Sparkles, ThumbsUp, ThumbsDown } from "lucide-react";
import { ScoreRing } from "@/components/shared/score-ring";
import { EmptyState } from "@/components/shared/empty-state";
import type { ResumeAnalysisRow } from "@/server/repositories/resume-analysis.repository";

export function AiAnalysisPanel({ analysis }: { analysis: ResumeAnalysisRow | null }) {
  if (!analysis) {
    return (
      <EmptyState
        icon={Sparkles}
        title="No AI analysis yet"
        description="Once n8n finishes analyzing this applicant's resume, the score and insights will appear here."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start sm:gap-8">
        <div className="flex flex-col items-center gap-2">
          <ScoreRing value={analysis.overallScore} />
          <p className="text-xs font-medium text-muted-foreground">Overall Score</p>
        </div>
        <div className="flex flex-col items-center gap-2 sm:items-start">
          <ScoreRing value={analysis.jdMatchPercentage} size={72} />
          <p className="text-xs font-medium text-muted-foreground">JD Match</p>
        </div>
        {analysis.summary && (
          <p className="max-w-sm text-center text-sm text-foreground/80 sm:text-left">{analysis.summary}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {analysis.strengths.length > 0 && (
          <div>
            <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
              <ThumbsUp className="size-4 text-[var(--success)]" />
              Top Strengths
            </h3>
            <ul className="space-y-1.5 text-sm text-foreground/80">
              {analysis.strengths.map((s) => (
                <li key={s}>• {s}</li>
              ))}
            </ul>
          </div>
        )}
        {analysis.missingSkills.length > 0 && (
          <div>
            <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
              <ThumbsDown className="size-4 text-destructive" />
              Missing Skills
            </h3>
            <ul className="space-y-1.5 text-sm text-foreground/80">
              {analysis.missingSkills.map((s) => (
                <li key={s}>• {s}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {analysis.recommendation && (
        <div>
          <h3 className="mb-2 text-sm font-semibold">Recommendation</h3>
          <p className="text-sm text-foreground/80">{analysis.recommendation}</p>
        </div>
      )}
    </div>
  );
}
