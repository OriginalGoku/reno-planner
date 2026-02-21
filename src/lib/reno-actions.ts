"use server";

import { revalidatePath } from "next/cache";
import { projectRepository } from "@/lib/reno-repository";
import type { ExpenseType, ItemStatus } from "@/lib/reno-data-loader";

type UpdateItemFieldsInput = {
  projectId: string;
  itemId: string;
  status: ItemStatus;
  estimatedCompletionDate?: string;
  actualCompletionDate?: string;
  performers: string[];
  description: string;
  note: string;
};

type AddExpenseInput = {
  projectId: string;
  itemId: string;
  date: string;
  amount: number;
  type: ExpenseType;
  vendor?: string;
  note?: string;
};

type AddMaterialInput = {
  projectId: string;
  itemId: string;
  name: string;
  quantity: number;
  estimatedPrice: number;
  note?: string;
};

type AddProjectNoteInput = {
  projectId: string;
  title: string;
  content: string;
  linkedSectionId?: string | null;
};

function refreshProjectPaths(projectId: string) {
  revalidatePath(`/app/${projectId}`);
  revalidatePath(`/app/${projectId}/items`);
  revalidatePath(`/app/${projectId}/expenses`);
  revalidatePath(`/app/${projectId}/purchases`);
  revalidatePath(`/app/${projectId}/notes`);
}

export async function updateItemFieldsAction(payload: UpdateItemFieldsInput) {
  await projectRepository.updateItemFields(payload.projectId, payload.itemId, {
    status: payload.status,
    estimatedCompletionDate: payload.estimatedCompletionDate,
    actualCompletionDate: payload.actualCompletionDate,
    performers: payload.performers,
    description: payload.description,
    note: payload.note,
  });

  refreshProjectPaths(payload.projectId);
}

export async function updateItemStatusAction(payload: {
  projectId: string;
  itemId: string;
  status: ItemStatus;
}) {
  await projectRepository.updateItemStatus(
    payload.projectId,
    payload.itemId,
    payload.status,
  );

  refreshProjectPaths(payload.projectId);
}

export async function addItemExpenseAction(payload: AddExpenseInput) {
  await projectRepository.addItemExpense(payload.projectId, payload.itemId, {
    id: crypto.randomUUID(),
    date: payload.date,
    amount: payload.amount,
    type: payload.type,
    vendor: payload.vendor,
    note: payload.note,
  });

  refreshProjectPaths(payload.projectId);
}

export async function addItemMaterialAction(payload: AddMaterialInput) {
  await projectRepository.addItemMaterial(payload.projectId, payload.itemId, {
    id: crypto.randomUUID(),
    name: payload.name,
    quantity: payload.quantity,
    estimatedPrice: payload.estimatedPrice,
    note: payload.note,
  });

  refreshProjectPaths(payload.projectId);
}

export async function removeItemMaterialAction(payload: {
  projectId: string;
  itemId: string;
  materialId: string;
}) {
  await projectRepository.removeItemMaterial(
    payload.projectId,
    payload.itemId,
    payload.materialId,
  );

  refreshProjectPaths(payload.projectId);
}

export async function updateItemMaterialAction(payload: {
  projectId: string;
  itemId: string;
  materialId: string;
  name: string;
  quantity: number;
  estimatedPrice: number;
  note?: string;
}) {
  await projectRepository.updateItemMaterial(
    payload.projectId,
    payload.itemId,
    {
      id: payload.materialId,
      name: payload.name,
      quantity: payload.quantity,
      estimatedPrice: payload.estimatedPrice,
      note: payload.note,
    },
  );

  refreshProjectPaths(payload.projectId);
}

export async function addProjectNoteAction(payload: AddProjectNoteInput) {
  await projectRepository.addProjectNote(payload.projectId, {
    id: crypto.randomUUID(),
    title: payload.title,
    content: payload.content,
    linkedSectionId: payload.linkedSectionId ?? null,
  });

  refreshProjectPaths(payload.projectId);
}

export async function updateProjectNoteLinkAction(payload: {
  projectId: string;
  noteId: string;
  linkedSectionId?: string | null;
}) {
  await projectRepository.updateProjectNoteLink(
    payload.projectId,
    payload.noteId,
    payload.linkedSectionId,
  );

  refreshProjectPaths(payload.projectId);
}

export async function updateProjectNoteContentAction(payload: {
  projectId: string;
  noteId: string;
  title: string;
  content: string;
}) {
  await projectRepository.updateProjectNoteContent(
    payload.projectId,
    payload.noteId,
    {
      title: payload.title,
      content: payload.content,
    },
  );

  refreshProjectPaths(payload.projectId);
}
