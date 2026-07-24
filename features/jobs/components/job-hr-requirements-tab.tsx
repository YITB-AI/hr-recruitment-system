"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ClipboardList, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import { updateJobHrRequirementsAction } from "@/actions/jobs";

export function JobHrRequirementsTab({ jobId, hrRequirements }: { jobId: string; hrRequirements: string[] }) {
  const [items, setItems] = useState(hrRequirements);
  const [draft, setDraft] = useState("");
  const [isPending, startTransition] = useTransition();

  function addItem() {
    const value = draft.trim();
    if (!value) return;
    setItems((prev) => [...prev, value]);
    setDraft("");
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function save() {
    startTransition(async () => {
      const result = await updateJobHrRequirementsAction({ jobId, hrRequirements: items });
      if (!result.success) toast.error(result.error);
      else toast.success("HR requirements saved");
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium">HR Requirements</h3>
        <p className="text-xs text-muted-foreground">
          Additional hiring requirements beyond the job description — visible only to HR. Candidates are evaluated
          against both the job description and these requirements.
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No HR requirements yet" description="Add requirements below." />
      ) : (
        <ul className="space-y-2">
          {items.map((item, index) => (
            <li key={index} className="flex items-start justify-between gap-3 rounded-lg border px-3 py-2">
              <p className="text-sm">{item}</p>
              <Button variant="ghost" size="icon-sm" disabled={isPending} onClick={() => removeItem(index)}>
                <X className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addItem();
            }
          }}
          placeholder="e.g. Must have led a team of 5+ engineers"
        />
        <Button type="button" variant="outline" onClick={addItem}>
          <Plus className="size-4" />
          Add
        </Button>
      </div>

      <Button disabled={isPending} onClick={save}>
        {isPending ? "Saving..." : "Save Requirements"}
      </Button>
    </div>
  );
}
