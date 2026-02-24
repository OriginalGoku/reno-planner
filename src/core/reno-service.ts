import { projectRepository } from "../lib/reno-repository.ts";
import {
  buildStorageKey,
  deleteStorageFile,
  readStorageFile,
  saveBufferToStorage,
} from "../lib/local-file-store.ts";
import { buildInvoiceExtractor } from "./invoice-extractor.ts";
import type {
  AttachmentScopeType,
  ExpenseType,
  ItemStatus,
  MaterialCatalogItem,
  MaterialUnitType,
  PurchaseInvoiceLine,
  PurchaseInvoiceReview,
  PurchaseInvoiceTotals,
  ProjectOverview,
  RenovationAttachment,
  RenovationProject,
  ServiceField,
  ServiceSection,
  ServiceSubsection,
  UnitFloor,
  UnitRoomType,
  UnitStatus,
} from "../lib/reno-types.ts";

export type UpdateItemFieldsInput = {
  projectId: string;
  itemId: string;
  title: string;
  estimate: number;
  status: ItemStatus;
  unitId?: string | null;
  estimatedCompletionDate?: string;
  actualCompletionDate?: string;
  performers: string[];
  description: string;
  note: string;
  materials?: RenovationProject["items"][number]["materials"];
  expenses?: RenovationProject["items"][number]["expenses"];
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
  materialId: string;
  quantity: number;
  estimatedPrice: number;
  url: string;
  note?: string;
};

export type UpdateMaterialInput = {
  projectId: string;
  itemId: string;
  materialId: string;
  catalogMaterialId: string;
  quantity: number;
  estimatedPrice: number;
  url: string;
  note?: string;
};

export type AddMaterialCatalogItemInput = {
  projectId: string;
  categoryId: string;
  name: string;
  unitType: MaterialUnitType;
  estimatedPrice?: number;
  sampleUrl?: string;
  notes?: string;
};

export type UpdateMaterialCatalogItemInput = {
  projectId: string;
  materialId: string;
  categoryId: string;
  name: string;
  unitType: MaterialUnitType;
  estimatedPrice?: number;
  sampleUrl?: string;
  notes?: string;
};

export type AddMaterialCategoryInput = {
  projectId: string;
  name: string;
  description?: string;
};

export type UpdateMaterialCategoryInput = {
  projectId: string;
  categoryId: string;
  name: string;
  description?: string;
};

export type AddProjectNoteInput = {
  projectId: string;
  title: string;
  content: string;
  linkedSectionId?: string | null;
};

export type AddUnitInput = {
  projectId: string;
  name: string;
  floor: UnitFloor;
  bedrooms: number;
  totalAreaSqm: number;
  status: UnitStatus;
  description: string;
};

export type UpdateUnitInput = {
  projectId: string;
  unitId: string;
  name: string;
  floor: UnitFloor;
  bedrooms: number;
  totalAreaSqm: number;
  status: UnitStatus;
  description: string;
};

export type AddUnitRoomInput = {
  projectId: string;
  unitId: string;
  roomType: UnitRoomType;
  widthMm: number;
  lengthMm: number;
  heightMm: number;
  description: string;
};

export type UpdateUnitRoomInput = {
  projectId: string;
  unitId: string;
  roomId: string;
  roomType: UnitRoomType;
  widthMm: number;
  lengthMm: number;
  heightMm: number;
  description: string;
};

export type UpdateProjectMetaInput = {
  projectId: string;
  name: string;
  address: string;
  phase: string;
  targetCompletion: string;
  overview: ProjectOverview;
};

export type AddServiceSectionInput = {
  projectId: string;
  name: string;
};

export type UpdateServiceSectionInput = {
  projectId: string;
  serviceSectionId: string;
  name: string;
};

export type AddServiceSubsectionInput = {
  projectId: string;
  serviceSectionId: string;
  name: string;
};

export type UpdateServiceSubsectionInput = {
  projectId: string;
  serviceSectionId: string;
  subsectionId: string;
  name: string;
};

export type AddServiceFieldInput = {
  projectId: string;
  serviceSectionId: string;
  subsectionId: string;
  name: string;
  notes: string;
  linkedSections: string[];
};

