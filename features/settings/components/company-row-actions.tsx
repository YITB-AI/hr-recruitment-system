"use client";

import { useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { MoreVertical, Eye, PauseCircle, PlayCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setCompanyStatusAction, deleteCompanyAction } from "@/actions/companies";
import type { CompanyRow } from "@/server/repositories/company.repository";

export function CompanyRowActions({ company }: { company: CompanyRow }) {
  const [isPending, startTransition] = useTransition();
  const isActive = company.status === "active";

  function handleToggleStatus() {
    startTransition(async () => {
      const result = await setCompanyStatusAction({ companyId: company._id, status: isActive ? "suspended" : "active" });
      if (!result.success) toast.error(result.error);
      else toast.success(isActive ? `"${company.name}" suspended` : `"${company.name}" reactivated`);
    });
  }

  function handleDelete() {
    if (!confirm(`Delete "${company.name}"? This can't be undone.`)) return;
    startTransition(async () => {
      const result = await deleteCompanyAction(company._id);
      if (!result.success) toast.error(result.error);
      else toast.success("Company deleted");
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" disabled={isPending} />}>
        <MoreVertical className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem render={<Link href={`/settings/companies/${company._id}`} />}>
          <Eye className="size-4" />
          View Details
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleToggleStatus}>
          {isActive ? <PauseCircle className="size-4" /> : <PlayCircle className="size-4" />}
          {isActive ? "Suspend" : "Reactivate"}
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={handleDelete}>
          <Trash2 className="size-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
