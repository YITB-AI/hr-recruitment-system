"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createJobSchema, updateJobSchema, type CreateJobInput, type UpdateJobInput } from "@/validators/job";
import { createJobAction, updateJobAction } from "@/actions/jobs";
import { JOB_STATUSES, JOB_TYPES, EXPERIENCE_LEVELS, WORK_MODES, JOB_SALARY_CURRENCIES } from "@/constants/job";
import type { JobRow } from "@/server/repositories/job.repository";
import type { DepartmentRow } from "@/server/repositories/department.repository";

const STATUS_ITEMS = JOB_STATUSES.map((s) => ({ value: s, label: s }));
const TYPE_ITEMS = JOB_TYPES.map((t) => ({ value: t, label: t }));
const EXPERIENCE_ITEMS = EXPERIENCE_LEVELS.map((l) => ({ value: l, label: l }));
const WORK_MODE_ITEMS = WORK_MODES.map((m) => ({ value: m, label: m }));
const CURRENCY_ITEMS = JOB_SALARY_CURRENCIES.map((c) => ({ value: c, label: c }));
const NO_DEPARTMENT = "";
const NO_EXPERIENCE_LEVEL = "";
const NO_WORK_MODE = "";

type JobFormValues = CreateJobInput | UpdateJobInput;

export function JobForm({ job, departments }: { job?: JobRow; departments: DepartmentRow[] }) {
  const departmentItems = [
    { value: NO_DEPARTMENT, label: "No department" },
    ...departments.map((d) => ({ value: d.name, label: d.name })),
  ];
  const router = useRouter();
  const isEdit = Boolean(job);
  // Base UI's Input primitive warns ("changing the default value state of an
  // uncontrolled FieldControl") if a defaultValue expression is recomputed
  // on every render, which Controller's field.value naturally does after
  // each onBlur commit — so this field is kept as its own controlled string
  // state instead, synced into the array-typed RHF field only on blur.
  const [skillsText, setSkillsText] = useState((job?.skills ?? []).join(", "));
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<JobFormValues>({
    // The .refine() on both schemas (salary min <= max) widens their inferred
    // type enough that TS can't unify the ternary's result with the shared
    // JobFormValues union on its own — a well-known zodResolver+refine+
    // ternary-schema gotcha, not a real type mismatch (both schemas' actual
    // shapes match JobFormValues exactly).
    resolver: zodResolver(isEdit ? updateJobSchema : createJobSchema) as Resolver<JobFormValues>,
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
          salaryMin: job.salaryMin ?? undefined,
          salaryMax: job.salaryMax ?? undefined,
          salaryCurrency: (job.salaryCurrency as CreateJobInput["salaryCurrency"]) ?? "USD",
          experienceLevel: (job.experienceLevel as CreateJobInput["experienceLevel"]) ?? undefined,
          workMode: (job.workMode as CreateJobInput["workMode"]) ?? undefined,
          skills: job.skills,
          responsibilities: job.responsibilities,
          featured: job.featured,
        }
      : {
          title: "",
          description: "",
          department: "",
          city: "",
          state: "",
          country: "",
          status: "Open",
          type: "Full-time",
          salaryCurrency: "USD",
          skills: [],
          responsibilities: [],
          featured: false,
        },
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Select items={STATUS_ITEMS} value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
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
        <div className="space-y-1.5">
          <Label>Experience Level</Label>
          <Controller
            control={control}
            name="experienceLevel"
            render={({ field }) => (
              <Select
                items={[{ value: NO_EXPERIENCE_LEVEL, label: "Not specified" }, ...EXPERIENCE_ITEMS]}
                value={field.value ?? NO_EXPERIENCE_LEVEL}
                onValueChange={(v) => field.onChange(v || undefined)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Not specified" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_EXPERIENCE_LEVEL}>Not specified</SelectItem>
                  {EXPERIENCE_LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Work Mode</Label>
          <Controller
            control={control}
            name="workMode"
            render={({ field }) => (
              <Select
                items={[{ value: NO_WORK_MODE, label: "Not specified" }, ...WORK_MODE_ITEMS]}
                value={field.value ?? NO_WORK_MODE}
                onValueChange={(v) => field.onChange(v || undefined)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Not specified" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_WORK_MODE}>Not specified</SelectItem>
                  {WORK_MODES.map((mode) => (
                    <SelectItem key={mode} value={mode}>
                      {mode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Salary Range</Label>
        <div className="grid grid-cols-3 gap-4">
          <Input type="number" min={0} placeholder="Min" {...register("salaryMin", { valueAsNumber: true })} />
          <Input type="number" min={0} placeholder="Max" {...register("salaryMax", { valueAsNumber: true })} />
          <Controller
            control={control}
            name="salaryCurrency"
            render={({ field }) => (
              <Select items={CURRENCY_ITEMS} value={field.value ?? "USD"} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {JOB_SALARY_CURRENCIES.map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        {errors.salaryMax && <p className="text-xs text-destructive">{errors.salaryMax.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="skills">Skills</Label>
        <Controller
          control={control}
          name="skills"
          render={({ field }) => (
            <Input
              id="skills"
              placeholder="React, TypeScript, Node.js"
              value={skillsText}
              onChange={(e) => setSkillsText(e.target.value)}
              onBlur={() =>
                field.onChange(
                  skillsText
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                )
              }
            />
          )}
        />
        <p className="text-xs text-muted-foreground">Comma-separated.</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="responsibilities">Responsibilities</Label>
        <Controller
          control={control}
          name="responsibilities"
          render={({ field }) => (
            <Textarea
              id="responsibilities"
              rows={4}
              placeholder={"Develop and maintain features\nCollaborate with design and product"}
              defaultValue={(field.value ?? []).join("\n")}
              onBlur={(e) =>
                field.onChange(
                  e.target.value
                    .split("\n")
                    .map((s) => s.trim())
                    .filter(Boolean),
                )
              }
            />
          )}
        />
        <p className="text-xs text-muted-foreground">One per line.</p>
      </div>

      <div className="flex items-center gap-2">
        <Controller
          control={control}
          name="featured"
          render={({ field }) => <Checkbox checked={field.value ?? false} onCheckedChange={field.onChange} />}
        />
        <Label className="font-normal">Featured job posting</Label>
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
