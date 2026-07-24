"use client";

import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  updateWebhookConfigSchema,
  updateEmailConfigSchema,
  type UpdateWebhookConfigInput,
  type UpdateEmailConfigInput,
} from "@/validators/company-integration-config";
import { updateWebhookConfigAction, updateEmailConfigAction } from "@/actions/company-integration-config";
import type { CompanyIntegrationConfigRow } from "@/server/repositories/company-integration-config.repository";
import type { WebhookAction } from "@/config/webhooks";

const WEBHOOK_ACTION_LABELS: Record<WebhookAction, string> = {
  "send-email": "Send Email (applicant notifications)",
  "send-sms": "Send SMS",
  "ai-call": "AI Call",
  "create-application": "Create Application",
  "send-account-email": "Account Email (OTP, welcome emails)",
  "sync-jobs": "Sync Jobs",
  "sync-all": "Sync All",
};
const WEBHOOK_ACTIONS = Object.keys(WEBHOOK_ACTION_LABELS) as WebhookAction[];

function WebhookConfigForm({ config }: { config: CompanyIntegrationConfigRow }) {
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<UpdateWebhookConfigInput>({
    resolver: zodResolver(updateWebhookConfigSchema),
    defaultValues: {
      webhookUrls: Object.fromEntries(WEBHOOK_ACTIONS.map((action) => [action, config.webhookUrls[action] ?? ""])) as UpdateWebhookConfigInput["webhookUrls"],
      webhookAuthHeaderValue: "",
    },
  });

  async function onSubmit(values: UpdateWebhookConfigInput) {
    const result = await updateWebhookConfigAction(values);
    if (result.success) toast.success("n8n webhook configuration saved");
    else toast.error(result.error);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-xl space-y-4">
      <div>
        <h3 className="text-sm font-semibold">n8n Integration</h3>
        <p className="text-xs text-muted-foreground">
          Override the webhook URL for any action below. Leave a field blank to use the shared default configured for this
          deployment.
        </p>
      </div>
      {WEBHOOK_ACTIONS.map((action) => (
        <div key={action} className="space-y-1.5">
          <Label htmlFor={`webhook-${action}`}>{WEBHOOK_ACTION_LABELS[action]}</Label>
          <Input id={`webhook-${action}`} placeholder="https://..." {...register(`webhookUrls.${action}`)} />
        </div>
      ))}
      <div className="space-y-1.5">
        <Label htmlFor="webhookAuthHeaderValue">Webhook Auth Header Value</Label>
        <Input
          id="webhookAuthHeaderValue"
          type="password"
          placeholder={config.hasWebhookAuthHeaderValue ? "•••• (saved — leave blank to keep)" : "Not set"}
          {...register("webhookAuthHeaderValue")}
        />
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Save n8n Configuration"}
      </Button>
    </form>
  );
}

function EmailConfigForm({ config }: { config: CompanyIntegrationConfigRow }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UpdateEmailConfigInput>({
    // z.coerce.number() on smtpPort makes the resolver's inferred INPUT type
    // (unknown) diverge from useForm's expected OUTPUT type (number |
    // undefined) — same well-known zodResolver+coerce gotcha already worked
    // around in job-form.tsx, not a real type mismatch.
    resolver: zodResolver(updateEmailConfigSchema) as Resolver<UpdateEmailConfigInput>,
    defaultValues: {
      senderName: config.email.senderName ?? "",
      senderEmail: config.email.senderEmail ?? "",
      smtpHost: config.email.smtpHost ?? "",
      smtpPort: config.email.smtpPort ?? undefined,
      smtpUser: config.email.smtpUser ?? "",
      smtpPassword: "",
    },
  });

  async function onSubmit(values: UpdateEmailConfigInput) {
    const result = await updateEmailConfigAction(values);
    if (result.success) toast.success("Email configuration saved");
    else toast.error(result.error);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-xl space-y-4">
      <div>
        <h3 className="text-sm font-semibold">Email Configuration</h3>
        <p className="text-xs text-muted-foreground">
          Sender identity and SMTP details passed to your n8n email workflow — this app doesn&apos;t send email directly,
          it always relays through n8n.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="senderName">Sender Name</Label>
          <Input id="senderName" {...register("senderName")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="senderEmail">Sender Email</Label>
          <Input id="senderEmail" type="email" {...register("senderEmail")} />
          {errors.senderEmail && <p className="text-xs text-destructive">{errors.senderEmail.message}</p>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="smtpHost">SMTP Host</Label>
          <Input id="smtpHost" {...register("smtpHost")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="smtpPort">SMTP Port</Label>
          <Input id="smtpPort" type="number" {...register("smtpPort")} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="smtpUser">SMTP User</Label>
          <Input id="smtpUser" {...register("smtpUser")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="smtpPassword">SMTP Password</Label>
          <Input
            id="smtpPassword"
            type="password"
            placeholder={config.email.hasSmtpPassword ? "•••• (saved — leave blank to keep)" : "Not set"}
            {...register("smtpPassword")}
          />
        </div>
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Save Email Configuration"}
      </Button>
    </form>
  );
}

export function CompanyIntegrationConfigPanel({ config }: { config: CompanyIntegrationConfigRow }) {
  return (
    <div className="space-y-8">
      <WebhookConfigForm config={config} />
      <div className="border-t pt-6">
        <EmailConfigForm config={config} />
      </div>
    </div>
  );
}
