"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { requestAiCallSchema, type RequestAiCallInput } from "@/validators/ai-call";
import { requestAiCallAction } from "@/actions/ai-call";

function defaultDate() {
  return new Date().toISOString().slice(0, 10);
}

function defaultTime() {
  const inHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
  return inHourFromNow.toISOString().slice(11, 16);
}

type AiCallDialogProps = {
  applicantId: string;
  name: string;
  phone: string;
  email: string;
  jobTitle: string | null;
};

export function AiCallDialog({ applicantId, name, phone, email, jobTitle }: AiCallDialogProps) {
  const [open, setOpen] = useState(false);
  const hasPhone = Boolean(phone);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RequestAiCallInput>({
    resolver: zodResolver(requestAiCallSchema),
    defaultValues: {
      applicantId,
      name,
      phone,
      email,
      jobTitle: jobTitle ?? "",
      callDate: defaultDate(),
      callTime: defaultTime(),
      message: "",
      interviewerNames: "",
      meetingLink: "",
    },
  });

  async function onSubmit(values: RequestAiCallInput) {
    const result = await requestAiCallAction(values);
    if (result.success) {
      toast.success("AI call requested");
      setOpen(false);
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" className="w-full justify-start" disabled={!hasPhone} />}>
        <PhoneCall />
        {hasPhone ? "AI Call" : "No phone on file"}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request AI Call</DialogTitle>
          <DialogDescription>Review the details before triggering the call.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="name">Applicant Name</Label>
              <Input id="name" {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" {...register("phone")} />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="jobTitle">Job Title</Label>
              <Input id="jobTitle" {...register("jobTitle")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="callDate">Call Date</Label>
              <Input id="callDate" type="date" {...register("callDate")} />
              {errors.callDate && <p className="text-xs text-destructive">{errors.callDate.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="callTime">Call Time</Label>
              <Input id="callTime" type="time" {...register("callTime")} />
              {errors.callTime && <p className="text-xs text-destructive">{errors.callTime.message}</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="message">Message / Prompt</Label>
            <Textarea id="message" rows={4} placeholder="What should the AI say on this call?" {...register("message")} />
            {errors.message && <p className="text-xs text-destructive">{errors.message.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="interviewerNames">Interviewer Name(s)</Label>
            <Input
              id="interviewerNames"
              placeholder="e.g. Jane Doe, John Smith"
              {...register("interviewerNames")}
            />
            <p className="text-xs text-muted-foreground">Separate multiple names with commas.</p>
            {errors.interviewerNames && <p className="text-xs text-destructive">{errors.interviewerNames.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="meetingLink">Meeting Link</Label>
            <Input id="meetingLink" placeholder="https://meet.google.com/..." {...register("meetingLink")} />
            {errors.meetingLink && <p className="text-xs text-destructive">{errors.meetingLink.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Requesting..." : "Trigger AI Call"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
