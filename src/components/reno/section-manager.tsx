"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { RenovationSection } from "@/lib/reno-data-loader";
import {
  addSectionAction,
  deleteSectionAction,
  moveSectionAction,
  updateSectionAction,
} from "@/lib/reno-actions";

type SectionManagerProps = {
  projectId: string;
  initialSections: RenovationSection[];
};

type EditingDraft = {
  title: string;
  description: string;
};

type Feedback = {
  type: "success" | "error";
  message: string;
} | null;

export function SectionManager({
  projectId,
  initialSections,
}: SectionManagerProps) {
  const [sections, setSections] = useState(initialSections);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [newSectionDescription, setNewSectionDescription] = useState("");
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<EditingDraft | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function addSection() {
    const title = newSectionTitle.trim();
    const description = newSectionDescription.trim();
    if (!title || !description) {
      return;
    }

    const localSection: RenovationSection = {
      id: `local-section-${Date.now()}`,
      title,
      description,
      position: sections.length,
    };
    setFeedback(null);
    setSections((current) => [...current, localSection]);
    setNewSectionTitle("");
    setNewSectionDescription("");

    startTransition(async () => {
      try {
        await addSectionAction({
          projectId,
          title,
          description,
        });
        setFeedback({
          type: "success",
          message: `Section "${title}" added.`,
        });
        router.refresh();
      } catch {
        setFeedback({
          type: "error",
          message: "Could not add section. Please try again.",
        });
        router.refresh();
      }
    });
  }

  function startEditingSection(section: RenovationSection) {
    setEditingSectionId(section.id);
    setEditingDraft({
      title: section.title,
      description: section.description,
    });
  }

  function cancelEditingSection() {
    setEditingSectionId(null);
    setEditingDraft(null);
  }

  function saveEditingSection() {
    if (!editingSectionId || !editingDraft) {
      return;
    }

    const title = editingDraft.title.trim();
    const description = editingDraft.description.trim();
    if (!title || !description) {
      return;
    }

    const sectionId = editingSectionId;
    setFeedback(null);
    setSections((current) =>
      current.map((section) =>
        section.id === sectionId ? { ...section, title, description } : section,
      ),
    );
    setEditingSectionId(null);
    setEditingDraft(null);

    if (sectionId.startsWith("local-section-")) {
      return;
    }

    startTransition(async () => {
      try {
        await updateSectionAction({
          projectId,
          sectionId,
          title,
          description,
        });
        setFeedback({
          type: "success",
          message: `Section "${title}" updated.`,
        });
        router.refresh();
      } catch {
        setFeedback({
          type: "error",
          message: "Could not update section. Please try again.",
        });
        router.refresh();
      }
    });
  }

  function removeSection(sectionId: string) {
    const section = sections.find((entry) => entry.id === sectionId);
    const sectionTitle = section?.title ?? "this section";
    const confirmed = window.confirm(
      `Delete "${sectionTitle}"? This will also remove all items in this section and unlink related notes.`,
    );
    if (!confirmed) {
      return;
    }

    setFeedback(null);
    setSections((current) =>
      current.filter((section) => section.id !== sectionId),
    );

    if (sectionId.startsWith("local-section-")) {
      return;
    }

    startTransition(async () => {
      try {
        await deleteSectionAction({
          projectId,
          sectionId,
        });
        setFeedback({
          type: "success",
          message: `Section "${sectionTitle}" deleted.`,
        });
        router.refresh();
      } catch {
        setFeedback({
          type: "error",
          message: "Could not delete section. Please try again.",
        });
        router.refresh();
      }
    });
  }

  function moveSection(sectionId: string, direction: "up" | "down") {
    const currentIndex = sections.findIndex(
      (section) => section.id === sectionId,
    );
    if (currentIndex < 0) {
      return;
    }

    const targetIndex =
      direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) {
      return;
    }

    const reordered = [...sections];
    const [movedSection] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, movedSection);
    const normalized = reordered.map((section, index) => ({
      ...section,
      position: index,
    }));
    setSections(normalized);
    setFeedback(null);

    if (sectionId.startsWith("local-section-")) {
      return;
    }

    startTransition(async () => {
      try {
        await moveSectionAction({
          projectId,
          sectionId,
          direction,
        });
        setFeedback({
          type: "success",
          message: "Section order updated.",
        });
        router.refresh();
      } catch {
        setFeedback({
          type: "error",
          message: "Could not reorder section. Please try again.",
        });
        router.refresh();
      }
    });
  }

  return (
    <section className="rounded-lg border p-4">
      <h2 className="text-base font-semibold">Sections</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Add, edit, and remove project sections.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <input
          value={newSectionTitle}
          onChange={(event) => setNewSectionTitle(event.target.value)}
          className="rounded-md border bg-background px-3 py-2 text-sm"
          placeholder="Section title (e.g., HVAC)"
        />
        <input
          value={newSectionDescription}
          onChange={(event) => setNewSectionDescription(event.target.value)}
          className="rounded-md border bg-background px-3 py-2 text-sm"
          placeholder="Section description"
        />
      </div>
      <button
        type="button"
        onClick={addSection}
        disabled={
          isPending || !newSectionTitle.trim() || !newSectionDescription.trim()
        }
        className="mt-3 rounded-md bg-foreground px-3 py-2 text-sm text-background disabled:opacity-60"
      >
        {isPending ? "Saving..." : "Add Section"}
      </button>
      {feedback ? (
        <p
          className={`mt-2 text-xs ${
            feedback.type === "success" ? "text-emerald-700" : "text-red-700"
          }`}
        >
          {feedback.message}
        </p>
      ) : null}

      <div className="mt-4 space-y-3">
        {sections.map((section) => (
          <div key={section.id} className="rounded-md border p-3">
            {editingSectionId === section.id && editingDraft ? (
              <div className="space-y-2">
                <input
                  value={editingDraft.title}
                  onChange={(event) =>
                    setEditingDraft((current) =>
                      current
                        ? {
                            ...current,
                            title: event.target.value,
                          }
                        : current,
                    )
                  }
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  placeholder="Section title"
                />
                <textarea
                  value={editingDraft.description}
                  onChange={(event) =>
                    setEditingDraft((current) =>
                      current
                        ? {
                            ...current,
                            description: event.target.value,
                          }
                        : current,
                    )
                  }
                  rows={3}
                  className="w-full rounded-md border bg-background p-3 text-sm"
                  placeholder="Section description"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={saveEditingSection}
                    disabled={isPending}
                    className="rounded-md bg-foreground px-2 py-1 text-xs text-background"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={cancelEditingSection}
                    disabled={isPending}
                    className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="font-medium">{section.title}</p>
                <p className="text-sm text-muted-foreground">
                  {section.description}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => moveSection(section.id, "up")}
                    disabled={isPending || sections[0]?.id === section.id}
                    className="rounded-md border px-2 py-1 text-xs hover:bg-muted disabled:opacity-60"
                  >
                    Move Up
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSection(section.id, "down")}
                    disabled={
                      isPending ||
                      sections[sections.length - 1]?.id === section.id
                    }
                    className="rounded-md border px-2 py-1 text-xs hover:bg-muted disabled:opacity-60"
                  >
                    Move Down
                  </button>
                  <button
                    type="button"
                    onClick={() => startEditingSection(section)}
                    disabled={isPending}
                    className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSection(section.id)}
                    disabled={isPending}
                    className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
