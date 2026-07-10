import Link from "next/link";
import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmployeeForm } from "@/features/employees/components/employee-form";
import { listManagerOptions } from "@/features/employees/services/employee.service";

export const metadata: Metadata = { title: "Add Employee" };
export const dynamic = "force-dynamic";

export default async function NewEmployeePage() {
  const managers = await listManagerOptions();

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/employees" className="hover:text-foreground">
          Employees
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="text-foreground">Add Employee</span>
      </div>

      <Card className="mx-auto max-w-2xl">
        <CardContent className="pt-6">
          <EmployeeForm managers={managers} />
        </CardContent>
      </Card>
    </div>
  );
}
