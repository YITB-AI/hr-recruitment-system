import { Phone, Mail, MessageSquareText, Clock, AlertTriangle, PhoneCall } from "lucide-react";
import type { CommunicationStats } from "@/types/dashboard";

export function CommunicationStatsRow({ stats }: { stats: CommunicationStats }) {
  const items = [
    { label: "Calls", value: stats.calls, icon: Phone, iconClassName: "bg-[var(--status-interview)]/10 text-[var(--status-interview)]" },
    { label: "Emails", value: stats.emails, icon: Mail, iconClassName: "bg-[var(--status-new)]/10 text-[var(--status-new)]" },
    {
      label: "Messages",
      value: stats.messages,
      icon: MessageSquareText,
      iconClassName: "bg-[var(--status-screening)]/10 text-[var(--status-screening)]",
    },
    {
      label: "In Progress",
      value: stats.inProgress,
      icon: PhoneCall,
      iconClassName: "bg-primary/10 text-primary",
    },
    {
      label: "Pending",
      value: stats.pending,
      icon: Clock,
      iconClassName: "bg-[var(--status-shortlisted)]/10 text-[var(--status-shortlisted)]",
    },
    { label: "Failed", value: stats.failed, icon: AlertTriangle, iconClassName: "bg-destructive/10 text-destructive" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3 rounded-xl border bg-card p-3">
          <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${item.iconClassName}`}>
            <item.icon className="size-4" />
          </div>
          <div>
            <p className="text-lg font-semibold leading-none">{item.value}</p>
            <p className="text-xs text-muted-foreground">{item.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
