"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { uploadLetterheadAction, deleteLetterheadAction } from "@/actions/letterheads";
import type { LetterheadRow } from "@/server/repositories/letterhead.repository";

export function LetterheadManagementPanel({ letterheads }: { letterheads: LetterheadRow[] }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function openCreate() {
    setName("");
    setFile(null);
    setOpen(true);
  }

  function handleUpload() {
    if (!file) return;
    const formData = new FormData();
    formData.set("name", name);
    formData.set("file", file);
    startTransition(async () => {
      const result = await uploadLetterheadAction(formData);
      if (result.success) {
        toast.success("Letterhead uploaded");
        setOpen(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleDelete(letterhead: LetterheadRow) {
    if (!confirm(`Delete "${letterhead.name}"?`)) return;
    startTransition(async () => {
      const result = await deleteLetterheadAction(letterhead._id);
      if (result.success) toast.success("Letterhead deleted");
      else toast.error(result.error);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Letterheads</h3>
          <p className="text-xs text-muted-foreground">
            Upload one or more complete letterhead images (logo + name + address, however you design them). If you upload just
            one, it's used automatically on every generated document. Upload more than one and you'll be asked which to use each
            time you generate a document.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4" />
          Upload Letterhead
        </Button>
      </div>

      {letterheads.length === 0 ? (
        <EmptyState icon={Upload} title="No letterheads uploaded" description="Upload one to have it applied to generated documents automatically." />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {letterheads.map((letterhead) => (
            <div key={letterhead._id} className="space-y-2 rounded-xl border p-2">
              <div className="flex h-16 items-center justify-center rounded-lg bg-muted/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={letterhead.imageUrl} alt={letterhead.name} className="max-h-14 max-w-full object-contain" />
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-xs font-medium">{letterhead.name}</p>
                <Button variant="ghost" size="icon-sm" disabled={isPending} onClick={() => handleDelete(letterhead)}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Letterhead</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="letterhead-name">Name</Label>
              <Input id="letterhead-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Main Letterhead" />
            </div>
            <div className="space-y-1.5">
              <Label>Image</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="size-4" />
                {file ? file.name : "Choose Image"}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" disabled={isPending} />}>Cancel</DialogClose>
            <Button onClick={handleUpload} disabled={isPending || !name.trim() || !file}>
              {isPending ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
