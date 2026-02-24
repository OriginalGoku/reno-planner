"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { ChevronRight } from "lucide-react";
import type {
  PurchaseInvoice,
  PurchaseInvoiceLine,
  RenovationProject,
} from "@/lib/reno-data-loader";
import {
  confirmInvoiceDraftAction,
  deleteInvoiceDraftAction,
  extractInvoiceDraftAction,
  forceSecondPassInvoiceDraftAction,
  updateInvoiceDraftAction,
} from "@/lib/reno-actions";
import { AttachmentManager } from "@/components/reno/attachment-manager";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const MATERIAL_UNITS = [
  "linear_ft",
  "sqft",
  "sqm",
  "piece",
  "bundle",
  "box",
  "roll",
  "sheet",
  "bag",
  "gallon",
  "liter",
  "kg",
  "lb",
  "meter",
  "other",
] as const;

function unitLabel(unitType: string) {
  return unitType.replaceAll("_", " ");
}

function passLabel(passUsed: "pass1" | "pass2" | undefined) {
  if (passUsed === "pass2") {
    return "Second Pass";
  }
  return "First Pass";
}

type PurchasesWireframeProps = {
  project: RenovationProject;
};

type ItemWithMaterials = {
  itemId: string;
  itemTitle: string;
  sectionId: string;
  sectionTitle: string;
  materials: NonNullable<RenovationProject["items"][number]["materials"]>;
};

type EditableInvoice = {
  id: string;
  vendorName: string;
  invoiceNumber: string;
  invoiceDate: string;
  currency: string;
  totals: PurchaseInvoice["totals"];
  lines: PurchaseInvoiceLine[];
  review: PurchaseInvoice["review"];
};

function toEditableInvoice(invoice: PurchaseInvoice): EditableInvoice {
  return {
    id: invoice.id,
    vendorName: invoice.vendorName,
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: invoice.invoiceDate,
    currency: invoice.currency,
    totals: invoice.totals,
    lines: invoice.lines,
    review: invoice.review,
  };
}

