"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Mail, MessageSquareText, CalendarPlus, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { shortlistApplicantAction, rejectApplicantAction } from "@/actions/applicants";
import type { ApplicantStatus } from "@/constants/applicant-status";

type QuickActionsPanelProps = {
  applicantId: string;
  status: ApplicantStatus;
  hasPhone: boolean;
};

type SendKind = "email" | "sms" | null;

export function QuickActionsPanel({ applicantId, status, hasPhone }: QuickActionsPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [sending, setSending] = useState<SendKind>(null);

  function handleShortlist() {
    startTransition(async () => {
      const result = await shortlistApplicantAction(applicantId);
      if (result.success) toast.success("Applicant shortlisted");
      else toast.error(result.error);
    });
  }

  function handleReject() {
    startTransition(async () => {
      const result = await rejectApplicantAction(applicantId);
      if (result.success) toast.success("Applicant rejected");
      else toast.error(result.error);
    });
  }

  async function handleSend(kind: "email" | "sms") {
    setSending(kind);
    try {
      const response = await fetch(`/api/applicants/${applicantId}/send-${kind}`, { method: "POST" });
      const body = await response.json();

      if (!response.ok || !body.success) {
        toast.error(body?.error?.message ?? `Failed to send ${kind}`);
        return;
      }

      toast.success(kind === "email" ? "Email queued via n8n" : "SMS queued via n8n", {
        description: typeof body.data === "string" ? body.data : undefined,
      });
    } catch {
      toast.error(`Could not reach the ${kind} webhook`);
    } finally {
      setSending(null);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        className="w-full justify-start"
        disabled={isPending || status === "shortlisted"}
        onClick={handleShortlist}
      >
        <CheckCircle2 className="text-[var(--status-shortlisted)]" />
        Shortlist
      </Button>

      <Button
        variant="outline"
        className="w-full justify-start"
        nativeButton={false}
        render={<Link href={`/applicants/${applicantId}/schedule-interview`} />}
      >
        <CalendarPlus />
        Schedule Interview
      </Button>

      <Button
        variant="outline"
        className="w-full justify-start"
        disabled={sending === "email"}
        onClick={() => handleSend("email")}
      >
        <Mail />
        {sending === "email" ? "Sending..." : "Send Email"}
      </Button>

      <Button
        variant="outline"
        className="w-full justify-start"
        disabled={sending === "sms" || !hasPhone}
        title={hasPhone ? undefined : "No phone number on file"}
        onClick={() => handleSend("sms")}
      >
        <MessageSquareText />
        {sending === "sms" ? "Sending..." : "Send SMS"}
      </Button>

      <Button
        variant="destructive"
        className="w-full justify-start"
        disabled={isPending || status === "rejected"}
        onClick={handleReject}
      >
        <XCircle />
        Reject Applicant
      </Button>
    </div>
  );
}
