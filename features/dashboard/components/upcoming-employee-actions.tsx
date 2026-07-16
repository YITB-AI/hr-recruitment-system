import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { CalendarCheck2 } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { UpcomingEmployeeActionItem } from "@/types/dashboard";

function ActionList({ items }: { items: UpcomingEmployeeActionItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={CalendarCheck2}
        title="Nothing due"
        description="Probation, confirmation, increment, and contract renewal reminders will show up here."
      />
    );
  }

  return (
    <ul className="space-y-4">
      {items.map((item, idx) => (
        <li key={`${item.employeeId}-${item.action}-${idx}`} className="flex gap-3">
          <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground/90">
              {item.employeeName} — {item.action}
            </p>
            <p className="text-sm text-muted-foreground">
              {item.designation} · {item.department}
            </p>
            <p className="text-xs text-muted-foreground/70">
              {formatDistanceToNow(new Date(item.dueDate), { addSuffix: true })}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              nativeButton={false}
              render={<Link href={`/documents?employeeId=${item.employeeId}`} />}
            >
              Generate Letter
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              nativeButton={false}
              render={<Link href={`/employees/${item.employeeId}`} />}
            >
              View Profile
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function UpcomingEmployeeActions({
  today,
  upcoming,
}: {
  today: UpcomingEmployeeActionItem[];
  upcoming: UpcomingEmployeeActionItem[];
}) {
  return (
    <Tabs defaultValue="today">
      <TabsList>
        <TabsTrigger value="today">Today ({today.length})</TabsTrigger>
        <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
      </TabsList>
      <TabsContent value="today" className="pt-4">
        <ActionList items={today} />
      </TabsContent>
      <TabsContent value="upcoming" className="pt-4">
        <ActionList items={upcoming} />
      </TabsContent>
    </Tabs>
  );
}
