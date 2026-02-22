import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  ItemStatus,
  ProjectOverview,
  RenovationAttachment,
  RenovationExpense,
  RenovationMaterial,
  RenovationNote,
  RenovationProject,
} from "./reno-types.ts";
import { validateProjectData } from "./reno-validation.ts";

type ProjectIndexEntry = {
  id: string;
  file: string;
};

type ProjectsIndex = {
  defaultProjectId: string;
  projects: ProjectIndexEntry[];
};

type UpdateItemFieldsInput = {
  title: string;
  estimate: number;
  status: ItemStatus;
  estimatedCompletionDate?: string;
  actualCompletionDate?: string;
  performers: string[];
  description: string;
  note: string;
};

type UpdateProjectMetaInput = {
  name: string;
  address: string;
  phase: string;
  targetCompletion: string;
  overview: ProjectOverview;
};

type AddUnitInput = RenovationProject["units"][number];

type UpdateUnitInput = Pick<
  RenovationProject["units"][number],
  "name" | "floor" | "bedrooms" | "totalAreaSqm" | "status" | "description"
>;

type AddUnitRoomInput = RenovationProject["units"][number]["rooms"][number];

type UpdateUnitRoomInput = Pick<
  RenovationProject["units"][number]["rooms"][number],
  "roomType" | "widthMm" | "lengthMm" | "heightMm" | "description"
>;

type SectionMoveDirection = "up" | "down";

function normalizeSectionOrder(
  sections: RenovationProject["sections"],
): RenovationProject["sections"] {
  const withFallback = sections.map((section, index) => ({
    ...section,
    position:
      typeof section.position === "number" &&
      Number.isInteger(section.position) &&
      section.position >= 0
        ? section.position
        : index,
  }));

  return withFallback
    .sort((a, b) => a.position - b.position)
    .map((section, index) => ({ ...section, position: index }));
}

