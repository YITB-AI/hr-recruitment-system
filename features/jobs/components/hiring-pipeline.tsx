import { Progress, ProgressLabel } from "@/components/ui/progress";

export type HiringPipelineStage = { label: string; count: number };

// Rendered in two places (Job Detail's sidebar card and its Analytics tab)
// from the same JobDetail.pipeline data — one component, no duplicated
// percentage math.
export function HiringPipeline({ stages, total }: { stages: HiringPipelineStage[]; total: number }) {
  return (
    <div className="space-y-4">
      {stages.map((stage) => {
        const pct = total === 0 ? 0 : Math.round((stage.count / total) * 100);
        return (
          <Progress key={stage.label} value={pct}>
            <div className="flex w-full items-center justify-between">
              <ProgressLabel>{stage.label}</ProgressLabel>
              {/* Base UI's ProgressValue renders the percentage value it's
                  tracking internally, formatted via a render-prop — not a
                  plain node slot. This shows the raw applicant count
                  instead, so a plain span, not that primitive. */}
              <span className="ml-auto text-sm text-muted-foreground tabular-nums">{stage.count}</span>
            </div>
          </Progress>
        );
      })}
    </div>
  );
}
