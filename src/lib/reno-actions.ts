"use server";

import { revalidatePath } from "next/cache";
import type { ExpenseType, ItemStatus } from "@/lib/reno-data-loader";
import {
  renoService,
  type AddMaterialCategoryInput,
  type AddMaterialCatalogItemInput,
  type AddExpenseInput,
  type AddMaterialInput,
  type AddProjectNoteInput,
  type AddUnitInput,
  type AddUnitRoomInput,
  type AddServiceFieldInput,
  type AddServiceSectionInput,
  type AddServiceSubsectionInput,
  type ConfirmInvoiceDraftInput,
  type DeleteInvoiceDraftInput,
  type ExtractInvoiceDraftInput,
  type ForceSecondPassInvoiceDraftInput,
  type UpdateProjectMetaInput,
  type UpdateItemFieldsInput,
  type UpdateInvoiceDraftInput,
  type UpdateServiceFieldInput,
  type UpdateServiceSectionInput,
  type UpdateServiceSubsectionInput,
  type UpdateMaterialCatalogItemInput,
  type UpdateMaterialCategoryInput,
  type UpdateUnitInput,
  type UpdateUnitRoomInput,
} from "@/core/reno-service";

function refreshProjectPaths(projectId: string) {
  revalidatePath(`/app/${projectId}`);
  revalidatePath(`/app/${projectId}/items`);
  revalidatePath(`/app/${projectId}/expenses`);
  revalidatePath(`/app/${projectId}/purchases`);
  revalidatePath(`/app/${projectId}/notes`);
  revalidatePath(`/app/${projectId}/units`);
  revalidatePath(`/app/${projectId}/services`);
  revalidatePath(`/app/${projectId}/materials`);
}

export async function updateItemFieldsAction(payload: UpdateItemFieldsInput) {
  await renoService.updateItemFields(payload);

  refreshProjectPaths(payload.projectId);
}

export async function updateProjectMetaAction(payload: UpdateProjectMetaInput) {
  await renoService.updateProjectMeta(payload);

  refreshProjectPaths(payload.projectId);
}

export async function updateItemStatusAction(payload: {
  projectId: string;
  itemId: string;
  status: ItemStatus;
}) {
  await renoService.updateItemStatus(payload);

  refreshProjectPaths(payload.projectId);
}

export async function addItemExpenseAction(payload: AddExpenseInput) {
  await renoService.addItemExpense(payload);

  refreshProjectPaths(payload.projectId);
}

export async function updateItemExpenseAction(payload: {
  projectId: string;
  itemId: string;
  expenseId: string;
  date: string;
  amount: number;
  type: ExpenseType;
  vendor?: string;
  note?: string;
}) {
  await renoService.updateItemExpense(payload);

  refreshProjectPaths(payload.projectId);
}

export async function removeItemExpenseAction(payload: {
  projectId: string;
  itemId: string;
  expenseId: string;
}) {
  await renoService.removeItemExpense(payload);

  refreshProjectPaths(payload.projectId);
}

export async function addItemMaterialAction(payload: AddMaterialInput) {
  await renoService.addItemMaterial(payload);

  refreshProjectPaths(payload.projectId);
}

export async function removeItemMaterialAction(payload: {
  projectId: string;
  itemId: string;
  materialId: string;
}) {
  await renoService.removeItemMaterial(payload);

  refreshProjectPaths(payload.projectId);
}

export async function updateItemMaterialAction(payload: {
  projectId: string;
  itemId: string;
  materialId: string;
  catalogMaterialId: string;
  quantity: number;
  estimatedPrice: number;
  url: string;
  note?: string;
}) {
  await renoService.updateItemMaterial(payload);

  refreshProjectPaths(payload.projectId);
}

export async function addMaterialCatalogItemAction(
  payload: AddMaterialCatalogItemInput,
) {
  await renoService.addMaterialCatalogItem(payload);
  refreshProjectPaths(payload.projectId);
}

export async function updateMaterialCatalogItemAction(
  payload: UpdateMaterialCatalogItemInput,
) {
  await renoService.updateMaterialCatalogItem(payload);
  refreshProjectPaths(payload.projectId);
}

export async function deleteMaterialCatalogItemAction(payload: {
  projectId: string;
  materialId: string;
}) {
  await renoService.deleteMaterialCatalogItem(payload);
  refreshProjectPaths(payload.projectId);
}

export async function addMaterialCategoryAction(
  payload: AddMaterialCategoryInput,
) {
  await renoService.addMaterialCategory(payload);
  refreshProjectPaths(payload.projectId);
}

export async function updateMaterialCategoryAction(
  payload: UpdateMaterialCategoryInput,
) {
  await renoService.updateMaterialCategory(payload);
  refreshProjectPaths(payload.projectId);
}

export async function deleteMaterialCategoryAction(payload: {
  projectId: string;
  categoryId: string;
}) {
  await renoService.deleteMaterialCategory(payload);
  refreshProjectPaths(payload.projectId);
}

export async function moveMaterialCategoryAction(payload: {
  projectId: string;
  categoryId: string;
  direction: "up" | "down";
}) {
  await renoService.moveMaterialCategory(payload);
  refreshProjectPaths(payload.projectId);
}

export async function addProjectNoteAction(payload: AddProjectNoteInput) {
  await renoService.addProjectNote(payload);

  refreshProjectPaths(payload.projectId);
}

export async function updateProjectNoteLinkAction(payload: {
  projectId: string;
  noteId: string;
  linkedSectionId?: string | null;
}) {
  await renoService.updateProjectNoteLink(payload);

  refreshProjectPaths(payload.projectId);
}

