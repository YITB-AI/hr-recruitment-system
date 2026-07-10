import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmployeeForm } from "@/features/employees/components/employee-form";
import { getEmployee, listManagerOptions } from "@/features/employees/services/employee.service";

export const metadata: Metadata = { title: "Edit Employee" };
export const dynamic = "force-dynamic";

export default async function EditEmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [employee, managers] = await Promise.all([getEmployee(id), listManagerOptions()]);

  if (!employee) notFound();

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/employees" className="hover:text-foreground">
          Employees
        </Link>
        <ChevronRight className="size-3.5" />
        <Link href={`/employees/${id}`} className="hover:text-foreground">
          {employee.name}
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="text-foreground">Edit</span>
      </div>

      <Card className="mx-auto max-w-2xl">
        <CardContent className="pt-6">
          <EmployeeForm managers={managers} existing={employee} />
        </CardContent>
      </Card>
    </div>
  );
}
