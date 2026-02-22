"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  getTotalActualForItem,
  STATUS_LABELS,
  type ItemStatus,
  type RenovationItem,
  type RenovationSection,
} from "@/lib/reno-data-loader";
import {
  addSectionItemAction,
  deleteSectionAction,
  deleteItemAction,
  updateSectionAction,
  updateItemStatusAction,
} from "@/lib/reno-actions";

type SectionItemsWireframeProps = {
  projectId: string;
  section: RenovationSection;
  items: RenovationItem[];
};

type Feedback = {
  type: "success" | "error";
  message: string;
} | null;

export function SectionItemsWireframe({
  projectId,
  section,
  items,
}: SectionItemsWireframeProps) {
  const [sectionDraft, setSectionDraft] = useState({
    title: section.title,
    description: section.description,
  });
  const [isEditingSection, setIsEditingSection] = useState(false);
  const [localItems, setLocalItems] = useState(items);
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemEstimate, setNewItemEstimate] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const estimateTotal = useMemo(
    () => localItems.reduce((sum, item) => sum + item.estimate, 0),
    [localItems],
  );
  const actualTotal = useMemo(
    () =>
      localItems.reduce((sum, item) => sum + getTotalActualForItem(item), 0),
    [localItems],
  );
  const variance = estimateTotal - actualTotal;

  function startEditingSection() {
    setSectionDraft({
      title: section.title,
      description: section.description,
    });
    setIsEditingSection(true);
  }

  function cancelEditingSection() {
    setIsEditingSection(false);
    setSectionDraft({
      title: section.title,
      description: section.description,
    });
  }

  function saveSection() {
    const title = sectionDraft.title.trim();
    const description = sectionDraft.description.trim();
    if (!title) {
      return;
    }

    setFeedback(null);
    setIsEditingSection(false);

    startTransition(async () => {
      try {
        await updateSectionAction({
          projectId,
          sectionId: section.id,
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

  function removeSection() {
    const confirmed = window.confirm(
      `Delete "${section.title}"? This will also remove all items in this section and unlink related notes.`,
    );
    if (!confirmed) {
      return;
    }

    setFeedback(null);
    startTransition(async () => {
      try {
        await deleteSectionAction({
          projectId,
          sectionId: section.id,
        });
        router.push(`/app/${projectId}`);
        router.refresh();
      } catch {
        setFeedback({
          type: "error",
          message: "Could not delete section. Please try again.",
        });
      }
    });
  }

  function updateStatus(itemId: string, status: ItemStatus) {
    setLocalItems((current) =>
      current.map((item) => (item.id === itemId ? { ...item, status } : item)),
    );
    setFeedback(null);

    if (itemId.startsWith("local-item-")) {
      return;
    }

    startTransition(async () => {
      try {
        await updateItemStatusAction({ projectId, itemId, status });
        setFeedback({ type: "success", message: "Item status updated." });
        router.refresh();
      } catch {
        setFeedback({
          type: "error",
          message: "Could not update item status. Please try again.",
        });
        router.refresh();
      }
    });
  }

  function addItem() {
    const title = newItemTitle.trim();
    if (!title) {
      return;
    }
    const estimateValue = Number(newItemEstimate);
    const estimate =
      Number.isFinite(estimateValue) && estimateValue >= 0 ? estimateValue : 0;

    setLocalItems((current) => [
      {
        id: `local-item-${Date.now()}`,
        sectionId: section.id,
        title,
        status: "todo",
        estimate,
        description: "",
        note: "",
        materials: [],
        expenses: [],
        performers: [],
      },
      ...current,
    ]);
    setFeedback(null);
    setNewItemTitle("");
    setNewItemEstimate("");

    startTransition(async () => {
      try {
        await addSectionItemAction({
          projectId,
          sectionId: section.id,
          title,
          estimate,
        });
        setFeedback({
          type: "success",
          message: `Item "${title}" added.`,
        });
        router.refresh();
      } catch {
        setFeedback({
          type: "error",
          message: "Could not add item. Please try again.",
        });
        router.refresh();
      }
    });
  }

  function deleteItem(itemId: string) {
    const target = localItems.find((item) => item.id === itemId);
    const itemTitle = target?.title ?? "this item";
    const confirmed = window.confirm(`Delete "${itemTitle}"?`);
    if (!confirmed) {
      return;
    }

    setLocalItems((current) => current.filter((item) => item.id !== itemId));
    setFeedback(null);

    if (itemId.startsWith("local-item-")) {
      return;
    }

    startTransition(async () => {
      try {
        await deleteItemAction({ projectId, itemId });
        setFeedback({
          type: "success",
          message: `Item "${itemTitle}" deleted.`,
        });
        router.refresh();
      } catch {
        setFeedback({
          type: "error",
          message: "Could not delete item. Please try again.",
        });
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Section
        </p>
        {isEditingSection ? (
          <div className="mt-2 space-y-2">
            <input
              value={sectionDraft.title}
              onChange={(event) =>
                setSectionDraft((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="Section title"
            />
            <textarea
              value={sectionDraft.description}
              onChange={(event) =>
                setSectionDraft((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              rows={3}
              className="w-full rounded-md border bg-background p-3 text-sm"
              placeholder="Section description"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={saveSection}
                disabled={isPending || !sectionDraft.title.trim()}
                className="rounded-md bg-foreground px-3 py-1.5 text-xs text-background disabled:opacity-60"
              >
                Save Section
              </button>
              <button
                type="button"
                onClick={cancelEditingSection}
                disabled={isPending}
                className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <h1 className="mt-1 text-2xl font-semibold">{section.title}</h1>
            <p className="text-sm text-muted-foreground">
              {section.description}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={startEditingSection}
                disabled={isPending}
                className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted"
              >
                Edit Section
              </button>
              <button
                type="button"
                onClick={removeSection}
                disabled={isPending}
                className="rounded-md border border-red-200 px-3 py-1.5 text-xs text-red-700 hover:bg-red-50"
              >
                Delete Section
              </button>
            </div>
          </>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Estimate Total</p>
          <p className="text-2xl font-semibold">
            ${estimateTotal.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Actual Total</p>
          <p className="text-2xl font-semibold">
            ${actualTotal.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Variance</p>
          <p className="text-2xl font-semibold">
            {variance >= 0 ? "+" : "-"}${Math.abs(variance).toLocaleString()}
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <div className="rounded-lg border p-4">
          <h2 className="text-base font-semibold">Add Item</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <input
              value={newItemTitle}
              onChange={(event) => setNewItemTitle(event.target.value)}
              className="rounded-md border bg-background px-3 py-2 text-sm md:col-span-2"
              placeholder="New item title..."
            />
            <input
              value={newItemEstimate}
              onChange={(event) => setNewItemEstimate(event.target.value)}
              className="rounded-md border bg-background px-3 py-2 text-sm"
              type="number"
              min="0"
              step="0.01"
              placeholder="Estimate (optional)"
            />
          </div>
          <button
            type="button"
            onClick={addItem}
            disabled={isPending || !newItemTitle.trim()}
            className="mt-3 rounded-md bg-foreground px-3 py-2 text-sm text-background disabled:opacity-60"
          >
            {isPending ? "Saving..." : "Add Item"}
          </button>
          {feedback ? (
            <p
              className={`mt-2 text-xs ${
                feedback.type === "success"
                  ? "text-emerald-700"
                  : "text-red-700"
              }`}
            >
              {feedback.message}
            </p>
          ) : null}
        </div>
        <h2 className="text-base font-semibold">Items</h2>
        {localItems.map((item) => {
          const actual = getTotalActualForItem(item);

          return (
            <div key={item.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <Link
                    href={`/app/${projectId}/items/${item.id}`}
                    className="font-medium underline-offset-2 hover:underline"
                  >
                    {item.title}
                  </Link>
                  <p className="text-sm text-muted-foreground">{item.note}</p>
                  <button
                    type="button"
                    onClick={() => deleteItem(item.id)}
                    disabled={isPending}
                    className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                  >
                    Delete Item
                  </button>
                </div>

                <div className="w-44 space-y-1">
                  <label className="text-xs text-muted-foreground">
                    Status
                  </label>
                  <select
                    value={item.status}
                    onChange={(event) =>
                      updateStatus(item.id, event.target.value as ItemStatus)
                    }
                    disabled={isPending}
                    className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                  >
                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <p className="mt-2 text-xs text-muted-foreground">
                Estimate: ${item.estimate.toLocaleString()} • Actual: $
                {actual.toLocaleString()} • Expenses: {item.expenses.length}
              </p>
            </div>
          );
        })}
      </section>
    </div>
  );
}
