"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AttachmentManager } from "@/components/reno/attachment-manager";
import type {
  ExpenseType,
  ItemStatus,
  MaterialCatalogItem,
  MaterialCategory,
  MaterialUnitType,
  RenovationAttachment,
  RenovationExpense,
  RenovationMaterial,
  RenovationItem,
} from "@/lib/reno-data-loader";
import { getTotalActualForItem } from "@/lib/reno-data-loader";
import {
  addItemExpenseAction,
  addItemMaterialAction,
  removeItemMaterialAction,
  removeItemExpenseAction,
  updateItemExpenseAction,
  updateItemMaterialAction,
  updateItemFieldsAction,
} from "@/lib/reno-actions";

type TabKey = "overview" | "notes" | "materials" | "expenses" | "files";

type ItemDetailWireframeProps = {
  projectId: string;
  item: RenovationItem;
  sectionTitle: string;
  attachments: RenovationAttachment[];
  materialCatalog: MaterialCatalogItem[];
  materialCategories: MaterialCategory[];
};

type Feedback = {
  type: "success" | "error";
  message: string;
} | null;

const tabs: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview & Schedule" },
  { key: "notes", label: "Notes" },
  { key: "materials", label: "Materials" },
  { key: "expenses", label: "Expenses" },
  { key: "files", label: "Files" },
];

const expenseTypes: ExpenseType[] = [
  "material",
  "labor",
  "permit",
  "tool",
  "other",
];
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

function materialUnitLabel(unitType: MaterialUnitType) {
  return (
    materialUnitOptions.find((option) => option.value === unitType)?.label ??
    unitType
  );
}
const statusOptions: { value: ItemStatus; label: string }[] = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "blocked", label: "Blocked" },
  { value: "done", label: "Completed" },
];

