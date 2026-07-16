"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createApplicationAction } from "@/actions/applicants";

type Job = { _id: string; title: string };

export function CreateApplicationDialog({ jobs }: { jobs: Job[] }) {
  const [open, setOpen] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const jobItems = jobs.map((job) => ({ value: job._id, label: job.title }));

  function reset() {
    setJobId(null);
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleSubmit() {
    if (!jobId) {
      toast.error("Select a job");
      return;
    }
    if (!file) {
      toast.error("Choose a CV file");
      return;
    }

    const formData = new FormData();
    formData.set("jobId", jobId);
    formData.set("file", file);

    startTransition(async () => {
      const result = await createApplicationAction(formData);
      if (result.success) {
        toast.success("Application submitted for processing");
        setOpen(false);
        reset();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={<Button />}>
        <Plus className="size-4" />
        Create Application
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Application</DialogTitle>
          <DialogDescription>
            Upload a candidate's CV and select the job — an n8n workflow will process it and create the applicant.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="create-application-job">Job</Label>
            <Select items={jobItems} value={jobId} onValueChange={(value) => setJobId(value)}>
              <SelectTrigger id="create-application-job" className="w-full">
                <SelectValue placeholder="Select a job" />
              </SelectTrigger>
              <SelectContent>
                {jobItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="create-application-file">Candidate CV</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="size-4" />
                {file ? file.name : "Choose PDF, DOC, or DOCX"}
              </Button>
            </div>
            <input
              ref={fileInputRef}
              id="create-application-file"
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-muted-foreground">PDF, DOC, or DOCX, up to 10MB.</p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Submitting..." : "Submit Application"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
