"use server";

import { revalidatePath } from "next/cache";
import { projectRepository } from "@/lib/reno-repository";
import type { ExpenseType, ItemStatus } from "@/lib/reno-data-loader";

type UpdateItemFieldsInput = {
  projectId: string;
  itemId: string;
  title: string;
  estimate: number;
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
    title: payload.title,
    estimate: payload.estimate,
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
  await projectRepository.updateItemExpense(payload.projectId, payload.itemId, {
    id: payload.expenseId,
    date: payload.date,
    amount: payload.amount,
    type: payload.type,
    vendor: payload.vendor,
    note: payload.note,
  });

  refreshProjectPaths(payload.projectId);
}

export async function removeItemExpenseAction(payload: {
  projectId: string;
  itemId: string;
  expenseId: string;
}) {
  await projectRepository.removeItemExpense(
    payload.projectId,
    payload.itemId,
    payload.expenseId,
  );

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

export async function addSectionItemAction(payload: {
  projectId: string;
  sectionId: string;
  title: string;
  estimate?: number;
}) {
  await projectRepository.addSectionItem(payload.projectId, payload.sectionId, {
    id: crypto.randomUUID(),
    sectionId: payload.sectionId,
    title: payload.title,
    status: "todo",
    estimate: payload.estimate ?? 0,
    description: "",
    note: "",
    materials: [],
    expenses: [],
    performers: [],
  });

  refreshProjectPaths(payload.projectId);
}

export async function deleteItemAction(payload: {
  projectId: string;
  itemId: string;
}) {
  await projectRepository.deleteItem(payload.projectId, payload.itemId);
  refreshProjectPaths(payload.projectId);
}

function toSectionId(title: string) {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function addSectionAction(payload: {
  projectId: string;
  title: string;
  description: string;
}) {
  const project = await projectRepository.getProjectById(payload.projectId);
  if (!project) {
    throw new Error(`Unknown projectId: ${payload.projectId}`);
  }

  const baseId = toSectionId(payload.title) || "section";
  let normalizedId = baseId;
  let suffix = 2;
  while (project.sections.some((section) => section.id === normalizedId)) {
    normalizedId = `${baseId}-${suffix}`;
    suffix += 1;
  }

  await projectRepository.addSection(payload.projectId, {
    id: normalizedId,
    title: payload.title.trim(),
    description: payload.description.trim(),
  });
  refreshProjectPaths(payload.projectId);
}

export async function updateSectionAction(payload: {
  projectId: string;
  sectionId: string;
  title: string;
  description: string;
}) {
  await projectRepository.updateSection(payload.projectId, payload.sectionId, {
    title: payload.title.trim(),
    description: payload.description.trim(),
  });
  refreshProjectPaths(payload.projectId);
}

export async function deleteSectionAction(payload: {
  projectId: string;
  sectionId: string;
}) {
  await projectRepository.deleteSection(payload.projectId, payload.sectionId);
  refreshProjectPaths(payload.projectId);
}
