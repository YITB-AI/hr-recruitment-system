"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Upload, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { validateEmployeeImportAction, commitEmployeeImportAction } from "@/actions/employees";
import { EmployeeImportPreviewTable } from "./employee-import-preview-table";
import { EmployeeImportResults } from "./employee-import-results";
import type { ImportRowResult, ImportCommitResultItem } from "@/features/employees/services/employee-import.service";

type Step = "upload" | "preview" | "results";

export function EmployeeImportDialog({ bulkEmployeeImportEnabled }: { bulkEmployeeImportEnabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<ImportRowResult[]>([]);
  const [results, setResults] = useState<ImportCommitResultItem[]>([]);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function openDialog() {
    setStep("upload");
    setFile(null);
    setRows([]);
    setResults([]);
    setOpen(true);
  }

  function handleValidate() {
    if (!file) return;
    const formData = new FormData();
    formData.set("file", file);
    startTransition(async () => {
      const result = await validateEmployeeImportAction(formData);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setRows(result.rows);
      setStep("preview");
    });
  }

  function handleCommit() {
    const validRows = rows.filter((r) => r.success).map((r) => ({ row: r.row, input: r.resolved }));
    if (validRows.length === 0) return;
    startTransition(async () => {
      const result = await commitEmployeeImportAction(validRows);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setResults(result.results);
      setStep("results");
      toast.success(`${result.successCount} employee${result.successCount === 1 ? "" : "s"} imported`);
    });
  }

  const readyCount = rows.filter((r) => r.success).length;

  return (
    <>
      <Button
        variant="outline"
        onClick={openDialog}
        disabled={!bulkEmployeeImportEnabled}
        title={!bulkEmployeeImportEnabled ? "Bulk Employee Import isn't enabled for your company — contact your platform administrator." : undefined}
      >
        <Upload className="size-4" />
        {bulkEmployeeImportEnabled ? "Import" : "Import (not enabled)"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Employees</DialogTitle>
          </DialogHeader>

          {step === "upload" && (
            <div className="space-y-3 py-2">
              <p className="text-sm text-muted-foreground">
                Upload a .csv or .xlsx file of employees to add in bulk. Department, status, and employee type must
                match names already configured for your company.
              </p>
              <Button variant="outline" nativeButton={false} render={<a href="/api/employees/import-template" />}>
                <Download className="size-4" />
                Download Template
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="size-4" />
                {file ? file.name : "Choose File"}
              </Button>
            </div>
          )}

          {step === "preview" && <div className="py-2">{rows.length > 0 && <EmployeeImportPreviewTable rows={rows} />}</div>}

          {step === "results" && <div className="py-2">{results.length > 0 && <EmployeeImportResults results={results} />}</div>}

          <DialogFooter>
            {step === "upload" && (
              <>
                <DialogClose render={<Button variant="outline" disabled={isPending} />}>Cancel</DialogClose>
                <Button onClick={handleValidate} disabled={isPending || !file}>
                  {isPending ? "Reading..." : "Continue"}
                </Button>
              </>
            )}
            {step === "preview" && (
              <>
                <Button variant="outline" disabled={isPending} onClick={() => setStep("upload")}>
                  Back
                </Button>
                <Button onClick={handleCommit} disabled={isPending || readyCount === 0}>
                  {isPending ? "Importing..." : `Import ${readyCount} Employee${readyCount === 1 ? "" : "s"}`}
                </Button>
              </>
            )}
            {step === "results" && <DialogClose render={<Button />}>Done</DialogClose>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
