import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function scoreClassName(score: number): string {
  if (score >= 80) return "bg-[var(--success)]/10 text-[var(--success)]";
  if (score >= 50) return "bg-[var(--status-screening)]/10 text-[var(--status-screening)]";
  return "bg-destructive/10 text-destructive";
}

export function ScoreBadge({ score, className }: { score: number | null; className?: string }) {
  if (score === null) {
    return <span className={cn("text-sm text-muted-foreground", className)}>—</span>;
  }

  return (
    <Badge className={cn("border-0 font-medium tabular-nums", scoreClassName(score), className)}>{score}</Badge>
  );
}