export function PurchasesWireframe({ project }: PurchasesWireframeProps) {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(
    null,
  );
  const [selectedAttachmentId, setSelectedAttachmentId] = useState<string>("");
  const [draft, setDraft] = useState<EditableInvoice | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const invoiceAttachments = useMemo(
    () =>
      project.attachments.filter(
        (entry) =>
          entry.scopeType === "project" &&
          entry.category === "invoice" &&
          !project.purchaseInvoices.some(
            (invoice) => invoice.attachmentId === entry.id,
          ),
      ),
    [project.attachments, project.purchaseInvoices],
  );

  const invoices = useMemo(
    () =>
      [...project.purchaseInvoices].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      ),
    [project.purchaseInvoices],
  );

  const selectedInvoice = useMemo(() => {
    if (!invoices.length) {
      return null;
    }
    if (!selectedInvoiceId) {
      return invoices[0];
    }
    return (
      invoices.find((entry) => entry.id === selectedInvoiceId) ?? invoices[0]
    );
  }, [invoices, selectedInvoiceId]);

  const activeDraft = useMemo(() => {
    if (!selectedInvoice || selectedInvoice.status !== "draft") {
      return null;
    }
    if (draft && draft.id === selectedInvoice.id) {
      return draft;
    }
    return toEditableInvoice(selectedInvoice);
  }, [draft, selectedInvoice]);

  const materialCatalogMap = useMemo(
    () => new Map(project.materialCatalog.map((entry) => [entry.id, entry])),
    [project.materialCatalog],
  );
  const materialCategoryMap = useMemo(
    () =>
      new Map(
        project.materialCategories.map((category) => [category.id, category]),
      ),
    [project.materialCategories],
  );

  const lineSubtotal = useMemo(() => {
    if (!activeDraft) {
      return 0;
    }
    return activeDraft.lines.reduce(
      (sum, line) => sum + line.quantity * line.unitPrice,
      0,
    );
  }, [activeDraft]);

  const totalsMismatch = useMemo(() => {
    if (!activeDraft) {
      return false;
    }
    return Math.abs(lineSubtotal - activeDraft.totals.subTotal) > 0.01;
  }, [activeDraft, lineSubtotal]);

  const subtotalDifference = useMemo(() => {
    if (!activeDraft) {
      return 0;
    }
    return Math.abs(activeDraft.totals.subTotal - lineSubtotal);
  }, [activeDraft, lineSubtotal]);

  const itemsWithMaterials = useMemo<ItemWithMaterials[]>(() => {
    return project.items
      .filter((item) => item.materials && item.materials.length > 0)
      .map((item) => {
        const sectionTitle =
          project.sections.find((section) => section.id === item.sectionId)
            ?.title ?? item.sectionId;

        return {
          itemId: item.id,
          itemTitle: item.title,
          sectionId: item.sectionId,
          sectionTitle,
          materials: item.materials ?? [],
        };
      });
  }, [project.items, project.sections]);

  const groupedBySection = useMemo(() => {
    return project.sections
      .map((section) => ({
        section,
        items: itemsWithMaterials.filter(
          (item) => item.sectionId === section.id,
        ),
      }))
      .filter((entry) => entry.items.length > 0);
  }, [itemsWithMaterials, project.sections]);

  const projectEstimatedMaterialsTotal = useMemo(() => {
    return itemsWithMaterials.reduce((sum, item) => {
      const itemTotal = item.materials.reduce(
        (lineSum, material) =>
          lineSum + material.quantity * material.estimatedPrice,
        0,
      );
      return sum + itemTotal;
    }, 0);
  }, [itemsWithMaterials]);

  const ledgerRows = useMemo(
    () =>
      [...project.purchaseLedger].sort((a, b) =>
        b.postedAt.localeCompare(a.postedAt),
      ),
    [project.purchaseLedger],
  );

  function updateLine(lineId: string, patch: Partial<PurchaseInvoiceLine>) {
    if (!activeDraft) {
      return;
    }
    setDraft({
      ...activeDraft,
      lines: activeDraft.lines.map((line) => {
        if (line.id !== lineId) {
          return line;
        }
        const next = { ...line, ...patch };
        if (
          patch.quantity !== undefined ||
          patch.unitPrice !== undefined ||
          patch.lineTotal === undefined
        ) {
          next.lineTotal = next.quantity * next.unitPrice;
        }
        return next;
      }),
    });
  }

  function addLine() {
    if (!activeDraft) {
      return;
    }
    setDraft({
      ...activeDraft,
      lines: [
        ...activeDraft.lines,
        {
          id: `line-${crypto.randomUUID()}`,
          sourceText: "",
          description: "",
          quantity: 0,
          unitType: "other",
          unitPrice: 0,
          lineTotal: 0,
          materialId: undefined,
          confidence: 0,
          needsReview: true,
          notes: "",
        },
      ],
    });
  }

  function removeLine(lineId: string) {
    if (!activeDraft) {
      return;
    }
    setDraft({
      ...activeDraft,
      lines: activeDraft.lines.filter((line) => line.id !== lineId),
    });
  }

  function saveDraft() {
    if (!activeDraft) {
      return;
    }
    setFeedback(null);
    startTransition(async () => {
      try {
        await updateInvoiceDraftAction({
          projectId: project.id,
          invoiceId: activeDraft.id,
          vendorName: activeDraft.vendorName,
          invoiceNumber: activeDraft.invoiceNumber,
          invoiceDate: activeDraft.invoiceDate,
          currency: activeDraft.currency,
          totals: activeDraft.totals,
          lines: activeDraft.lines,
          review: activeDraft.review,
        });
        setFeedback("Invoice draft saved.");
      } catch (error) {
        setFeedback(
          error instanceof Error ? error.message : "Could not save draft.",
        );
      }
    });
  }

  function confirmDraft() {
    if (!activeDraft) {
      return;
    }
    setFeedback(null);
    startTransition(async () => {
      try {
        await updateInvoiceDraftAction({
          projectId: project.id,
          invoiceId: activeDraft.id,
          vendorName: activeDraft.vendorName,
          invoiceNumber: activeDraft.invoiceNumber,
          invoiceDate: activeDraft.invoiceDate,
          currency: activeDraft.currency,
          totals: activeDraft.totals,
          lines: activeDraft.lines,
          review: activeDraft.review,
        });
        await confirmInvoiceDraftAction({
          projectId: project.id,
          invoiceId: activeDraft.id,
          review: activeDraft.review,
        });
        setFeedback("Invoice confirmed and posted to ledger.");
      } catch (error) {
        setFeedback(
          error instanceof Error ? error.message : "Could not confirm invoice.",
        );
      }
    });
  }

  function deleteDraft() {
    if (!activeDraft) {
      return;
    }
    const confirmed = window.confirm(
      `Delete draft "${activeDraft.invoiceNumber || activeDraft.id}"?`,
    );
    if (!confirmed) {
      return;
    }
    setFeedback(null);
    startTransition(async () => {
      try {
        await deleteInvoiceDraftAction({
          projectId: project.id,
          invoiceId: activeDraft.id,
        });
        setDraft(null);
        setSelectedInvoiceId(null);
        setFeedback("Invoice draft deleted.");
      } catch (error) {
        setFeedback(
          error instanceof Error ? error.message : "Could not delete draft.",
        );
      }
    });
  }

  function createDraftFromAttachment() {
    if (!selectedAttachmentId) {
      return;
    }
    setFeedback(null);
    startTransition(async () => {
      try {
        await extractInvoiceDraftAction({
          projectId: project.id,
          attachmentId: selectedAttachmentId,
        });
        setFeedback("Invoice draft created from attachment.");
        setSelectedAttachmentId("");
      } catch (error) {
        setFeedback(
          error instanceof Error ? error.message : "Could not create draft.",
        );
      }
    });
  }

  function forceSecondPass() {
    if (!activeDraft || !selectedInvoice) {
      return;
    }
    setFeedback(null);
    startTransition(async () => {
      try {
        await forceSecondPassInvoiceDraftAction({
          projectId: project.id,
          invoiceId: activeDraft.id,
        });
        setDraft(null);
        setFeedback("Second pass complete. Draft refreshed.");
      } catch (error) {
        setFeedback(
          error instanceof Error
            ? error.message
            : "Could not run second pass extraction.",
        );
      }
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Purchases
        </p>
        <h1 className="mt-1 text-2xl font-semibold">Invoice Bookkeeping</h1>
        <p className="text-sm text-muted-foreground">
          Upload invoice files, create draft entries, review line-to-material
          mapping, then confirm immutable ledger postings.
        </p>
      </section>

      <AttachmentManager
        projectId={project.id}
        scopeType="project"
        title="Invoice Files"
        compact
        attachments={project.attachments}
      />

      <section className="rounded-lg border p-4 space-y-3">
        <h2 className="text-base font-semibold">Create Invoice Draft</h2>
        <div className="grid gap-2 md:grid-cols-[1fr_auto]">
          <select
            value={selectedAttachmentId}
            onChange={(event) => setSelectedAttachmentId(event.target.value)}
            className="rounded-md border bg-background px-2 py-1.5 text-sm"
          >
            <option value="">Select invoice attachment...</option>
            {invoiceAttachments.map((attachment) => (
              <option key={attachment.id} value={attachment.id}>
                {attachment.fileTitle || attachment.originalName}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={createDraftFromAttachment}
            disabled={isPending || !selectedAttachmentId}
            className="rounded-md bg-foreground px-3 py-1.5 text-sm text-background disabled:opacity-60"
          >
            {isPending ? "Working..." : "Create Draft"}
          </button>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="rounded-lg border p-3 space-y-2">
          <h2 className="text-base font-semibold">Invoices</h2>
          {!invoices.length ? (
            <p className="text-sm text-muted-foreground">No invoices yet.</p>
          ) : (
            invoices.map((invoice) => (
              <button
                type="button"
                key={invoice.id}
                onClick={() => setSelectedInvoiceId(invoice.id)}
                className={`w-full rounded-md border px-2 py-2 text-left ${
                  selectedInvoice?.id === invoice.id ? "bg-muted" : ""
                }`}
              >
                <p className="text-sm font-medium">
                  {invoice.invoiceNumber || invoice.id}
                </p>
                <p className="text-xs text-muted-foreground">
                  {invoice.vendorName || "Unknown vendor"} • {invoice.status}
                </p>
              </button>
            ))
          )}
        </div>

        <div className="rounded-lg border p-4 space-y-3">
          {!selectedInvoice ? (
            <p className="text-sm text-muted-foreground">
              Select an invoice to review.
            </p>
          ) : selectedInvoice.status !== "draft" || !activeDraft ? (
            <div className="space-y-2">
              <h3 className="font-semibold">
                {selectedInvoice.invoiceNumber || selectedInvoice.id}
              </h3>
              <p className="text-sm text-muted-foreground">
                Status: {selectedInvoice.status}
              </p>
              <p className="text-sm">
                Vendor: {selectedInvoice.vendorName || "Unknown"}
              </p>
              <p className="text-sm">
                Grand total: {selectedInvoice.currency}{" "}
                {selectedInvoice.totals.grandTotal.toLocaleString()}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2">
                <p className="text-sm text-muted-foreground">
                  Extraction pass:
                  <span className="ml-1 rounded bg-muted px-2 py-0.5 text-foreground">
                    {passLabel(selectedInvoice.extraction.passUsed)}
                  </span>
                </p>
                {selectedInvoice.extraction.passUsed === "pass1" ? (
                  <button
                    type="button"
                    onClick={forceSecondPass}
                    disabled={isPending}
                    className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-60"
                  >
                    {isPending ? "Running..." : "Force Second Pass"}
                  </button>
                ) : null}
              </div>

              <div className="grid gap-2 md:grid-cols-4">
                <label className="space-y-1 text-sm">
                  <span className="text-xs text-muted-foreground">Vendor</span>
                  <input
                    value={activeDraft.vendorName}
                    onChange={(event) =>
                      setDraft({
                        ...activeDraft,
                        vendorName: event.target.value,
                      })
                    }
                    className="w-full rounded-md border px-2 py-1.5"
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-xs text-muted-foreground">
                    Invoice Number
                  </span>
                  <input
                    value={activeDraft.invoiceNumber}
                    onChange={(event) =>
                      setDraft({
                        ...activeDraft,
                        invoiceNumber: event.target.value,
                      })
                    }
                    className="w-full rounded-md border px-2 py-1.5"
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-xs text-muted-foreground">
                    Invoice Date
                  </span>
                  <input
                    type="date"
                    value={activeDraft.invoiceDate}
                    onChange={(event) =>
                      setDraft({
                        ...activeDraft,
                        invoiceDate: event.target.value,
                      })
                    }
                    className="w-full rounded-md border px-2 py-1.5"
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-xs text-muted-foreground">
                    Currency
                  </span>
                  <input
                    value={activeDraft.currency}
                    onChange={(event) =>
                      setDraft({ ...activeDraft, currency: event.target.value })
                    }
                    className="w-full rounded-md border px-2 py-1.5"
                  />
                </label>
              </div>

              <div className="grid gap-2 md:grid-cols-5">
                <label className="space-y-1 text-sm">
                  <span className="text-xs text-muted-foreground">
                    SubTotal
                  </span>
                  <input
                    type="number"
                    value={activeDraft.totals.subTotal}
                    onChange={(event) =>
                      setDraft({
                        ...activeDraft,
                        totals: {
                          ...activeDraft.totals,
                          subTotal: Number(event.target.value),
                        },
                      })
                    }
                    className="w-full rounded-md border px-2 py-1.5"
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-xs text-muted-foreground">Tax</span>
                  <input
                    type="number"
                    value={activeDraft.totals.tax}
                    onChange={(event) =>
                      setDraft({
                        ...activeDraft,
                        totals: {
                          ...activeDraft.totals,
                          tax: Number(event.target.value),
                        },
                      })
                    }
                    className="w-full rounded-md border px-2 py-1.5"
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-xs text-muted-foreground">
                    Shipping
                  </span>
                  <input
                    type="number"
                    value={activeDraft.totals.shipping}
                    onChange={(event) =>
                      setDraft({
                        ...activeDraft,
                        totals: {
                          ...activeDraft.totals,
                          shipping: Number(event.target.value),
                        },
                      })
                    }
                    className="w-full rounded-md border px-2 py-1.5"
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-xs text-muted-foreground">
                    Other Fees
                  </span>
                  <input
                    type="number"
                    value={activeDraft.totals.otherFees}
                    onChange={(event) =>
                      setDraft({
                        ...activeDraft,
                        totals: {
                          ...activeDraft.totals,
                          otherFees: Number(event.target.value),
                        },
                      })
                    }
                    className="w-full rounded-md border px-2 py-1.5"
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-xs text-muted-foreground">
                    Grand Total
                  </span>
                  <input
                    type="number"
                    value={activeDraft.totals.grandTotal}
                    onChange={(event) =>
                      setDraft({
                        ...activeDraft,
                        totals: {
                          ...activeDraft.totals,
                          grandTotal: Number(event.target.value),
                        },
                      })
                    }
                    className="w-full rounded-md border px-2 py-1.5"
                  />
                </label>
              </div>

              <div className="rounded-md border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Invoice Lines</h4>
                  <button
                    type="button"
                    onClick={addLine}
                    className="rounded-md border px-2 py-1 text-xs"
                  >
                    Add Line
                  </button>
                </div>
                <div className="space-y-3">
                  {activeDraft.lines.map((line) => (
                    <div
                      key={line.id}
                      className="rounded-md border p-2 space-y-2"
                    >
                      <div className="grid gap-2 md:grid-cols-3">
                        <label className="space-y-1 text-xs">
                          <span className="text-muted-foreground">
                            Description
                          </span>
                          <input
                            value={line.description}
                            onChange={(event) =>
                              updateLine(line.id, {
                                description: event.target.value,
                              })
                            }
                            className="w-full rounded-md border px-2 py-1"
                          />
                        </label>
                        <label className="space-y-1 text-xs">
                          <span className="text-muted-foreground">
                            Source Text
                          </span>
                          <input
                            value={line.sourceText}
                            onChange={(event) =>
                              updateLine(line.id, {
                                sourceText: event.target.value,
                              })
                            }
                            className="w-full rounded-md border px-2 py-1"
                          />
                        </label>
                        <label className="space-y-1 text-xs">
                          <span className="text-muted-foreground">
                            Material Link
                          </span>
                          <select
                            value={line.materialId ?? ""}
                            onChange={(event) =>
                              updateLine(line.id, {
                                materialId: event.target.value || undefined,
                              })
                            }
                            className="w-full rounded-md border px-2 py-1"
                          >
                            <option value="">Unlinked</option>
                            {project.materialCatalog.map((material) => (
                              <option key={material.id} value={material.id}>
                                {material.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <div className="grid gap-2 md:grid-cols-5">
                        <label className="space-y-1 text-xs">
                          <span className="text-muted-foreground">
                            Quantity
                          </span>
                          <input
                            type="number"
                            value={line.quantity}
                            onChange={(event) =>
                              updateLine(line.id, {
                                quantity: Number(event.target.value),
                              })
                            }
                            className="w-full rounded-md border px-2 py-1"
                          />
                        </label>
                        <label className="space-y-1 text-xs">
                          <span className="text-muted-foreground">Unit</span>
                          <select
                            value={line.unitType}
                            onChange={(event) =>
                              updateLine(line.id, {
                                unitType: event.target
                                  .value as PurchaseInvoiceLine["unitType"],
                              })
                            }
                            className="w-full rounded-md border px-2 py-1"
                          >
                            {MATERIAL_UNITS.map((unit) => (
                              <option key={unit} value={unit}>
                                {unitLabel(unit)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="space-y-1 text-xs">
                          <span className="text-muted-foreground">
                            Unit Price
                          </span>
                          <input
                            type="number"
                            value={line.unitPrice}
                            onChange={(event) =>
                              updateLine(line.id, {
                                unitPrice: Number(event.target.value),
                              })
                            }
                            className="w-full rounded-md border px-2 py-1"
                          />
                        </label>
                        <label className="space-y-1 text-xs">
                          <span className="text-muted-foreground">
                            Line Total
                          </span>
                          <input
                            type="number"
                            value={line.lineTotal}
                            onChange={(event) =>
                              updateLine(line.id, {
                                lineTotal: Number(event.target.value),
                              })
                            }
                            className="w-full rounded-md border px-2 py-1"
                          />
                        </label>
                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={() => removeLine(line.id)}
                            className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-700"
                          >
                            Delete Line
                          </button>
                        </div>
                      </div>
                      <div className="grid gap-2 md:grid-cols-3">
                        <label className="space-y-1 text-xs">
                          <span className="text-muted-foreground">
                            Confidence
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            min={0}
                            max={1}
                            value={line.confidence}
                            onChange={(event) =>
                              updateLine(line.id, {
                                confidence: Number(event.target.value),
                              })
                            }
                            className="w-full rounded-md border px-2 py-1"
                          />
                        </label>
                        <label className="space-y-1 text-xs">
                          <span className="text-muted-foreground">
                            Needs Review
                          </span>
                          <select
                            value={line.needsReview ? "yes" : "no"}
                            onChange={(event) =>
                              updateLine(line.id, {
                                needsReview: event.target.value === "yes",
                              })
                            }
                            className="w-full rounded-md border px-2 py-1"
                          >
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                          </select>
                        </label>
                        <label className="space-y-1 text-xs md:col-span-1">
                          <span className="text-muted-foreground">
                            Line Notes
                          </span>
                          <input
                            value={line.notes}
                            onChange={(event) =>
                              updateLine(line.id, { notes: event.target.value })
                            }
                            className="w-full rounded-md border px-2 py-1"
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-md border p-3 space-y-2 text-sm">
                <p>
                  Computed line subtotal: {activeDraft.currency}{" "}
                  {lineSubtotal.toLocaleString()}
                </p>
                <p>
                  Entered subtotal: {activeDraft.currency}{" "}
                  {activeDraft.totals.subTotal.toLocaleString()}
                </p>
                {totalsMismatch ? (
                  <div className="space-y-1">
                    <p className="text-red-700">
                      Totals mismatch: {activeDraft.currency}{" "}
                      {subtotalDifference.toLocaleString()}
                    </p>
                    <p className="text-red-700 text-xs">
                      Confirm requires override.
                    </p>
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={activeDraft.review.totalsMismatchOverride}
                        onChange={(event) =>
                          setDraft({
                            ...activeDraft,
                            review: {
                              ...activeDraft.review,
                              totalsMismatchOverride: event.target.checked,
                            },
                          })
                        }
                      />
                      Override totals mismatch
                    </label>
                    <input
                      value={activeDraft.review.overrideReason}
                      onChange={(event) =>
                        setDraft({
                          ...activeDraft,
                          review: {
                            ...activeDraft.review,
                            overrideReason: event.target.value,
                          },
                        })
                      }
                      placeholder="Override reason"
                      className="w-full rounded-md border px-2 py-1 text-sm"
                    />
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={saveDraft}
                  disabled={isPending}
                  className="rounded-md border px-3 py-1.5 text-sm"
                >
                  {isPending ? "Saving..." : "Save Draft"}
                </button>
                <button
                  type="button"
                  onClick={confirmDraft}
                  disabled={isPending}
                  className="rounded-md bg-foreground px-3 py-1.5 text-sm text-background disabled:opacity-60"
                >
                  {isPending ? "Confirming..." : "Confirm & Post"}
                </button>
                <button
                  type="button"
                  onClick={deleteDraft}
                  disabled={isPending}
                  className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 disabled:opacity-60"
                >
                  Delete Draft
                </button>
              </div>
            </div>
          )}

          {feedback ? (
            <p className="text-sm text-muted-foreground">{feedback}</p>
          ) : null}
        </div>
      </section>

      <section className="rounded-lg border p-4 space-y-2">
        <h2 className="text-base font-semibold">Purchase Ledger</h2>
        {!ledgerRows.length ? (
          <p className="text-sm text-muted-foreground">
            No posted entries yet.
          </p>
        ) : (
          <div className="space-y-2">
            {ledgerRows.map((row) => (
              <div key={row.id} className="rounded-md border p-2 text-sm">
                <p className="font-medium">
                  {materialCatalogMap.get(row.materialId)?.name ??
                    row.materialId}
                </p>
                <p className="text-muted-foreground">
                  {row.quantity} {unitLabel(row.unitType)} • {row.currency}{" "}
                  {row.lineTotal.toLocaleString()} • {row.vendorName} •{" "}
                  {row.invoiceDate}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-lg border p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Materials Rollup
        </p>
        <h2 className="mt-1 text-xl font-semibold">Materials Planner</h2>
        <p className="text-sm text-muted-foreground">
          Materials grouped by section and item for purchase planning.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Items With Materials</p>
          <p className="text-2xl font-semibold">{itemsWithMaterials.length}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">
            Estimated Material Total
          </p>
          <p className="text-2xl font-semibold">
            ${projectEstimatedMaterialsTotal.toLocaleString()}
          </p>
        </div>
      </section>

      <section className="space-y-3">
        {groupedBySection.map(({ section, items }) => {
          const sectionTotal = items.reduce((sum, item) => {
            const itemTotal = item.materials.reduce(
              (lineSum, material) =>
                lineSum + material.quantity * material.estimatedPrice,
              0,
            );
            return sum + itemTotal;
          }, 0);

          return (
            <Collapsible key={section.id} defaultOpen>
              <div className="rounded-lg border">
                <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-left">
                  <div>
                    <p className="font-medium">{section.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {items.length} item{items.length > 1 ? "s" : ""} • $
                      {sectionTotal.toLocaleString()}
                    </p>
                  </div>
                  <ChevronRight className="size-4 transition-transform data-[state=open]:rotate-90" />
                </CollapsibleTrigger>

                <CollapsibleContent className="space-y-3 border-t px-4 py-3">
                  {items.map((item) => {
                    const itemTotal = item.materials.reduce(
                      (sum, material) =>
                        sum + material.quantity * material.estimatedPrice,
                      0,
                    );

                    return (
                      <div key={item.itemId} className="rounded-lg border p-4">
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <Link
                            href={`/app/${project.id}/items/${item.itemId}`}
                            className="font-medium underline-offset-2 hover:underline"
                          >
                            {item.itemTitle}
                          </Link>
                          <span className="text-sm font-semibold">
                            ${itemTotal.toLocaleString()}
                          </span>
                        </div>

                        <div className="space-y-2">
                          {item.materials.map((material) => (
                            <div
                              key={material.id}
                              className="rounded-md border p-3 text-sm text-muted-foreground"
                            >
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-medium text-foreground">
                                      {materialCatalogMap.get(
                                        material.materialId,
                                      )?.name ??
                                        `Unknown material (${material.materialId})`}
                                    </p>
                                    <span className="rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-wide">
                                      {materialCategoryMap.get(
                                        materialCatalogMap.get(
                                          material.materialId,
                                        )?.categoryId ?? "",
                                      )?.name ??
                                        materialCatalogMap.get(
                                          material.materialId,
                                        )?.categoryId ??
                                        "Uncategorized"}
                                    </span>
                                  </div>
                                  <p>
                                    Qty: {material.quantity}{" "}
                                    {unitLabel(
                                      materialCatalogMap.get(
                                        material.materialId,
                                      )?.unitType ?? "other",
                                    )}{" "}
                                    • Unit est: $
                                    {material.estimatedPrice.toLocaleString()}
                                  </p>
                                  {material.note ? (
                                    <p>{material.note}</p>
                                  ) : null}
                                </div>
                                <p className="font-medium text-foreground">
                                  $
                                  {(
                                    material.quantity * material.estimatedPrice
                                  ).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}

        {!groupedBySection.length ? (
          <p className="text-sm text-muted-foreground">
            No materials have been added yet.
          </p>
        ) : null}
      </section>
    </div>
  );
}
