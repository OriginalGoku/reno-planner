import { projectRepository } from "../lib/reno-repository.ts";
import type {
  ExpenseType,
  ItemStatus,
  ProjectOverview,
  RenovationProject,
} from "../lib/reno-types.ts";

export type UpdateItemFieldsInput = {
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

export type AddExpenseInput = {
  projectId: string;
  itemId: string;
  date: string;
  amount: number;
  type: ExpenseType;
  vendor?: string;
  note?: string;
};

export type UpdateExpenseInput = {
  projectId: string;
  itemId: string;
  expenseId: string;
  date: string;
  amount: number;
  type: ExpenseType;
  vendor?: string;
  note?: string;
};

export type AddMaterialInput = {
  projectId: string;
  itemId: string;
  name: string;
  quantity: number;
  estimatedPrice: number;
  note?: string;
};

export type UpdateMaterialInput = {
  projectId: string;
  itemId: string;
  materialId: string;
  name: string;
  quantity: number;
  estimatedPrice: number;
  note?: string;
};

export type AddProjectNoteInput = {
  projectId: string;
  title: string;
  content: string;
  linkedSectionId?: string | null;
};

export type UpdateProjectMetaInput = {
  projectId: string;
  name: string;
  address: string;
  phase: string;
  targetCompletion: string;
  overview: ProjectOverview;
};

function toSectionId(title: string) {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const renoService = {
  async getDefaultProjectId() {
    return projectRepository.getDefaultProjectId();
  },

  async listProjectIds() {
    return projectRepository.listProjectIds();
  },

  async updateItemFields(payload: UpdateItemFieldsInput) {
    return projectRepository.updateItemFields(
      payload.projectId,
      payload.itemId,
      {
        title: payload.title,
        estimate: payload.estimate,
        status: payload.status,
        estimatedCompletionDate: payload.estimatedCompletionDate,
        actualCompletionDate: payload.actualCompletionDate,
        performers: payload.performers,
        description: payload.description,
        note: payload.note,
      },
    );
  },

  async updateProjectMeta(payload: UpdateProjectMetaInput) {
    return projectRepository.updateProjectMeta(payload.projectId, {
      name: payload.name.trim(),
      address: payload.address.trim(),
      phase: payload.phase.trim(),
      targetCompletion: payload.targetCompletion.trim(),
      overview: payload.overview,
    });
  },

  async updateItemStatus(payload: {
    projectId: string;
    itemId: string;
    status: ItemStatus;
  }) {
    return projectRepository.updateItemStatus(
      payload.projectId,
      payload.itemId,
      payload.status,
    );
  },

  async addItemExpense(payload: AddExpenseInput) {
    return projectRepository.addItemExpense(payload.projectId, payload.itemId, {
      id: crypto.randomUUID(),
      date: payload.date,
      amount: payload.amount,
      type: payload.type,
      vendor: payload.vendor,
      note: payload.note,
    });
  },

  async updateItemExpense(payload: UpdateExpenseInput) {
    return projectRepository.updateItemExpense(
      payload.projectId,
      payload.itemId,
      {
        id: payload.expenseId,
        date: payload.date,
        amount: payload.amount,
        type: payload.type,
        vendor: payload.vendor,
        note: payload.note,
      },
    );
  },

  async removeItemExpense(payload: {
    projectId: string;
    itemId: string;
    expenseId: string;
  }) {
    return projectRepository.removeItemExpense(
      payload.projectId,
      payload.itemId,
      payload.expenseId,
    );
  },

  async addItemMaterial(payload: AddMaterialInput) {
    return projectRepository.addItemMaterial(
      payload.projectId,
      payload.itemId,
      {
        id: crypto.randomUUID(),
        name: payload.name,
        quantity: payload.quantity,
        estimatedPrice: payload.estimatedPrice,
        note: payload.note,
      },
    );
  },

  async removeItemMaterial(payload: {
    projectId: string;
    itemId: string;
    materialId: string;
  }) {
    return projectRepository.removeItemMaterial(
      payload.projectId,
      payload.itemId,
      payload.materialId,
    );
  },

  async updateItemMaterial(payload: UpdateMaterialInput) {
    return projectRepository.updateItemMaterial(
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
  },

  async addProjectNote(payload: AddProjectNoteInput) {
    return projectRepository.addProjectNote(payload.projectId, {
      id: crypto.randomUUID(),
      title: payload.title,
      content: payload.content,
      linkedSectionId: payload.linkedSectionId ?? null,
    });
  },

  async updateProjectNoteLink(payload: {
    projectId: string;
    noteId: string;
    linkedSectionId?: string | null;
  }) {
    return projectRepository.updateProjectNoteLink(
      payload.projectId,
      payload.noteId,
      payload.linkedSectionId,
    );
  },

  async updateProjectNoteContent(payload: {
    projectId: string;
    noteId: string;
    title: string;
    content: string;
  }) {
    return projectRepository.updateProjectNoteContent(
      payload.projectId,
      payload.noteId,
      {
        title: payload.title,
        content: payload.content,
      },
    );
  },

  async deleteProjectNote(payload: { projectId: string; noteId: string }) {
    return projectRepository.deleteProjectNote(
      payload.projectId,
      payload.noteId,
    );
  },

  async addSectionItem(payload: {
    projectId: string;
    sectionId: string;
    title: string;
    estimate?: number;
  }) {
    return projectRepository.addSectionItem(
      payload.projectId,
      payload.sectionId,
      {
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
      },
    );
  },

  async deleteItem(payload: { projectId: string; itemId: string }) {
    return projectRepository.deleteItem(payload.projectId, payload.itemId);
  },

  async addSection(payload: {
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

    return projectRepository.addSection(payload.projectId, {
      id: normalizedId,
      title: payload.title.trim(),
      description: payload.description.trim(),
      position: project.sections.length,
    });
  },

  async updateSection(payload: {
    projectId: string;
    sectionId: string;
    title: string;
    description: string;
  }) {
    return projectRepository.updateSection(
      payload.projectId,
      payload.sectionId,
      {
        title: payload.title.trim(),
        description: payload.description.trim(),
      },
    );
  },

  async deleteSection(payload: { projectId: string; sectionId: string }) {
    return projectRepository.deleteSection(
      payload.projectId,
      payload.sectionId,
    );
  },

  async moveSection(payload: {
    projectId: string;
    sectionId: string;
    direction: "up" | "down";
  }) {
    return projectRepository.moveSection(
      payload.projectId,
      payload.sectionId,
      payload.direction,
    );
  },

  async getProjectById(projectId: string): Promise<RenovationProject | null> {
    return projectRepository.getProjectById(projectId);
  },
};
