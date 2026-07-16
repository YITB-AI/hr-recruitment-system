import type { Metadata } from "next";
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
import { PermissionsPanel } from "@/features/settings/components/permissions-panel";
import { getSettings } from "@/features/settings/services/settings.service";
import { listCompanyUsers } from "@/features/settings/services/user-management.service";
import { listUnmappedJobs, listCompaniesForMapping } from "@/features/settings/services/job-mapping.service";
import { listOrphanedApplicants } from "@/features/settings/services/data-repair.service";
import { listCompanies } from "@/features/settings/services/company-management.service";
import { listStatuses } from "@/features/settings/services/status-management.service";
import { listRoleSummaries, getAllPermissionActions } from "@/features/settings/services/permissions.service";
import { companyRepository } from "@/server/repositories/company.repository";
import { userRepository } from "@/server/repositories/user.repository";
import { getCurrentUser } from "@/lib/current-user";
import { connectDB } from "@/server/db/connect";
import type { UserRole } from "@/constants/user";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
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
    roleSummaries,
    orphanedApplicants,
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
    isAdmin ? listRoleSummaries() : Promise.resolve(null),
    isPlatformAdmin ? listOrphanedApplicants() : Promise.resolve(null),
  ]);
  const allPermissionActions = getAllPermissionActions();

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader title="Settings" description="Manage your organization's configuration and appearance." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="pt-6">
              <Tabs defaultValue="general">
                <TabsList>
                  <TabsTrigger value="general">General</TabsTrigger>
                  <TabsTrigger value="appearance">Appearance</TabsTrigger>
                  <TabsTrigger value="notifications">Notifications</TabsTrigger>
                  {isAdmin && <TabsTrigger value="users">Users & Roles</TabsTrigger>}
                  {isAdmin && <TabsTrigger value="permissions">Permissions</TabsTrigger>}
                  {isAdmin && <TabsTrigger value="statuses">Statuses</TabsTrigger>}
                  {isPlatformAdmin && <TabsTrigger value="companies">Companies</TabsTrigger>}
                  {isPlatformAdmin && <TabsTrigger value="unmapped-jobs">Unmapped Jobs</TabsTrigger>}
                  {isPlatformAdmin && <TabsTrigger value="orphaned-applicants">Orphaned Applicants</TabsTrigger>}
                </TabsList>

                <TabsContent value="general" className="pt-6">
                  <GeneralSettingsForm settings={settings} />
                </TabsContent>

                <TabsContent value="appearance" className="pt-6">
                  <AppearanceSettingsForm settings={settings} />
                </TabsContent>

                <TabsContent value="notifications" className="pt-6">
                  <NotificationSettingsForm settings={settings} />
                </TabsContent>

                {isAdmin && users && (
                  <TabsContent value="users" className="pt-6">
                    <UsersTable users={users} />
                  </TabsContent>
                )}

                {isAdmin && applicantStatuses && employeeStatuses && (
                  <TabsContent value="statuses" className="pt-6">
                    <StatusManagementPanel statusesByModule={{ applicant: applicantStatuses, employee: employeeStatuses }} />
                  </TabsContent>
                )}

                {isAdmin && roleSummaries && (
                  <TabsContent value="permissions" className="pt-6">
                    <PermissionsPanel roles={roleSummaries} allActions={allPermissionActions} />
                  </TabsContent>
                )}

                {isPlatformAdmin && allCompanies && (
                  <TabsContent value="companies" className="pt-6">
                    <CompaniesTable companies={allCompanies} />
                  </TabsContent>
                )}

                {isPlatformAdmin && unmappedJobs && companiesForMapping && (
                  <TabsContent value="unmapped-jobs" className="pt-6">
                    <UnmappedJobsTable jobs={unmappedJobs} companies={companiesForMapping} />
                  </TabsContent>
                )}

                {isPlatformAdmin && orphanedApplicants && companiesForMapping && (
                  <TabsContent value="orphaned-applicants" className="pt-6">
                    <OrphanedApplicantsTable applicants={orphanedApplicants} companies={companiesForMapping} />
                  </TabsContent>
                )}
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {company && (
            <TenantInfoCard company={company} yourRole={actor.role as UserRole} userCount={teamMembers.length} />
          )}
        </div>
      </div>
    </div>
  );
}
