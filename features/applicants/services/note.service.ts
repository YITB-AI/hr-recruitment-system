import { connectDB } from "@/server/db/connect";
import { noteRepository, type NoteRow } from "@/server/repositories/note.repository";
import { applicantRepository } from "@/server/repositories/applicant.repository";
import { getCurrentUser } from "@/lib/current-user";
import { requireRole } from "@/lib/auth/permissions";
import type { CreateNoteInput } from "@/validators/note";

export async function listNotes(applicantId: string): Promise<NoteRow[]> {
  await connectDB();
  const { companyId } = await getCurrentUser();
  return noteRepository.findByApplicantId(companyId, applicantId);
}

export async function createNote(input: CreateNoteInput): Promise<NoteRow> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "applicant.note.manage");

  const applicant = await applicantRepository.findById(actor.companyId, input.applicantId);
  if (!applicant) throw new Error("Applicant not found");

  return noteRepository.create({
    companyId: actor.companyId,
    applicantId: input.applicantId,
    authorId: actor.id === "system" ? undefined : actor.id,
    authorName: actor.name,
    body: input.body,
  });
}

export async function deleteNote(id: string): Promise<void> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "applicant.note.manage");

  const deleted = await noteRepository.deleteById(actor.companyId, id);
  if (!deleted) throw new Error("Note not found");
}
