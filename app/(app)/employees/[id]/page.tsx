import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ChevronRight, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { EmployeeProfileCard } from "@/features/employees/components/employee-profile-card";
import { EmployeeOverview } from "@/features/employees/components/employee-overview";
import { EmployeeDocumentsTab } from "@/features/employees/components/employee-documents-tab";
import { StatusConfigProvider } from "@/components/shared/status-config-provider";
import { getEmployee, getEmployeeDocuments } from "@/features/employees/services/employee.service";
import { listActiveStatuses } from "@/features/settings/services/status-management.service";

export const metadata: Metadata = { title: "Employee Profile" };
export const dynamic = "force-dynamic";

const PLACEHOLDER_TABS = [
  { value: "leave", label: "Leave", description: "Leave history and balance will appear here." },
  { value: "performance", label: "Performance", description: "Performance reviews will appear here." },
  { value: "attendance", label: "Attendance", description: "Attendance records will appear here." },
];

export default async function EmployeeProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [employee, documents, employeeStatuses] = await Promise.all([
    getEmployee(id),
    getEmployeeDocuments(id),
    listActiveStatuses("employee"),
  ]);

  if (!employee) notFound();

  return (
    <StatusConfigProvider statuses={employeeStatuses}>
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/employees" className="hover:text-foreground">
          Employees
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="text-foreground">{employee.name}</span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        <EmployeeProfileCard employee={employee} />

        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue="overview">
              <TabsList className="w-full justify-start overflow-x-auto overflow-y-hidden">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                {PLACEHOLDER_TABS.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value}>
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="overview" className="pt-6">
                <EmployeeOverview employee={employee} />
              </TabsContent>

              <TabsContent value="documents" className="pt-6">
                <EmployeeDocumentsTab documents={documents} />
              </TabsContent>

              {PLACEHOLDER_TABS.map((tab) => (
                <TabsContent key={tab.value} value={tab.value} className="pt-6">
                  <EmptyState icon={Sparkles} title={`${tab.label} not available yet`} description={tab.description} />
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
    </StatusConfigProvider>
  );
}
