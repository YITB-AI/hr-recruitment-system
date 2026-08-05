import { Building2, Calendar, ShieldCheck, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { CompanyRow } from "@/server/repositories/company.repository";

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

type TenantInfoCardProps = {
  company: CompanyRow;
  // Pre-resolved to a real display name by the caller — Dynamic RBAC means
  // this is no longer one of 4 compile-time labels (see
  // server/repositories/role.repository.ts).
  yourRoleName: string;
  userCount: number;
};

export function TenantInfoCard({ company, yourRoleName, userCount }: TenantInfoCardProps) {
  const rows = [
    { icon: Building2, label: "Company ID", value: <code className="text-xs">{company.slug}</code> },
    {
      icon: ShieldCheck,
      label: "Status",
      value: (
        <Badge variant={company.status === "active" ? "outline" : "destructive"} className="capitalize">
          {company.status}
        </Badge>
      ),
    },
    { icon: Users, label: "Your Role", value: yourRoleName },
    { icon: Users, label: "Team Size", value: `${userCount} user${userCount === 1 ? "" : "s"}` },
    { icon: Calendar, label: "Created", value: formatDate(company.createdAt) },
  ];

  return (
    <div className="space-y-4 rounded-2xl border bg-card p-5">
      <div>
        <p className="text-xs font-medium text-muted-foreground">Tenant Information</p>
        <h3 className="text-lg font-semibold">{company.name}</h3>
      </div>
      <dl className="space-y-3 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3">
            <dt className="flex items-center gap-2 text-muted-foreground">
              <row.icon className="size-4" />
              {row.label}
            </dt>
            <dd className="font-medium">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
