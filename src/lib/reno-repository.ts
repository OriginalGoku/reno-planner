import { readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import type {
  ItemStatus,
  MaterialUnitType,
  PurchaseInvoice,
  PurchaseInvoiceLine,
  PurchaseInvoiceReview,
  PurchaseInvoiceTotals,
  PurchaseLedgerEntry,
  ProjectOverview,
  RenovationAttachment,
  RenovationExpense,
  RenovationMaterial,
  RenovationNote,
  RenovationProject,
  ServiceField,
  ServiceSection,
  ServiceSubsection,
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
  unitId?: string | null;
  estimatedCompletionDate?: string;
  actualCompletionDate?: string;
  performers: string[];
  description: string;
  note: string;
  materials?: RenovationMaterial[];
  expenses?: RenovationExpense[];
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

type UpdateServiceSectionInput = Pick<ServiceSection, "name">;

type UpdateServiceSubsectionInput = Pick<ServiceSubsection, "name">;

type UpdateServiceFieldInput = Pick<
  ServiceField,
  "name" | "notes" | "linkedSections"
>;

type AddMaterialCategoryInput = RenovationProject["materialCategories"][number];

type UpdateMaterialCategoryInput = Pick<
  RenovationProject["materialCategories"][number],
  "name" | "description"
>;

type AddMaterialCatalogItemInput = RenovationProject["materialCatalog"][number];

type UpdateMaterialCatalogItemInput = Pick<
  RenovationProject["materialCatalog"][number],
  "name" | "unitType" | "estimatedPrice" | "sampleUrl" | "notes" | "categoryId"
>;

type UpdateInvoiceDraftInput = {
  vendorName: string;
  invoiceNumber: string;
  invoiceDate: string;
  currency: string;
  totals: PurchaseInvoiceTotals;
  lines: PurchaseInvoiceLine[];
  review: PurchaseInvoiceReview;
};

type SectionMoveDirection = "up" | "down";
const DEFAULT_MATERIAL_CATEGORY_ID = "uncategorized";

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

function normalizeMaterialCategoryOrder(
  categories: RenovationProject["materialCategories"],
): RenovationProject["materialCategories"] {
  const withFallback = categories.map((category, index) => ({
    ...category,
    sortOrder:
      typeof category.sortOrder === "number" &&
      Number.isInteger(category.sortOrder) &&
      category.sortOrder >= 0
        ? category.sortOrder
        : index,
  }));

  return withFallback
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((category, index) => ({ ...category, sortOrder: index }));
}

function toCatalogId(input: string) {
  const normalized = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "material";
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
  addMaterialCatalogItem(
    projectId: string,
    material: AddMaterialCatalogItemInput,
  ): Promise<RenovationProject>;
  updateMaterialCatalogItem(
    projectId: string,
    materialId: string,
    payload: UpdateMaterialCatalogItemInput,
  ): Promise<RenovationProject>;
  deleteMaterialCatalogItem(
    projectId: string,
    materialId: string,
  ): Promise<RenovationProject>;
  addMaterialCategory(
    projectId: string,
    category: AddMaterialCategoryInput,
  ): Promise<RenovationProject>;
  updateMaterialCategory(
    projectId: string,
    categoryId: string,
    payload: UpdateMaterialCategoryInput,
  ): Promise<RenovationProject>;
  deleteMaterialCategory(
    projectId: string,
    categoryId: string,
  ): Promise<RenovationProject>;
  moveMaterialCategory(
    projectId: string,
    categoryId: string,
    direction: SectionMoveDirection,
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
  addServiceSection(
    projectId: string,
    serviceSection: ServiceSection,
  ): Promise<RenovationProject>;
  updateServiceSection(
    projectId: string,
    serviceSectionId: string,
    payload: UpdateServiceSectionInput,
  ): Promise<RenovationProject>;
  deleteServiceSection(
    projectId: string,
    serviceSectionId: string,
  ): Promise<RenovationProject>;
  addServiceSubsection(
    projectId: string,
    serviceSectionId: string,
    subsection: ServiceSubsection,
  ): Promise<RenovationProject>;
  updateServiceSubsection(
    projectId: string,
    serviceSectionId: string,
    subsectionId: string,
    payload: UpdateServiceSubsectionInput,
  ): Promise<RenovationProject>;
  deleteServiceSubsection(
    projectId: string,
    serviceSectionId: string,
    subsectionId: string,
  ): Promise<RenovationProject>;
  addServiceField(
    projectId: string,
    serviceSectionId: string,
    subsectionId: string,
    field: ServiceField,
  ): Promise<RenovationProject>;
  updateServiceField(
    projectId: string,
    serviceSectionId: string,
    subsectionId: string,
    fieldId: string,
    payload: UpdateServiceFieldInput,
  ): Promise<RenovationProject>;
  deleteServiceField(
    projectId: string,
    serviceSectionId: string,
    subsectionId: string,
    fieldId: string,
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
  createInvoiceDraftFromExtraction(
    projectId: string,
    invoice: PurchaseInvoice,
  ): Promise<RenovationProject>;
  updateInvoiceDraft(
    projectId: string,
    invoiceId: string,
    payload: UpdateInvoiceDraftInput,
  ): Promise<RenovationProject>;
  confirmInvoiceDraft(
    projectId: string,
    invoiceId: string,
    payload: {
      review: PurchaseInvoiceReview;
      confirmedAt: string;
      postedAt: string;
      ledgerEntries: PurchaseLedgerEntry[];
    },
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
        items?: RenovationProject["items"];
        units?: RenovationProject["units"];
        serviceSections?: RenovationProject["serviceSections"];
        materialCategories?:
          | RenovationProject["materialCategories"]
          | unknown[];
        materialCatalog?: RenovationProject["materialCatalog"] | unknown[];
        purchaseInvoices?: RenovationProject["purchaseInvoices"];
        purchaseLedger?: RenovationProject["purchaseLedger"];
        notes?: RenovationProject["notes"];
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
                  (room.roomType as string) === "kitchen_living_area"
                    ? "kitchen"
                    : room.roomType,
              }))
            : [],
        }));
      }
      if (!Array.isArray(projectLike.serviceSections)) {
        projectLike.serviceSections = [];
      }
      const seededCategories: RenovationProject["materialCategories"] = [];
      if (Array.isArray(projectLike.materialCategories)) {
        for (const entry of projectLike.materialCategories) {
          if (
            typeof entry === "object" &&
            entry !== null &&
            typeof (entry as { id?: unknown }).id === "string"
          ) {
            seededCategories.push(
              entry as RenovationProject["materialCategories"][number],
            );
          }
        }
      }
      if (
        !seededCategories.some(
          (entry) => entry.id === DEFAULT_MATERIAL_CATEGORY_ID,
        )
      ) {
        seededCategories.push({
          id: DEFAULT_MATERIAL_CATEGORY_ID,
          name: "Uncategorized",
          description: "Default category for uncategorized materials.",
          sortOrder: seededCategories.length,
        });
      }
      const normalizedCategories =
        normalizeMaterialCategoryOrder(seededCategories);
      projectLike.materialCategories = normalizedCategories;
      const knownCategoryIds = new Set(
        normalizedCategories.map((entry) => entry.id),
      );

      const seededCatalog: RenovationProject["materialCatalog"] = [];
      const seenCatalogIds = new Set<string>();
      if (Array.isArray(projectLike.materialCatalog)) {
        for (const entry of projectLike.materialCatalog) {
          if (
            typeof entry === "object" &&
            entry !== null &&
            typeof (entry as { id?: unknown }).id === "string"
          ) {
            const catalogEntry =
              entry as RenovationProject["materialCatalog"][number];
            if (
              !catalogEntry.categoryId ||
              !knownCategoryIds.has(catalogEntry.categoryId)
            ) {
              catalogEntry.categoryId = DEFAULT_MATERIAL_CATEGORY_ID;
            }
            if (!seenCatalogIds.has(catalogEntry.id)) {
              seededCatalog.push(catalogEntry);
              seenCatalogIds.add(catalogEntry.id);
            }
          }
        }
      }

      const upsertCatalogFromLegacy = (
        name: string,
        unitType: MaterialUnitType | undefined,
      ) => {
        const normalizedName = name.trim();
        if (!normalizedName) {
          return null;
        }
        const safeUnitType = unitType ?? "other";
        const existing = seededCatalog.find(
          (entry) =>
            entry.name.toLowerCase() === normalizedName.toLowerCase() &&
            entry.unitType === safeUnitType,
        );
        if (existing) {
          return existing.id;
        }
        const baseId = toCatalogId(normalizedName);
        let nextId = baseId;
        let suffix = 2;
        while (seenCatalogIds.has(nextId)) {
          nextId = `${baseId}-${suffix}`;
          suffix += 1;
        }
        seededCatalog.push({
          id: nextId,
          categoryId: DEFAULT_MATERIAL_CATEGORY_ID,
          name: normalizedName,
          unitType: safeUnitType,
          estimatedPrice: undefined,
          sampleUrl: "",
          notes: "",
        });
        seenCatalogIds.add(nextId);
        return nextId;
      };

      if (Array.isArray(projectLike.items)) {
        const items = projectLike.items;
        for (const item of items) {
          if (!Array.isArray(item.materials)) {
            item.materials = [];
            continue;
          }
          item.materials = item.materials.map((material) => {
            if (material.materialId) {
              return material;
            }
            const materialId = upsertCatalogFromLegacy(
              (material as { name?: string }).name ?? "Uncategorized Material",
              (material as { unitType?: MaterialUnitType }).unitType,
            );
            return {
              id:
                typeof material.id === "string" && material.id.length > 0
                  ? material.id
                  : randomUUID(),
              materialId: materialId ?? "uncategorized-material",
              quantity:
                typeof material.quantity === "number" ? material.quantity : 0,
              estimatedPrice:
                typeof material.estimatedPrice === "number"
                  ? material.estimatedPrice
                  : 0,
              url: typeof material.url === "string" ? material.url : "",
              note: material.note,
            };
          });
        }
      }

      projectLike.materialCatalog = seededCatalog;
      if (!Array.isArray(projectLike.purchaseInvoices)) {
        projectLike.purchaseInvoices = [];
      }
      if (!Array.isArray(projectLike.purchaseLedger)) {
        projectLike.purchaseLedger = [];
      }
      if (!Array.isArray(projectLike.notes)) {
        projectLike.notes = [];
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
    project.materialCategories = normalizeMaterialCategoryOrder(
      project.materialCategories,
    );
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
    updated.materialCategories = normalizeMaterialCategoryOrder(
      updated.materialCategories,
    );
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
      if (typeof payload.unitId === "string") {
        const unitExists = project.units.some(
          (entry) => entry.id === payload.unitId,
        );
        if (!unitExists) {
          throw new Error(`Unknown unitId: ${payload.unitId}`);
        }
      }

      item.title = payload.title;
      item.estimate = payload.estimate;
      item.status = payload.status;
      if (payload.unitId !== undefined) {
        item.unitId = payload.unitId ?? null;
      }
      item.estimatedCompletionDate =
        payload.estimatedCompletionDate || undefined;
      item.actualCompletionDate = payload.actualCompletionDate || undefined;
      item.performers = payload.performers;
      item.description = payload.description;
      item.note = payload.note;
      if (payload.materials !== undefined) {
        item.materials = payload.materials;
      }
      if (payload.expenses !== undefined) {
        item.expenses = payload.expenses;
      }

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

  async addMaterialCatalogItem(
    projectId: string,
    material: AddMaterialCatalogItemInput,
  ): Promise<RenovationProject> {
    return this.mutateProject(projectId, (project) => {
      const exists = project.materialCatalog.some(
        (entry) => entry.id === material.id,
      );
      if (exists) {
        throw new Error(`Material catalog id already exists: ${material.id}`);
      }
      const categoryExists = project.materialCategories.some(
        (entry) => entry.id === material.categoryId,
      );
      if (!categoryExists) {
        throw new Error(`Unknown categoryId: ${material.categoryId}`);
      }

      project.materialCatalog = [material, ...project.materialCatalog];
      return project;
    });
  }

  async updateMaterialCatalogItem(
    projectId: string,
    materialId: string,
    payload: UpdateMaterialCatalogItemInput,
  ): Promise<RenovationProject> {
    return this.mutateProject(projectId, (project) => {
      const material = project.materialCatalog.find(
        (entry) => entry.id === materialId,
      );
      if (!material) {
        throw new Error(`Unknown materialId: ${materialId}`);
      }
      const categoryExists = project.materialCategories.some(
        (entry) => entry.id === payload.categoryId,
      );
      if (!categoryExists) {
        throw new Error(`Unknown categoryId: ${payload.categoryId}`);
      }

      material.name = payload.name;
      material.unitType = payload.unitType;
      material.estimatedPrice = payload.estimatedPrice;
      material.sampleUrl = payload.sampleUrl;
      material.notes = payload.notes;
      material.categoryId = payload.categoryId;
      return project;
    });
  }

  async deleteMaterialCatalogItem(
    projectId: string,
    materialId: string,
  ): Promise<RenovationProject> {
    return this.mutateProject(projectId, (project) => {
      const inUse = project.items.some((item) =>
        (item.materials ?? []).some(
          (material) => material.materialId === materialId,
        ),
      );
      if (inUse) {
        throw new Error(
          `Material catalog item is in use by one or more item material lines: ${materialId}`,
        );
      }
      project.materialCatalog = project.materialCatalog.filter(
        (entry) => entry.id !== materialId,
      );
      return project;
    });
  }

  async addMaterialCategory(
    projectId: string,
    category: AddMaterialCategoryInput,
  ): Promise<RenovationProject> {
    return this.mutateProject(projectId, (project) => {
      const exists = project.materialCategories.some(
        (entry) => entry.id === category.id,
      );
      if (exists) {
        throw new Error(`Material category id already exists: ${category.id}`);
      }
      project.materialCategories = [...project.materialCategories, category];
      return project;
    });
  }

  async updateMaterialCategory(
    projectId: string,
    categoryId: string,
    payload: UpdateMaterialCategoryInput,
  ): Promise<RenovationProject> {
    return this.mutateProject(projectId, (project) => {
      const category = project.materialCategories.find(
        (entry) => entry.id === categoryId,
      );
      if (!category) {
        throw new Error(`Unknown categoryId: ${categoryId}`);
      }
      category.name = payload.name;
      category.description = payload.description;
      return project;
    });
  }

  async deleteMaterialCategory(
    projectId: string,
    categoryId: string,
  ): Promise<RenovationProject> {
    return this.mutateProject(projectId, (project) => {
      if (categoryId === DEFAULT_MATERIAL_CATEGORY_ID) {
        throw new Error("Cannot delete the default Uncategorized category.");
      }
      const exists = project.materialCategories.some(
        (entry) => entry.id === categoryId,
      );
      if (!exists) {
        throw new Error(`Unknown categoryId: ${categoryId}`);
      }
      project.materialCatalog = project.materialCatalog.map((material) =>
        material.categoryId === categoryId
          ? { ...material, categoryId: DEFAULT_MATERIAL_CATEGORY_ID }
          : material,
      );
      project.materialCategories = project.materialCategories.filter(
        (entry) => entry.id !== categoryId,
      );
      return project;
    });
  }

  async moveMaterialCategory(
    projectId: string,
    categoryId: string,
    direction: SectionMoveDirection,
  ): Promise<RenovationProject> {
    return this.mutateProject(projectId, (project) => {
      const ordered = normalizeMaterialCategoryOrder(
        project.materialCategories,
      );
      const index = ordered.findIndex((entry) => entry.id === categoryId);
      if (index < 0) {
        throw new Error(`Unknown categoryId: ${categoryId}`);
      }
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= ordered.length) {
        project.materialCategories = ordered;
        return project;
      }
      const [moved] = ordered.splice(index, 1);
      ordered.splice(targetIndex, 0, moved);
      project.materialCategories = ordered.map((entry, orderIndex) => ({
        ...entry,
        sortOrder: orderIndex,
      }));
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
      project.items = project.items.map((item) =>
        item.unitId === unitId ? { ...item, unitId: null } : item,
      );
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

  async addServiceSection(
    projectId: string,
    serviceSection: ServiceSection,
  ): Promise<RenovationProject> {
    return this.mutateProject(projectId, (project) => {
      project.serviceSections = [serviceSection, ...project.serviceSections];
      return project;
    });
  }

  async updateServiceSection(
    projectId: string,
    serviceSectionId: string,
    payload: UpdateServiceSectionInput,
  ): Promise<RenovationProject> {
    return this.mutateProject(projectId, (project) => {
      const section = project.serviceSections.find(
        (entry) => entry.id === serviceSectionId,
      );
      if (!section) {
        throw new Error(`Unknown serviceSectionId: ${serviceSectionId}`);
      }
      section.name = payload.name;
      return project;
    });
  }

  async deleteServiceSection(
    projectId: string,
    serviceSectionId: string,
  ): Promise<RenovationProject> {
    return this.mutateProject(projectId, (project) => {
      project.serviceSections = project.serviceSections.filter(
        (entry) => entry.id !== serviceSectionId,
      );
      return project;
    });
  }

  async addServiceSubsection(
    projectId: string,
    serviceSectionId: string,
    subsection: ServiceSubsection,
  ): Promise<RenovationProject> {
    return this.mutateProject(projectId, (project) => {
      const section = project.serviceSections.find(
        (entry) => entry.id === serviceSectionId,
      );
      if (!section) {
        throw new Error(`Unknown serviceSectionId: ${serviceSectionId}`);
      }
      section.subsections = [subsection, ...section.subsections];
      return project;
    });
  }

  async updateServiceSubsection(
    projectId: string,
    serviceSectionId: string,
    subsectionId: string,
    payload: UpdateServiceSubsectionInput,
  ): Promise<RenovationProject> {
    return this.mutateProject(projectId, (project) => {
      const section = project.serviceSections.find(
        (entry) => entry.id === serviceSectionId,
      );
      if (!section) {
        throw new Error(`Unknown serviceSectionId: ${serviceSectionId}`);
      }
      const subsection = section.subsections.find(
        (entry) => entry.id === subsectionId,
      );
      if (!subsection) {
        throw new Error(`Unknown subsectionId: ${subsectionId}`);
      }
      subsection.name = payload.name;
      return project;
    });
  }

  async deleteServiceSubsection(
    projectId: string,
    serviceSectionId: string,
    subsectionId: string,
  ): Promise<RenovationProject> {
    return this.mutateProject(projectId, (project) => {
      const section = project.serviceSections.find(
        (entry) => entry.id === serviceSectionId,
      );
      if (!section) {
        throw new Error(`Unknown serviceSectionId: ${serviceSectionId}`);
      }
      section.subsections = section.subsections.filter(
        (entry) => entry.id !== subsectionId,
      );
      return project;
    });
  }

  async addServiceField(
    projectId: string,
    serviceSectionId: string,
    subsectionId: string,
    field: ServiceField,
  ): Promise<RenovationProject> {
    return this.mutateProject(projectId, (project) => {
      const section = project.serviceSections.find(
        (entry) => entry.id === serviceSectionId,
      );
      if (!section) {
        throw new Error(`Unknown serviceSectionId: ${serviceSectionId}`);
      }
      const subsection = section.subsections.find(
        (entry) => entry.id === subsectionId,
      );
      if (!subsection) {
        throw new Error(`Unknown subsectionId: ${subsectionId}`);
      }
      subsection.fields = [field, ...subsection.fields];
      return project;
    });
  }

  async updateServiceField(
    projectId: string,
    serviceSectionId: string,
    subsectionId: string,
    fieldId: string,
    payload: UpdateServiceFieldInput,
  ): Promise<RenovationProject> {
    return this.mutateProject(projectId, (project) => {
      const section = project.serviceSections.find(
        (entry) => entry.id === serviceSectionId,
      );
      if (!section) {
        throw new Error(`Unknown serviceSectionId: ${serviceSectionId}`);
      }
      const subsection = section.subsections.find(
        (entry) => entry.id === subsectionId,
      );
      if (!subsection) {
        throw new Error(`Unknown subsectionId: ${subsectionId}`);
      }
      const field = subsection.fields.find((entry) => entry.id === fieldId);
      if (!field) {
        throw new Error(`Unknown fieldId: ${fieldId}`);
      }
      field.name = payload.name;
      field.notes = payload.notes;
      field.linkedSections = payload.linkedSections;
      return project;
    });
  }

  async deleteServiceField(
    projectId: string,
    serviceSectionId: string,
    subsectionId: string,
    fieldId: string,
  ): Promise<RenovationProject> {
    return this.mutateProject(projectId, (project) => {
      const section = project.serviceSections.find(
        (entry) => entry.id === serviceSectionId,
      );
      if (!section) {
        throw new Error(`Unknown serviceSectionId: ${serviceSectionId}`);
      }
      const subsection = section.subsections.find(
        (entry) => entry.id === subsectionId,
      );
      if (!subsection) {
        throw new Error(`Unknown subsectionId: ${subsectionId}`);
      }
      subsection.fields = subsection.fields.filter(
        (entry) => entry.id !== fieldId,
      );
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
      if (item.unitId) {
        const unitExists = project.units.some(
          (unit) => unit.id === item.unitId,
        );
        if (!unitExists) {
          throw new Error(`Unknown unitId: ${item.unitId}`);
        }
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

  async createInvoiceDraftFromExtraction(
    projectId: string,
    invoice: PurchaseInvoice,
  ): Promise<RenovationProject> {
    return this.mutateProject(projectId, (project) => {
      if (invoice.projectId !== projectId) {
        throw new Error("Invoice.projectId must match target project.");
      }
      const attachment = project.attachments.find(
        (entry) => entry.id === invoice.attachmentId,
      );
      if (!attachment) {
        throw new Error(`Unknown attachmentId: ${invoice.attachmentId}`);
      }
      if (attachment.category !== "invoice") {
        throw new Error("Attachment category must be invoice.");
      }
      const exists = project.purchaseInvoices.some(
        (entry) => entry.id === invoice.id,
      );
      if (exists) {
        throw new Error(`Invoice id already exists: ${invoice.id}`);
      }
      project.purchaseInvoices = [invoice, ...project.purchaseInvoices];
      return project;
    });
  }

  async updateInvoiceDraft(
    projectId: string,
    invoiceId: string,
    payload: UpdateInvoiceDraftInput,
  ): Promise<RenovationProject> {
    return this.mutateProject(projectId, (project) => {
      const invoice = project.purchaseInvoices.find(
        (entry) => entry.id === invoiceId,
      );
      if (!invoice) {
        throw new Error(`Unknown invoiceId: ${invoiceId}`);
      }
      if (invoice.status !== "draft") {
        throw new Error("Only draft invoices can be edited.");
      }
      invoice.vendorName = payload.vendorName;
      invoice.invoiceNumber = payload.invoiceNumber;
      invoice.invoiceDate = payload.invoiceDate;
      invoice.currency = payload.currency;
      invoice.totals = payload.totals;
      invoice.lines = payload.lines;
      invoice.review = payload.review;
      invoice.updatedAt = new Date().toISOString();
      return project;
    });
  }

  async confirmInvoiceDraft(
    projectId: string,
    invoiceId: string,
    payload: {
      review: PurchaseInvoiceReview;
      confirmedAt: string;
      postedAt: string;
      ledgerEntries: PurchaseLedgerEntry[];
    },
  ): Promise<RenovationProject> {
    return this.mutateProject(projectId, (project) => {
      const invoice = project.purchaseInvoices.find(
        (entry) => entry.id === invoiceId,
      );
      if (!invoice) {
        throw new Error(`Unknown invoiceId: ${invoiceId}`);
      }
      if (invoice.status !== "draft") {
        throw new Error("Only draft invoices can be confirmed.");
      }
      const lineIds = new Set(invoice.lines.map((line) => line.id));
      for (const ledgerEntry of payload.ledgerEntries) {
        if (ledgerEntry.projectId !== projectId) {
          throw new Error("Ledger entry projectId must match target project.");
        }
        if (ledgerEntry.invoiceId !== invoiceId) {
          throw new Error("Ledger entry invoiceId must match target invoice.");
        }
        if (!lineIds.has(ledgerEntry.invoiceLineId)) {
          throw new Error(
            `Ledger entry references unknown invoiceLineId: ${ledgerEntry.invoiceLineId}`,
          );
        }
      }
      invoice.review = payload.review;
      invoice.status = "confirmed";
      invoice.confirmedAt = payload.confirmedAt;
      invoice.updatedAt = payload.confirmedAt;
      project.purchaseLedger = [
        ...payload.ledgerEntries,
        ...project.purchaseLedger,
      ];
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
