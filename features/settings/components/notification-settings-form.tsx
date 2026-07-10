"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { updateNotificationSettingsAction } from "@/actions/settings";
import type { SettingRow } from "@/server/repositories/setting.repository";

const ROWS: Array<{ key: keyof SettingRow["features"]; label: string; description: string }> = [
  { key: "emailNotifications", label: "Email Notifications", description: "Send notifications to users by email." },
  { key: "smsNotifications", label: "SMS Notifications", description: "Send notifications by SMS via n8n." },
  { key: "aiResumeAnalysis", label: "AI Resume Analysis", description: "Enable the AI Analysis tab on applicant profiles." },
];

export function NotificationSettingsForm({ settings }: { settings: SettingRow }) {
  const [values, setValues] = useState(settings.features);
  const [isPending, startTransition] = useTransition();

  function handleToggle(key: keyof SettingRow["features"], checked: boolean) {
    const next = { ...values, [key]: checked };
    setValues(next);

    startTransition(async () => {
      const result = await updateNotificationSettingsAction(next);
      if (!result.success) {
        toast.error(result.error);
        setValues(values); // revert on failure
      }
    });
  }

  return (
    <div className="max-w-lg divide-y">
      {ROWS.map((row) => (
        <div key={row.key} className="flex items-center justify-between gap-4 py-4">
          <div>
            <p className="text-sm font-medium">{row.label}</p>
            <p className="text-xs text-muted-foreground">{row.description}</p>
          </div>
          <Switch
            checked={values[row.key]}
            disabled={isPending}
            onCheckedChange={(checked) => handleToggle(row.key, checked)}
          />
        </div>
      ))}
    </div>
  );
}
