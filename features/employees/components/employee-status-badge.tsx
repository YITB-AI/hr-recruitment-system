import { Badge } from "@/components/ui/badge";
import { EMPLOYMENT_STATUS_LABELS, EMPLOYMENT_STATUS_BADGE_CLASSNAME } from "@/constants/employee";
import type { EmploymentStatus } from "@/constants/employee";
import { cn } from "@/lib/utils";

export function EmployeeStatusBadge({ status, className }: { status: EmploymentStatus; className?: string }) {
  return (
    <Badge className={cn("border-0 font-medium", EMPLOYMENT_STATUS_BADGE_CLASSNAME[status], className)}>
      {EMPLOYMENT_STATUS_LABELS[status]}
    </Badge>
  );
}
