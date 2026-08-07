import { connectDB } from "@/server/db/connect";
import { settingRepository, type SettingRow } from "@/server/repositories/setting.repository";
import { activityLogRepository } from "@/server/repositories/activity-log.repository";
import { getCurrentUser, resolveActorId } from "@/lib/current-user";
import { verifySession } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { FONT_OPTIONS, DEFAULT_PRIMARY_COLOR, DEFAULT_FONT_KEY, type FontKey } from "@/constants/appearance";

import type { GeneralSettingsInput, NotificationSettingsInput, AppearanceSettingsInput } from "@/validators/settings";

/** For the authenticated Settings management page — scoped to the logged-in user's own company. */
export async function getSettings(): Promise<SettingRow> {
  await connectDB();
  const { companyId } = await getCurrentUser();
  return settingRepository.get(companyId);
}

export type AppearanceStyleResult = { style: React.CSSProperties; fontKey: FontKey };

const DEFAULT_APPEARANCE_RESULT: AppearanceStyleResult = {
  style: {
    "--primary": DEFAULT_PRIMARY_COLOR,
    "--font-sans": `var(${FONT_OPTIONS.find((f) => f.key === DEFAULT_FONT_KEY)?.variable ?? FONT_OPTIONS[0].variable})`,
  } as React.CSSProperties,
  fontKey: DEFAULT_FONT_KEY,
};

/**
 * Turns the saved appearance settings into inline CSS custom properties for
 * the root layout to apply on <html>, plus the resolved font key so the
 * layout knows which single font's next/font `.variable` class to actually
 * apply (see app/layout.tsx and lib/fonts.ts — only the active tenant's font
 * is loaded site-wide; every other option is scoped to the Appearance
 * settings preview card only).
 *
 * Deliberately uses verifySession() (returns null, never redirects), NOT
 * getCurrentUser() — the root layout renders for unauthenticated requests
 * too (e.g. /login itself), and getCurrentUser() would redirect there,
 * which would break the login page's own rendering. Falls back to the
 * default style pre-login, when there's no company to resolve yet.
 */
export async function getAppearanceStyle(): Promise<AppearanceStyleResult> {
  await connectDB();
  const session = await verifySession();
  if (!session) return DEFAULT_APPEARANCE_RESULT;

  const settings = await settingRepository.get(session.companyId);
  const font = FONT_OPTIONS.find((f) => f.key === settings.appearance.fontKey) ?? FONT_OPTIONS[0];

  return {
    style: {
      "--primary": settings.appearance.primaryColor,
      "--font-sans": `var(${font.variable})`,
    } as React.CSSProperties,
    fontKey: font.key,
  };
}

async function logSettingsChange(companyId: string, section: string, settingsId: string) {
  const actor = await getCurrentUser();
  await activityLogRepository.create({
    companyId,
    actorId: resolveActorId(actor),
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
