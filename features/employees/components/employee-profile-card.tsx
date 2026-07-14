import Link from "next/link";
import { Pencil } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import type { EmployeeDetailRow } from "@/server/repositories/employee.repository";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function EmployeeProfileCard({ employee }: { employee: EmployeeDetailRow }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
        <Avatar className="size-20">
          <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
            {initials(employee.name)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-lg font-semibold">{employee.name}</p>
          <p className="text-sm text-muted-foreground">{employee.designation}</p>
          <p className="text-xs text-muted-foreground">{employee.employeeCode}</p>
        </div>
        <StatusBadge status={employee.employmentStatus} />
        <Button
          variant="outline"
          className="w-full"
          nativeButton={false}
          render={<Link href={`/employees/${employee._id}/edit`} />}
        >
          <Pencil className="size-4" />
          Edit Profile
        </Button>
      </CardContent>
    </Card>
  );
}
