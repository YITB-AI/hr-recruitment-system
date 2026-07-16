"use client";

import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
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
import { scheduleInterviewSchema, type ScheduleInterviewInput } from "@/validators/interview";
import { scheduleInterviewAction, rescheduleInterviewAction } from "@/actions/interviews";
import { INTERVIEW_TYPES, type InterviewType } from "@/constants/interview";
import type { UserRow } from "@/server/repositories/user.repository";

const TYPE_LABELS: Record<string, string> = {
  technical: "Technical Interview",
  hr: "HR Interview",
  managerial: "Managerial Interview",
  final: "Final Interview",
};

const DURATIONS = [30, 45, 60, 90, 120];

// Base UI's <Select.Value> renders the raw value unless the Root is given an
// `items` lookup — without these, these selects showed raw values like
// "technical" or "60" instead of their labels.
const INTERVIEW_TYPE_ITEMS = INTERVIEW_TYPES.map((type) => ({ value: type, label: TYPE_LABELS[type] }));
const DURATION_ITEMS = DURATIONS.map((d) => ({ value: String(d), label: `${d} Minutes` }));

export type RescheduleSeed = {
  oldInterviewId: string;
  type: InterviewType;
  interviewerIds: string[];
  durationMinutes: number;
  meetingLink: string;
  notes: string;
};

export function ScheduleInterviewForm({
  applicantId,
  interviewers,
  reschedule,
}: {
  applicantId: string;
  interviewers: UserRow[];
  /** When set, the form is in reschedule mode — pre-filled from the old
   * interview (date/time left blank for the user to pick) and submits to
   * rescheduleInterviewAction instead of scheduleInterviewAction. */
  reschedule?: RescheduleSeed;
}) {
  const router = useRouter();
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ScheduleInterviewInput>({
    resolver: zodResolver(scheduleInterviewSchema),
    defaultValues: {
      applicantId,
      type: reschedule?.type ?? "technical",
      interviewerIds: reschedule?.interviewerIds ?? [],
      durationMinutes: reschedule?.durationMinutes ?? 60,
      meetingLink: reschedule?.meetingLink ?? "",
      notes: reschedule?.notes ?? "",
    },
  });

  async function onSubmit(values: ScheduleInterviewInput) {
    const result = reschedule
      ? await rescheduleInterviewAction({ ...values, oldInterviewId: reschedule.oldInterviewId })
      : await scheduleInterviewAction(values);
    if (result.success) {
      toast.success(reschedule ? "Interview rescheduled" : "Interview scheduled");
      router.push(`/applicants/${applicantId}`);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-1.5">
        <Label>Interview Type</Label>
        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <Select items={INTERVIEW_TYPE_ITEMS} value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {INTERVIEW_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Interviewers</Label>
        <Controller
          control={control}
          name="interviewerIds"
          render={({ field }) => (
            <div className="space-y-2 rounded-lg border p-3">
              {interviewers.length === 0 && (
                <p className="text-sm text-muted-foreground">No users found.</p>
              )}
              {interviewers.map((interviewer) => {
                const checked = field.value.includes(interviewer._id);
                return (
                  <label key={interviewer._id} className="flex items-center gap-2.5 text-sm">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(value) => {
                        field.onChange(
                          value
                            ? [...field.value, interviewer._id]
                            : field.value.filter((id) => id !== interviewer._id),
                        );
                      }}
                    />
                    {interviewer.name}
                    {interviewer.title && (
                      <span className="text-xs text-muted-foreground">({interviewer.title})</span>
                    )}
                  </label>
                );
              })}
            </div>
          )}
        />
        {errors.interviewerIds && (
          <p className="text-xs text-destructive">{errors.interviewerIds.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="date">Date</Label>
          <Input id="date" type="date" {...register("date")} />
          {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="time">Time</Label>
          <Input id="time" type="time" {...register("time")} />
          {errors.time && <p className="text-xs text-destructive">{errors.time.message}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Duration</Label>
        <Controller
          control={control}
          name="durationMinutes"
          render={({ field }) => (
            <Select
              items={DURATION_ITEMS}
              value={String(field.value)}
              onValueChange={(v) => field.onChange(Number(v))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATIONS.map((d) => (
                  <SelectItem key={d} value={String(d)}>
                    {d} Minutes
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="meetingLink">Meeting Link</Label>
        <Input id="meetingLink" placeholder="https://meet.google.com/..." {...register("meetingLink")} />
        {errors.meetingLink && <p className="text-xs text-destructive">{errors.meetingLink.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" placeholder="Anything the interviewer should know..." {...register("notes")} />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/applicants/${applicantId}`)}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : reschedule ? "Reschedule Interview" : "Schedule Interview"}
        </Button>
      </div>
    </form>
  );
}