export type UpdateServiceFieldInput = {
  projectId: string;
  serviceSectionId: string;
  subsectionId: string;
  fieldId: string;
  name: string;
  notes: string;
  linkedSections: string[];
};

export type AddAttachmentInput = {
  projectId: string;
  scopeType: AttachmentScopeType;
  scopeId?: string | null;
  category: RenovationAttachment["category"];
  fileTitle?: string;
  note?: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  fileBuffer: Buffer;
};

export type ExtractInvoiceDraftInput = {
  projectId: string;
  attachmentId: string;
  provider?: string;
  model?: string;
};

export type UpdateInvoiceDraftInput = {
  projectId: string;
  invoiceId: string;
  vendorName: string;
  invoiceNumber: string;
  invoiceDate: string;
  currency: string;
  totals: PurchaseInvoiceTotals;
  lines: PurchaseInvoiceLine[];
  review: PurchaseInvoiceReview;
};

export type ConfirmInvoiceDraftInput = {
  projectId: string;
  invoiceId: string;
  review: PurchaseInvoiceReview;
};

export type DeleteInvoiceDraftInput = {
  projectId: string;
  invoiceId: string;
};

export type ForceSecondPassInvoiceDraftInput = {
  projectId: string;
  invoiceId: string;
};

function toSectionId(title: string) {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toSlug(input: string) {
  return input
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
        unitId: payload.unitId,
        estimatedCompletionDate: payload.estimatedCompletionDate,
        actualCompletionDate: payload.actualCompletionDate,
        performers: payload.performers,
        description: payload.description,
        note: payload.note,
        materials: payload.materials,
        expenses: payload.expenses,
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

  async addAttachment(payload: AddAttachmentInput) {
    const attachmentId = crypto.randomUUID();
    const storageKey = buildStorageKey({
      projectId: payload.projectId,
      scopeType: payload.scopeType,
      scopeId: payload.scopeId,
      attachmentId,
      originalName: payload.originalName,
    });
    await saveBufferToStorage(storageKey, payload.fileBuffer);
    const uploadedAt = new Date().toISOString();
    return projectRepository.addAttachment(payload.projectId, {
      id: attachmentId,
      projectId: payload.projectId,
      scopeType: payload.scopeType,
      scopeId: payload.scopeId ?? null,
      category: payload.category,
      fileTitle: payload.fileTitle?.trim() || undefined,
      originalName: payload.originalName,
      mimeType: payload.mimeType || "application/octet-stream",
      sizeBytes: payload.sizeBytes,
      storageKey,
      uploadedAt,
      note: payload.note?.trim() || undefined,
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
    const project = await projectRepository.getProjectById(payload.projectId);
    if (!project) {
      throw new Error(`Unknown projectId: ${payload.projectId}`);
    }
    const catalogMaterial = project.materialCatalog.find(
      (entry) => entry.id === payload.materialId,
    );
    if (!catalogMaterial) {
      throw new Error(`Unknown materialId: ${payload.materialId}`);
    }

    return projectRepository.addItemMaterial(
      payload.projectId,
      payload.itemId,
      {
        id: crypto.randomUUID(),
        materialId: payload.materialId,
        quantity: payload.quantity,
        estimatedPrice: payload.estimatedPrice,
        url: payload.url,
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
        materialId: payload.catalogMaterialId,
        quantity: payload.quantity,
        estimatedPrice: payload.estimatedPrice,
        url: payload.url,
        note: payload.note,
      },
    );
  },

  async addMaterialCatalogItem(payload: AddMaterialCatalogItemInput) {
    const project = await projectRepository.getProjectById(payload.projectId);
    if (!project) {
      throw new Error(`Unknown projectId: ${payload.projectId}`);
    }
    const base = toSlug(payload.name) || "material";
    let id = base;
    let suffix = 2;
    while (project.materialCatalog.some((entry) => entry.id === id)) {
      id = `${base}-${suffix}`;
      suffix += 1;
    }
    const categoryExists = project.materialCategories.some(
      (entry) => entry.id === payload.categoryId,
    );
    if (!categoryExists) {
      throw new Error(`Unknown categoryId: ${payload.categoryId}`);
    }
    const material: MaterialCatalogItem = {
      id,
      categoryId: payload.categoryId,
      name: payload.name.trim(),
      unitType: payload.unitType,
      estimatedPrice: payload.estimatedPrice,
      sampleUrl: payload.sampleUrl?.trim() ?? "",
      notes: payload.notes?.trim() ?? "",
    };
    return projectRepository.addMaterialCatalogItem(
      payload.projectId,
      material,
    );
  },

  async updateMaterialCatalogItem(payload: UpdateMaterialCatalogItemInput) {
    return projectRepository.updateMaterialCatalogItem(
      payload.projectId,
      payload.materialId,
      {
        name: payload.name.trim(),
        unitType: payload.unitType,
        categoryId: payload.categoryId,
        estimatedPrice: payload.estimatedPrice,
        sampleUrl: payload.sampleUrl?.trim() ?? "",
        notes: payload.notes?.trim() ?? "",
      },
    );
  },

  async addMaterialCategory(payload: AddMaterialCategoryInput) {
    const project = await projectRepository.getProjectById(payload.projectId);
    if (!project) {
      throw new Error(`Unknown projectId: ${payload.projectId}`);
    }
    const base = toSlug(payload.name) || "category";
    let id = base;
    let suffix = 2;
    while (project.materialCategories.some((entry) => entry.id === id)) {
      id = `${base}-${suffix}`;
      suffix += 1;
    }
    return projectRepository.addMaterialCategory(payload.projectId, {
      id,
      name: payload.name.trim(),
      description: payload.description?.trim() ?? "",
      sortOrder: project.materialCategories.length,
    });
  },

  async updateMaterialCategory(payload: UpdateMaterialCategoryInput) {
    return projectRepository.updateMaterialCategory(
      payload.projectId,
      payload.categoryId,
      {
        name: payload.name.trim(),
        description: payload.description?.trim() ?? "",
      },
    );
  },

  async deleteMaterialCategory(payload: {
    projectId: string;
    categoryId: string;
  }) {
    return projectRepository.deleteMaterialCategory(
      payload.projectId,
      payload.categoryId,
    );
  },

  async moveMaterialCategory(payload: {
    projectId: string;
    categoryId: string;
    direction: "up" | "down";
  }) {
    return projectRepository.moveMaterialCategory(
      payload.projectId,
      payload.categoryId,
      payload.direction,
    );
  },

  async deleteMaterialCatalogItem(payload: {
    projectId: string;
    materialId: string;
  }) {
    return projectRepository.deleteMaterialCatalogItem(
      payload.projectId,
      payload.materialId,
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

  async addUnit(payload: AddUnitInput) {
    return projectRepository.addUnit(payload.projectId, {
      id: crypto.randomUUID(),
      name: payload.name.trim(),
      floor: payload.floor,
      bedrooms: payload.bedrooms,
      totalAreaSqm: payload.totalAreaSqm,
      status: payload.status,
      description: payload.description.trim(),
      rooms: [
        {
          id: crypto.randomUUID(),
          roomType: "kitchen",
          widthMm: 0,
          lengthMm: 0,
          heightMm: 0,
          description: "",
        },
        {
          id: crypto.randomUUID(),
          roomType: "living_area",
          widthMm: 0,
          lengthMm: 0,
          heightMm: 0,
          description: "",
        },
        {
          id: crypto.randomUUID(),
          roomType: "bathroom",
          widthMm: 0,
          lengthMm: 0,
          heightMm: 0,
          description: "",
        },
      ],
    });
  },

  async updateUnit(payload: UpdateUnitInput) {
    return projectRepository.updateUnit(payload.projectId, payload.unitId, {
      name: payload.name.trim(),
      floor: payload.floor,
      bedrooms: payload.bedrooms,
      totalAreaSqm: payload.totalAreaSqm,
      status: payload.status,
      description: payload.description.trim(),
    });
  },

  async deleteUnit(payload: { projectId: string; unitId: string }) {
    return projectRepository.deleteUnit(payload.projectId, payload.unitId);
  },

  async addUnitRoom(payload: AddUnitRoomInput) {
    return projectRepository.addUnitRoom(payload.projectId, payload.unitId, {
      id: crypto.randomUUID(),
      roomType: payload.roomType,
      widthMm: payload.widthMm,
      lengthMm: payload.lengthMm,
      heightMm: payload.heightMm,
      description: payload.description.trim(),
    });
  },

  async updateUnitRoom(payload: UpdateUnitRoomInput) {
    return projectRepository.updateUnitRoom(
      payload.projectId,
      payload.unitId,
      payload.roomId,
      {
        roomType: payload.roomType,
        widthMm: payload.widthMm,
        lengthMm: payload.lengthMm,
        heightMm: payload.heightMm,
        description: payload.description.trim(),
      },
    );
  },

  async deleteUnitRoom(payload: {
    projectId: string;
    unitId: string;
    roomId: string;
  }) {
    return projectRepository.deleteUnitRoom(
      payload.projectId,
      payload.unitId,
      payload.roomId,
    );
  },

  async addServiceSection(payload: AddServiceSectionInput) {
    const project = await projectRepository.getProjectById(payload.projectId);
    if (!project) {
      throw new Error(`Unknown projectId: ${payload.projectId}`);
    }
    const base = toSlug(payload.name) || "service-section";
    let id = base;
    let suffix = 2;
    while (project.serviceSections.some((entry) => entry.id === id)) {
      id = `${base}-${suffix}`;
      suffix += 1;
    }
    const section: ServiceSection = {
      id,
      name: payload.name.trim(),
      subsections: [],
    };
    return projectRepository.addServiceSection(payload.projectId, section);
  },

  async updateServiceSection(payload: UpdateServiceSectionInput) {
    return projectRepository.updateServiceSection(
      payload.projectId,
      payload.serviceSectionId,
      { name: payload.name.trim() },
    );
  },

  async deleteServiceSection(payload: {
    projectId: string;
    serviceSectionId: string;
  }) {
    return projectRepository.deleteServiceSection(
      payload.projectId,
      payload.serviceSectionId,
    );
  },

  async addServiceSubsection(payload: AddServiceSubsectionInput) {
    const project = await projectRepository.getProjectById(payload.projectId);
    if (!project) {
      throw new Error(`Unknown projectId: ${payload.projectId}`);
    }
    const section = project.serviceSections.find(
      (entry) => entry.id === payload.serviceSectionId,
    );
    if (!section) {
      throw new Error(`Unknown serviceSectionId: ${payload.serviceSectionId}`);
    }
    const base = toSlug(payload.name) || "subsection";
    let id = base;
    let suffix = 2;
    while (section.subsections.some((entry) => entry.id === id)) {
      id = `${base}-${suffix}`;
      suffix += 1;
    }
    const subsection: ServiceSubsection = {
      id,
      name: payload.name.trim(),
      fields: [],
    };
    return projectRepository.addServiceSubsection(
      payload.projectId,
      payload.serviceSectionId,
      subsection,
    );
  },

  async updateServiceSubsection(payload: UpdateServiceSubsectionInput) {
    return projectRepository.updateServiceSubsection(
      payload.projectId,
      payload.serviceSectionId,
      payload.subsectionId,
      { name: payload.name.trim() },
    );
  },

  async deleteServiceSubsection(payload: {
    projectId: string;
    serviceSectionId: string;
    subsectionId: string;
  }) {
    return projectRepository.deleteServiceSubsection(
      payload.projectId,
      payload.serviceSectionId,
      payload.subsectionId,
    );
  },

  async addServiceField(payload: AddServiceFieldInput) {
    const field: ServiceField = {
      id: crypto.randomUUID(),
      name: payload.name.trim(),
      notes: payload.notes.trim(),
      linkedSections: payload.linkedSections,
    };
    return projectRepository.addServiceField(
      payload.projectId,
      payload.serviceSectionId,
      payload.subsectionId,
      field,
    );
  },

  async updateServiceField(payload: UpdateServiceFieldInput) {
    return projectRepository.updateServiceField(
      payload.projectId,
      payload.serviceSectionId,
      payload.subsectionId,
      payload.fieldId,
      {
        name: payload.name.trim(),
        notes: payload.notes.trim(),
        linkedSections: payload.linkedSections,
      },
    );
  },

  async deleteServiceField(payload: {
    projectId: string;
    serviceSectionId: string;
    subsectionId: string;
    fieldId: string;
  }) {
    return projectRepository.deleteServiceField(
      payload.projectId,
      payload.serviceSectionId,
      payload.subsectionId,
      payload.fieldId,
    );
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

  async deleteAttachment(payload: { projectId: string; attachmentId: string }) {
    const project = await projectRepository.getProjectById(payload.projectId);
    if (!project) {
      throw new Error(`Unknown projectId: ${payload.projectId}`);
    }
    const attachment = project.attachments.find(
      (entry) => entry.id === payload.attachmentId,
    );
    if (!attachment) {
      throw new Error(`Unknown attachmentId: ${payload.attachmentId}`);
    }

    await deleteStorageFile(attachment.storageKey);
    return projectRepository.deleteAttachment(
      payload.projectId,
      payload.attachmentId,
    );
  },

  async addSectionItem(payload: {
    projectId: string;
    sectionId: string;
    title: string;
    estimate?: number;
    unitId?: string | null;
    status?: ItemStatus;
    estimatedCompletionDate?: string;
    actualCompletionDate?: string;
    performers?: string[];
    description?: string;
    note?: string;
    materials?: RenovationProject["items"][number]["materials"];
    expenses?: RenovationProject["items"][number]["expenses"];
  }) {
    return projectRepository.addSectionItem(
      payload.projectId,
      payload.sectionId,
      {
        id: crypto.randomUUID(),
        sectionId: payload.sectionId,
        unitId: payload.unitId ?? null,
        title: payload.title,
        status: payload.status ?? "todo",
        estimate: payload.estimate ?? 0,
        estimatedCompletionDate: payload.estimatedCompletionDate,
        actualCompletionDate: payload.actualCompletionDate,
        description: payload.description ?? "",
        note: payload.note ?? "",
        materials: payload.materials ?? [],
        expenses: payload.expenses ?? [],
        performers: payload.performers ?? [],
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

  async setSectionPosition(payload: {
    projectId: string;
    sectionId: string;
    position: number;
  }) {
    return projectRepository.setSectionPosition(
      payload.projectId,
      payload.sectionId,
      payload.position,
    );
  },

  async createInvoiceDraftFromExtraction(payload: ExtractInvoiceDraftInput) {
    const project = await projectRepository.getProjectById(payload.projectId);
    if (!project) {
      throw new Error(`Unknown projectId: ${payload.projectId}`);
    }
    const attachment = project.attachments.find(
      (entry) => entry.id === payload.attachmentId,
    );
    if (!attachment) {
      throw new Error(`Unknown attachmentId: ${payload.attachmentId}`);
    }
    if (attachment.category !== "invoice") {
      throw new Error("Attachment category must be invoice.");
    }

    const extractor = buildInvoiceExtractor();
    const fileBuffer = await readStorageFile(attachment.storageKey);
    const extracted = await extractor.extract({
      fileBuffer,
      mimeType: attachment.mimeType || "application/octet-stream",
      fileName: attachment.fileTitle || attachment.originalName,
      provider: payload.provider,
      model: payload.model,
    });
    if (process.env.RENO_INVOICE_DEBUG === "1") {
      console.log(
        `[invoice-service] extracted invoice lines=${extracted.lines.length} vendor="${extracted.vendorName}" invoice="${extracted.invoiceNumber}" date="${extracted.invoiceDate}"`,
      );
    }

    const now = new Date().toISOString();
    const invoiceId = `inv-${crypto.randomUUID()}`;
    const invoiceNumber =
      extracted.invoiceNumber ||
      attachment.fileTitle?.trim() ||
      attachment.originalName;

    return projectRepository.createInvoiceDraftFromExtraction(
      payload.projectId,
      {
        id: invoiceId,
        status: "draft",
        projectId: payload.projectId,
        attachmentId: payload.attachmentId,
        vendorName: extracted.vendorName,
        invoiceNumber,
        invoiceDate: extracted.invoiceDate || now.slice(0, 10),
        currency: extracted.currency || "CAD",
        totals: extracted.totals,
        lines: extracted.lines.map((line) => ({
          id: `line-${crypto.randomUUID()}`,
          sourceText: line.sourceText,
          description: line.description,
          quantity: line.quantity,
          unitType: line.unitType,
          unitPrice: line.unitPrice,
          lineTotal: line.lineTotal,
          materialId: undefined,
          confidence: line.confidence,
          needsReview: line.needsReview,
          notes: line.notes,
        })),
        extraction: {
          provider:
            payload.provider?.trim() ||
            process.env.RENO_INVOICE_LLM_PROVIDER?.trim() ||
            "openai",
          model:
            extracted.modelUsed ||
            payload.model?.trim() ||
            process.env.RENO_INVOICE_LLM_MODEL?.trim() ||
            "gpt-5-nano",
          extractedAt: now,
          passUsed: extracted.passUsed,
          rawOutput: extracted.rawOutput,
        },
        review: {
          totalsMismatchOverride: false,
          overrideReason: "",
        },
        createdAt: now,
        updatedAt: now,
        confirmedAt: null,
      },
    );
  },

  async updateInvoiceDraft(payload: UpdateInvoiceDraftInput) {
    const project = await projectRepository.getProjectById(payload.projectId);
    if (!project) {
      throw new Error(`Unknown projectId: ${payload.projectId}`);
    }
    const materialIds = new Set(
      project.materialCatalog.map((entry) => entry.id),
    );
    for (const line of payload.lines) {
      if (line.materialId && !materialIds.has(line.materialId)) {
        throw new Error(
          `Unknown materialId in line ${line.id}: ${line.materialId}`,
        );
      }
    }
    return projectRepository.updateInvoiceDraft(
      payload.projectId,
      payload.invoiceId,
      {
        vendorName: payload.vendorName.trim(),
        invoiceNumber: payload.invoiceNumber.trim(),
        invoiceDate: payload.invoiceDate.trim(),
        currency: payload.currency.trim() || "CAD",
        totals: payload.totals,
        lines: payload.lines,
        review: payload.review,
      },
    );
  },

  async confirmInvoiceDraft(payload: ConfirmInvoiceDraftInput) {
    const project = await projectRepository.getProjectById(payload.projectId);
    if (!project) {
      throw new Error(`Unknown projectId: ${payload.projectId}`);
    }
    const invoice = project.purchaseInvoices.find(
      (entry) => entry.id === payload.invoiceId,
    );
    if (!invoice) {
      throw new Error(`Unknown invoiceId: ${payload.invoiceId}`);
    }
    if (invoice.status !== "draft") {
      throw new Error("Only draft invoices can be confirmed.");
    }

    const materialIds = new Set(
      project.materialCatalog.map((entry) => entry.id),
    );
    const lineSubTotal = invoice.lines.reduce(
      (sum, line) => sum + line.quantity * line.unitPrice,
      0,
    );
    const hasMismatch = Math.abs(lineSubTotal - invoice.totals.subTotal) > 0.01;
    if (hasMismatch && !payload.review.totalsMismatchOverride) {
      throw new Error(
        "Invoice subtotal does not match sum of line totals. Set totalsMismatchOverride to confirm.",
      );
    }
    if (
      payload.review.totalsMismatchOverride &&
      !payload.review.overrideReason.trim()
    ) {
      throw new Error(
        "overrideReason is required when totalsMismatchOverride is true.",
      );
    }

    const postedAt = new Date().toISOString();
    const ledgerEntries = invoice.lines.map((line) => {
      if (!line.materialId) {
        throw new Error(
          `Invoice line ${line.id} is missing materialId and cannot be posted.`,
        );
      }
      if (!materialIds.has(line.materialId)) {
        throw new Error(
          `Unknown materialId in line ${line.id}: ${line.materialId}`,
        );
      }
      return {
        id: `led-${crypto.randomUUID()}`,
        projectId: payload.projectId,
        invoiceId: invoice.id,
        invoiceLineId: line.id,
        postedAt,
        materialId: line.materialId,
        quantity: line.quantity,
        unitType: line.unitType,
        unitPrice: line.unitPrice,
        lineTotal: line.lineTotal,
        vendorName: invoice.vendorName,
        invoiceDate: invoice.invoiceDate,
        currency: invoice.currency,
        entryType: "purchase" as const,
        note: line.notes ?? "",
      };
    });

    return projectRepository.confirmInvoiceDraft(
      payload.projectId,
      payload.invoiceId,
      {
        review: payload.review,
        confirmedAt: postedAt,
        postedAt,
        ledgerEntries,
      },
    );
  },

  async listInvoices(payload: { projectId: string }) {
    const project = await projectRepository.getProjectById(payload.projectId);
    if (!project) {
      throw new Error(`Unknown projectId: ${payload.projectId}`);
    }
    return [...project.purchaseInvoices].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  },

  async getInvoice(payload: { projectId: string; invoiceId: string }) {
    const project = await projectRepository.getProjectById(payload.projectId);
    if (!project) {
      throw new Error(`Unknown projectId: ${payload.projectId}`);
    }
    const invoice = project.purchaseInvoices.find(
      (entry) => entry.id === payload.invoiceId,
    );
    if (!invoice) {
      throw new Error(`Unknown invoiceId: ${payload.invoiceId}`);
    }
    return invoice;
  },

  async listPurchaseLedger(payload: { projectId: string; invoiceId?: string }) {
    const project = await projectRepository.getProjectById(payload.projectId);
    if (!project) {
      throw new Error(`Unknown projectId: ${payload.projectId}`);
    }
    const rows = project.purchaseLedger.filter(
      (entry) => !payload.invoiceId || entry.invoiceId === payload.invoiceId,
    );
    return rows.sort((a, b) => b.postedAt.localeCompare(a.postedAt));
  },

  async deleteInvoiceDraft(payload: DeleteInvoiceDraftInput) {
    return projectRepository.deleteInvoiceDraft(
      payload.projectId,
      payload.invoiceId,
    );
  },

  async forceSecondPassInvoiceDraft(payload: ForceSecondPassInvoiceDraftInput) {
    const project = await projectRepository.getProjectById(payload.projectId);
    if (!project) {
      throw new Error(`Unknown projectId: ${payload.projectId}`);
    }
    const invoice = project.purchaseInvoices.find(
      (entry) => entry.id === payload.invoiceId,
    );
    if (!invoice) {
      throw new Error(`Unknown invoiceId: ${payload.invoiceId}`);
    }
    if (invoice.status !== "draft") {
      throw new Error("Only draft invoices can be re-extracted.");
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

    const extractor = buildInvoiceExtractor();
    const fileBuffer = await readStorageFile(attachment.storageKey);
    const extracted = await extractor.extract({
      fileBuffer,
      mimeType: attachment.mimeType || "application/octet-stream",
      fileName: attachment.fileTitle || attachment.originalName,
      provider: invoice.extraction.provider,
      model: invoice.extraction.model,
      forceSecondPass: true,
    });
    const now = new Date().toISOString();

    return projectRepository.updateInvoiceDraft(
      payload.projectId,
      payload.invoiceId,
      {
        vendorName: extracted.vendorName,
        invoiceNumber:
          extracted.invoiceNumber || invoice.invoiceNumber || invoice.id,
        invoiceDate: extracted.invoiceDate || invoice.invoiceDate,
        currency: extracted.currency || invoice.currency || "CAD",
        totals: extracted.totals,
        lines: extracted.lines.map((line) => ({
          id: `line-${crypto.randomUUID()}`,
          sourceText: line.sourceText,
          description: line.description,
          quantity: line.quantity,
          unitType: line.unitType,
          unitPrice: line.unitPrice,
          lineTotal: line.lineTotal,
          materialId: undefined,
          confidence: line.confidence,
          needsReview: line.needsReview,
          notes: line.notes,
        })),
        review: {
          totalsMismatchOverride: false,
          overrideReason: "",
        },
        extraction: {
          provider: invoice.extraction.provider || "openai",
          model: extracted.modelUsed || invoice.extraction.model,
          extractedAt: now,
          passUsed: extracted.passUsed,
          rawOutput: extracted.rawOutput,
        },
      },
    );
  },

  async getProjectById(projectId: string): Promise<RenovationProject | null> {
    return projectRepository.getProjectById(projectId);
  },
};
