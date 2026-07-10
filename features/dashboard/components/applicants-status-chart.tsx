"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { ApplicantStatusSlice } from "@/types/dashboard";
import { EmptyState } from "@/components/shared/empty-state";
import { PieChart as PieChartIcon } from "lucide-react";

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ApplicantStatusSlice }>;
}) {
  if (!active || !payload?.length) return null;
  const slice = payload[0].payload;

  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{slice.label}</p>
      <p className="text-muted-foreground">
        {slice.count} applicants · {slice.percentage}%
      </p>
    </div>
  );
}

export function ApplicantsStatusChart({ data }: { data: ApplicantStatusSlice[] }) {
  if (data.length === 0) {
    return (
      <EmptyState
        icon={PieChartIcon}
        title="No applicants yet"
        description="Once candidates apply, their pipeline status breakdown will appear here."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
      <div className="h-56 w-full shrink-0 sm:w-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="label"
              innerRadius="65%"
              outerRadius="100%"
              paddingAngle={2}
              stroke="var(--card)"
              strokeWidth={2}
            >
              {data.map((slice) => (
                <Cell key={slice.status} fill={slice.colorVar} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul className="flex-1 space-y-2.5">
        {data.map((slice) => (
          <li key={slice.status} className="flex items-center gap-2.5 text-sm">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: slice.colorVar }}
            />
            <span className="flex-1 truncate text-foreground/80">{slice.label}</span>
            <span className="font-medium tabular-nums">{slice.count}</span>
            <span className="w-12 text-right text-xs tabular-nums text-muted-foreground">
              {slice.percentage}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
