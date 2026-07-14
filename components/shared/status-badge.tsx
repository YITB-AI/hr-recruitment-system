"use client";

import { Badge } from "@/components/ui/badge";
import { useStatusLookup } from "@/components/shared/status-config-provider";
import { getStatusIcon } from "@/lib/status-icons";
import { cn } from "@/lib/utils";

// Generic across every status-bearing module (Applicant.status,
// Employee.employmentStatus) — resolves name/color/icon from whichever
// module's StatusConfigProvider is mounted above it in the tree, per the
// dynamic per-company Status collection (Settings > Statuses) rather than a
// compile-time constants file.
export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const { getStatus } = useStatusLookup();
  const { name, color, icon } = getStatus(status);
  const Icon = getStatusIcon(icon);

  return (
    <Badge
      className={cn("border-0 font-medium", className)}
      style={{ backgroundColor: `${color}1A`, color }}
    >
      <Icon className="size-3.5" />
      {name}
    </Badge>
  );
}
