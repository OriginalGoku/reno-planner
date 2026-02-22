import type { RenovationItem, RenovationProject } from "@/lib/reno-types";
export type {
  AttachmentScopeType,
  ExpenseType,
  ItemStatus,
  MaterialUnitType,
  RenovationAttachment,
  RenovationExpense,
  RenovationMaterial,
  RenovationItem,
  RenovationNote,
  RenovationProject,
  RenovationSection,
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
