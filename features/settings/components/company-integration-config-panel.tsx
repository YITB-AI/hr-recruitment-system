"use client";

import { useState, useTransition } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  updateWebhookConfigSchema,
  updateEmailConfigSchema,
  updateLinkedinConfigSchema,
  updateFacebookAppCredentialsSchema,
  updateXAppCredentialsSchema,
  type UpdateWebhookConfigInput,
  type UpdateEmailConfigInput,
  type UpdateLinkedinConfigInput,
  type UpdateFacebookAppCredentialsInput,
  type UpdateXAppCredentialsInput,
} from "@/validators/company-integration-config";
import {
  updateWebhookConfigAction,
  updateEmailConfigAction,
  updateLinkedinConfigAction,
  updateFacebookAppCredentialsAction,
  updateXAppCredentialsAction,
  setIndeedFeedEnabledAction,
} from "@/actions/company-integration-config";
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

function LinkedinConfigForm({ config }: { config: CompanyIntegrationConfigRow }) {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<UpdateLinkedinConfigInput>({
    resolver: zodResolver(updateLinkedinConfigSchema),
    defaultValues: { organizationUrn: config.linkedin.organizationUrn ?? "" },
  });

  async function onSubmit(values: UpdateLinkedinConfigInput) {
    const result = await updateLinkedinConfigAction(values);
    if (result.success) toast.success("LinkedIn configuration saved");
    else toast.error(result.error);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 rounded-xl border p-4">
      <div>
        <h4 className="text-sm font-semibold">LinkedIn</h4>
        <p className="text-xs text-muted-foreground">
          LinkedIn&apos;s real job-posting API requires a Talent Solutions partnership this app doesn&apos;t have — publishing
          opens a pre-filled LinkedIn share link for you to post yourself, it&apos;s never fully automatic.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="organizationUrn">Organization URN (optional, for future partner API use)</Label>
        <Input id="organizationUrn" placeholder="urn:li:organization:..." {...register("organizationUrn")} />
      </div>
      <Button type="submit" size="sm" variant="outline" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Save"}
      </Button>
    </form>
  );
}

function FacebookConfigForm({ config }: { config: CompanyIntegrationConfigRow }) {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<UpdateFacebookAppCredentialsInput>({
    resolver: zodResolver(updateFacebookAppCredentialsSchema),
    defaultValues: { appId: config.facebook.appId ?? "", appSecret: "" },
  });

  async function onSubmit(values: UpdateFacebookAppCredentialsInput) {
    const result = await updateFacebookAppCredentialsAction(values);
    if (result.success) toast.success("Facebook app credentials saved");
    else toast.error(result.error);
  }

  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div>
        <h4 className="text-sm font-semibold">Facebook</h4>
        <p className="text-xs text-muted-foreground">
          Requires your own Meta for Developers app. Meta&apos;s review for the posting permission requires business
          verification and can take real time — posting will fail with a clear error until that&apos;s approved.
        </p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="fb-appId">App ID</Label>
            <Input id="fb-appId" {...register("appId")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fb-appSecret">App Secret</Label>
            <Input id="fb-appSecret" type="password" placeholder="•••• (leave blank to keep)" {...register("appSecret")} />
          </div>
        </div>
        <Button type="submit" size="sm" variant="outline" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Credentials"}
        </Button>
      </form>
      <div className="flex items-center gap-2 border-t pt-3">
        <Button size="sm" nativeButton={false} render={<a href="/api/social/facebook/connect" />}>
          <ExternalLink className="size-4" />
          {config.facebook.connected ? "Reconnect Page" : "Connect Page"}
        </Button>
        {config.facebook.connected && (
          <span className="text-xs text-muted-foreground">Connected: Page {config.facebook.pageId}</span>
        )}
      </div>
    </div>
  );
}

function XConfigForm({ config }: { config: CompanyIntegrationConfigRow }) {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<UpdateXAppCredentialsInput>({
    resolver: zodResolver(updateXAppCredentialsSchema),
    defaultValues: { apiKey: config.x.apiKey ?? "", apiSecret: "" },
  });

  async function onSubmit(values: UpdateXAppCredentialsInput) {
    const result = await updateXAppCredentialsAction(values);
    if (result.success) toast.success("X app credentials saved");
    else toast.error(result.error);
  }

  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div>
        <h4 className="text-sm font-semibold">X (Twitter)</h4>
        <p className="text-xs text-muted-foreground">
          Requires your own X developer app. Whether your current API tier permits posting is something to confirm on
          X&apos;s pricing page.
        </p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="x-apiKey">API Key (Client ID)</Label>
            <Input id="x-apiKey" {...register("apiKey")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="x-apiSecret">API Secret</Label>
            <Input id="x-apiSecret" type="password" placeholder="•••• (leave blank to keep)" {...register("apiSecret")} />
          </div>
        </div>
        <Button type="submit" size="sm" variant="outline" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Credentials"}
        </Button>
      </form>
      <div className="flex items-center gap-2 border-t pt-3">
        <Button size="sm" nativeButton={false} render={<a href="/api/social/x/connect" />}>
          <ExternalLink className="size-4" />
          {config.x.connected ? "Reconnect Account" : "Connect Account"}
        </Button>
        {config.x.connected && <span className="text-xs text-muted-foreground">Connected</span>}
      </div>
    </div>
  );
}

function IndeedConfigForm({ config, feedUrl }: { config: CompanyIntegrationConfigRow; feedUrl: string }) {
  const [isPending, startTransition] = useTransition();
  const [enabled, setEnabled] = useState(config.indeed.feedEnabled);

  function handleToggle(checked: boolean) {
    setEnabled(checked);
    startTransition(async () => {
      const result = await setIndeedFeedEnabledAction(checked);
      if (!result.success) {
        toast.error(result.error);
        setEnabled(!checked);
      }
    });
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(feedUrl);
    toast.success("Feed URL copied");
  }

  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold">Indeed</h4>
          <p className="text-xs text-muted-foreground">
            No OAuth — Indeed uses a public XML feed. Enable it, register the URL below once in your Indeed employer
            account, then opt individual jobs into it from each job&apos;s Promote tab.
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={handleToggle} disabled={isPending} />
      </div>
      {enabled && (
        <div className="flex items-center gap-2">
          <Input readOnly value={feedUrl} className="font-mono text-xs" />
          <Button type="button" size="icon-sm" variant="outline" onClick={handleCopy}>
            <Copy className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

export function CompanyIntegrationConfigPanel({
  config,
  companySlug,
  appBaseUrl,
}: {
  config: CompanyIntegrationConfigRow;
  companySlug: string;
  appBaseUrl: string;
}) {
  const feedUrl = `${appBaseUrl}/api/job-feeds/${companySlug}/indeed.xml`;

  return (
    <div className="space-y-8">
      <WebhookConfigForm config={config} />
      <div className="border-t pt-6">
        <EmailConfigForm config={config} />
      </div>
      <div className="border-t pt-6">
        <h3 className="mb-1 text-sm font-semibold">Social Media Integration</h3>
        <p className="mb-4 text-xs text-muted-foreground">Used for multi-platform job posting from a Job&apos;s Promote tab.</p>
        <div className="max-w-xl space-y-4">
          <LinkedinConfigForm config={config} />
          <FacebookConfigForm config={config} />
          <XConfigForm config={config} />
          <IndeedConfigForm config={config} feedUrl={feedUrl} />
        </div>
      </div>
    </div>
  );
}
