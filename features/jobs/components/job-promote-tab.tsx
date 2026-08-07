"use client";

import { useState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Megaphone, Plus, Trash2, ExternalLink, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { HiringPipeline } from "@/features/jobs/components/hiring-pipeline";
import { logJobPromotionAction, removeJobPromotionLogEntryAction } from "@/actions/jobs";
import { publishJobToPlatformAction, setPostToIndeedAction } from "@/actions/job-posting";
import { logJobPromotionSchema, type LogJobPromotionInput } from "@/validators/job";
import { PROMOTION_CHANNELS, PROMOTION_CHANNEL_LABELS, JOB_POSTING_PLATFORMS, JOB_POSTING_PLATFORM_LABELS } from "@/constants/job";
import type { PromotionLogEntry, PlatformPosting } from "@/server/repositories/job.repository";
import { Switch } from "@/components/ui/switch";
import { confirmAction } from "@/store/confirm-store";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function LogPromotionDialog({ jobId }: { jobId: string }) {
  const [open, setOpen] = useState(false);
  const {
    control,
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LogJobPromotionInput>({
    resolver: zodResolver(logJobPromotionSchema),
    defaultValues: { jobId, channel: "linkedin", customChannel: "", url: "", notes: "" },
  });
  const channel = watch("channel");

  async function onSubmit(values: LogJobPromotionInput) {
    const result = await logJobPromotionAction(values);
    if (result.success) {
      toast.success("Promotion logged");
      reset({ jobId, channel: "linkedin", customChannel: "", url: "", notes: "" });
      setOpen(false);
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="size-4" />
        Log Promotion
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log a Promotion</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Channel</Label>
            <Controller
              control={control}
              name="channel"
              render={({ field }) => (
                <Select items={PROMOTION_CHANNELS.map((c) => ({ value: c, label: PROMOTION_CHANNEL_LABELS[c] }))} value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROMOTION_CHANNELS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {PROMOTION_CHANNEL_LABELS[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          {channel === "other" && (
            <div className="space-y-1.5">
              <Label htmlFor="customChannel">Channel Name</Label>
              <Input id="customChannel" placeholder="e.g. Local job fair" {...register("customChannel")} />
              {errors.customChannel && <p className="text-xs text-destructive">{errors.customChannel.message}</p>}
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="url">Posting URL (Optional)</Label>
            <Input id="url" placeholder="https://..." {...register("url")} />
            {errors.url && <p className="text-xs text-destructive">{errors.url.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea id="notes" rows={3} {...register("notes")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Logging..." : "Log Promotion"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PublishToJobBoards({
  jobId,
  platformPostings,
  postToIndeed,
  socialJobPostingEnabled,
  indeedJobFeedEnabled,
}: {
  jobId: string;
  platformPostings: PlatformPosting[];
  postToIndeed: boolean;
  socialJobPostingEnabled: boolean;
  indeedJobFeedEnabled: boolean;
}) {
  const [pending, setPending] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const postingByPlatform = new Map(platformPostings.map((p) => [p.platform, p]));

  function handlePublish(platform: (typeof JOB_POSTING_PLATFORMS)[number]) {
    setPending(platform);
    startTransition(async () => {
      const result = await publishJobToPlatformAction(jobId, platform);
      setPending(null);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      if (result.result.ok) {
        toast.success(`Published to ${JOB_POSTING_PLATFORM_LABELS[platform]}`);
      } else if (result.result.requiresManualAction) {
        window.open(result.result.requiresManualAction.url, "_blank", "noopener,noreferrer");
        toast.info(result.result.error);
      } else {
        toast.error(result.result.error);
      }
    });
  }

  function handleToggleIndeed(checked: boolean) {
    startTransition(async () => {
      const result = await setPostToIndeedAction(jobId, checked);
      if (!result.success) toast.error(result.error);
    });
  }

  return (
    <div>
      <h3 className="mb-4 text-sm font-medium">Publish to Job Boards</h3>
      <div className="divide-y rounded-xl border">
        {JOB_POSTING_PLATFORMS.map((platform) => {
          const posting = postingByPlatform.get(platform);
          if (platform === "indeed") {
            return (
              <div key={platform} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{JOB_POSTING_PLATFORM_LABELS[platform]}</p>
                  <p className="text-xs text-muted-foreground">
                    {indeedJobFeedEnabled
                      ? "Indeed uses a public XML feed, not a per-job publish action — enable it and configure the feed URL in Settings > Integrations, then opt this job in here."
                      : "Not enabled for your company — contact your platform administrator."}
                  </p>
                </div>
                <Switch checked={postToIndeed} onCheckedChange={handleToggleIndeed} disabled={isPending || !indeedJobFeedEnabled} />
              </div>
            );
          }
          return (
            <div key={platform} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-medium">{JOB_POSTING_PLATFORM_LABELS[platform]}</p>
                {posting && (
                  <p className="text-xs text-muted-foreground">
                    {posting.status === "published" && posting.externalPostUrl ? (
                      <a href={posting.externalPostUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        View post
                      </a>
                    ) : posting.status === "failed" ? (
                      <span className="text-destructive">{posting.error}</span>
                    ) : (
                      posting.status
                    )}
                  </p>
                )}
                {!socialJobPostingEnabled && (
                  <p className="text-xs text-muted-foreground">Not enabled for your company — contact your platform administrator.</p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={(isPending && pending === platform) || !socialJobPostingEnabled}
                onClick={() => handlePublish(platform)}
              >
                {isPending && pending === platform ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : platform === "linkedin" ? (
                  <ExternalLink className="size-4" />
                ) : (
                  <Send className="size-4" />
                )}
                {platform === "linkedin" ? "Open LinkedIn to Post" : "Publish"}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function JobPromoteTab({
  jobId,
  promotionLog,
  sourceBreakdown,
  platformPostings,
  postToIndeed,
  socialJobPostingEnabled,
  indeedJobFeedEnabled,
}: {
  jobId: string;
  promotionLog: PromotionLogEntry[];
  sourceBreakdown: Array<{ label: string; count: number }>;
  platformPostings: PlatformPosting[];
  postToIndeed: boolean;
  socialJobPostingEnabled: boolean;
  indeedJobFeedEnabled: boolean;
}) {
  const totalApplicants = sourceBreakdown.reduce((sum, row) => sum + row.count, 0);

  async function handleRemove(entryId: string) {
    if (!(await confirmAction({ title: "Remove this promotion log entry?" }))) return;
    const result = await removeJobPromotionLogEntryAction({ jobId, entryId });
    if (!result.success) toast.error(result.error);
  }

  return (
    <div className="space-y-8">
      <PublishToJobBoards
        jobId={jobId}
        platformPostings={platformPostings}
        postToIndeed={postToIndeed}
        socialJobPostingEnabled={socialJobPostingEnabled}
        indeedJobFeedEnabled={indeedJobFeedEnabled}
      />

      <div>
        <h3 className="mb-4 text-sm font-medium">Where Applicants Came From</h3>
        {sourceBreakdown.length === 0 ? (
          <p className="text-sm text-muted-foreground">No applicants yet — nothing to break down.</p>
        ) : (
          <HiringPipeline stages={sourceBreakdown} total={totalApplicants} />
        )}
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-medium">Promotion Log</h3>
          <LogPromotionDialog jobId={jobId} />
        </div>

        {promotionLog.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title="No promotions logged yet"
            description="Track where you've shared this job posting — LinkedIn, Indeed, your careers page, and more."
          />
        ) : (
          <ul className="divide-y rounded-xl border">
            {promotionLog.map((entry) => (
              <li key={entry._id} className="flex items-start justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">
                    {entry.channel === "other" ? entry.customChannel : PROMOTION_CHANNEL_LABELS[entry.channel]}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(entry.postedAt)}
                    {entry.loggedByName ? ` · Logged by ${entry.loggedByName}` : ""}
                  </p>
                  {entry.notes && <p className="mt-1 text-sm text-foreground/80">{entry.notes}</p>}
                  {entry.url && (
                    <a
                      href={entry.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="size-3.5" />
                      View posting
                    </a>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleRemove(entry._id)}
                  aria-label={`Remove promotion log entry for ${entry.channel === "other" ? entry.customChannel : PROMOTION_CHANNEL_LABELS[entry.channel]}`}
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
