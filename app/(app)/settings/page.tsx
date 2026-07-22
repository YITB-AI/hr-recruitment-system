import type { Metadata } from "next";
import {
  Settings as SettingsIcon,
  Palette,
  Bell,
  Users,
  ShieldCheck,
  Tag,
  Building2,
  Network,
  Building,
  Briefcase,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { GeneralSettingsForm } from "@/features/settings/components/general-settings-form";
import { NotificationSettingsForm } from "@/features/settings/components/notification-settings-form";
import { AppearanceSettingsForm } from "@/features/settings/components/appearance-settings-form";
import { UsersTable } from "@/features/settings/components/users-table";
import { UnmappedJobsTable } from "@/features/settings/components/unmapped-jobs-table";
import { OrphanedApplicantsTable } from "@/features/settings/components/orphaned-applicants-table";
import { CompaniesTable } from "@/features/settings/components/companies-table";
import { TenantInfoCard } from "@/features/settings/components/tenant-info-card";
import { StatusManagementPanel } from "@/features/settings/components/status-management-panel";
import { DepartmentManagementPanel } from "@/features/settings/components/department-management-panel";
import { EmployeeTypeManagementPanel } from "@/features/settings/components/employee-type-management-panel";
import { PermissionsPanel } from "@/features/settings/components/permissions-panel";
import { getSettings } from "@/features/settings/services/settings.service";
import { listCompanyUsers } from "@/features/settings/services/user-management.service";
import { listUnmappedJobs, listCompaniesForMapping } from "@/features/settings/services/job-mapping.service";
import { listOrphanedApplicants } from "@/features/settings/services/data-repair.service";
import { listCompanies } from "@/features/settings/services/company-management.service";
import { listStatuses } from "@/features/settings/services/status-management.service";
import { listDepartments } from "@/features/settings/services/department.service";
import { listEmployeeTypes } from "@/features/settings/services/employee-type.service";
import { listRoleSummaries, getAllPermissionActions } from "@/features/settings/services/permissions.service";
import { companyRepository } from "@/server/repositories/company.repository";
import { userRepository } from "@/server/repositories/user.repository";
import { getCurrentUser } from "@/lib/current-user";
import { connectDB } from "@/server/db/connect";
import type { UserRole } from "@/constants/user";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

const DEEP_LINKABLE_TABS = new Set(["notifications"]);

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const defaultTab = tab && DEEP_LINKABLE_TABS.has(tab) ? tab : "general";
  await connectDB();
  const actor = await getCurrentUser();
  const isAdmin = actor.role === "admin";
  const isPlatformAdmin = actor.isPlatformAdmin;

  const [
    settings,
    users,
    unmappedJobs,
    companiesForMapping,
    allCompanies,
    company,
    teamMembers,
    applicantStatuses,
    employeeStatuses,
    applicantSources,
    roleSummaries,
    orphanedApplicants,
    departments,
    employeeTypes,
  ] = await Promise.all([
    getSettings(),
    isAdmin ? listCompanyUsers() : Promise.resolve(null),
    isPlatformAdmin ? listUnmappedJobs() : Promise.resolve(null),
    isPlatformAdmin ? listCompaniesForMapping() : Promise.resolve(null),
    isPlatformAdmin ? listCompanies() : Promise.resolve(null),
    companyRepository.findById(actor.companyId),
    userRepository.findAll(actor.companyId),
    isAdmin ? listStatuses("applicant") : Promise.resolve(null),
    isAdmin ? listStatuses("employee") : Promise.resolve(null),
    isAdmin ? listStatuses("applicant_source") : Promise.resolve(null),
    isAdmin ? listRoleSummaries() : Promise.resolve(null),
    isPlatformAdmin ? listOrphanedApplicants() : Promise.resolve(null),
    isAdmin ? listDepartments() : Promise.resolve(null),
    isAdmin ? listEmployeeTypes() : Promise.resolve(null),
  ]);
  const allPermissionActions = getAllPermissionActions();

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader title="Settings" description="Manage your organization's configuration and appearance." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
        <Tabs defaultValue={defaultTab} orientation="vertical" className="items-start">
          <TabsList variant="line" className="h-fit w-56 shrink-0 flex-col items-stretch gap-1 bg-transparent p-0">
            <TabsTrigger value="general" className="w-full justify-start gap-2 rounded-lg px-3 py-2 data-active:bg-muted data-active:shadow-none">
              <SettingsIcon className="size-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="appearance" className="w-full justify-start gap-2 rounded-lg px-3 py-2 data-active:bg-muted data-active:shadow-none">
              <Palette className="size-4" />
              Appearance
            </TabsTrigger>
            <TabsTrigger value="notifications" className="w-full justify-start gap-2 rounded-lg px-3 py-2 data-active:bg-muted data-active:shadow-none">
              <Bell className="size-4" />
              Notifications
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="users" className="w-full justify-start gap-2 rounded-lg px-3 py-2 data-active:bg-muted data-active:shadow-none">
                <Users className="size-4" />
                Users & Roles
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="permissions" className="w-full justify-start gap-2 rounded-lg px-3 py-2 data-active:bg-muted data-active:shadow-none">
                <ShieldCheck className="size-4" />
                Permissions
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="statuses" className="w-full justify-start gap-2 rounded-lg px-3 py-2 data-active:bg-muted data-active:shadow-none">
                <Tag className="size-4" />
                Statuses
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="departments" className="w-full justify-start gap-2 rounded-lg px-3 py-2 data-active:bg-muted data-active:shadow-none">
                <Building2 className="size-4" />
                Departments
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="employee-types" className="w-full justify-start gap-2 rounded-lg px-3 py-2 data-active:bg-muted data-active:shadow-none">
                <Network className="size-4" />
                Employee Types
              </TabsTrigger>
            )}
            {isPlatformAdmin && (
              <TabsTrigger value="companies" className="w-full justify-start gap-2 rounded-lg px-3 py-2 data-active:bg-muted data-active:shadow-none">
                <Building className="size-4" />
                Companies
              </TabsTrigger>
            )}
            {isPlatformAdmin && (
              <TabsTrigger value="unmapped-jobs" className="w-full justify-start gap-2 rounded-lg px-3 py-2 data-active:bg-muted data-active:shadow-none">
                <Briefcase className="size-4" />
                Unmapped Jobs
              </TabsTrigger>
            )}
            {isPlatformAdmin && (
              <TabsTrigger value="orphaned-applicants" className="w-full justify-start gap-2 rounded-lg px-3 py-2 data-active:bg-muted data-active:shadow-none">
                <AlertTriangle className="size-4" />
                Orphaned Applicants
              </TabsTrigger>
            )}
          </TabsList>

          <Card className="flex-1">
            <CardContent className="pt-6">
              <TabsContent value="general">
                <GeneralSettingsForm settings={settings} />
              </TabsContent>

              <TabsContent value="appearance">
                <AppearanceSettingsForm settings={settings} />
              </TabsContent>

              <TabsContent value="notifications">
                <NotificationSettingsForm settings={settings} />
              </TabsContent>

              {isAdmin && users && (
                <TabsContent value="users">
                  <UsersTable users={users} />
                </TabsContent>
              )}

              {isAdmin && applicantStatuses && employeeStatuses && applicantSources && (
                <TabsContent value="statuses">
                  <StatusManagementPanel
                    statusesByModule={{
                      applicant: applicantStatuses,
                      employee: employeeStatuses,
                      applicant_source: applicantSources,
                    }}
                  />
                </TabsContent>
              )}

              {isAdmin && departments && (
                <TabsContent value="departments">
                  <DepartmentManagementPanel departments={departments} />
                </TabsContent>
              )}

              {isAdmin && employeeTypes && (
                <TabsContent value="employee-types">
                  <EmployeeTypeManagementPanel employeeTypes={employeeTypes} />
                </TabsContent>
              )}

              {isAdmin && roleSummaries && (
                <TabsContent value="permissions">
                  <PermissionsPanel roles={roleSummaries} allActions={allPermissionActions} />
                </TabsContent>
              )}

              {isPlatformAdmin && allCompanies && (
                <TabsContent value="companies">
                  <CompaniesTable companies={allCompanies} />
                </TabsContent>
              )}

              {isPlatformAdmin && unmappedJobs && companiesForMapping && (
                <TabsContent value="unmapped-jobs">
                  <UnmappedJobsTable jobs={unmappedJobs} companies={companiesForMapping} />
                </TabsContent>
              )}

              {isPlatformAdmin && orphanedApplicants && companiesForMapping && (
                <TabsContent value="orphaned-applicants">
                  <OrphanedApplicantsTable applicants={orphanedApplicants} companies={companiesForMapping} />
                </TabsContent>
              )}
            </CardContent>
          </Card>
        </Tabs>

        <div className="space-y-6">
          {company && (
            <TenantInfoCard company={company} yourRole={actor.role as UserRole} userCount={teamMembers.length} />
          )}
        </div>
      </div>
    </div>
  );
}
