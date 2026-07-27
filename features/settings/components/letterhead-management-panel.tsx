"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Upload, Ruler } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { uploadLetterheadAction, deleteLetterheadAction, updateLetterheadMarginsAction } from "@/actions/letterheads";
import type { LetterheadRow } from "@/server/repositories/letterhead.repository";

function MarginsDialog({ letterhead, open, onOpenChange }: { letterhead: LetterheadRow; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [topMarginIn, setTopMarginIn] = useState(String(letterhead.contentTopMarginIn));
  const [bottomMarginIn, setBottomMarginIn] = useState(String(letterhead.contentBottomMarginIn));
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    const top = Number(topMarginIn);
    const bottom = Number(bottomMarginIn);
    if (!Number.isFinite(top) || !Number.isFinite(bottom)) {
      toast.error("Enter valid numbers");
      return;
    }
    startTransition(async () => {
      const result = await updateLetterheadMarginsAction(letterhead._id, top, bottom);
      if (result.success) {
        toast.success("Margins updated");
        onOpenChange(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Content Margins — {letterhead.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-xs text-muted-foreground">
            How much of the top/bottom of the page body text must stay clear of, so it doesn&apos;t overlap this letterhead&apos;s own
            logo/title or footer bar. If a generated document shows text overlapping the letterhead, increase the relevant value.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="margin-top">Top margin (in)</Label>
              <Input id="margin-top" type="number" min="0" max="4" step="0.1" value={topMarginIn} onChange={(e) => setTopMarginIn(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="margin-bottom">Bottom margin (in)</Label>
              <Input
                id="margin-bottom"
                type="number"
                min="0"
                max="4"
                step="0.1"
                value={bottomMarginIn}
                onChange={(e) => setBottomMarginIn(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={isPending} />}>Cancel</DialogClose>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function LetterheadManagementPanel({ letterheads }: { letterheads: LetterheadRow[] }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();
  const [marginsFor, setMarginsFor] = useState<LetterheadRow | null>(null);
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
            Upload one or more complete letterheads — an image or a PDF (its first page is used) — with your logo, name, and
            address however you design them. If you upload just one, it&apos;s used automatically on every generated document.
            Upload more than one and you&apos;ll be asked which to use each time you generate a document.
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
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon-sm" disabled={isPending} onClick={() => setMarginsFor(letterhead)} title="Adjust content margins">
                    <Ruler className="size-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" disabled={isPending} onClick={() => handleDelete(letterhead)} title="Delete">
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
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
              <Label>Image or PDF</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,application/pdf"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="size-4" />
                {file ? file.name : "Choose File"}
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

      {marginsFor && <MarginsDialog letterhead={marginsFor} open={marginsFor !== null} onOpenChange={(next) => !next && setMarginsFor(null)} />}
    </div>
  );
}
