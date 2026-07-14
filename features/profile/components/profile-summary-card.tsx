import { Building2, Calendar, Clock, Mail, ShieldCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { USER_ROLE_LABELS, type UserRole } from "@/constants/user";
import type { OwnProfile } from "@/features/profile/services/profile.service";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatDate(date: Date | null) {
  if (!date) return "Never";
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(date: Date | null) {
  if (!date) return "Never";
  return new Date(date).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export function ProfileSummaryCard({ profile }: { profile: OwnProfile }) {
  const isLocked = Boolean(profile.lockedUntil && profile.lockedUntil.getTime() > Date.now());

  const rows = [
    { icon: Mail, label: "Email", value: profile.email },
    { icon: Building2, label: "Company", value: profile.companyName },
    { icon: ShieldCheck, label: "Role", value: USER_ROLE_LABELS[profile.role as UserRole] ?? profile.role },
    ...(profile.department ? [{ icon: Building2, label: "Department", value: profile.department }] : []),
    ...(profile.title ? [{ icon: ShieldCheck, label: "Designation", value: profile.title }] : []),
    { icon: Calendar, label: "Created", value: formatDate(profile.createdAt) },
    { icon: Clock, label: "Last Login", value: formatDateTime(profile.lastLoginAt) },
  ];

  return (
    <div className="space-y-5 rounded-2xl border bg-card p-5">
      <div className="flex flex-col items-center gap-3 text-center">
        <Avatar className="size-20">
          {profile.avatarUrl && <AvatarImage src={profile.avatarUrl} alt={profile.name} />}
          <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
            {initials(profile.name)}
          </AvatarFallback>
        </Avatar>
        <div>
          <h3 className="text-lg font-semibold">{profile.name}</h3>
          <p className="text-sm text-muted-foreground">{profile.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isLocked ? "destructive" : "outline"}>{isLocked ? "Locked" : "Active"}</Badge>
          <Badge variant={profile.emailVerified ? "outline" : "destructive"}>
            {profile.emailVerified ? "Email verified" : "Email unverified"}
          </Badge>
        </div>
      </div>
      <dl className="space-y-3 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3">
            <dt className="flex items-center gap-2 text-muted-foreground">
              <row.icon className="size-4" />
              {row.label}
            </dt>
            <dd className="max-w-[60%] truncate text-right font-medium">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
