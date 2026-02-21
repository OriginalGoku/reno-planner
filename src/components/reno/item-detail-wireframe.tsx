"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  ExpenseType,
  ItemStatus,
  RenovationExpense,
  RenovationMaterial,
  RenovationItem,
} from "@/lib/reno-data-loader";
import { getTotalActualForItem } from "@/lib/reno-data-loader";
import {
  addItemExpenseAction,
  addItemMaterialAction,
  removeItemMaterialAction,
  updateItemMaterialAction,
  updateItemFieldsAction,
} from "@/lib/reno-actions";

type TabKey = "overview" | "notes" | "materials" | "expenses";

type ItemDetailWireframeProps = {
  projectId: string;
  item: RenovationItem;
  sectionTitle: string;
};

const tabs: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview & Schedule" },
  { key: "notes", label: "Notes" },
  { key: "materials", label: "Materials" },
  { key: "expenses", label: "Expenses" },
];

const expenseTypes: ExpenseType[] = [
  "material",
  "labor",
  "permit",
  "tool",
  "other",
];
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
}: ItemDetailWireframeProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
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
  const [materialName, setMaterialName] = useState("");
  const [materialQuantity, setMaterialQuantity] = useState("");
  const [materialEstimatedPrice, setMaterialEstimatedPrice] = useState("");
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

  const [isSavingOverview, startSavingOverview] = useTransition();
  const [isSavingMaterial, startSavingMaterial] = useTransition();
  const [isSavingExpense, startSavingExpense] = useTransition();
  const router = useRouter();

  const actualTotal = useMemo(
    () => getTotalActualForItem({ ...item, expenses }),
    [expenses, item],
  );
  const delta = item.estimate - actualTotal;

  function saveOverviewAndNotes() {
    startSavingOverview(async () => {
      await updateItemFieldsAction({
        projectId,
        itemId: item.id,
        status: itemStatus,
        estimatedCompletionDate: estimatedCompletionDate || undefined,
        actualCompletionDate: actualCompletionDate || undefined,
        performers,
        description,
        note: notes,
      });
      router.refresh();
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
    setExpenseDate("");
    setExpenseAmount("");
    setExpenseType("material");
    setExpenseVendor("");
    setExpenseNote("");

    startSavingExpense(async () => {
      await addItemExpenseAction({
        projectId,
        itemId: item.id,
        date: newExpense.date,
        amount: newExpense.amount,
        type: newExpense.type,
        vendor: newExpense.vendor,
        note: newExpense.note,
      });
      router.refresh();
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
    setPerformers((current) => [...current, trimmed]);
    setNewPerformer("");
  }

  function removePerformer(name: string) {
    setPerformers((current) =>
      current.filter((performer) => performer !== name),
    );
  }

  function addMaterial() {
    const name = materialName.trim();
    const quantity = Number(materialQuantity);
    const estimatedPrice = Number(materialEstimatedPrice);

    if (!name || Number.isNaN(quantity) || Number.isNaN(estimatedPrice)) {
      return;
    }
    if (quantity <= 0 || estimatedPrice < 0) {
      return;
    }

    const newMaterial: RenovationMaterial = {
      id: `local-material-${Date.now()}`,
      name,
      quantity,
      estimatedPrice,
      note: materialNote.trim() || undefined,
    };

    setMaterials((current) => [newMaterial, ...current]);
    setMaterialName("");
    setMaterialQuantity("");
    setMaterialEstimatedPrice("");
    setMaterialNote("");

    startSavingMaterial(async () => {
      await addItemMaterialAction({
        projectId,
        itemId: item.id,
        name: newMaterial.name,
        quantity: newMaterial.quantity,
        estimatedPrice: newMaterial.estimatedPrice,
        note: newMaterial.note,
      });
      router.refresh();
    });
  }

  function removeMaterial(materialId: string) {
    setMaterials((current) =>
      current.filter((material) => material.id !== materialId),
    );

    if (materialId.startsWith("local-material-")) {
      return;
    }

    startSavingMaterial(async () => {
      await removeItemMaterialAction({
        projectId,
        itemId: item.id,
        materialId,
      });
      router.refresh();
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
      !editingMaterialDraft.name.trim() ||
      editingMaterialDraft.quantity < 0 ||
      editingMaterialDraft.estimatedPrice < 0
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
    setEditingMaterialId(null);
    setEditingMaterialDraft(null);

    if (materialId.startsWith("local-material-")) {
      return;
    }

    startSavingMaterial(async () => {
      await updateItemMaterialAction({
        projectId,
        itemId: item.id,
        materialId,
        name: materialDraft.name.trim(),
        quantity: materialDraft.quantity,
        estimatedPrice: materialDraft.estimatedPrice,
        note: materialDraft.note,
      });
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Item
        </p>
        <h1 className="mt-1 text-2xl font-semibold">{item.title}</h1>
        <p className="text-sm text-muted-foreground">
          Section: {sectionTitle} • Estimate: ${item.estimate.toLocaleString()}{" "}
          • Actual: ${actualTotal.toLocaleString()}
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
              Save Overview
            </button>
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
              Save Notes
            </button>
          </div>
        ) : null}

        {activeTab === "materials" ? (
          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">
                  Material Name
                </label>
                <input
                  value={materialName}
                  onChange={(event) => setMaterialName(event.target.value)}
                  type="text"
                  placeholder={'e.g., Flexible Duct 6"'}
                  className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                />
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
                  Estimated Price (unit)
                </label>
                <input
                  value={materialEstimatedPrice}
                  onChange={(event) =>
                    setMaterialEstimatedPrice(event.target.value)
                  }
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
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
              disabled={isSavingMaterial}
              className="rounded-md bg-foreground px-3 py-2 text-sm text-background disabled:opacity-60"
            >
              Add Material
            </button>

            <div className="space-y-2">
              <h2 className="text-sm font-semibold">Materials List</h2>
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
                            <input
                              value={editingMaterialDraft.name}
                              onChange={(event) =>
                                setEditingMaterialDraft((current) =>
                                  current
                                    ? { ...current, name: event.target.value }
                                    : current,
                                )
                              }
                              className="rounded-md border bg-background px-2 py-1.5 text-sm text-foreground"
                              placeholder="Material name"
                            />
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
                              className="rounded-md border bg-background px-2 py-1.5 text-sm text-foreground"
                              placeholder="Note"
                            />
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
                              className="rounded-md border bg-background px-2 py-1.5 text-sm text-foreground"
                              placeholder="Quantity"
                            />
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={editingMaterialDraft.estimatedPrice}
                              onChange={(event) =>
                                setEditingMaterialDraft((current) =>
                                  current
                                    ? {
                                        ...current,
                                        estimatedPrice:
                                          Number(event.target.value) || 0,
                                      }
                                    : current,
                                )
                              }
                              className="rounded-md border bg-background px-2 py-1.5 text-sm text-foreground"
                              placeholder="Estimated price"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={saveMaterialEdits}
                              className="rounded-md bg-foreground px-2 py-1 text-xs text-background"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={cancelEditingMaterial}
                              className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-foreground">
                              {material.name}
                            </p>
                            <p>
                              Qty: {material.quantity} • Unit est: $
                              {material.estimatedPrice.toLocaleString()}
                            </p>
                            <p>
                              Line est: $
                              {(
                                material.quantity * material.estimatedPrice
                              ).toLocaleString()}
                            </p>
                            {material.note ? <p>{material.note}</p> : null}
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => startEditingMaterial(material)}
                              className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => removeMaterial(material.id)}
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
              disabled={isSavingExpense}
              className="rounded-md bg-foreground px-3 py-2 text-sm text-background disabled:opacity-60"
            >
              Add Expense
            </button>

            <div className="space-y-2">
              <h2 className="text-sm font-semibold">Expense Entries</h2>
              {expenses.length ? (
                <div className="space-y-2">
                  {expenses.map((expense) => (
                    <div
                      key={expense.id}
                      className="rounded-md border p-3 text-sm text-muted-foreground"
                    >
                      <p className="font-medium text-foreground">
                        ${expense.amount.toLocaleString()} • {expense.type}
                      </p>
                      <p>
                        {expense.date}
                        {expense.vendor ? ` • ${expense.vendor}` : ""}
                      </p>
                      {expense.note ? <p>{expense.note}</p> : null}
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
      </section>
    </div>
  );
}
