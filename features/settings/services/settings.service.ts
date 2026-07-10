import { connectDB } from "@/server/db/connect";
import { settingRepository, type SettingRow } from "@/server/repositories/setting.repository";
import { activityLogRepository } from "@/server/repositories/activity-log.repository";
import { getCurrentUser } from "@/lib/current-user";
import { FONT_OPTIONS } from "@/constants/appearance";
import type { GeneralSettingsInput, NotificationSettingsInput, AppearanceSettingsInput } from "@/validators/settings";

export async function getSettings(): Promise<SettingRow> {
  await connectDB();
  return settingRepository.get();
}

/**
 * Turns the saved appearance settings into inline CSS custom properties for
 * the root layout to apply on <html>. Overriding `--primary` here beats every
 * selector in globals.css on specificity, and `--font-sans` is reassigned to
 * whichever font's own variable (set by that font's next/font loader class,
 * also applied on <html>) the user picked — see app/layout.tsx.
 */
export async function getAppearanceStyle(): Promise<React.CSSProperties> {
  const settings = await getSettings();
  const font = FONT_OPTIONS.find((f) => f.key === settings.appearance.fontKey) ?? FONT_OPTIONS[0];

  return {
    "--primary": settings.appearance.primaryColor,
    "--font-sans": `var(${font.variable})`,
  } as React.CSSProperties;
}

async function logSettingsChange(section: string, settingsId: string) {
  const actor = await getCurrentUser();
  await activityLogRepository.create({
    actorId: actor.id === "no-users-seeded" ? undefined : actor.id,
    actorName: actor.name,
    action: "settings.updated",
    entityType: "setting",
    entityId: settingsId,
    message: `${actor.name} updated ${section} settings`,
  });
}

export async function updateGeneralSettings(input: GeneralSettingsInput): Promise<SettingRow> {
  await connectDB();
  const updated = await settingRepository.update(input);
  await logSettingsChange("general", updated._id);
  return updated;
}

export async function updateNotificationSettings(input: NotificationSettingsInput): Promise<SettingRow> {
  await connectDB();
  const updated = await settingRepository.update({ features: input });
  await logSettingsChange("notification", updated._id);
  return updated;
}

export async function updateAppearanceSettings(input: AppearanceSettingsInput): Promise<SettingRow> {
  await connectDB();
  const updated = await settingRepository.update({ appearance: input });
  await logSettingsChange("appearance", updated._id);
  return updated;
}
