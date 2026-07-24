import { connectDB } from "@/server/db/connect";
import {
  companyIntegrationConfigRepository,
  type CompanyIntegrationConfigRow,
} from "@/server/repositories/company-integration-config.repository";
import { activityLogRepository } from "@/server/repositories/activity-log.repository";
import { getCurrentUser } from "@/lib/current-user";
import { requireRole } from "@/lib/auth/permissions";
import type {
  UpdateWebhookConfigInput,
  UpdateEmailConfigInput,
  UpdateLinkedinConfigInput,
  UpdateFacebookAppCredentialsInput,
  UpdateXAppCredentialsInput,
} from "@/validators/company-integration-config";

export async function getCompanyIntegrationConfig(): Promise<CompanyIntegrationConfigRow> {
  await connectDB();
  const { companyId } = await getCurrentUser();
  return companyIntegrationConfigRepository.get(companyId);
}

export async function updateWebhookConfig(input: UpdateWebhookConfigInput): Promise<CompanyIntegrationConfigRow> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "settings.manage");

  const updated = await companyIntegrationConfigRepository.updateWebhookConfig(actor.companyId, input);

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: actor.id === "system" ? undefined : actor.id,
    actorName: actor.name,
    action: "integration_config.webhooks_updated",
    entityType: "setting",
    entityId: updated._id,
    message: `${actor.name} updated the n8n webhook configuration`,
  });

  return updated;
}

export async function updateEmailConfig(input: UpdateEmailConfigInput): Promise<CompanyIntegrationConfigRow> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "settings.manage");

  const updated = await companyIntegrationConfigRepository.updateEmailConfig(actor.companyId, input);

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: actor.id === "system" ? undefined : actor.id,
    actorName: actor.name,
    action: "integration_config.email_updated",
    entityType: "setting",
    entityId: updated._id,
    message: `${actor.name} updated the email configuration`,
  });

  return updated;
}

export async function updateLinkedinConfig(input: UpdateLinkedinConfigInput): Promise<CompanyIntegrationConfigRow> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "settings.manage");
  return companyIntegrationConfigRepository.updateLinkedin(actor.companyId, input);
}

export async function updateFacebookAppCredentials(input: UpdateFacebookAppCredentialsInput): Promise<CompanyIntegrationConfigRow> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "settings.manage");
  return companyIntegrationConfigRepository.updateFacebookAppCredentials(actor.companyId, input);
}

export async function updateXAppCredentials(input: UpdateXAppCredentialsInput): Promise<CompanyIntegrationConfigRow> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "settings.manage");
  return companyIntegrationConfigRepository.updateXAppCredentials(actor.companyId, input);
}

export async function setIndeedFeedEnabled(feedEnabled: boolean): Promise<CompanyIntegrationConfigRow> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "settings.manage");
  return companyIntegrationConfigRepository.setIndeedFeedEnabled(actor.companyId, feedEnabled);
}