export async function updateProjectNoteContentAction(payload: {
  projectId: string;
  noteId: string;
  title: string;
  content: string;
}) {
  await renoService.updateProjectNoteContent(payload);

  refreshProjectPaths(payload.projectId);
}

export async function deleteProjectNoteAction(payload: {
  projectId: string;
  noteId: string;
}) {
  await renoService.deleteProjectNote(payload);

  refreshProjectPaths(payload.projectId);
}

export async function addSectionItemAction(payload: {
  projectId: string;
  sectionId: string;
  title: string;
  estimate?: number;
  unitId?: string | null;
}) {
  await renoService.addSectionItem(payload);

  refreshProjectPaths(payload.projectId);
}

export async function deleteItemAction(payload: {
  projectId: string;
  itemId: string;
}) {
  await renoService.deleteItem(payload);
  refreshProjectPaths(payload.projectId);
}

export async function addSectionAction(payload: {
  projectId: string;
  title: string;
  description: string;
}) {
  await renoService.addSection(payload);
  refreshProjectPaths(payload.projectId);
}

export async function updateSectionAction(payload: {
  projectId: string;
  sectionId: string;
  title: string;
  description: string;
}) {
  await renoService.updateSection(payload);
  refreshProjectPaths(payload.projectId);
}

export async function deleteSectionAction(payload: {
  projectId: string;
  sectionId: string;
}) {
  await renoService.deleteSection(payload);
  refreshProjectPaths(payload.projectId);
}

export async function moveSectionAction(payload: {
  projectId: string;
  sectionId: string;
  direction: "up" | "down";
}) {
  await renoService.moveSection(payload);
  refreshProjectPaths(payload.projectId);
}

export async function addUnitAction(payload: AddUnitInput) {
  await renoService.addUnit(payload);
  refreshProjectPaths(payload.projectId);
}

export async function updateUnitAction(payload: UpdateUnitInput) {
  await renoService.updateUnit(payload);
  refreshProjectPaths(payload.projectId);
}

export async function deleteUnitAction(payload: {
  projectId: string;
  unitId: string;
}) {
  await renoService.deleteUnit(payload);
  refreshProjectPaths(payload.projectId);
}

export async function addUnitRoomAction(payload: AddUnitRoomInput) {
  await renoService.addUnitRoom(payload);
  refreshProjectPaths(payload.projectId);
}

export async function updateUnitRoomAction(payload: UpdateUnitRoomInput) {
  await renoService.updateUnitRoom(payload);
  refreshProjectPaths(payload.projectId);
}

export async function deleteUnitRoomAction(payload: {
  projectId: string;
  unitId: string;
  roomId: string;
}) {
  await renoService.deleteUnitRoom(payload);
  refreshProjectPaths(payload.projectId);
}

export async function addServiceSectionAction(payload: AddServiceSectionInput) {
  await renoService.addServiceSection(payload);
  refreshProjectPaths(payload.projectId);
}

export async function updateServiceSectionAction(
  payload: UpdateServiceSectionInput,
) {
  await renoService.updateServiceSection(payload);
  refreshProjectPaths(payload.projectId);
}

export async function deleteServiceSectionAction(payload: {
  projectId: string;
  serviceSectionId: string;
}) {
  await renoService.deleteServiceSection(payload);
  refreshProjectPaths(payload.projectId);
}

export async function addServiceSubsectionAction(
  payload: AddServiceSubsectionInput,
) {
  await renoService.addServiceSubsection(payload);
  refreshProjectPaths(payload.projectId);
}

export async function updateServiceSubsectionAction(
  payload: UpdateServiceSubsectionInput,
) {
  await renoService.updateServiceSubsection(payload);
  refreshProjectPaths(payload.projectId);
}

export async function deleteServiceSubsectionAction(payload: {
  projectId: string;
  serviceSectionId: string;
  subsectionId: string;
}) {
  await renoService.deleteServiceSubsection(payload);
  refreshProjectPaths(payload.projectId);
}

export async function addServiceFieldAction(payload: AddServiceFieldInput) {
  await renoService.addServiceField(payload);
  refreshProjectPaths(payload.projectId);
}

export async function updateServiceFieldAction(
  payload: UpdateServiceFieldInput,
) {
  await renoService.updateServiceField(payload);
  refreshProjectPaths(payload.projectId);
}

export async function deleteServiceFieldAction(payload: {
  projectId: string;
  serviceSectionId: string;
  subsectionId: string;
  fieldId: string;
}) {
  await renoService.deleteServiceField(payload);
  refreshProjectPaths(payload.projectId);
}

export async function extractInvoiceDraftAction(
  payload: ExtractInvoiceDraftInput,
) {
  await renoService.createInvoiceDraftFromExtraction(payload);
  refreshProjectPaths(payload.projectId);
}

export async function updateInvoiceDraftAction(
  payload: UpdateInvoiceDraftInput,
) {
  await renoService.updateInvoiceDraft(payload);
  refreshProjectPaths(payload.projectId);
}

export async function confirmInvoiceDraftAction(
  payload: ConfirmInvoiceDraftInput,
) {
  await renoService.confirmInvoiceDraft(payload);
  refreshProjectPaths(payload.projectId);
}

export async function deleteInvoiceDraftAction(
  payload: DeleteInvoiceDraftInput,
) {
  await renoService.deleteInvoiceDraft(payload);
  refreshProjectPaths(payload.projectId);
}

export async function forceSecondPassInvoiceDraftAction(
  payload: ForceSecondPassInvoiceDraftInput,
) {
  await renoService.forceSecondPassInvoiceDraft(payload);
  refreshProjectPaths(payload.projectId);
}
