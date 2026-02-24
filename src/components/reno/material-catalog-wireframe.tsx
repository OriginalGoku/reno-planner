"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import type {
  MaterialCatalogItem,
  MaterialCategory,
  MaterialUnitType,
} from "@/lib/reno-data-loader";
import {
  addMaterialCatalogItemAction,
  addMaterialCategoryAction,
  deleteMaterialCatalogItemAction,
  deleteMaterialCategoryAction,
  moveMaterialCategoryAction,
  updateMaterialCatalogItemAction,
  updateMaterialCategoryAction,
} from "@/lib/reno-actions";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type MaterialCatalogWireframeProps = {
  projectId: string;
  initialCatalog: MaterialCatalogItem[];
  initialCategories: MaterialCategory[];
};

type Feedback = {
  type: "success" | "error";
  message: string;
} | null;

type CatalogDraft = {
  categoryId: string;
  name: string;
  unitType: MaterialUnitType;
  estimatedPrice: string;
  sampleUrl: string;
  notes: string;
};

type CategoryDraft = {
  name: string;
  description: string;
};

const materialUnitOptions: { value: MaterialUnitType; label: string }[] = [
  { value: "linear_ft", label: "Linear ft" },
  { value: "sqft", label: "Sq ft" },
  { value: "sqm", label: "Sq m" },
  { value: "piece", label: "Piece" },
  { value: "bundle", label: "Bundle" },
  { value: "box", label: "Box" },
  { value: "roll", label: "Roll" },
  { value: "sheet", label: "Sheet" },
  { value: "bag", label: "Bag" },
  { value: "gallon", label: "Gallon" },
  { value: "liter", label: "Liter" },
  { value: "kg", label: "Kg" },
  { value: "lb", label: "Lb" },
  { value: "meter", label: "Meter" },
  { value: "other", label: "Other" },
];

function emptyCategoryDraft(): CategoryDraft {
  return { name: "", description: "" };
}

function emptyCatalogDraft(defaultCategoryId: string): CatalogDraft {
  return {
    categoryId: defaultCategoryId,
    name: "",
    unitType: "piece",
    estimatedPrice: "",
    sampleUrl: "",
    notes: "",
  };
}

function toCatalogDraft(item: MaterialCatalogItem): CatalogDraft {
  return {
    categoryId: item.categoryId,
    name: item.name,
    unitType: item.unitType,
    estimatedPrice:
      typeof item.estimatedPrice === "number" ? String(item.estimatedPrice) : "",
    sampleUrl: item.sampleUrl ?? "",
    notes: item.notes ?? "",
  };
}

function toCategoryDraft(category: MaterialCategory): CategoryDraft {
  return {
    name: category.name,
    description: category.description ?? "",
  };
}

function unitLabel(unitType: MaterialUnitType) {
  return (
    materialUnitOptions.find((option) => option.value === unitType)?.label ??
    unitType
  );
}

