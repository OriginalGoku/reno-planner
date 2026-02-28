import type { RenovationItem, RenovationProject } from "@/lib/reno-types";
export type {
  AttachmentScopeType,
  ExpenseType,
  ItemStatus,
  MaterialCatalogItem,
  MaterialCategory,
  MaterialUnitType,
  PurchaseInvoice,
  PurchaseInvoiceLine,
  PurchaseInvoiceStatus,
  PurchaseLedgerEntry,
  PurchaseLedgerEntryType,
  RenovationAttachment,
  RenovationExpense,
  RenovationMaterial,
  RenovationItem,
  RenovationNote,
  RenovationProject,
  RenovationSection,
  RenovationUnit,
  ServiceField,
  ServiceSection,
  ServiceSubsection,
  UnitFloor,
  UnitRoomType,
  UnitStatus,
} from "@/lib/reno-types";
export { STATUS_LABELS } from "@/lib/reno-types";

export function getProjectSummary(project: RenovationProject) {
  const byStatus = project.items.reduce(
    (acc, item) => {
      acc[item.status] += 1;
      return acc;
    },
    {
      todo: 0,
      in_progress: 0,
      blocked: 0,
      done: 0,
    },
  );

  return {
    totalSections: project.sections.length,
    totalItems: project.items.length,
    ...byStatus,
  };
}

export function getSectionById(project: RenovationProject, sectionId: string) {
  return project.sections.find((section) => section.id === sectionId);
}

export function getItemsBySectionId(
  project: RenovationProject,
  sectionId: string,
) {
  return project.items.filter((item) => item.sectionId === sectionId);
}

export function getItemById(project: RenovationProject, itemId: string) {
  return project.items.find((item) => item.id === itemId);
}

export function getItemsByUnitId(project: RenovationProject, unitId: string) {
  return project.items.filter((item) => item.unitId === unitId);
}

export function getTotalActualForItem(item: RenovationItem) {
  return item.expenses.reduce((sum, expense) => sum + expense.amount, 0);
}

export function getProjectFinancials(project: RenovationProject) {
  const estimateTotal = project.items.reduce(
    (sum, item) => sum + item.estimate,
    0,
  );
  const actualTotal = project.items.reduce(
    (sum, item) => sum + getTotalActualForItem(item),
    0,
  );

  return {
    estimateTotal,
    actualTotal,
    variance: estimateTotal - actualTotal,
  };
}

export function getProjectFinancialSnapshot(project: RenovationProject) {
  const estimateFromItems = project.items.reduce(
    (sum, item) => sum + item.estimate,
    0,
  );
  const actualFromExpenses = project.items.reduce(
    (sum, item) => sum + getTotalActualForItem(item),
    0,
  );
  const actualFromLedger = project.purchaseLedger.reduce(
    (sum, row) => sum + row.lineTotal,
    0,
  );
  const draftInvoices = project.purchaseInvoices.filter(
    (invoice) => invoice.status === "draft",
  );
  const draftInvoiceCount = draftInvoices.length;
  const draftInvoiceTotal = draftInvoices.reduce(
    (sum, invoice) => sum + invoice.totals.grandTotal,
    0,
  );
  const estimatedMaterialsTotal = project.items.reduce((sum, item) => {
    const itemMaterialsTotal = (item.materials ?? []).reduce(
      (lineSum, materialLine) => {
        const catalogEntry = project.materialCatalog.find(
          (entry) => entry.id === materialLine.materialId,
        );
        const unitEstimate = catalogEntry?.estimatedPrice ?? 0;
        return lineSum + materialLine.quantity * unitEstimate;
      },
      0,
    );
    return sum + itemMaterialsTotal;
  }, 0);

  return {
    estimateFromItems,
    actualFromExpenses,
    actualFromLedger,
    estimatedMaterialsTotal,
    varianceVsLedger: estimateFromItems - actualFromLedger,
    varianceVsExpenses: estimateFromItems - actualFromExpenses,
    draftInvoiceCount,
    draftInvoiceTotal,
  };
}

export function getSectionFinancials(
  project: RenovationProject,
  sectionId: string,
) {
  const sectionItems = getItemsBySectionId(project, sectionId);
  const estimateTotal = sectionItems.reduce(
    (sum, item) => sum + item.estimate,
    0,
  );
  const actualTotal = sectionItems.reduce(
    (sum, item) => sum + getTotalActualForItem(item),
    0,
  );

  return {
    estimateTotal,
    actualTotal,
    variance: estimateTotal - actualTotal,
  };
}
