"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteTemplateAction } from "@/actions/document-templates";

export function DeleteTemplateButton({ id, name }: { id: string; name: string }) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`Delete "${name}"? This can't be undone.`)) return;

    startTransition(async () => {
      const result = await deleteTemplateAction(id);
      if (!result.success) toast.error(result.error);
      else toast.success("Template deleted");
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="text-muted-foreground hover:text-destructive"
      disabled={isPending}
      onClick={handleDelete}
    >
      <Trash2 className="size-4" />
    </Button>
  );
}
