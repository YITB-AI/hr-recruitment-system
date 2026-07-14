import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ChevronRight, Users, Briefcase, Activity as ActivityIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { CompanyDetailHeader } from "@/features/settings/components/company-detail-header";
import { getCompanyDetail } from "@/features/settings/services/company-management.service";

export const metadata: Metadata = { title: "Company Details" };
export const dynamic = "force-dynamic";

function formatDate(value: string | Date | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function CompanyDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getCompanyDetail(id);
  if (!detail) notFound();

  const { company, userCount, jobCount, users, jobs, activity } = detail;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/settings" className="hover:text-foreground">
          Settings
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="text-foreground">Company Details</span>
      </div>

      <CompanyDetailHeader company={company} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center justify-between pt-6">
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="size-4" />
              Users
            </span>
            <span className="text-lg font-semibold">{userCount}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between pt-6">
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <Briefcase className="size-4" />
              Jobs
            </span>
            <span className="text-lg font-semibold">{jobCount}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between pt-6">
            <span className="text-sm text-muted-foreground">Created</span>
            <span className="text-sm font-medium">{formatDate(company.createdAt)}</span>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="users">
            <TabsList className="w-full justify-start overflow-x-auto overflow-y-hidden">
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="jobs">Jobs</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="pt-6">
              {users.length === 0 ? (
                <EmptyState icon={Users} title="No users yet" description="Users added to this company will show up here." />
              ) : (
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Name</th>
                      <th className="px-3 py-2 font-medium">Email</th>
                      <th className="px-3 py-2 font-medium">Role</th>
                      <th className="px-3 py-2 font-medium">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {users.map((user) => (
                      <tr key={user._id}>
                        <td className="px-3 py-2 font-medium">{user.name}</td>
                        <td className="px-3 py-2 text-foreground/80">{user.email}</td>
                        <td className="px-3 py-2 text-foreground/80 capitalize">{user.role}</td>
                        <td className="px-3 py-2 text-foreground/80">{formatDate(user.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </TabsContent>

            <TabsContent value="jobs" className="pt-6">
              {jobs.length === 0 ? (
                <EmptyState icon={Briefcase} title="No jobs yet" description="Job postings created by this company will show up here." />
              ) : (
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Title</th>
                      <th className="px-3 py-2 font-medium">Department</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {jobs.map((job) => (
                      <tr key={job._id}>
                        <td className="px-3 py-2 font-medium">{job.title}</td>
                        <td className="px-3 py-2 text-foreground/80">{job.department || "—"}</td>
                        <td className="px-3 py-2">
                          <Badge variant={job.status === "Closed" ? "destructive" : "outline"}>{job.status}</Badge>
                          {job.archivedAt && (
                            <Badge variant="outline" className="ml-1.5">
                              Archived
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </TabsContent>

            <TabsContent value="activity" className="pt-6">
              {activity.length === 0 ? (
                <EmptyState icon={ActivityIcon} title="No activity yet" description="Actions taken within this company will show up here." />
              ) : (
                <ul className="divide-y">
                  {activity.map((entry) => (
                    <li key={entry._id} className="py-3">
                      <p className="text-sm">{entry.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(entry.createdAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                        {entry.actorName ? ` · ${entry.actorName}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
