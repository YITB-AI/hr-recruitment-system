"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { updateNotificationPreferencesAction } from "@/actions/notifications";
import { NOTIFICATION_TYPES, NOTIFICATION_TYPE_LABELS, type NotificationType } from "@/constants/notification";

const DESCRIPTIONS: Record<NotificationType, string> = {
  application: "New applicants, status changes, and AI call outcomes.",
  interview: "Interviews scheduled for applicants.",
  employee: "New employee records created.",
  document: "Documents generated for applicants or employees.",
  system: "Account-security events, such as an email change request.",
  mention: "@mentions on Notes — no mentions exist yet in this app.",
};

export function NotificationPreferencesForm({ preferences }: { preferences: Record<NotificationType, boolean> }) {
  const [values, setValues] = useState(preferences);
  const [pendingType, setPendingType] = useState<NotificationType | null>(null);

  function handleToggle(type: NotificationType, checked: boolean) {
    const next = { ...values, [type]: checked };
    setValues(next);
    setPendingType(type);

    updateNotificationPreferencesAction(next)
      .then((result) => {
        if (!result.success) {
          toast.error(result.error);
          setValues(values); // revert on failure
        }
      })
      .finally(() => setPendingType(null));
  }

  return (
    <div className="max-w-lg divide-y">
      {NOTIFICATION_TYPES.map((type) => (
        <div key={type} className="flex items-center justify-between gap-4 py-4">
          <div>
            <p className="text-sm font-medium">{NOTIFICATION_TYPE_LABELS[type]}</p>
            <p className="text-xs text-muted-foreground">{DESCRIPTIONS[type]}</p>
          </div>
          <Switch
            checked={values[type]}
            disabled={pendingType === type}
            onCheckedChange={(checked) => handleToggle(type, checked)}
          />
        </div>
      ))}
    </div>
  );
}
