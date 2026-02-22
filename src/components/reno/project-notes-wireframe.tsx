"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { RenovationNote, RenovationSection } from "@/lib/reno-data-loader";
import {
  addProjectNoteAction,
  deleteProjectNoteAction,
  updateProjectNoteContentAction,
  updateProjectNoteLinkAction,
} from "@/lib/reno-actions";

type ProjectNotesWireframeProps = {
  projectId: string;
  initialNotes: RenovationNote[];
  sections: RenovationSection[];
};

type Feedback = {
  type: "success" | "error";
  message: string;
} | null;

export function ProjectNotesWireframe({
  projectId,
  initialNotes,
  sections,
}: ProjectNotesWireframeProps) {
  const [notes, setNotes] = useState<RenovationNote[]>(initialNotes);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingContent, setEditingContent] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [linkedSectionId, setLinkedSectionId] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const sectionMap = useMemo(() => {
    return new Map(sections.map((section) => [section.id, section.title]));
  }, [sections]);

  function addNote() {
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!trimmedTitle || !trimmedContent) {
      return;
    }

    const newNote: RenovationNote = {
      id: `local-${Date.now()}`,
      title: trimmedTitle,
      content: trimmedContent,
      linkedSectionId: linkedSectionId || null,
    };

    setFeedback(null);
    setNotes((current) => [newNote, ...current]);
    setTitle("");
    setContent("");
    setLinkedSectionId("");

    startTransition(async () => {
      try {
        await addProjectNoteAction({
          projectId,
          title: newNote.title,
          content: newNote.content,
          linkedSectionId: newNote.linkedSectionId,
        });
        setFeedback({ type: "success", message: "Note added." });
        router.refresh();
      } catch {
        setFeedback({
          type: "error",
          message: "Could not add note. Please try again.",
        });
        router.refresh();
      }
    });
  }

  function updateNoteLink(noteId: string, sectionId: string) {
    const sectionTitle =
      sectionId && sectionMap.get(sectionId)
        ? sectionMap.get(sectionId)
        : "Whole project";

    setFeedback(null);
    setNotes((current) =>
      current.map((note) =>
        note.id === noteId
          ? { ...note, linkedSectionId: sectionId || null }
          : note,
      ),
    );

    if (noteId.startsWith("local-")) {
      return;
    }

    startTransition(async () => {
      try {
        await updateProjectNoteLinkAction({
          projectId,
          noteId,
          linkedSectionId: sectionId || null,
        });
        setFeedback({
          type: "success",
          message: `Note linked to ${sectionTitle}.`,
        });
        router.refresh();
      } catch {
        setFeedback({
          type: "error",
          message: "Could not update note link. Please try again.",
        });
        router.refresh();
      }
    });
  }

  function startEditingNote(note: RenovationNote) {
    setEditingNoteId(note.id);
    setEditingTitle(note.title);
    setEditingContent(note.content);
  }

  function cancelEditingNote() {
    setEditingNoteId(null);
    setEditingTitle("");
    setEditingContent("");
  }

  function saveEditingNote() {
    if (!editingNoteId || !editingTitle.trim() || !editingContent.trim()) {
      return;
    }

    const noteId = editingNoteId;
    const titleValue = editingTitle.trim();
    const contentValue = editingContent.trim();

    setNotes((current) =>
      current.map((note) =>
        note.id === noteId
          ? {
              ...note,
              title: titleValue,
              content: contentValue,
            }
          : note,
      ),
    );
    setFeedback(null);
    setEditingNoteId(null);
    setEditingTitle("");
    setEditingContent("");

    if (noteId.startsWith("local-")) {
      return;
    }

    startTransition(async () => {
      try {
        await updateProjectNoteContentAction({
          projectId,
          noteId,
          title: titleValue,
          content: contentValue,
        });
        setFeedback({ type: "success", message: "Note updated." });
        router.refresh();
      } catch {
        setFeedback({
          type: "error",
          message: "Could not update note. Please try again.",
        });
        router.refresh();
      }
    });
  }

  function deleteNote(noteId: string, noteTitle: string) {
    const confirmed = window.confirm(`Delete note "${noteTitle}"?`);
    if (!confirmed) {
      return;
    }

    setFeedback(null);
    setNotes((current) => current.filter((note) => note.id !== noteId));
    if (editingNoteId === noteId) {
      cancelEditingNote();
    }

    if (noteId.startsWith("local-")) {
      setFeedback({ type: "success", message: "Note deleted." });
      return;
    }

    startTransition(async () => {
      try {
        await deleteProjectNoteAction({
          projectId,
          noteId,
        });
        setFeedback({ type: "success", message: "Note deleted." });
        router.refresh();
      } catch {
        setFeedback({
          type: "error",
          message: "Could not delete note. Please try again.",
        });
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Lessons learned
        </p>
        <h1 className="mt-1 text-2xl font-semibold">Project Notes</h1>
        <p className="text-sm text-muted-foreground">
          Add notes and link each one to a section or keep it as a whole-project
          note.
        </p>
      </section>

      <section className="space-y-3 rounded-lg border p-4">
        <h2 className="text-sm font-semibold">Add New Note</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Note Title</label>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="e.g., Plumbing inspection prep"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Link To</label>
            <select
              value={linkedSectionId}
              onChange={(event) => setLinkedSectionId(event.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="">Whole project</option>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.title}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Note Content</label>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={4}
            className="w-full rounded-md border bg-background p-3 text-sm"
            placeholder="Write your note..."
          />
        </div>
        <button
          type="button"
          onClick={addNote}
          disabled={isPending || !title.trim() || !content.trim()}
          className="rounded-md bg-foreground px-3 py-2 text-sm text-background disabled:opacity-60"
        >
          {isPending ? "Saving..." : "Add Note"}
        </button>
        {feedback ? (
          <p
            className={`text-xs ${
              feedback.type === "success" ? "text-emerald-700" : "text-red-700"
            }`}
          >
            {feedback.message}
          </p>
        ) : null}
      </section>

      <section className="space-y-3 rounded-lg border p-4">
        <h2 className="text-sm font-semibold">Notes List</h2>
        {notes.map((note) => (
          <div key={note.id} className="space-y-2 rounded-md border p-3">
            {editingNoteId === note.id ? (
              <div className="space-y-2">
                <input
                  value={editingTitle}
                  onChange={(event) => setEditingTitle(event.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  placeholder="Note title"
                />
                <textarea
                  value={editingContent}
                  onChange={(event) => setEditingContent(event.target.value)}
                  rows={4}
                  className="w-full rounded-md border bg-background p-3 text-sm"
                  placeholder="Note content"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={saveEditingNote}
                    disabled={isPending}
                    className="rounded-md bg-foreground px-2 py-1 text-xs text-background"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={cancelEditingNote}
                    disabled={isPending}
                    className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{note.title}</p>
                  <div className="flex items-center gap-2">
                    <select
                      value={note.linkedSectionId ?? ""}
                      onChange={(event) =>
                        updateNoteLink(note.id, event.target.value)
                      }
                      disabled={isPending}
                      className="rounded-md border bg-background px-2 py-1 text-xs"
                    >
                      <option value="">Whole project</option>
                      {sections.map((section) => (
                        <option key={section.id} value={section.id}>
                          {section.title}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => startEditingNote(note)}
                      disabled={isPending}
                      className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteNote(note.id, note.title)}
                      disabled={isPending}
                      className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-60"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{note.content}</p>
                <p className="text-xs text-muted-foreground">
                  Linked to:{" "}
                  {note.linkedSectionId
                    ? (sectionMap.get(note.linkedSectionId) ??
                      "Unknown section")
                    : "Whole project"}
                </p>
              </>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
