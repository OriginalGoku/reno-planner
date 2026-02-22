"use server";

import { revalidatePath } from "next/cache";
import type {
  ExpenseType,
  ItemStatus,
  MaterialUnitType,
} from "@/lib/reno-data-loader";
import {
  renoService,
  type AddExpenseInput,
  type AddMaterialInput,
  type AddProjectNoteInput,
  type AddUnitInput,
  type AddUnitRoomInput,
  type UpdateProjectMetaInput,
  type UpdateItemFieldsInput,
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
  name: string;
  quantity: number;
  unitType: MaterialUnitType;
  estimatedPrice: number;
  url: string;
  note?: string;
}) {
  await renoService.updateItemMaterial(payload);

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
