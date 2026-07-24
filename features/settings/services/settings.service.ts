import { connectDB } from "@/server/db/connect";
import { settingRepository, type SettingRow } from "@/server/repositories/setting.repository";
import { activityLogRepository } from "@/server/repositories/activity-log.repository";
import { getCurrentUser } from "@/lib/current-user";
import { verifySession } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { FONT_OPTIONS, DEFAULT_PRIMARY_COLOR, DEFAULT_FONT_KEY } from "@/constants/appearance";

import type { GeneralSettingsInput, NotificationSettingsInput, AppearanceSettingsInput } from "@/validators/settings";

/** For the authenticated Settings management page — scoped to the logged-in user's own company. */
export async function getSettings(): Promise<SettingRow> {
  await connectDB();
  const { companyId } = await getCurrentUser();
  return settingRepository.get(companyId);
}

const DEFAULT_APPEARANCE_STYLE: React.CSSProperties = {
  "--primary": DEFAULT_PRIMARY_COLOR,
  "--font-sans": `var(${FONT_OPTIONS.find((f) => f.key === DEFAULT_FONT_KEY)?.variable ?? FONT_OPTIONS[0].variable})`,
} as React.CSSProperties;

/**
 * Turns the saved appearance settings into inline CSS custom properties for
 * the root layout to apply on <html>. Overriding `--primary` here beats every
 * selector in globals.css on specificity, and `--font-sans` is reassigned to
 * whichever font's own variable (set by that font's next/font loader class,
 * also applied on <html>) the user picked — see app/layout.tsx.
 *
 * Deliberately uses verifySession() (returns null, never redirects), NOT
 * getCurrentUser() — the root layout renders for unauthenticated requests
 * too (e.g. /login itself), and getCurrentUser() would redirect there,
 * which would break the login page's own rendering. Falls back to the
 * default style pre-login, when there's no company to resolve yet.
 */
export async function getAppearanceStyle(): Promise<React.CSSProperties> {
  await connectDB();
  const session = await verifySession();
  if (!session) return DEFAULT_APPEARANCE_STYLE;

  const settings = await settingRepository.get(session.companyId);
  const font = FONT_OPTIONS.find((f) => f.key === settings.appearance.fontKey) ?? FONT_OPTIONS[0];

  return {
    "--primary": settings.appearance.primaryColor,
    "--font-sans": `var(${font.variable})`,
  } as React.CSSProperties;
}

async function logSettingsChange(companyId: string, section: string, settingsId: string) {
  const actor = await getCurrentUser();
  await activityLogRepository.create({
    companyId,
    actorId: actor.id === "system" ? undefined : actor.id,
    actorName: actor.name,
    action: "settings.updated",
    entityType: "setting",
    entityId: settingsId,
    message: `${actor.name} updated ${section} settings`,
  });
}

export async function updateGeneralSettings(input: GeneralSettingsInput): Promise<SettingRow> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "settings.manage");
  const updated = await settingRepository.update(actor.companyId, input);
  await logSettingsChange(actor.companyId, "general", updated._id);
  return updated;
}

export async function updateNotificationSettings(input: NotificationSettingsInput): Promise<SettingRow> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "settings.manage");
  const updated = await settingRepository.update(actor.companyId, { features: input });
  await logSettingsChange(actor.companyId, "notification", updated._id);
  return updated;
}

export async function updateAppearanceSettings(input: AppearanceSettingsInput): Promise<SettingRow> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "settings.manage");
  const updated = await settingRepository.update(actor.companyId, { appearance: input });
  await logSettingsChange(actor.companyId, "appearance", updated._id);
  return updated;
}
