"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import {
  createAiCallQuestionAction,
  updateAiCallQuestionAction,
  setAiCallQuestionActiveAction,
  deleteAiCallQuestionAction,
  reorderAiCallQuestionsAction,
} from "@/actions/ai-call-questions";
import { confirmAction } from "@/store/confirm-store";
import type { AiCallQuestionRow } from "@/server/repositories/ai-call-question.repository";

type EditingState = { mode: "create" } | { mode: "edit"; question: AiCallQuestionRow } | null;

export function AiCallQuestionManagementPanel({ questions }: { questions: AiCallQuestionRow[] }) {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<EditingState>(null);
  const [text, setText] = useState("");
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(
    () => questions.filter((q) => q.text.toLowerCase().includes(search.toLowerCase())),
    [questions, search],
  );

  function openCreate() {
    setText("");
    setEditing({ mode: "create" });
  }

  function openEdit(question: AiCallQuestionRow) {
    setText(question.text);
    setEditing({ mode: "edit", question });
  }

  function handleSave() {
    startTransition(async () => {
      const result =
        editing?.mode === "edit"
          ? await updateAiCallQuestionAction({ id: editing.question._id, text })
          : await createAiCallQuestionAction({ text });

      if (result.success) {
        toast.success(editing?.mode === "edit" ? "Question updated" : "Question added");
        setEditing(null);
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleToggleActive(question: AiCallQuestionRow) {
    startTransition(async () => {
      const result = await setAiCallQuestionActiveAction(question._id, !question.isActive);
      if (!result.success) toast.error(result.error);
    });
  }

  async function handleDelete(question: AiCallQuestionRow) {
    if (!(await confirmAction({ title: "Delete this question?", description: "This can't be undone." }))) return;
    startTransition(async () => {
      const result = await deleteAiCallQuestionAction(question._id);
      if (result.success) toast.success("Question deleted");
      else toast.error(result.error);
    });
  }

  function handleMove(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= questions.length) return;
    const reordered = [...questions];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    startTransition(async () => {
      const result = await reorderAiCallQuestionsAction({ orderedIds: reordered.map((q) => q._id) });
      if (!result.success) toast.error(result.error);
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold">AI Call Questions</h3>
        <p className="text-xs text-muted-foreground">
          Custom questions the AI asks during candidate calls, in the order below. Only enabled questions are included.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-48 max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search questions..." className="pl-9" />
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4" />
          Add Question
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Search} title="No questions found" description="Add a question for the AI to ask on calls." />
      ) : (
        <div className="divide-y rounded-xl border">
          {filtered.map((question, index) => (
            <div key={question._id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <button
                    type="button"
                    disabled={isPending || index === 0}
                    onClick={() => handleMove(index, -1)}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <ChevronUp className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={isPending || index === filtered.length - 1}
                    onClick={() => handleMove(index, 1)}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <ChevronDown className="size-3.5" />
                  </button>
                </div>
                <p className="text-sm">{question.text}</p>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={question.isActive} onCheckedChange={() => handleToggleActive(question)} disabled={isPending} />
                <Button variant="ghost" size="icon-sm" onClick={() => openEdit(question)} disabled={isPending}>
                  <Pencil className="size-4" />
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(question)} disabled={isPending}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.mode === "edit" ? "Edit question" : "Add question"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="ai-call-question-text">Question</Label>
              <Textarea
                id="ai-call-question-text"
                rows={3}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="e.g. What is your notice period?"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button onClick={handleSave} disabled={isPending || !text.trim()}>
              {isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
