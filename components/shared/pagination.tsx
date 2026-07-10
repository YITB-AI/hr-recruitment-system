import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  /** Builds the href for a given page number, e.g. (p) => `/employees?page=${p}` */
  buildHref: (page: number) => string;
};

/** Collapses a long page range to first/last + a window around the current page, e.g. 1 … 4 5 [6] 7 8 … 40. */
function getPageWindow(current: number, last: number): Array<number | "ellipsis"> {
  const pages = new Set<number>([1, last, current, current - 1, current + 1]);
  const sorted = Array.from(pages)
    .filter((p) => p >= 1 && p <= last)
    .sort((a, b) => a - b);

  const result: Array<number | "ellipsis"> = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push("ellipsis");
    result.push(sorted[i]);
  }
  return result;
}

// Anchor elements don't support the native `:disabled` pseudo-class, so a
// disabled "prev/next" step can't be a real `disabled` Button rendered as a
// <Link> — it renders as an inert native <button> instead, and only becomes
// a real link once there's somewhere to go.
function StepButton({ href, disabled, children }: { href: string; disabled: boolean; children: React.ReactNode }) {
  if (disabled) {
    return (
      <Button variant="outline" size="icon-sm" disabled>
        {children}
      </Button>
    );
  }
  return (
    <Button variant="outline" size="icon-sm" nativeButton={false} render={<Link href={href} />}>
      {children}
    </Button>
  );
}

export function Pagination({ page, pageSize, total, buildHref }: PaginationProps) {
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  if (total === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm text-muted-foreground">
      <p>
        Showing {from} to {to} of {total} results
      </p>

      <div className="flex items-center gap-1">
        <StepButton href={buildHref(page - 1)} disabled={page <= 1}>
          <ChevronLeft className="size-4" />
        </StepButton>

        {getPageWindow(page, lastPage).map((entry, i) =>
          entry === "ellipsis" ? (
            <span key={`ellipsis-${i}`} className="px-1.5 text-muted-foreground">
              ...
            </span>
          ) : entry === page ? (
            <Button key={entry} size="icon-sm" className="pointer-events-none tabular-nums">
              {entry}
            </Button>
          ) : (
            <Button
              key={entry}
              variant="outline"
              size="icon-sm"
              nativeButton={false}
              render={<Link href={buildHref(entry)} />}
              className="tabular-nums"
            >
              {entry}
            </Button>
          ),
        )}

        <StepButton href={buildHref(page + 1)} disabled={page >= lastPage}>
          <ChevronRight className="size-4" />
        </StepButton>
      </div>
    </div>
  );
}
