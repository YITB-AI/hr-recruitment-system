import { Badge } from "@/components/ui/badge";
import { APPLICANT_STATUS_CONFIG, type ApplicantStatus } from "@/constants/applicant-status";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, className }: { status: ApplicantStatus; className?: string }) {
  const config = APPLICANT_STATUS_CONFIG[status];

  return (
    <Badge className={cn("border-0 font-medium", config.badgeClassName, className)}>
      {config.label}
    </Badge>
  );
}
