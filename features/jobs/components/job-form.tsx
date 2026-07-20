"use client";

import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createJobSchema, updateJobSchema, type CreateJobInput, type UpdateJobInput } from "@/validators/job";
import { createJobAction, updateJobAction } from "@/actions/jobs";
import { JOB_STATUSES, JOB_TYPES } from "@/constants/job";
import type { JobRow } from "@/server/repositories/job.repository";
import type { DepartmentRow } from "@/server/repositories/department.repository";

const STATUS_ITEMS = JOB_STATUSES.map((s) => ({ value: s, label: s }));
const TYPE_ITEMS = JOB_TYPES.map((t) => ({ value: t, label: t }));
const NO_DEPARTMENT = "";

type JobFormValues = CreateJobInput | UpdateJobInput;

export function JobForm({ job, departments }: { job?: JobRow; departments: DepartmentRow[] }) {
  const departmentItems = [
    { value: NO_DEPARTMENT, label: "No department" },
    ...departments.map((d) => ({ value: d.name, label: d.name })),
  ];
  const router = useRouter();
  const isEdit = Boolean(job);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<JobFormValues>({
    resolver: zodResolver(isEdit ? updateJobSchema : createJobSchema),
    defaultValues: job
      ? {
          jobId: job._id,
          title: job.title,
          description: job.description ?? "",
          department: job.department,
          city: job.city,
          state: job.state,
          country: job.country,
          status: (job.status as CreateJobInput["status"]) ?? "Open",
          type: (job.type as CreateJobInput["type"]) ?? "Full-time",
        }
      : { title: "", description: "", department: "", city: "", state: "", country: "", status: "Open", type: "Full-time" },
  });

  async function onSubmit(values: JobFormValues) {
    const result = isEdit ? await updateJobAction(values) : await createJobAction(values);
    // On success the action calls redirect(), which throws internally and
    // never returns here — only the failure path produces a value.
    if (result && !result.success) toast.error(result.error);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="title">Job Title</Label>
        <Input id="title" {...register("title")} placeholder="Senior Frontend Developer" />
        {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" {...register("description")} rows={4} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Department</Label>
          <Controller
            control={control}
            name="department"
            render={({ field }) => (
              <Select items={departmentItems} value={field.value ?? NO_DEPARTMENT} onValueChange={(v) => field.onChange(v ?? NO_DEPARTMENT)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="No department" />
                </SelectTrigger>
                <SelectContent>
                  {departmentItems.map((item) => (
                    <SelectItem key={item.value || "none"} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Job Type</Label>
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <Select items={TYPE_ITEMS} value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {JOB_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="city">City</Label>
          <Input id="city" {...register("city")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="state">State</Label>
          <Input id="state" {...register("state")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="country">Country</Label>
          <Input id="country" {...register("country")} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Status</Label>
        <Controller
          control={control}
          name="status"
          render={({ field }) => (
            <Select items={STATUS_ITEMS} value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {JOB_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="flex justify-end gap-2 border-t pt-4">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : isEdit ? "Save Changes" : "Create Job"}
        </Button>
      </div>
    </form>
  );
}
