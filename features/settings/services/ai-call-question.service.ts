import { connectDB } from "@/server/db/connect";
import { aiCallQuestionRepository, type AiCallQuestionRow } from "@/server/repositories/ai-call-question.repository";
import { activityLogRepository } from "@/server/repositories/activity-log.repository";
import { getCurrentUser, resolveActorId } from "@/lib/current-user";
import { requireRole } from "@/lib/auth/permissions";
import type { CreateAiCallQuestionInput, UpdateAiCallQuestionInput } from "@/validators/ai-call-question";

export async function listAiCallQuestions(includeInactive = true): Promise<AiCallQuestionRow[]> {
  await connectDB();
  const { companyId } = await getCurrentUser();
  return aiCallQuestionRepository.findAll(companyId, includeInactive);
}

export async function createAiCallQuestion(input: CreateAiCallQuestionInput): Promise<AiCallQuestionRow> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "ai_call_question.manage");

  const question = await aiCallQuestionRepository.create({
    companyId: actor.companyId,
    text: input.text,
    createdBy: resolveActorId(actor),
  });

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: resolveActorId(actor),
    actorName: actor.name,
    action: "ai_call_question.created",
    entityType: "setting",
    entityId: question._id,
    message: `${actor.name} added an AI call question`,
  });

  return question;
}

export async function updateAiCallQuestion(input: UpdateAiCallQuestionInput): Promise<AiCallQuestionRow> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "ai_call_question.manage");

  const question = await aiCallQuestionRepository.update(actor.companyId, input.id, { text: input.text });
  if (!question) throw new Error("Question not found");

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: resolveActorId(actor),
    actorName: actor.name,
    action: "ai_call_question.updated",
    entityType: "setting",
    entityId: question._id,
    message: `${actor.name} updated an AI call question`,
  });

  return question;
}

export async function setAiCallQuestionActive(id: string, isActive: boolean): Promise<AiCallQuestionRow> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "ai_call_question.manage");

  const question = await aiCallQuestionRepository.update(actor.companyId, id, { isActive });
  if (!question) throw new Error("Question not found");

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: resolveActorId(actor),
    actorName: actor.name,
    action: isActive ? "ai_call_question.activated" : "ai_call_question.deactivated",
    entityType: "setting",
    entityId: question._id,
    message: `${actor.name} ${isActive ? "enabled" : "disabled"} an AI call question`,
  });

  return question;
}

export async function deleteAiCallQuestion(id: string): Promise<void> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "ai_call_question.manage");

  const existing = await aiCallQuestionRepository.findById(actor.companyId, id);
  if (!existing) throw new Error("Question not found");

  await aiCallQuestionRepository.delete(actor.companyId, id);

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: resolveActorId(actor),
    actorName: actor.name,
    action: "ai_call_question.deleted",
    entityType: "setting",
    entityId: id,
    message: `${actor.name} deleted an AI call question`,
  });
}

export async function reorderAiCallQuestions(orderedIds: string[]): Promise<void> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "ai_call_question.manage");

  await aiCallQuestionRepository.reorder(actor.companyId, orderedIds);
}
