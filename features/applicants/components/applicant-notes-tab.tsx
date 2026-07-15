"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { StickyNote, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import { createNoteAction, deleteNoteAction } from "@/actions/notes";
import type { NoteRow } from "@/server/repositories/note.repository";

function formatDateTime(date: Date) {
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ApplicantNotesTab({ applicantId, notes }: { applicantId: string; notes: NoteRow[] }) {
  const [body, setBody] = useState("");
  const [items, setItems] = useState(notes);
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    const trimmed = body.trim();
    if (!trimmed) return;

    startTransition(async () => {
      const result = await createNoteAction({ applicantId, body: trimmed });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setItems((prev) => [result.note, ...prev]);
      setBody("");
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteNoteAction(id, applicantId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setItems((prev) => prev.filter((note) => note._id !== id));
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Textarea
          placeholder="Add an internal note about this applicant..."
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={3}
        />
        <div className="flex justify-end">
          <Button type="button" size="sm" disabled={isPending || !body.trim()} onClick={handleAdd}>
            Add note
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={StickyNote}
          title="No notes yet"
          description="Internal notes about this applicant will appear here — never visible to the applicant."
        />
      ) : (
        <ul className="divide-y">
          {items.map((note) => (
            <li key={note._id} className="flex items-start justify-between gap-3 py-3">
              <div>
                <p className="whitespace-pre-wrap text-sm">{note.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {note.authorName} · {formatDateTime(note.createdAt)}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="shrink-0 text-muted-foreground hover:text-destructive"
                disabled={isPending}
                onClick={() => handleDelete(note._id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
