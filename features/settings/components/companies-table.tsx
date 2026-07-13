"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Building2, Plus, Copy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { createCompanyAction } from "@/actions/companies";
import type { CompanyRow } from "@/server/repositories/company.repository";
import type { CreateCompanyResult } from "@/features/settings/services/company-management.service";

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
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Company</th>
              <th className="px-4 py-3 font-medium">Company ID</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {companies.map((company) => (
              <tr key={company._id} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{company.name}</td>
                <td className="px-4 py-3 text-foreground/80">
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{company.slug}</code>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={company.status === "active" ? "outline" : "destructive"} className="capitalize">
                    {company.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-foreground/80">{formatDate(company.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
