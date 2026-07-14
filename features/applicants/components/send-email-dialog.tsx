"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { sendApplicantEmailAction } from "@/actions/email";
import { EMAIL_TEMPLATE_LABELS, type EmailTemplate } from "@/constants/email";

type SendEmailDialogProps = {
  applicantId: string;
  applicantEmail: string;
  template: EmailTemplate;
  interviewId?: string;
  triggerLabel?: string;
  triggerVariant?: React.ComponentProps<typeof Button>["variant"];
  triggerClassName?: string;
};

export function SendEmailDialog({
  applicantId,
  applicantEmail,
  template,
  interviewId,
  triggerLabel = "Send Email",
  triggerVariant = "outline",
  triggerClassName = "w-full justify-start",
}: SendEmailDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await sendApplicantEmailAction({ applicantId, template, interviewId });
      if (result.success) {
        toast.success("Email sent");
        setOpen(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  const hasEmail = Boolean(applicantEmail);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={triggerVariant} className={triggerClassName} disabled={!hasEmail} />}>
        <Mail />
        {hasEmail ? triggerLabel : "No email on file"}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{EMAIL_TEMPLATE_LABELS[template]}</DialogTitle>
          <DialogDescription>Review the details before sending.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">To</span>
            <span className="font-medium">{applicantEmail}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Subject</span>
            <span className="font-medium">{EMAIL_TEMPLATE_LABELS[template]}</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isPending}>
            {isPending ? "Sending..." : "Send Email"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
