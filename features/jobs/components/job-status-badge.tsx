import { Badge } from "@/components/ui/badge";
import { JOB_STATUS_COLORS } from "@/constants/job";

// Job's 4 statuses are a small, fixed, non-tenant-customizable set (unlike
// Applicant/Employee status, which route through the company-configurable
// StatusConfigProvider/Status collection) — a plain color map is enough, no
// need for that heavier per-company system here.
export function JobStatusBadge({ status, className }: { status: string; className?: string }) {
  const color = JOB_STATUS_COLORS[status] ?? "#71717a"; // fallback for any free-text status n8n writes outside the 4-value list
  return (
    <Badge className={className ? `border-0 font-medium ${className}` : "border-0 font-medium"} style={{ backgroundColor: `${color}1A`, color }}>
      {status}
    </Badge>
  );
}
