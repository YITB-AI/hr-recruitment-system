"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, Pencil, PauseCircle, PlayCircle, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import {
  updateCompanyAction,
  setCompanyStatusAction,
  uploadCompanyLogoAction,
  deleteCompanyAction,
} from "@/actions/companies";
import type { CompanyRow } from "@/server/repositories/company.repository";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function CompanyDetailHeader({ company }: { company: CompanyRow }) {
  const router = useRouter();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [name, setName] = useState(company.name);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isActive = company.status === "active";

  function handleSaveName() {
    startTransition(async () => {
      const result = await updateCompanyAction({ companyId: company._id, name });
      if (result.success) {
        toast.success("Company updated");
        setIsEditOpen(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleToggleStatus() {
    startTransition(async () => {
      const result = await setCompanyStatusAction({ companyId: company._id, status: isActive ? "suspended" : "active" });
      if (result.success) toast.success(isActive ? "Company suspended" : "Company reactivated");
      else toast.error(result.error);
    });
  }

  function handleLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.set("file", file);
    startTransition(async () => {
      const result = await uploadCompanyLogoAction(company._id, formData);
      if (result.success) toast.success("Logo updated");
      else toast.error(result.error);
    });
  }

  function handleDelete() {
    if (!confirm(`Delete "${company.name}"? This can't be undone.`)) return;
    startTransition(async () => {
      const result = await deleteCompanyAction(company._id);
      if (result.success) {
        toast.success("Company deleted");
        router.push("/settings");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar className="size-16">
            {company.logoUrl && <AvatarImage src={company.logoUrl} alt={company.name} />}
            <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
              {initials(company.name)}
            </AvatarFallback>
          </Avatar>
          <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleLogoChange} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isPending}
            className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full border bg-background text-muted-foreground hover:text-foreground"
            aria-label="Change logo"
          >
            <Camera className="size-3.5" />
          </button>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{company.name}</h1>
            <Badge variant={isActive ? "outline" : "destructive"} className="capitalize">
              {company.status}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Company ID: <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{company.slug}</code>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={() => setIsEditOpen(true)}>
          <Pencil className="size-4" />
          Edit
        </Button>
        <Button variant="outline" onClick={handleToggleStatus} disabled={isPending}>
          {isActive ? <PauseCircle className="size-4" /> : <PlayCircle className="size-4" />}
          {isActive ? "Suspend" : "Reactivate"}
        </Button>
        <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
          <Trash2 className="size-4" />
          Delete
        </Button>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit company</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label htmlFor="company-name">Company name</Label>
            <Input id="company-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button onClick={handleSaveName} disabled={isPending || !name.trim()}>
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
