import "server-only";

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  ItemStatus,
  RenovationExpense,
  RenovationMaterial,
  RenovationNote,
  RenovationProject,
} from "@/lib/reno-types";
import { validateProjectData } from "@/lib/reno-validation";

type ProjectIndexEntry = {
  id: string;
  file: string;
};

type ProjectsIndex = {
  defaultProjectId: string;
  projects: ProjectIndexEntry[];
};

type UpdateItemFieldsInput = {
  status: ItemStatus;
  estimatedCompletionDate?: string;
  actualCompletionDate?: string;
  performers: string[];
  description: string;
  note: string;
};

export interface ProjectRepository {
  getDefaultProjectId(): Promise<string>;
  getProjectById(projectId: string): Promise<RenovationProject | null>;
  listProjectIds(): Promise<string[]>;
  updateItemFields(
    projectId: string,
    itemId: string,
    payload: UpdateItemFieldsInput,
  ): Promise<RenovationProject>;
  updateItemStatus(
    projectId: string,
    itemId: string,
    status: ItemStatus,
  ): Promise<RenovationProject>;
  addItemExpense(
    projectId: string,
    itemId: string,
    expense: RenovationExpense,
  ): Promise<RenovationProject>;
  addItemMaterial(
    projectId: string,
    itemId: string,
    material: RenovationMaterial,
  ): Promise<RenovationProject>;
  updateItemMaterial(
    projectId: string,
    itemId: string,
    material: RenovationMaterial,
  ): Promise<RenovationProject>;
  removeItemMaterial(
    projectId: string,
    itemId: string,
    materialId: string,
  ): Promise<RenovationProject>;
  addProjectNote(
    projectId: string,
    note: RenovationNote,
  ): Promise<RenovationProject>;
  updateProjectNoteLink(
    projectId: string,
    noteId: string,
    linkedSectionId?: string | null,
  ): Promise<RenovationProject>;
  updateProjectNoteContent(
    projectId: string,
    noteId: string,
    payload: Pick<RenovationNote, "title" | "content">,
  ): Promise<RenovationProject>;
}

export class JsonProjectRepository implements ProjectRepository {
  private readonly dataDir = path.join(process.cwd(), "src/data/reno");

  private readonly indexPath = path.join(this.dataDir, "projects-index.json");

  private async loadIndex(): Promise<ProjectsIndex> {
    const raw = await readFile(this.indexPath, "utf8");
    const parsed = JSON.parse(raw) as ProjectsIndex;

    if (!parsed.defaultProjectId || !Array.isArray(parsed.projects)) {
      throw new Error("Invalid projects index format.");
    }

    return parsed;
  }

  private async resolveProjectPath(projectId: string): Promise<string | null> {
    const index = await this.loadIndex();
    const entry = index.projects.find((project) => project.id === projectId);
    if (!entry) {
      return null;
    }

    return path.join(this.dataDir, entry.file);
  }

  private async readProject(
    projectId: string,
  ): Promise<RenovationProject | null> {
    const projectPath = await this.resolveProjectPath(projectId);
    if (!projectPath) {
      return null;
    }

    const raw = await readFile(projectPath, "utf8");
    const parsed = JSON.parse(raw);
    return validateProjectData(parsed);
  }

  private async writeProject(project: RenovationProject): Promise<void> {
    const projectPath = await this.resolveProjectPath(project.id);
    if (!projectPath) {
      throw new Error(`Project not found: ${project.id}`);
    }

    validateProjectData(project);
    await writeFile(
      projectPath,
      `${JSON.stringify(project, null, 2)}\n`,
      "utf8",
    );
  }

  private async mutateProject(
    projectId: string,
    mutate: (project: RenovationProject) => RenovationProject,
  ): Promise<RenovationProject> {
    const project = await this.readProject(projectId);
    if (!project) {
      throw new Error(`Unknown projectId: ${projectId}`);
    }

    const updated = mutate(project);
    await this.writeProject(updated);
    return updated;
  }

  async getDefaultProjectId(): Promise<string> {
    const index = await this.loadIndex();
    return index.defaultProjectId;
  }

  async getProjectById(projectId: string): Promise<RenovationProject | null> {
    return this.readProject(projectId);
  }

  async listProjectIds(): Promise<string[]> {
    const index = await this.loadIndex();
    return index.projects.map((project) => project.id);
  }

