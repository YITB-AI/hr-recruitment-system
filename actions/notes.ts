"use server";

import { revalidatePath } from "next/cache";
import { createNoteSchema } from "@/validators/note";
import { createNote, deleteNote } from "@/features/applicants/services/note.service";
import type { NoteRow } from "@/server/repositories/note.repository";

export type CreateNoteResult = { success: true; note: NoteRow } | { success: false; error: string };

export async function createNoteAction(input: unknown): Promise<CreateNoteResult> {
  const parsed = createNoteSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const note = await createNote(parsed.data);
    revalidatePath(`/applicants/${parsed.data.applicantId}`);
    return { success: true, note };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to add note" };
  }
}

export type ActionResult = { success: true } | { success: false; error: string };

export async function deleteNoteAction(id: string, applicantId: string): Promise<ActionResult> {
  try {
    await deleteNote(id);
    revalidatePath(`/applicants/${applicantId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete note" };
  }
}