export function MaterialCatalogWireframe({
  projectId,
  initialCatalog,
  initialCategories,
}: MaterialCatalogWireframeProps) {
  const [catalog, setCatalog] = useState(initialCatalog);
  const [categories, setCategories] = useState(initialCategories);
  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.sortOrder - b.sortOrder),
    [categories],
  );
  const fallbackCategoryId = sortedCategories[0]?.id ?? "uncategorized";

  const [newEntry, setNewEntry] = useState<CatalogDraft>(
    emptyCatalogDraft(fallbackCategoryId),
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<CatalogDraft | null>(null);

  const [newCategory, setNewCategory] = useState<CategoryDraft>(
    emptyCategoryDraft,
  );
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );
  const [editingCategoryDraft, setEditingCategoryDraft] =
    useState<CategoryDraft | null>(null);

  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const categoryById = useMemo(
    () => new Map(sortedCategories.map((category) => [category.id, category])),
    [sortedCategories],
  );

  const groupedCatalog = useMemo(() => {
    const map = new Map<string, MaterialCatalogItem[]>();
    for (const category of sortedCategories) {
      map.set(category.id, []);
    }
    for (const entry of catalog) {
      const bucket = map.get(entry.categoryId) ?? [];
      bucket.push(entry);
      if (!map.has(entry.categoryId)) {
        map.set(entry.categoryId, bucket);
      }
    }

    return sortedCategories.map((category) => ({
      category,
      items: (map.get(category.id) ?? []).sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    }));
  }, [catalog, sortedCategories]);

  function addCategory() {
    const name = newCategory.name.trim();
    if (!name) {
      return;
    }

    const optimisticId = `local-category-${Date.now()}`;
    const optimistic: MaterialCategory = {
      id: optimisticId,
      name,
      description: newCategory.description.trim(),
      sortOrder: categories.length,
    };

    setCategories((current) => [...current, optimistic]);
    setNewCategory(emptyCategoryDraft());
    setFeedback(null);

    startTransition(async () => {
      try {
        await addMaterialCategoryAction({
          projectId,
          name,
          description: optimistic.description,
        });
        setFeedback({ type: "success", message: "Category added." });
        router.refresh();
      } catch {
        setFeedback({ type: "error", message: "Could not add category." });
        router.refresh();
      }
    });
  }

  function beginEditCategory(category: MaterialCategory) {
    setEditingCategoryId(category.id);
    setEditingCategoryDraft(toCategoryDraft(category));
  }

  function cancelEditCategory() {
    setEditingCategoryId(null);
    setEditingCategoryDraft(null);
  }

  function saveCategory() {
    if (!editingCategoryId || !editingCategoryDraft) {
      return;
    }
    const name = editingCategoryDraft.name.trim();
    if (!name) {
      return;
    }

    const categoryId = editingCategoryId;
    const description = editingCategoryDraft.description.trim();

    setCategories((current) =>
      current.map((category) =>
        category.id === categoryId ? { ...category, name, description } : category,
      ),
    );
    cancelEditCategory();
    setFeedback(null);

    if (categoryId.startsWith("local-category-")) {
      return;
    }

    startTransition(async () => {
      try {
        await updateMaterialCategoryAction({
          projectId,
          categoryId,
          name,
          description,
        });
        setFeedback({ type: "success", message: "Category updated." });
        router.refresh();
      } catch {
        setFeedback({ type: "error", message: "Could not update category." });
        router.refresh();
      }
    });
  }

  function moveCategory(categoryId: string, direction: "up" | "down") {
    setFeedback(null);

    setCategories((current) => {
      const ordered = [...current].sort((a, b) => a.sortOrder - b.sortOrder);
      const index = ordered.findIndex((entry) => entry.id === categoryId);
      if (index < 0) {
        return current;
      }
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= ordered.length) {
        return current;
      }
      const [moved] = ordered.splice(index, 1);
      ordered.splice(target, 0, moved);
      return ordered.map((entry, nextIndex) => ({
        ...entry,
        sortOrder: nextIndex,
      }));
    });

    if (categoryId.startsWith("local-category-")) {
      return;
    }

    startTransition(async () => {
      try {
        await moveMaterialCategoryAction({ projectId, categoryId, direction });
        setFeedback({ type: "success", message: "Category reordered." });
        router.refresh();
      } catch {
        setFeedback({ type: "error", message: "Could not reorder category." });
        router.refresh();
      }
    });
  }

  function deleteCategory(categoryId: string) {
    const category = categoryById.get(categoryId);
    if (!category) {
      return;
    }
    if (category.id === "uncategorized") {
      window.alert("Uncategorized cannot be deleted.");
      return;
    }
    const confirmed = window.confirm(
      `Delete \"${category.name}\"? Materials under it will be reassigned to Uncategorized.`,
    );
    if (!confirmed) {
      return;
    }

    setCategories((current) => current.filter((entry) => entry.id !== categoryId));
    setCatalog((current) =>
      current.map((entry) =>
        entry.categoryId === categoryId
          ? { ...entry, categoryId: "uncategorized" }
          : entry,
      ),
    );
    setFeedback(null);

    if (categoryId.startsWith("local-category-")) {
      return;
    }

    startTransition(async () => {
      try {
        await deleteMaterialCategoryAction({ projectId, categoryId });
        setFeedback({ type: "success", message: "Category deleted." });
        router.refresh();
      } catch {
        setFeedback({ type: "error", message: "Could not delete category." });
        router.refresh();
      }
    });
  }

  function addEntry() {
    const name = newEntry.name.trim();
    if (!name || !newEntry.categoryId) {
      return;
    }
    const estimatedPrice =
      newEntry.estimatedPrice.trim() === ""
        ? undefined
        : Number(newEntry.estimatedPrice);
    if (
      estimatedPrice !== undefined &&
      (Number.isNaN(estimatedPrice) || estimatedPrice < 0)
    ) {
      return;
    }

    const optimisticId = `local-catalog-${Date.now()}`;
    const optimistic: MaterialCatalogItem = {
      id: optimisticId,
      categoryId: newEntry.categoryId,
      name,
      unitType: newEntry.unitType,
      estimatedPrice,
      sampleUrl: newEntry.sampleUrl.trim(),
      notes: newEntry.notes.trim(),
    };

    setCatalog((current) => [optimistic, ...current]);
    setNewEntry(emptyCatalogDraft(fallbackCategoryId));
    setFeedback(null);

    startTransition(async () => {
      try {
        await addMaterialCatalogItemAction({
          projectId,
          categoryId: optimistic.categoryId,
          name,
          unitType: optimistic.unitType,
          estimatedPrice,
          sampleUrl: optimistic.sampleUrl,
          notes: optimistic.notes,
        });
        setFeedback({ type: "success", message: "Material added." });
        router.refresh();
      } catch {
        setFeedback({ type: "error", message: "Could not add material." });
        router.refresh();
      }
    });
  }

  function beginEdit(item: MaterialCatalogItem) {
    setEditingId(item.id);
    setEditingDraft(toCatalogDraft(item));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingDraft(null);
  }

  function saveEdit() {
    if (!editingId || !editingDraft) {
      return;
    }
    const name = editingDraft.name.trim();
    if (!name) {
      return;
    }
    const estimatedPrice =
      editingDraft.estimatedPrice.trim() === ""
        ? undefined
        : Number(editingDraft.estimatedPrice);
    if (
      estimatedPrice !== undefined &&
      (Number.isNaN(estimatedPrice) || estimatedPrice < 0)
    ) {
      return;
    }

    const materialId = editingId;

    setCatalog((current) =>
      current.map((entry) =>
        entry.id === materialId
          ? {
              ...entry,
              categoryId: editingDraft.categoryId,
              name,
              unitType: editingDraft.unitType,
              estimatedPrice,
              sampleUrl: editingDraft.sampleUrl.trim(),
              notes: editingDraft.notes.trim(),
            }
          : entry,
      ),
    );

    cancelEdit();
    setFeedback(null);

    if (materialId.startsWith("local-catalog-")) {
      return;
    }

    startTransition(async () => {
      try {
        await updateMaterialCatalogItemAction({
          projectId,
          materialId,
          categoryId: editingDraft.categoryId,
          name,
          unitType: editingDraft.unitType,
          estimatedPrice,
          sampleUrl: editingDraft.sampleUrl.trim(),
          notes: editingDraft.notes.trim(),
        });
        setFeedback({ type: "success", message: "Material updated." });
        router.refresh();
      } catch {
        setFeedback({ type: "error", message: "Could not update material." });
        router.refresh();
      }
    });
  }

  function deleteEntry(materialId: string) {
    const material = catalog.find((entry) => entry.id === materialId);
    const confirmed = window.confirm(
      `Delete \"${material?.name ?? "this material"}\" from catalog?`,
    );
    if (!confirmed) {
      return;
    }

    setCatalog((current) => current.filter((entry) => entry.id !== materialId));
    setFeedback(null);

    if (materialId.startsWith("local-catalog-")) {
      return;
    }

    startTransition(async () => {
      try {
        await deleteMaterialCatalogItemAction({ projectId, materialId });
        setFeedback({ type: "success", message: "Material deleted." });
        router.refresh();
      } catch {
        setFeedback({
          type: "error",
          message:
            "Could not delete material. It may be used by one or more item material lines.",
        });
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Materials
        </p>
        <h1 className="mt-1 text-2xl font-semibold">Material Catalog</h1>
        <p className="text-sm text-muted-foreground">
          Manage categories and catalog entries used by item material lines.
        </p>
      </section>

      <section className="space-y-3 rounded-lg border p-4">
        <h2 className="text-sm font-semibold">Material Categories</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Category Name</label>
            <input
              value={newCategory.name}
              onChange={(event) =>
                setNewCategory((current) => ({ ...current, name: event.target.value }))
              }
              className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
              placeholder="Drywall"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Description (optional)</label>
            <input
              value={newCategory.description}
              onChange={(event) =>
                setNewCategory((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={addCategory}
          disabled={isPending || !newCategory.name.trim()}
          className="rounded-md border px-3 py-2 text-sm"
        >
          Add Category
        </button>

        <div className="space-y-2">
          {sortedCategories.map((category) => (
            <article key={category.id} className="rounded-md border p-3">
              {editingCategoryId === category.id && editingCategoryDraft ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Category Name</label>
                    <input
                      value={editingCategoryDraft.name}
                      onChange={(event) =>
                        setEditingCategoryDraft((current) =>
                          current ? { ...current, name: event.target.value } : current,
                        )
                      }
                      className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Description</label>
                    <input
                      value={editingCategoryDraft.description}
                      onChange={(event) =>
                        setEditingCategoryDraft((current) =>
                          current
                            ? { ...current, description: event.target.value }
                            : current,
                        )
                      }
                      className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2 flex gap-2">
                    <button
                      type="button"
                      onClick={saveCategory}
                      className="rounded-md border px-3 py-1.5 text-sm"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditCategory}
                      className="rounded-md border px-3 py-1.5 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{category.name}</p>
                    {category.description ? (
                      <p className="text-sm text-muted-foreground">{category.description}</p>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => moveCategory(category.id, "up")}
                      className="rounded-md border px-2 py-1 text-xs"
                      disabled={isPending}
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      onClick={() => moveCategory(category.id, "down")}
                      className="rounded-md border px-2 py-1 text-xs"
                      disabled={isPending}
                    >
                      Down
                    </button>
                    <button
                      type="button"
                      onClick={() => beginEditCategory(category)}
                      className="rounded-md border px-2 py-1 text-xs"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteCategory(category.id)}
                      className="rounded-md border px-2 py-1 text-xs"
                      disabled={category.id === "uncategorized"}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-lg border p-4">
        <h2 className="text-sm font-semibold">Add Material</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs text-muted-foreground">Category</label>
            <select
              value={newEntry.categoryId}
              onChange={(event) =>
                setNewEntry((current) => ({
                  ...current,
                  categoryId: event.target.value,
                }))
              }
              className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
            >
              {sortedCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs text-muted-foreground">Name</label>
            <input
              value={newEntry.name}
              onChange={(event) =>
                setNewEntry((current) => ({ ...current, name: event.target.value }))
              }
              className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
              placeholder="Drywall 5/8 Type X"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Unit Type</label>
            <select
              value={newEntry.unitType}
              onChange={(event) =>
                setNewEntry((current) => ({
                  ...current,
                  unitType: event.target.value as MaterialUnitType,
                }))
              }
              className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
            >
              {materialUnitOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Default Estimated Price (optional)</label>
            <input
              value={newEntry.estimatedPrice}
              onChange={(event) =>
                setNewEntry((current) => ({
                  ...current,
                  estimatedPrice: event.target.value,
                }))
              }
              className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
              type="number"
              min="0"
              step="0.01"
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs text-muted-foreground">Sample URL (optional)</label>
            <input
              value={newEntry.sampleUrl}
              onChange={(event) =>
                setNewEntry((current) => ({ ...current, sampleUrl: event.target.value }))
              }
              className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
              placeholder="https://example.com/product"
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs text-muted-foreground">Notes (optional)</label>
            <textarea
              value={newEntry.notes}
              onChange={(event) =>
                setNewEntry((current) => ({ ...current, notes: event.target.value }))
              }
              className="min-h-20 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={addEntry}
          disabled={isPending || !newEntry.name.trim() || !newEntry.categoryId}
          className="rounded-md border px-3 py-2 text-sm"
        >
          Add Material
        </button>
      </section>

      {feedback ? (
        <p
          className={`text-sm ${
            feedback.type === "success" ? "text-green-600" : "text-red-600"
          }`}
        >
          {feedback.message}
        </p>
      ) : null}

      <section className="space-y-3 rounded-lg border p-4">
        <h2 className="text-sm font-semibold">Catalog Entries by Category</h2>
        {groupedCatalog.length ? (
          <div className="space-y-2">
            {groupedCatalog.map(({ category, items }) => (
              <Collapsible key={category.id} defaultOpen>
                <div className="rounded-md border">
                  <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 text-left">
                    <div>
                      <p className="font-medium">{category.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {items.length} material{items.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <ChevronRight className="size-4 transition-transform data-[state=open]:rotate-90" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2 border-t px-3 py-2">
                    {items.length ? (
                      items.map((entry) => (
                        <article key={entry.id} className="rounded-md border p-3">
                          {editingId === entry.id && editingDraft ? (
                            <div className="space-y-3">
                              <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-1 sm:col-span-2">
                                  <label className="text-xs text-muted-foreground">Category</label>
                                  <select
                                    value={editingDraft.categoryId}
                                    onChange={(event) =>
                                      setEditingDraft((current) =>
                                        current
                                          ? {
                                              ...current,
                                              categoryId: event.target.value,
                                            }
                                          : current,
                                      )
                                    }
                                    className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                                  >
                                    {sortedCategories.map((categoryOption) => (
                                      <option
                                        key={categoryOption.id}
                                        value={categoryOption.id}
                                      >
                                        {categoryOption.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div className="space-y-1 sm:col-span-2">
                                  <label className="text-xs text-muted-foreground">Name</label>
                                  <input
                                    value={editingDraft.name}
                                    onChange={(event) =>
                                      setEditingDraft((current) =>
                                        current
                                          ? { ...current, name: event.target.value }
                                          : current,
                                      )
                                    }
                                    className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-xs text-muted-foreground">Unit Type</label>
                                  <select
                                    value={editingDraft.unitType}
                                    onChange={(event) =>
                                      setEditingDraft((current) =>
                                        current
                                          ? {
                                              ...current,
                                              unitType:
                                                event.target.value as MaterialUnitType,
                                            }
                                          : current,
                                      )
                                    }
                                    className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                                  >
                                    {materialUnitOptions.map((option) => (
                                      <option key={option.value} value={option.value}>
                                        {option.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div className="space-y-1">
                                  <label className="text-xs text-muted-foreground">Default Estimated Price</label>
                                  <input
                                    value={editingDraft.estimatedPrice}
                                    onChange={(event) =>
                                      setEditingDraft((current) =>
                                        current
                                          ? {
                                              ...current,
                                              estimatedPrice: event.target.value,
                                            }
                                          : current,
                                      )
                                    }
                                    className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                  />
                                </div>
                                <div className="space-y-1 sm:col-span-2">
                                  <label className="text-xs text-muted-foreground">Sample URL</label>
                                  <input
                                    value={editingDraft.sampleUrl}
                                    onChange={(event) =>
                                      setEditingDraft((current) =>
                                        current
                                          ? {
                                              ...current,
                                              sampleUrl: event.target.value,
                                            }
                                          : current,
                                      )
                                    }
                                    className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                                  />
                                </div>
                                <div className="space-y-1 sm:col-span-2">
                                  <label className="text-xs text-muted-foreground">Notes</label>
                                  <textarea
                                    value={editingDraft.notes}
                                    onChange={(event) =>
                                      setEditingDraft((current) =>
                                        current
                                          ? {
                                              ...current,
                                              notes: event.target.value,
                                            }
                                          : current,
                                      )
                                    }
                                    className="min-h-20 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                                  />
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={saveEdit}
                                  className="rounded-md border px-3 py-1.5 text-sm"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEdit}
                                  className="rounded-md border px-3 py-1.5 text-sm"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="font-medium">{entry.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  Unit: {unitLabel(entry.unitType)}
                                  {typeof entry.estimatedPrice === "number"
                                    ? ` • Default est: $${entry.estimatedPrice.toLocaleString()}`
                                    : ""}
                                </p>
                                {entry.notes ? (
                                  <p className="text-sm text-muted-foreground">{entry.notes}</p>
                                ) : null}
                                {entry.sampleUrl ? (
                                  <a
                                    href={entry.sampleUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs text-blue-600 underline"
                                  >
                                    Open sample URL
                                  </a>
                                ) : null}
                              </div>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => beginEdit(entry)}
                                  className="rounded-md border px-2 py-1 text-xs"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteEntry(entry.id)}
                                  className="rounded-md border px-2 py-1 text-xs"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          )}
                        </article>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No materials in this category.
                      </p>
                    )}
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No material catalog entries yet.
          </p>
        )}
      </section>
    </div>
  );
}
