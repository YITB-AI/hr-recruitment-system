import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StatTrend } from "@/types/dashboard";

type StatCardProps = {
  label: string;
  value: number | string;
  icon: LucideIcon;
  iconClassName?: string;
  trend?: StatTrend;
  // Optional — renders the card as a link to a pre-filtered page when
  // provided; every existing caller that doesn't pass one keeps rendering
  // a plain, non-interactive div exactly as before.
  href?: string;
  // Optional — describes the trend's comparison period. Defaults to "last
  // week" so every existing caller (weekly-windowed trends) is unaffected.
  periodLabel?: string;
};

const TREND_STYLES: Record<StatTrend["direction"], string> = {
  up: "text-[var(--success)] bg-[var(--success)]/10",
  down: "text-destructive bg-destructive/10",
  flat: "text-muted-foreground bg-muted",
};

const TREND_ICON: Record<StatTrend["direction"], LucideIcon> = {
  up: ArrowUpRight,
  down: ArrowDownRight,
  flat: Minus,
};

export function StatCard({ label, value, icon: Icon, iconClassName, trend, href, periodLabel }: StatCardProps) {
  const TrendIcon = trend ? TREND_ICON[trend.direction] : null;
  const cardClassName = cn(
    "rounded-2xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md",
    href && "block cursor-pointer",
  );

  const content = (
    <>
      <div className="flex items-start justify-between">
        <div
          className={cn(
            "flex size-11 items-center justify-center rounded-xl",
            iconClassName ?? "bg-primary/10 text-primary",
          )}
        >
          <Icon className="size-5" />
        </div>
        {trend && TrendIcon && (
          <span
            className={cn(
              "flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium",
              TREND_STYLES[trend.direction],
            )}
          >
            <TrendIcon className="size-3.5" />
            {trend.percentage}%
          </span>
        )}
      </div>
      <p className="mt-4 text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
      {trend && (
        <p className="mt-1 text-xs text-muted-foreground">
          {trend.direction === "flat" ? "No change" : trend.direction === "up" ? "Up" : "Down"} from{" "}
          {periodLabel ?? "last week"}
        </p>
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cardClassName}>
        {content}
      </Link>
    );
  }

  return <div className={cardClassName}>{content}</div>;
}