export interface ProjectRepository {
  getDefaultProjectId(): Promise<string>;
  getProjectById(projectId: string): Promise<RenovationProject | null>;
  listProjectIds(): Promise<string[]>;
  updateItemFields(
    projectId: string,
    itemId: string,
    payload: UpdateItemFieldsInput,
  ): Promise<RenovationProject>;
  updateProjectMeta(
    projectId: string,
    payload: UpdateProjectMetaInput,
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
  updateItemExpense(
    projectId: string,
    itemId: string,
    expense: RenovationExpense,
  ): Promise<RenovationProject>;
  removeItemExpense(
    projectId: string,
    itemId: string,
    expenseId: string,
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
  addUnit(projectId: string, unit: AddUnitInput): Promise<RenovationProject>;
  updateUnit(
    projectId: string,
    unitId: string,
    payload: UpdateUnitInput,
  ): Promise<RenovationProject>;
  deleteUnit(projectId: string, unitId: string): Promise<RenovationProject>;
  addUnitRoom(
    projectId: string,
    unitId: string,
    room: AddUnitRoomInput,
  ): Promise<RenovationProject>;
  updateUnitRoom(
    projectId: string,
    unitId: string,
    roomId: string,
    payload: UpdateUnitRoomInput,
  ): Promise<RenovationProject>;
  deleteUnitRoom(
    projectId: string,
    unitId: string,
    roomId: string,
  ): Promise<RenovationProject>;
  addSectionItem(
    projectId: string,
    sectionId: string,
    item: RenovationProject["items"][number],
  ): Promise<RenovationProject>;
  deleteItem(projectId: string, itemId: string): Promise<RenovationProject>;
  addSection(
    projectId: string,
    section: RenovationProject["sections"][number],
  ): Promise<RenovationProject>;
  updateSection(
    projectId: string,
    sectionId: string,
    payload: Pick<
      RenovationProject["sections"][number],
      "title" | "description"
    >,
  ): Promise<RenovationProject>;
  deleteSection(
    projectId: string,
    sectionId: string,
  ): Promise<RenovationProject>;
  moveSection(
    projectId: string,
    sectionId: string,
    direction: SectionMoveDirection,
  ): Promise<RenovationProject>;
  setSectionPosition(
    projectId: string,
    sectionId: string,
    position: number,
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
  deleteProjectNote(
    projectId: string,
    noteId: string,
  ): Promise<RenovationProject>;
  addAttachment(
    projectId: string,
    attachment: RenovationAttachment,
  ): Promise<RenovationProject>;
  deleteAttachment(
    projectId: string,
    attachmentId: string,
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
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      Array.isArray((parsed as { sections?: unknown[] }).sections)
    ) {
      const projectLike = parsed as {
        sections: RenovationProject["sections"];
        units?: RenovationProject["units"];
        attachments?: RenovationProject["attachments"];
      };
      projectLike.sections = normalizeSectionOrder(projectLike.sections);
      if (!Array.isArray(projectLike.units)) {
        projectLike.units = [];
      } else {
        projectLike.units = projectLike.units.map((unit) => ({
          ...unit,
          bedrooms:
            typeof unit.bedrooms === "number" &&
            Number.isInteger(unit.bedrooms) &&
            unit.bedrooms >= 0
              ? unit.bedrooms
              : 0,
          rooms: Array.isArray(unit.rooms)
            ? unit.rooms.map((room) => ({
                ...room,
                roomType:
                  room.roomType === "kitchen_living_area"
                    ? "kitchen"
                    : room.roomType,
              }))
            : [],
        }));
      }
      if (!Array.isArray(projectLike.attachments)) {
        projectLike.attachments = [];
      }
    }
    return validateProjectData(parsed);
  }

  private async writeProject(project: RenovationProject): Promise<void> {
    const projectPath = await this.resolveProjectPath(project.id);
    if (!projectPath) {
      throw new Error(`Project not found: ${project.id}`);
    }

    project.sections = normalizeSectionOrder(project.sections);
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
    updated.sections = normalizeSectionOrder(updated.sections);
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

      item.title = payload.title;
      item.estimate = payload.estimate;
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

  async updateProjectMeta(
    projectId: string,
    payload: UpdateProjectMetaInput,
  ): Promise<RenovationProject> {
    return this.mutateProject(projectId, (project) => {
      project.name = payload.name;
      project.address = payload.address;
      project.phase = payload.phase;
      project.targetCompletion = payload.targetCompletion;
      project.overview = payload.overview;
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

  async updateItemExpense(
    projectId: string,
    itemId: string,
    expense: RenovationExpense,
  ): Promise<RenovationProject> {
    return this.mutateProject(projectId, (project) => {
      const item = project.items.find((entry) => entry.id === itemId);
      if (!item) {
        throw new Error(`Unknown itemId: ${itemId}`);
      }

      const expenseIndex = item.expenses.findIndex(
        (entry) => entry.id === expense.id,
      );
      if (expenseIndex < 0) {
        throw new Error(`Unknown expenseId: ${expense.id}`);
      }

      item.expenses[expenseIndex] = expense;
      return project;
    });
  }

  async removeItemExpense(
    projectId: string,
    itemId: string,
    expenseId: string,
  ): Promise<RenovationProject> {
    return this.mutateProject(projectId, (project) => {
      const item = project.items.find((entry) => entry.id === itemId);
      if (!item) {
        throw new Error(`Unknown itemId: ${itemId}`);
      }

      item.expenses = item.expenses.filter(
        (expense) => expense.id !== expenseId,
      );
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

  async addUnit(
    projectId: string,
    unit: AddUnitInput,
  ): Promise<RenovationProject> {
    return this.mutateProject(projectId, (project) => {
      project.units = [unit, ...project.units];
      return project;
    });
  }

  async updateUnit(
    projectId: string,
    unitId: string,
    payload: UpdateUnitInput,
  ): Promise<RenovationProject> {
    return this.mutateProject(projectId, (project) => {
      const unit = project.units.find((entry) => entry.id === unitId);
      if (!unit) {
        throw new Error(`Unknown unitId: ${unitId}`);
      }

      unit.name = payload.name;
      unit.floor = payload.floor;
      unit.bedrooms = payload.bedrooms;
      unit.totalAreaSqm = payload.totalAreaSqm;
      unit.status = payload.status;
      unit.description = payload.description;
      return project;
    });
  }

  async deleteUnit(
    projectId: string,
    unitId: string,
  ): Promise<RenovationProject> {
    return this.mutateProject(projectId, (project) => {
      project.units = project.units.filter((unit) => unit.id !== unitId);
      return project;
    });
  }

  async addUnitRoom(
    projectId: string,
    unitId: string,
    room: AddUnitRoomInput,
  ): Promise<RenovationProject> {
    return this.mutateProject(projectId, (project) => {
      const unit = project.units.find((entry) => entry.id === unitId);
      if (!unit) {
        throw new Error(`Unknown unitId: ${unitId}`);
      }
      unit.rooms = [room, ...unit.rooms];
      return project;
    });
  }

  async updateUnitRoom(
    projectId: string,
    unitId: string,
    roomId: string,
    payload: UpdateUnitRoomInput,
  ): Promise<RenovationProject> {
    return this.mutateProject(projectId, (project) => {
      const unit = project.units.find((entry) => entry.id === unitId);
      if (!unit) {
        throw new Error(`Unknown unitId: ${unitId}`);
      }
      const room = unit.rooms.find((entry) => entry.id === roomId);
      if (!room) {
        throw new Error(`Unknown roomId: ${roomId}`);
      }

      room.roomType = payload.roomType;
      room.widthMm = payload.widthMm;
      room.lengthMm = payload.lengthMm;
      room.heightMm = payload.heightMm;
      room.description = payload.description;
      return project;
    });
  }

  async deleteUnitRoom(
    projectId: string,
    unitId: string,
    roomId: string,
  ): Promise<RenovationProject> {
    return this.mutateProject(projectId, (project) => {
      const unit = project.units.find((entry) => entry.id === unitId);
      if (!unit) {
        throw new Error(`Unknown unitId: ${unitId}`);
      }
      unit.rooms = unit.rooms.filter((room) => room.id !== roomId);
      return project;
    });
  }

  async addSectionItem(
    projectId: string,
    sectionId: string,
    item: RenovationProject["items"][number],
  ): Promise<RenovationProject> {
    return this.mutateProject(projectId, (project) => {
      const sectionExists = project.sections.some(
        (section) => section.id === sectionId,
      );
      if (!sectionExists) {
        throw new Error(`Unknown sectionId: ${sectionId}`);
      }

      project.items = [{ ...item, sectionId }, ...project.items];
      return project;
    });
  }

  async deleteItem(
    projectId: string,
    itemId: string,
  ): Promise<RenovationProject> {
    return this.mutateProject(projectId, (project) => {
      project.items = project.items.filter((item) => item.id !== itemId);
      return project;
    });
  }

  async addSection(
    projectId: string,
    section: RenovationProject["sections"][number],
  ): Promise<RenovationProject> {
    return this.mutateProject(projectId, (project) => {
      project.sections = [...project.sections, section];
      return project;
    });
  }

  async updateSection(
    projectId: string,
    sectionId: string,
    payload: Pick<
      RenovationProject["sections"][number],
      "title" | "description"
    >,
  ): Promise<RenovationProject> {
    return this.mutateProject(projectId, (project) => {
      const section = project.sections.find((entry) => entry.id === sectionId);
      if (!section) {
        throw new Error(`Unknown sectionId: ${sectionId}`);
      }

      section.title = payload.title;
      section.description = payload.description;
      return project;
    });
  }

  async deleteSection(
    projectId: string,
    sectionId: string,
  ): Promise<RenovationProject> {
    return this.mutateProject(projectId, (project) => {
      project.sections = project.sections.filter(
        (section) => section.id !== sectionId,
      );
      project.items = project.items.filter(
        (item) => item.sectionId !== sectionId,
      );
      project.notes = project.notes.map((note) =>
        note.linkedSectionId === sectionId
          ? { ...note, linkedSectionId: null }
          : note,
      );
      return project;
    });
  }

  async moveSection(
    projectId: string,
    sectionId: string,
    direction: SectionMoveDirection,
  ): Promise<RenovationProject> {
    return this.mutateProject(projectId, (project) => {
      const ordered = normalizeSectionOrder(project.sections);
      const index = ordered.findIndex((section) => section.id === sectionId);
      if (index < 0) {
        throw new Error(`Unknown sectionId: ${sectionId}`);
      }

      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= ordered.length) {
        project.sections = ordered;
        return project;
      }

      const [moved] = ordered.splice(index, 1);
      ordered.splice(targetIndex, 0, moved);
      project.sections = ordered.map((section, orderIndex) => ({
        ...section,
        position: orderIndex,
      }));
      return project;
    });
  }

  async setSectionPosition(
    projectId: string,
    sectionId: string,
    position: number,
  ): Promise<RenovationProject> {
    return this.mutateProject(projectId, (project) => {
      const ordered = normalizeSectionOrder(project.sections);
      const index = ordered.findIndex((section) => section.id === sectionId);
      if (index < 0) {
        throw new Error(`Unknown sectionId: ${sectionId}`);
      }

      const maxIndex = ordered.length - 1;
      const nextIndex = Math.max(0, Math.min(position, maxIndex));

      const [moved] = ordered.splice(index, 1);
      ordered.splice(nextIndex, 0, moved);
      project.sections = ordered.map((section, orderIndex) => ({
        ...section,
        position: orderIndex,
      }));
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

  async deleteProjectNote(
    projectId: string,
    noteId: string,
  ): Promise<RenovationProject> {
    return this.mutateProject(projectId, (project) => {
      project.notes = project.notes.filter((note) => note.id !== noteId);
      return project;
    });
  }

  async addAttachment(
    projectId: string,
    attachment: RenovationAttachment,
  ): Promise<RenovationProject> {
    return this.mutateProject(projectId, (project) => {
      if (attachment.projectId !== projectId) {
        throw new Error("Attachment.projectId must match target project.");
      }

      if (attachment.scopeType === "section") {
        const exists = project.sections.some(
          (section) => section.id === attachment.scopeId,
        );
        if (!exists) {
          throw new Error(`Unknown sectionId: ${attachment.scopeId}`);
        }
      }

      if (attachment.scopeType === "item") {
        const exists = project.items.some(
          (item) => item.id === attachment.scopeId,
        );
        if (!exists) {
          throw new Error(`Unknown itemId: ${attachment.scopeId}`);
        }
      }

      if (attachment.scopeType === "expense") {
        const exists = project.items.some((item) =>
          item.expenses.some((expense) => expense.id === attachment.scopeId),
        );
        if (!exists) {
          throw new Error(`Unknown expenseId: ${attachment.scopeId}`);
        }
      }

      if (attachment.scopeType === "project") {
        attachment.scopeId = null;
      }

      project.attachments = [attachment, ...project.attachments];
      return project;
    });
  }

  async deleteAttachment(
    projectId: string,
    attachmentId: string,
  ): Promise<RenovationProject> {
    return this.mutateProject(projectId, (project) => {
      project.attachments = project.attachments.filter(
        (attachment) => attachment.id !== attachmentId,
      );
      return project;
    });
  }
}

export const projectRepository: ProjectRepository = new JsonProjectRepository();
