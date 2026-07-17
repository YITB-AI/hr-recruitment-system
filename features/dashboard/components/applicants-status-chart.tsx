"use client";

import { useRouter } from "next/navigation";
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
  const router = useRouter();

  function goToStatus(status: string) {
    router.push(`/applicants?status=${encodeURIComponent(status)}`);
  }

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
    // Always stacked (chart above legend), never side-by-side: this card
    // sits inside a multi-column dashboard/reports grid, so its available
    // width has no reliable relationship to the viewport — a `sm:flex-row`
    // breakpoint here previously assumed otherwise and clipped the chart
    // and legend text whenever the grid cell was narrower than ~500px
    // (invisible with 1-2 slices of test data, very visible with a real
    // multi-status breakdown).
    <div className="flex flex-col items-center gap-4">
      <div className="h-40 w-40 shrink-0">
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
                <Cell
                  key={slice.status}
                  fill={slice.colorVar}
                  className="cursor-pointer"
                  onClick={() => goToStatus(slice.status)}
                />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul className="w-full space-y-2.5">
        {data.map((slice) => (
          <li key={slice.status}>
            <button
              type="button"
              onClick={() => goToStatus(slice.status)}
              className="flex w-full items-center gap-2.5 rounded-md text-left text-sm hover:bg-muted/60"
            >
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: slice.colorVar }}
              />
              <span className="flex-1 truncate text-foreground/80">{slice.label}</span>
              <span className="font-medium tabular-nums">{slice.count}</span>
              <span className="w-12 text-right text-xs tabular-nums text-muted-foreground">
                {slice.percentage}%
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