  async updateItemFields(
    projectId: string,
    itemId: string,
    payload: UpdateItemFieldsInput,
  ): Promise<RenovationProject> {
    return this.mutateProject(projectId, (project) => {
      const item = project.items.find((entry) => entry.id === itemId);
      if (!item) {
        throw new Error(`Unknown itemId: ${itemId}`);
      }

      item.status = payload.status;
      item.estimatedCompletionDate =
        payload.estimatedCompletionDate || undefined;
      item.actualCompletionDate = payload.actualCompletionDate || undefined;
      item.performers = payload.performers;
      item.description = payload.description;
      item.note = payload.note;

      return project;
    });
  }

  async updateItemStatus(
    projectId: string,
    itemId: string,
    status: ItemStatus,
  ): Promise<RenovationProject> {
    return this.mutateProject(projectId, (project) => {
      const item = project.items.find((entry) => entry.id === itemId);
      if (!item) {
        throw new Error(`Unknown itemId: ${itemId}`);
      }

      item.status = status;
      return project;
    });
  }

  async addItemExpense(
    projectId: string,
    itemId: string,
    expense: RenovationExpense,
  ): Promise<RenovationProject> {
    return this.mutateProject(projectId, (project) => {
      const item = project.items.find((entry) => entry.id === itemId);
      if (!item) {
        throw new Error(`Unknown itemId: ${itemId}`);
      }

      item.expenses = [expense, ...item.expenses];
      return project;
    });
  }

  async addItemMaterial(
    projectId: string,
    itemId: string,
    material: RenovationMaterial,
  ): Promise<RenovationProject> {
    return this.mutateProject(projectId, (project) => {
      const item = project.items.find((entry) => entry.id === itemId);
      if (!item) {
        throw new Error(`Unknown itemId: ${itemId}`);
      }

      item.materials = [material, ...(item.materials ?? [])];
      return project;
    });
  }

  async removeItemMaterial(
    projectId: string,
    itemId: string,
    materialId: string,
  ): Promise<RenovationProject> {
    return this.mutateProject(projectId, (project) => {
      const item = project.items.find((entry) => entry.id === itemId);
      if (!item) {
        throw new Error(`Unknown itemId: ${itemId}`);
      }

      item.materials = (item.materials ?? []).filter(
        (material) => material.id !== materialId,
      );
      return project;
    });
  }

  async updateItemMaterial(
    projectId: string,
    itemId: string,
    material: RenovationMaterial,
  ): Promise<RenovationProject> {
    return this.mutateProject(projectId, (project) => {
      const item = project.items.find((entry) => entry.id === itemId);
      if (!item) {
        throw new Error(`Unknown itemId: ${itemId}`);
      }

      const existingMaterials = item.materials ?? [];
      const materialIndex = existingMaterials.findIndex(
        (entry) => entry.id === material.id,
      );
      if (materialIndex < 0) {
        throw new Error(`Unknown materialId: ${material.id}`);
      }

      existingMaterials[materialIndex] = material;
      item.materials = existingMaterials;
      return project;
    });
  }

  async addProjectNote(
    projectId: string,
    note: RenovationNote,
  ): Promise<RenovationProject> {
    return this.mutateProject(projectId, (project) => {
      project.notes = [note, ...project.notes];
      return project;
    });
  }

  async updateProjectNoteLink(
    projectId: string,
    noteId: string,
    linkedSectionId?: string | null,
  ): Promise<RenovationProject> {
    return this.mutateProject(projectId, (project) => {
      const note = project.notes.find((entry) => entry.id === noteId);
      if (!note) {
        throw new Error(`Unknown noteId: ${noteId}`);
      }

      note.linkedSectionId = linkedSectionId || null;
      return project;
    });
  }

  async updateProjectNoteContent(
    projectId: string,
    noteId: string,
    payload: Pick<RenovationNote, "title" | "content">,
  ): Promise<RenovationProject> {
    return this.mutateProject(projectId, (project) => {
      const note = project.notes.find((entry) => entry.id === noteId);
      if (!note) {
        throw new Error(`Unknown noteId: ${noteId}`);
      }

      note.title = payload.title;
      note.content = payload.content;
      return project;
    });
  }
}

export const projectRepository: ProjectRepository = new JsonProjectRepository();