export function ItemDetailWireframe({
  projectId,
  item,
  sectionTitle,
  attachments,
  materialCatalog,
  materialCategories,
}: ItemDetailWireframeProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [itemTitle, setItemTitle] = useState(item.title);
  const [itemEstimate, setItemEstimate] = useState(item.estimate);
  const [itemStatus, setItemStatus] = useState<ItemStatus>(item.status);
  const [estimatedCompletionDate, setEstimatedCompletionDate] = useState(
    item.estimatedCompletionDate ?? "",
  );
  const [actualCompletionDate, setActualCompletionDate] = useState(
    item.actualCompletionDate ?? "",
  );
  const [performers, setPerformers] = useState<string[]>(item.performers ?? []);
  const [newPerformer, setNewPerformer] = useState("");
  const [description, setDescription] = useState(item.description);
  const [notes, setNotes] = useState(item.note);
  const [materials, setMaterials] = useState<RenovationMaterial[]>(
    item.materials ?? [],
  );
  const [expenses, setExpenses] = useState<RenovationExpense[]>(item.expenses);
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    materialCatalog[0]?.categoryId ?? "",
  );
  const [selectedMaterialId, setSelectedMaterialId] = useState(
    materialCatalog[0]?.id ?? "",
  );
  const [materialQuantity, setMaterialQuantity] = useState("");
  const [materialUrl, setMaterialUrl] = useState("");
  const [materialNote, setMaterialNote] = useState("");
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(
    null,
  );
  const [editingMaterialDraft, setEditingMaterialDraft] =
    useState<RenovationMaterial | null>(null);

  const [expenseDate, setExpenseDate] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseType, setExpenseType] = useState<ExpenseType>("material");
  const [expenseVendor, setExpenseVendor] = useState("");
  const [expenseNote, setExpenseNote] = useState("");
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editingExpenseDraft, setEditingExpenseDraft] =
    useState<RenovationExpense | null>(null);
  const [overviewFeedback, setOverviewFeedback] = useState<Feedback>(null);
  const [materialsFeedback, setMaterialsFeedback] = useState<Feedback>(null);
  const [expensesFeedback, setExpensesFeedback] = useState<Feedback>(null);

  const [isSavingOverview, startSavingOverview] = useTransition();
  const [isSavingMaterial, startSavingMaterial] = useTransition();
  const [isSavingExpense, startSavingExpense] = useTransition();
  const router = useRouter();
  const materialCatalogMap = useMemo(
    () => new Map(materialCatalog.map((entry) => [entry.id, entry])),
    [materialCatalog],
  );
  const materialCategoryOptions = useMemo(() => {
    const lookup = new Map(
      materialCategories.map((category) => [category.id, category.name]),
    );
    const unique = new Set(materialCatalog.map((entry) => entry.categoryId));
    return Array.from(unique).map((categoryId) => ({
      id: categoryId,
      name: lookup.get(categoryId) ?? categoryId,
    }));
  }, [materialCatalog, materialCategories]);
  const materialsForSelectedCategory = useMemo(
    () =>
      materialCatalog
        .filter((entry) => entry.categoryId === selectedCategoryId)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [materialCatalog, selectedCategoryId],
  );

  const actualTotal = useMemo(
    () => getTotalActualForItem({ ...item, expenses }),
    [expenses, item],
  );
  const delta = itemEstimate - actualTotal;

  function saveOverviewAndNotes() {
    setOverviewFeedback(null);
    startSavingOverview(async () => {
      try {
        await updateItemFieldsAction({
          projectId,
          itemId: item.id,
          title: itemTitle.trim() || item.title,
          estimate: itemEstimate,
          status: itemStatus,
          estimatedCompletionDate: estimatedCompletionDate || undefined,
          actualCompletionDate: actualCompletionDate || undefined,
          performers,
          description,
          note: notes,
        });
        setOverviewFeedback({
          type: "success",
          message: "Overview and notes saved.",
        });
        router.refresh();
      } catch {
        setOverviewFeedback({
          type: "error",
          message: "Could not save changes. Please try again.",
        });
      }
    });
  }

  function addExpense() {
    const parsedAmount = Number(expenseAmount);
    if (!expenseDate || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      return;
    }

    const newExpense: RenovationExpense = {
      id: `local-${Date.now()}`,
      date: expenseDate,
      amount: parsedAmount,
      type: expenseType,
      vendor: expenseVendor || undefined,
      note: expenseNote || undefined,
    };

    setExpenses((current) => [newExpense, ...current]);
    setExpensesFeedback(null);
    setExpenseDate("");
    setExpenseAmount("");
    setExpenseType("material");
    setExpenseVendor("");
    setExpenseNote("");

    startSavingExpense(async () => {
      try {
        await addItemExpenseAction({
          projectId,
          itemId: item.id,
          date: newExpense.date,
          amount: newExpense.amount,
          type: newExpense.type,
          vendor: newExpense.vendor,
          note: newExpense.note,
        });
        setExpensesFeedback({ type: "success", message: "Expense added." });
        router.refresh();
      } catch {
        setExpensesFeedback({
          type: "error",
          message: "Could not add expense. Please try again.",
        });
        router.refresh();
      }
    });
  }

  function startEditingExpense(expense: RenovationExpense) {
    setEditingExpenseId(expense.id);
    setEditingExpenseDraft({ ...expense });
  }

  function cancelEditingExpense() {
    setEditingExpenseId(null);
    setEditingExpenseDraft(null);
  }

  function saveEditingExpense() {
    if (!editingExpenseId || !editingExpenseDraft) {
      return;
    }
    if (!editingExpenseDraft.date || editingExpenseDraft.amount <= 0) {
      return;
    }

    const expenseId = editingExpenseId;
    const expenseDraft = editingExpenseDraft;
    setExpenses((current) =>
      current.map((expense) =>
        expense.id === expenseId ? expenseDraft : expense,
      ),
    );
    setExpensesFeedback(null);
    setEditingExpenseId(null);
    setEditingExpenseDraft(null);

    if (expenseId.startsWith("local-")) {
      return;
    }

    startSavingExpense(async () => {
      try {
        await updateItemExpenseAction({
          projectId,
          itemId: item.id,
          expenseId,
          date: expenseDraft.date,
          amount: expenseDraft.amount,
          type: expenseDraft.type,
          vendor: expenseDraft.vendor,
          note: expenseDraft.note,
        });
        setExpensesFeedback({ type: "success", message: "Expense updated." });
        router.refresh();
      } catch {
        setExpensesFeedback({
          type: "error",
          message: "Could not update expense. Please try again.",
        });
        router.refresh();
      }
    });
  }

  function removeExpense(expenseId: string) {
    const target = expenses.find((expense) => expense.id === expenseId);
    const amountLabel = target
      ? `$${target.amount.toLocaleString()}`
      : "expense";
    const confirmed = window.confirm(`Remove ${amountLabel}?`);
    if (!confirmed) {
      return;
    }

    setExpenses((current) =>
      current.filter((expense) => expense.id !== expenseId),
    );
    setExpensesFeedback(null);

    if (expenseId.startsWith("local-")) {
      return;
    }

    startSavingExpense(async () => {
      try {
        await removeItemExpenseAction({
          projectId,
          itemId: item.id,
          expenseId,
        });
        setExpensesFeedback({ type: "success", message: "Expense removed." });
        router.refresh();
      } catch {
        setExpensesFeedback({
          type: "error",
          message: "Could not remove expense. Please try again.",
        });
        router.refresh();
      }
    });
  }

  function addPerformer() {
    const trimmed = newPerformer.trim();
    if (!trimmed) {
      return;
    }
    if (
      performers.some(
        (performer) => performer.toLowerCase() === trimmed.toLowerCase(),
      )
    ) {
      return;
    }
    const updatedPerformers = [...performers, trimmed];
    setPerformers(updatedPerformers);
    setOverviewFeedback(null);
    setNewPerformer("");

    startSavingOverview(async () => {
      try {
        await updateItemFieldsAction({
          projectId,
          itemId: item.id,
          title: itemTitle.trim() || item.title,
          estimate: itemEstimate,
          status: itemStatus,
          estimatedCompletionDate: estimatedCompletionDate || undefined,
          actualCompletionDate: actualCompletionDate || undefined,
          performers: updatedPerformers,
          description,
          note: notes,
        });
        setOverviewFeedback({
          type: "success",
          message: `Assignee "${trimmed}" added.`,
        });
        router.refresh();
      } catch {
        setOverviewFeedback({
          type: "error",
          message: "Could not save assignee. Please try again.",
        });
      }
    });
  }

  function removePerformer(name: string) {
    const updatedPerformers = performers.filter(
      (performer) => performer !== name,
    );
    setPerformers(updatedPerformers);
    setOverviewFeedback(null);

    startSavingOverview(async () => {
      try {
        await updateItemFieldsAction({
          projectId,
          itemId: item.id,
          title: itemTitle.trim() || item.title,
          estimate: itemEstimate,
          status: itemStatus,
          estimatedCompletionDate: estimatedCompletionDate || undefined,
          actualCompletionDate: actualCompletionDate || undefined,
          performers: updatedPerformers,
          description,
          note: notes,
        });
        setOverviewFeedback({
          type: "success",
          message: `Assignee "${name}" removed.`,
        });
        router.refresh();
      } catch {
        setOverviewFeedback({
          type: "error",
          message: "Could not remove assignee. Please try again.",
        });
      }
    });
  }

  function addMaterial() {
    const materialId = selectedMaterialId;
    const quantity = Number(materialQuantity);
    const catalogEntry = materialCatalogMap.get(materialId);

    if (!catalogEntry || Number.isNaN(quantity)) {
      return;
    }
    if (quantity <= 0) {
      return;
    }

    const newMaterial: RenovationMaterial = {
      id: `local-material-${Date.now()}`,
      materialId,
      quantity,
      url: materialUrl.trim(),
      note: materialNote.trim() || undefined,
    };

    setMaterials((current) => [newMaterial, ...current]);
    setMaterialsFeedback(null);
    const firstInCategory = materialCatalog.find(
      (entry) => entry.categoryId === selectedCategoryId,
    );
    setSelectedMaterialId(firstInCategory?.id ?? "");
    setMaterialQuantity("");
    setMaterialUrl("");
    setMaterialNote("");

    startSavingMaterial(async () => {
      try {
        await addItemMaterialAction({
          projectId,
          itemId: item.id,
          materialId: newMaterial.materialId,
          quantity: newMaterial.quantity,
          url: newMaterial.url,
          note: newMaterial.note,
        });
        setMaterialsFeedback({ type: "success", message: "Material added." });
        router.refresh();
      } catch {
        setMaterialsFeedback({
          type: "error",
          message: "Could not add material. Please try again.",
        });
        router.refresh();
      }
    });
  }

  function removeMaterial(materialId: string) {
    const target = materials.find((material) => material.id === materialId);
    const materialLabel = target
      ? (materialCatalogMap.get(target.materialId)?.name ?? target.materialId)
      : "this material";
    const confirmed = window.confirm(
      `Remove "${materialLabel}" from materials?`,
    );
    if (!confirmed) {
      return;
    }

    setMaterials((current) =>
      current.filter((material) => material.id !== materialId),
    );
    setMaterialsFeedback(null);

    if (materialId.startsWith("local-material-")) {
      return;
    }

    startSavingMaterial(async () => {
      try {
        await removeItemMaterialAction({
          projectId,
          itemId: item.id,
          materialId,
        });
        setMaterialsFeedback({ type: "success", message: "Material removed." });
        router.refresh();
      } catch {
        setMaterialsFeedback({
          type: "error",
          message: "Could not remove material. Please try again.",
        });
        router.refresh();
      }
    });
  }

  function startEditingMaterial(material: RenovationMaterial) {
    setEditingMaterialId(material.id);
    setEditingMaterialDraft({ ...material });
  }

  function cancelEditingMaterial() {
    setEditingMaterialId(null);
    setEditingMaterialDraft(null);
  }

  function saveMaterialEdits() {
    if (!editingMaterialId || !editingMaterialDraft) {
      return;
    }
    if (
      !materialCatalogMap.has(editingMaterialDraft.materialId) ||
      editingMaterialDraft.quantity < 0
    ) {
      return;
    }

    const materialId = editingMaterialId;
    const materialDraft = editingMaterialDraft;

    setMaterials((current) =>
      current.map((material) =>
        material.id === materialId ? materialDraft : material,
      ),
    );
    setMaterialsFeedback(null);
    setEditingMaterialId(null);
    setEditingMaterialDraft(null);

    if (materialId.startsWith("local-material-")) {
      return;
    }

    startSavingMaterial(async () => {
      try {
        await updateItemMaterialAction({
          projectId,
          itemId: item.id,
          materialId,
          catalogMaterialId: materialDraft.materialId,
          quantity: materialDraft.quantity,
          url: materialDraft.url,
          note: materialDraft.note,
        });
        setMaterialsFeedback({
          type: "success",
          message: "Material updated.",
        });
        router.refresh();
      } catch {
        setMaterialsFeedback({
          type: "error",
          message: "Could not update material. Please try again.",
        });
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Item
        </p>
        <h1 className="mt-1 text-2xl font-semibold">{itemTitle}</h1>
        <p className="text-sm text-muted-foreground">
          Section: {sectionTitle} • Estimate: ${itemEstimate.toLocaleString()} •
          Actual: ${actualTotal.toLocaleString()}
        </p>
        <p className="text-sm text-muted-foreground">
          Budget delta: {delta >= 0 ? "+" : "-"}$
          {Math.abs(delta).toLocaleString()}
        </p>
      </section>

      <section className="space-y-4 rounded-lg border p-4">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-md border px-3 py-1.5 text-sm ${
                activeTab === tab.key
                  ? "bg-foreground text-background"
                  : "bg-background text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "overview" ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1 sm:col-span-3">
                <label className="text-xs text-muted-foreground">
                  Item Title
                </label>
                <input
                  value={itemTitle}
                  onChange={(event) => setItemTitle(event.target.value)}
                  className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                />
              </div>
              <div className="space-y-1 sm:col-span-3">
                <label className="text-xs text-muted-foreground">
                  Estimate
                </label>
                <input
                  value={itemEstimate}
                  onChange={(event) =>
                    setItemEstimate(
                      Math.max(0, Number(event.target.value) || 0),
                    )
                  }
                  className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                  type="number"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Status</label>
                <select
                  value={itemStatus}
                  onChange={(event) =>
                    setItemStatus(event.target.value as ItemStatus)
                  }
                  className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">
                  Estimated Completion Date
                </label>
                <input
                  value={estimatedCompletionDate}
                  onChange={(event) =>
                    setEstimatedCompletionDate(event.target.value)
                  }
                  type="date"
                  className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">
                  Actual Completion Date
                </label>
                <input
                  value={actualCompletionDate}
                  onChange={(event) =>
                    setActualCompletionDate(event.target.value)
                  }
                  type="date"
                  className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">
                Assigned People / Vendors
              </label>
              <div className="flex flex-wrap gap-2">
                {performers.map((performer) => (
                  <span
                    key={performer}
                    className="inline-flex items-center gap-2 rounded-full border px-2 py-1 text-xs"
                  >
                    {performer}
                    <button
                      type="button"
                      onClick={() => removePerformer(performer)}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label={`Remove ${performer}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
                {!performers.length ? (
                  <span className="text-xs text-muted-foreground">
                    No assignees yet.
                  </span>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  value={newPerformer}
                  onChange={(event) => setNewPerformer(event.target.value)}
                  className="min-w-64 flex-1 rounded-md border bg-background px-2 py-1.5 text-sm"
                  placeholder="Type contractor, person, or vendor name..."
                />
                <button
                  type="button"
                  onClick={addPerformer}
                  disabled={isSavingOverview || !newPerformer.trim()}
                  className="rounded-md bg-foreground px-3 py-1.5 text-sm text-background"
                >
                  Add
                </button>
              </div>
            </div>

            <label className="text-sm font-medium">Overview</label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={8}
              className="w-full rounded-md border bg-background p-3 text-sm"
              placeholder="Write overall item description here..."
            />
            <button
              type="button"
              disabled={isSavingOverview}
              onClick={saveOverviewAndNotes}
              className="rounded-md bg-foreground px-3 py-2 text-sm text-background disabled:opacity-60"
            >
              {isSavingOverview ? "Saving..." : "Save Overview"}
            </button>
            {overviewFeedback ? (
              <p
                className={`text-xs ${
                  overviewFeedback.type === "success"
                    ? "text-emerald-700"
                    : "text-red-700"
                }`}
              >
                {overviewFeedback.message}
              </p>
            ) : null}
          </div>
        ) : null}

        {activeTab === "notes" ? (
          <div className="space-y-2">
            <label className="text-sm font-medium">Execution Notes</label>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={10}
              className="w-full rounded-md border bg-background p-3 text-sm"
              placeholder="Add scope notes, checklists, and blockers..."
            />
            <button
              type="button"
              disabled={isSavingOverview}
              onClick={saveOverviewAndNotes}
              className="rounded-md bg-foreground px-3 py-2 text-sm text-background disabled:opacity-60"
            >
              {isSavingOverview ? "Saving..." : "Save Notes"}
            </button>
            {overviewFeedback ? (
              <p
                className={`text-xs ${
                  overviewFeedback.type === "success"
                    ? "text-emerald-700"
                    : "text-red-700"
                }`}
              >
                {overviewFeedback.message}
              </p>
            ) : null}
          </div>
        ) : null}

        {activeTab === "materials" ? (
          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">
                  Category
                </label>
                <select
                  value={selectedCategoryId}
                  onChange={(event) => {
                    const nextCategoryId = event.target.value;
                    setSelectedCategoryId(nextCategoryId);
                    const firstInCategory = materialCatalog.find(
                      (entry) => entry.categoryId === nextCategoryId,
                    );
                    setSelectedMaterialId(firstInCategory?.id ?? "");
                  }}
                  className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                >
                  {materialCategoryOptions.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1 lg:col-span-2">
                <label className="text-xs text-muted-foreground">
                  Catalog Material
                </label>
                <select
                  value={selectedMaterialId}
                  onChange={(event) =>
                    setSelectedMaterialId(event.target.value)
                  }
                  className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                >
                  {materialsForSelectedCategory.map((catalogItem) => (
                    <option key={catalogItem.id} value={catalogItem.id}>
                      {catalogItem.name}
                    </option>
                  ))}
                </select>
                {selectedMaterialId ? (
                  <p className="text-[11px] text-muted-foreground">
                    Unit type:{" "}
                    {materialUnitLabel(
                      materialCatalogMap.get(selectedMaterialId)?.unitType ??
                        "other",
                    )}
                  </p>
                ) : null}
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">
                  Quantity
                </label>
                <input
                  value={materialQuantity}
                  onChange={(event) => setMaterialQuantity(event.target.value)}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0"
                  className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">
                  Catalog Unit Estimate
                </label>
                <div className="rounded-md border bg-muted px-2 py-1.5 text-sm">
                  $
                  {(
                    materialCatalogMap.get(selectedMaterialId)
                      ?.estimatedPrice ?? 0
                  ).toLocaleString()}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Price source: Material Catalog
                </p>
                {(materialCatalogMap.get(selectedMaterialId)?.estimatedPrice ??
                  0) === 0 ? (
                  <p className="text-[11px] text-amber-700">
                    Catalog default is 0. Set default estimated price in Catalog
                    Entries.
                  </p>
                ) : null}
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">
                  Product URL
                </label>
                <input
                  value={materialUrl}
                  onChange={(event) => setMaterialUrl(event.target.value)}
                  type="text"
                  placeholder="https://..."
                  className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Notes</label>
                <input
                  value={materialNote}
                  onChange={(event) => setMaterialNote(event.target.value)}
                  type="text"
                  placeholder="Optional notes"
                  className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={addMaterial}
              disabled={isSavingMaterial || !selectedMaterialId}
              className="rounded-md bg-foreground px-3 py-2 text-sm text-background disabled:opacity-60"
            >
              {isSavingMaterial ? "Saving..." : "Add Material"}
            </button>
            {materialsFeedback ? (
              <p
                className={`text-xs ${
                  materialsFeedback.type === "success"
                    ? "text-emerald-700"
                    : "text-red-700"
                }`}
              >
                {materialsFeedback.message}
              </p>
            ) : null}

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-semibold">Materials List</h2>
                <span className="rounded-full border border-blue-300 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-800">
                  Price source: Material Catalog
                </span>
              </div>
              {materials.length ? (
                <div className="space-y-2">
                  {materials.map((material) => (
                    <div
                      key={material.id}
                      className="rounded-md border p-3 text-sm text-muted-foreground"
                    >
                      {editingMaterialId === material.id &&
                      editingMaterialDraft ? (
                        <div className="space-y-3">
                          <div className="grid gap-2 sm:grid-cols-2">
                            <div className="space-y-1 sm:col-span-2">
                              <label className="text-xs text-muted-foreground">
                                Category
                              </label>
                              <select
                                value={
                                  materialCatalogMap.get(
                                    editingMaterialDraft.materialId,
                                  )?.categoryId ?? ""
                                }
                                onChange={(event) => {
                                  const nextCategoryId = event.target.value;
                                  const firstInCategory = materialCatalog.find(
                                    (entry) =>
                                      entry.categoryId === nextCategoryId,
                                  );
                                  if (!firstInCategory) {
                                    return;
                                  }
                                  setEditingMaterialDraft((current) =>
                                    current
                                      ? {
                                          ...current,
                                          materialId: firstInCategory.id,
                                        }
                                      : current,
                                  );
                                }}
                                className="w-full rounded-md border bg-background px-2 py-1.5 text-sm text-foreground"
                              >
                                {materialCategoryOptions.map((category) => (
                                  <option key={category.id} value={category.id}>
                                    {category.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-1 sm:col-span-2">
                              <label className="text-xs text-muted-foreground">
                                Catalog Material
                              </label>
                              <select
                                value={editingMaterialDraft.materialId}
                                onChange={(event) =>
                                  setEditingMaterialDraft((current) =>
                                    current
                                      ? {
                                          ...current,
                                          materialId: event.target.value,
                                        }
                                      : current,
                                  )
                                }
                                className="w-full rounded-md border bg-background px-2 py-1.5 text-sm text-foreground"
                              >
                                {materialCatalog
                                  .filter(
                                    (catalogItem) =>
                                      catalogItem.categoryId ===
                                      (materialCatalogMap.get(
                                        editingMaterialDraft.materialId,
                                      )?.categoryId ?? ""),
                                  )
                                  .map((catalogItem) => (
                                    <option
                                      key={catalogItem.id}
                                      value={catalogItem.id}
                                    >
                                      {catalogItem.name}
                                    </option>
                                  ))}
                              </select>
                              <p className="text-[11px] text-muted-foreground">
                                Unit type:{" "}
                                {materialUnitLabel(
                                  materialCatalogMap.get(
                                    editingMaterialDraft.materialId,
                                  )?.unitType ?? "other",
                                )}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-muted-foreground">
                                Notes
                              </label>
                              <input
                                value={editingMaterialDraft.note ?? ""}
                                onChange={(event) =>
                                  setEditingMaterialDraft((current) =>
                                    current
                                      ? {
                                          ...current,
                                          note: event.target.value || undefined,
                                        }
                                      : current,
                                  )
                                }
                                className="w-full rounded-md border bg-background px-2 py-1.5 text-sm text-foreground"
                                placeholder="Note"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-muted-foreground">
                                Product URL
                              </label>
                              <input
                                value={editingMaterialDraft.url}
                                onChange={(event) =>
                                  setEditingMaterialDraft((current) =>
                                    current
                                      ? {
                                          ...current,
                                          url: event.target.value,
                                        }
                                      : current,
                                  )
                                }
                                className="w-full rounded-md border bg-background px-2 py-1.5 text-sm text-foreground"
                                placeholder="https://..."
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-muted-foreground">
                                Quantity
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={editingMaterialDraft.quantity}
                                onChange={(event) =>
                                  setEditingMaterialDraft((current) =>
                                    current
                                      ? {
                                          ...current,
                                          quantity:
                                            Number(event.target.value) || 0,
                                        }
                                      : current,
                                  )
                                }
                                className="w-full rounded-md border bg-background px-2 py-1.5 text-sm text-foreground"
                                placeholder="Quantity"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-muted-foreground">
                                Catalog Unit Estimate
                              </label>
                              <div className="rounded-md border bg-muted px-2 py-1.5 text-sm text-foreground">
                                $
                                {(
                                  materialCatalogMap.get(
                                    editingMaterialDraft.materialId,
                                  )?.estimatedPrice ?? 0
                                ).toLocaleString()}
                              </div>
                              <p className="text-[11px] text-muted-foreground">
                                Price source: Material Catalog
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={saveMaterialEdits}
                              disabled={isSavingMaterial}
                              className="rounded-md bg-foreground px-2 py-1 text-xs text-background"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={cancelEditingMaterial}
                              disabled={isSavingMaterial}
                              className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            {(() => {
                              const catalogEntry = materialCatalogMap.get(
                                material.materialId,
                              );
                              return (
                                <>
                                  <p className="font-medium text-foreground">
                                    {catalogEntry?.name ??
                                      `Unknown material (${material.materialId})`}
                                  </p>
                                  <p>
                                    Qty: {material.quantity}{" "}
                                    {materialUnitLabel(
                                      catalogEntry?.unitType ?? "other",
                                    )}{" "}
                                    • Unit est: $
                                    {(
                                      catalogEntry?.estimatedPrice ?? 0
                                    ).toLocaleString()}
                                  </p>
                                </>
                              );
                            })()}
                            <p>
                              Line est: $
                              {(
                                material.quantity *
                                (materialCatalogMap.get(material.materialId)
                                  ?.estimatedPrice ?? 0)
                              ).toLocaleString()}
                            </p>
                            {(materialCatalogMap.get(material.materialId)
                              ?.estimatedPrice ?? 0) === 0 ? (
                              <p className="text-amber-700">
                                Warning: catalog unit estimate is 0 for this
                                material.
                              </p>
                            ) : null}
                            {material.note ? <p>{material.note}</p> : null}
                            {material.url ? (
                              <p>
                                <a
                                  href={material.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="underline underline-offset-2"
                                >
                                  Open product link
                                </a>
                              </p>
                            ) : null}
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => startEditingMaterial(material)}
                              disabled={isSavingMaterial}
                              className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => removeMaterial(material.id)}
                              disabled={isSavingMaterial}
                              className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No materials added yet.
                </p>
              )}
            </div>
          </div>
        ) : null}

        {activeTab === "expenses" ? (
          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Date</label>
                <input
                  value={expenseDate}
                  onChange={(event) => setExpenseDate(event.target.value)}
                  type="date"
                  className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Amount</label>
                <input
                  value={expenseAmount}
                  onChange={(event) => setExpenseAmount(event.target.value)}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Type</label>
                <select
                  value={expenseType}
                  onChange={(event) =>
                    setExpenseType(event.target.value as ExpenseType)
                  }
                  className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                >
                  {expenseTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Vendor</label>
                <input
                  value={expenseVendor}
                  onChange={(event) => setExpenseVendor(event.target.value)}
                  type="text"
                  placeholder="Vendor"
                  className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Note</label>
                <input
                  value={expenseNote}
                  onChange={(event) => setExpenseNote(event.target.value)}
                  type="text"
                  placeholder="Short note"
                  className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={addExpense}
              disabled={isSavingExpense || !expenseDate || !expenseAmount}
              className="rounded-md bg-foreground px-3 py-2 text-sm text-background disabled:opacity-60"
            >
              {isSavingExpense ? "Saving..." : "Add Expense"}
            </button>
            {expensesFeedback ? (
              <p
                className={`text-xs ${
                  expensesFeedback.type === "success"
                    ? "text-emerald-700"
                    : "text-red-700"
                }`}
              >
                {expensesFeedback.message}
              </p>
            ) : null}

            <div className="space-y-2">
              <h2 className="text-sm font-semibold">Expense Entries</h2>
              {expenses.length ? (
                <div className="space-y-2">
                  {expenses.map((expense) => (
                    <div
                      key={expense.id}
                      className="rounded-md border p-3 text-sm text-muted-foreground"
                    >
                      {editingExpenseId === expense.id &&
                      editingExpenseDraft ? (
                        <div className="space-y-2">
                          <div className="grid gap-2 sm:grid-cols-2">
                            <input
                              type="date"
                              value={editingExpenseDraft.date}
                              onChange={(event) =>
                                setEditingExpenseDraft((current) =>
                                  current
                                    ? { ...current, date: event.target.value }
                                    : current,
                                )
                              }
                              className="rounded-md border bg-background px-2 py-1.5 text-sm text-foreground"
                            />
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={editingExpenseDraft.amount}
                              onChange={(event) =>
                                setEditingExpenseDraft((current) =>
                                  current
                                    ? {
                                        ...current,
                                        amount: Number(event.target.value) || 0,
                                      }
                                    : current,
                                )
                              }
                              className="rounded-md border bg-background px-2 py-1.5 text-sm text-foreground"
                            />
                            <select
                              value={editingExpenseDraft.type}
                              onChange={(event) =>
                                setEditingExpenseDraft((current) =>
                                  current
                                    ? {
                                        ...current,
                                        type: event.target.value as ExpenseType,
                                      }
                                    : current,
                                )
                              }
                              className="rounded-md border bg-background px-2 py-1.5 text-sm text-foreground"
                            >
                              {expenseTypes.map((type) => (
                                <option key={type} value={type}>
                                  {type}
                                </option>
                              ))}
                            </select>
                            <input
                              value={editingExpenseDraft.vendor ?? ""}
                              onChange={(event) =>
                                setEditingExpenseDraft((current) =>
                                  current
                                    ? {
                                        ...current,
                                        vendor: event.target.value || undefined,
                                      }
                                    : current,
                                )
                              }
                              className="rounded-md border bg-background px-2 py-1.5 text-sm text-foreground"
                              placeholder="Vendor"
                            />
                            <input
                              value={editingExpenseDraft.note ?? ""}
                              onChange={(event) =>
                                setEditingExpenseDraft((current) =>
                                  current
                                    ? {
                                        ...current,
                                        note: event.target.value || undefined,
                                      }
                                    : current,
                                )
                              }
                              className="rounded-md border bg-background px-2 py-1.5 text-sm text-foreground sm:col-span-2"
                              placeholder="Note"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={saveEditingExpense}
                              disabled={isSavingExpense}
                              className="rounded-md bg-foreground px-2 py-1 text-xs text-background"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={cancelEditingExpense}
                              disabled={isSavingExpense}
                              className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="font-medium text-foreground">
                                ${expense.amount.toLocaleString()} •{" "}
                                {expense.type}
                              </p>
                              <p>
                                {expense.date}
                                {expense.vendor ? ` • ${expense.vendor}` : ""}
                              </p>
                              {expense.note ? <p>{expense.note}</p> : null}
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => startEditingExpense(expense)}
                                disabled={isSavingExpense}
                                className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => removeExpense(expense.id)}
                                disabled={isSavingExpense}
                                className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                          <div className="mt-3">
                            <AttachmentManager
                              projectId={projectId}
                              scopeType="expense"
                              scopeId={expense.id}
                              attachments={attachments}
                              title="Expense Files"
                              compact
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No expenses yet.
                </p>
              )}
            </div>
          </div>
        ) : null}

        {activeTab === "files" ? (
          <AttachmentManager
            projectId={projectId}
            scopeType="item"
            scopeId={item.id}
            attachments={attachments}
            title="Item Files"
          />
        ) : null}
      </section>
    </div>
  );
}
