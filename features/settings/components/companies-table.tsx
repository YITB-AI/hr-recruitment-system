"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Building2, Plus, Copy, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { CompanyRowActions } from "@/features/settings/components/company-row-actions";
import { createCompanyAction } from "@/actions/companies";
import type { CompanyRow } from "@/server/repositories/company.repository";
import type { CreateCompanyResult } from "@/features/settings/services/company-management.service";

const PAGE_SIZE = 8;
const STATUS_ITEMS = [
  { value: "__all__", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
];

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function CompaniesTable({ companies }: { companies: CompanyRow[] }) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [created, setCreated] = useState<CreateCompanyResult | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("__all__");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return companies.filter((company) => {
      if (statusFilter !== "__all__" && company.status !== statusFilter) return false;
      if (search && !`${company.name} ${company.slug}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [companies, search, statusFilter]);

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function handleCreate() {
    setIsSubmitting(true);
    const result = await createCompanyAction({ name, adminName, adminEmail });
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setCreated(result.result);
    setName("");
    setAdminName("");
    setAdminEmail("");
  }

  function closeCreateDialog(open: boolean) {
    if (!open) {
      setIsCreateOpen(false);
      setCreated(null);
    } else {
      setIsCreateOpen(true);
    }
  }

  function copyCredentials() {
    if (!created) return;
    const text = `Company ID: ${created.company.slug}\nEmail: ${created.adminEmail}\nPassword: ${created.tempPassword}`;
    navigator.clipboard.writeText(text);
    toast.success("Credentials copied to clipboard");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{companies.length} company{companies.length === 1 ? "" : "ies"}</p>
        <Button size="sm" onClick={() => setIsCreateOpen(true)}>
          <Plus className="size-4" />
          Add Company
        </Button>
      </div>

      {companies.length === 0 ? (
        <EmptyState icon={Building2} title="No companies yet" description="Add your first client company to get started." />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <Select
              items={STATUS_ITEMS}
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v ?? "__all__");
                setPage(1);
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_ITEMS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative min-w-48 max-w-sm flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search companies..."
                className="pl-9"
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon={Search} title="No matching companies" description="Try a different search or status filter." />
          ) : (
            <div className="overflow-hidden rounded-xl border">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Company</th>
                    <th className="px-4 py-3 font-medium">Company ID</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                    <th className="px-4 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paged.map((company) => (
                    <tr key={company._id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">
                        <Link href={`/settings/companies/${company._id}`} className="hover:underline">
                          {company.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-foreground/80">
                        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{company.slug}</code>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={company.status === "active" ? "outline" : "destructive"} className="capitalize">
                          {company.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-foreground/80">{formatDate(company.createdAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <CompanyRowActions company={company} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length > PAGE_SIZE && (
                <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
                  <p>
                    Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                      <ChevronLeft className="size-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      disabled={page * PAGE_SIZE >= filtered.length}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      <Dialog open={isCreateOpen} onOpenChange={closeCreateDialog}>
        <DialogContent>
          {!created ? (
            <>
              <DialogHeader>
                <DialogTitle>Add a company</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="space-y-1.5">
                  <Label htmlFor="companyName">Company name</Label>
                  <Input id="companyName" value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Inc" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="adminName">First admin's name</Label>
                  <Input id="adminName" value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="Jane Doe" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="adminEmail">First admin's email</Label>
                  <Input
                    id="adminEmail"
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="jane@acme.com"
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
                <Button onClick={handleCreate} disabled={isSubmitting || !name || !adminName || !adminEmail}>
                  {isSubmitting ? "Creating..." : "Create Company"}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Company created</DialogTitle>
              </DialogHeader>
              <div className="space-y-2 rounded-lg border bg-muted/30 p-4 text-sm">
                <p>
                  <span className="text-muted-foreground">Company ID:</span> <code>{created.company.slug}</code>
                </p>
                <p>
                  <span className="text-muted-foreground">Admin email:</span> {created.adminEmail}
                </p>
                <p>
                  <span className="text-muted-foreground">Temporary password:</span> <code>{created.tempPassword}</code>
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Share these credentials with the admin over a secure channel. They&apos;ll be required to set their own
                password on first login.
              </p>
              <DialogFooter>
                <Button variant="outline" onClick={copyCredentials}>
                  <Copy className="size-4" />
                  Copy
                </Button>
                <DialogClose render={<Button />}>Done</DialogClose>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
