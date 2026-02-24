import type {
  AttachmentScopeType,
  ExpenseType,
  ItemStatus,
  MaterialUnitType,
  RenovationProject,
  UnitFloor,
  UnitRoomType,
  UnitStatus,
} from "./reno-types.ts";

const VALID_STATUS: ItemStatus[] = ["todo", "in_progress", "blocked", "done"];
const VALID_EXPENSE_TYPES: ExpenseType[] = [
  "material",
  "labor",
  "permit",
  "tool",
  "other",
];
const VALID_MATERIAL_UNITS: MaterialUnitType[] = [
  "linear_ft",
  "sqft",
  "sqm",
  "piece",
  "bundle",
  "box",
  "roll",
  "sheet",
  "bag",
  "gallon",
  "liter",
  "kg",
  "lb",
  "meter",
  "other",
];
const VALID_ATTACHMENT_SCOPES: AttachmentScopeType[] = [
  "project",
  "section",
  "item",
  "expense",
];
const VALID_UNIT_FLOORS: UnitFloor[] = ["main", "basement"];
const VALID_UNIT_STATUS: UnitStatus[] = ["planned", "in_progress", "done"];
const VALID_UNIT_ROOM_TYPES: UnitRoomType[] = [
  "kitchen",
  "living_area",
  "bedroom",
  "bathroom",
  "storage",
  "other",
];
const VALID_ATTACHMENT_CATEGORIES = [
  "drawing",
  "invoice",
  "permit",
  "photo",
  "other",
] as const;

function ensure(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Invalid project data: ${message}`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((entry) => typeof entry === "string")
  );
}

export function validateProjectData(value: unknown): RenovationProject {
  ensure(isRecord(value), "Project root must be an object.");

  const project = value;
  ensure(typeof project.id === "string", "Project.id must be a string.");
  ensure(typeof project.name === "string", "Project.name must be a string.");
  ensure(
    typeof project.address === "string",
    "Project.address must be a string.",
  );
  ensure(typeof project.phase === "string", "Project.phase must be a string.");
  ensure(
    typeof project.targetCompletion === "string",
    "Project.targetCompletion must be a string.",
  );
  ensure(isRecord(project.overview), "Project.overview must be an object.");

  const overview = project.overview;
  ensure(
    typeof overview.projectDescription === "string",
    "Overview.projectDescription must be a string.",
  );
  ensure(isRecord(overview.area), "Overview.area must be an object.");
  ensure(
    typeof overview.area.groundFloorSqFtApprox === "number",
    "Overview.area.groundFloorSqFtApprox must be a number.",
  );
  ensure(
    typeof overview.area.basementSqFtApprox === "number",
    "Overview.area.basementSqFtApprox must be a number.",
  );

  ensure(
    isRecord(overview.occupancyPlan),
    "Overview.occupancyPlan must be an object.",
  );
  ensure(
    typeof overview.occupancyPlan.groundFloorUnits === "number",
    "Overview.occupancyPlan.groundFloorUnits must be a number.",
  );
  ensure(
    typeof overview.occupancyPlan.basementUnits === "number",
    "Overview.occupancyPlan.basementUnits must be a number.",
  );
  ensure(
    typeof overview.occupancyPlan.totalUnits === "number",
    "Overview.occupancyPlan.totalUnits must be a number.",
  );

  ensure(
    isRecord(overview.currentState),
    "Overview.currentState must be an object.",
  );
  ensure(
    typeof overview.currentState.permitObtained === "boolean",
    "Overview.currentState.permitObtained must be a boolean.",
  );
  ensure(
    typeof overview.currentState.occupancy === "string",
    "Overview.currentState.occupancy must be a string.",
  );
  ensure(
    typeof overview.currentState.framing === "string",
    "Overview.currentState.framing must be a string.",
  );
  ensure(
    typeof overview.currentState.groundFloorExteriorWalls === "string",
    "Overview.currentState.groundFloorExteriorWalls must be a string.",
  );
  ensure(
    typeof overview.currentState.basementExteriorWalls === "string",
    "Overview.currentState.basementExteriorWalls must be a string.",
  );
  ensure(
    typeof overview.currentState.hazmat === "string",
    "Overview.currentState.hazmat must be a string.",
  );

  ensure(
    isRecord(overview.unitMixAndSystems),
    "Overview.unitMixAndSystems must be an object.",
  );
  ensure(
    typeof overview.unitMixAndSystems.totalUnits === "number",
    "Overview.unitMixAndSystems.totalUnits must be a number.",
  );
  ensure(
    typeof overview.unitMixAndSystems.bathrooms === "number",
    "Overview.unitMixAndSystems.bathrooms must be a number.",
  );
  ensure(
    typeof overview.unitMixAndSystems.kitchens === "number",
    "Overview.unitMixAndSystems.kitchens must be a number.",
  );
  ensure(
    typeof overview.unitMixAndSystems.laundry === "string",
    "Overview.unitMixAndSystems.laundry must be a string.",
  );
  ensure(
    typeof overview.unitMixAndSystems.hotWater === "string",
    "Overview.unitMixAndSystems.hotWater must be a string.",
  );
  ensure(
    typeof overview.unitMixAndSystems.basementCeilingHeight === "string",
    "Overview.unitMixAndSystems.basementCeilingHeight must be a string.",
  );

  ensure(
    isRecord(overview.tradesAndFinancing),
    "Overview.tradesAndFinancing must be an object.",
  );
  ensure(
    typeof overview.tradesAndFinancing.generalContractor === "string",
    "Overview.tradesAndFinancing.generalContractor must be a string.",
  );
  ensure(
    isStringArray(overview.tradesAndFinancing.confirmedTrades),
    "Overview.tradesAndFinancing.confirmedTrades must be an array of strings.",
  );
  ensure(
    isStringArray(overview.tradesAndFinancing.pendingBeforeStart),
    "Overview.tradesAndFinancing.pendingBeforeStart must be an array of strings.",
  );
  ensure(
    typeof overview.tradesAndFinancing.financing === "string",
    "Overview.tradesAndFinancing.financing must be a string.",
  );

  ensure(
    isStringArray(overview.scopeExclusions),
    "Overview.scopeExclusions must be an array of strings.",
  );

  ensure(Array.isArray(project.sections), "Project.sections must be an array.");
  ensure(Array.isArray(project.items), "Project.items must be an array.");
  ensure(Array.isArray(project.units), "Project.units must be an array.");
  ensure(
    Array.isArray(project.serviceSections),
    "Project.serviceSections must be an array.",
  );
  ensure(
    Array.isArray(project.materialCategories),
    "Project.materialCategories must be an array.",
  );
  ensure(
    Array.isArray(project.materialCatalog),
    "Project.materialCatalog must be an array.",
  );
  ensure(
    Array.isArray(project.purchaseInvoices),
    "Project.purchaseInvoices must be an array.",
  );
  ensure(
    Array.isArray(project.purchaseLedger),
    "Project.purchaseLedger must be an array.",
  );
  ensure(Array.isArray(project.notes), "Project.notes must be an array.");
  ensure(
    Array.isArray(project.attachments),
    "Project.attachments must be an array.",
  );

  for (const section of project.sections) {
    ensure(isRecord(section), "Each section must be an object.");
    ensure(typeof section.id === "string", "Section.id must be a string.");
    ensure(
      typeof section.title === "string",
      "Section.title must be a string.",
    );
    ensure(
      typeof section.description === "string",
      "Section.description must be a string.",
    );
    ensure(
      typeof section.position === "number" &&
        Number.isInteger(section.position) &&
        section.position >= 0,
      "Section.position must be a non-negative integer.",
    );
  }

  const uniqueSectionPositions = new Set(
    project.sections.map((section) => section.position as number),
  );
  ensure(
    uniqueSectionPositions.size === project.sections.length,
    "Section.position values must be unique.",
  );

  const materialCategoryIds = new Set<string>();
  for (const category of project.materialCategories) {
    ensure(
      isRecord(category),
      "Each materialCategory entry must be an object.",
    );
    ensure(
      typeof category.id === "string" && category.id.length > 0,
      "MaterialCategory.id must be a non-empty string.",
    );
    ensure(
      !materialCategoryIds.has(category.id),
      `MaterialCategory.id must be unique: ${category.id}.`,
    );
    materialCategoryIds.add(category.id);
    ensure(
      typeof category.name === "string" && category.name.length > 0,
      "MaterialCategory.name must be a non-empty string.",
    );
    ensure(
      typeof category.sortOrder === "number" &&
        Number.isInteger(category.sortOrder) &&
        category.sortOrder >= 0,
      "MaterialCategory.sortOrder must be a non-negative integer.",
    );
    ensure(
      isOptionalString(category.description),
      "MaterialCategory.description must be a string when provided.",
    );
  }

  const materialCatalogIds = new Set<string>();
  for (const catalogItem of project.materialCatalog) {
    ensure(
      isRecord(catalogItem),
      "Each materialCatalog entry must be an object.",
    );
    ensure(
      typeof catalogItem.id === "string" && catalogItem.id.length > 0,
      "MaterialCatalog.id must be a non-empty string.",
    );
    ensure(
      !materialCatalogIds.has(catalogItem.id),
      `MaterialCatalog.id must be unique: ${catalogItem.id}.`,
    );
    materialCatalogIds.add(catalogItem.id);
    ensure(
      typeof catalogItem.categoryId === "string" &&
        materialCategoryIds.has(catalogItem.categoryId),
      "MaterialCatalog.categoryId must reference a valid project materialCategories entry.",
    );
    ensure(
      typeof catalogItem.name === "string",
      "MaterialCatalog.name must be a string.",
    );
    ensure(
      typeof catalogItem.unitType === "string" &&
        VALID_MATERIAL_UNITS.includes(catalogItem.unitType as MaterialUnitType),
      `MaterialCatalog.unitType must be one of: ${VALID_MATERIAL_UNITS.join(", ")}.`,
    );
    ensure(
      catalogItem.estimatedPrice === undefined ||
        typeof catalogItem.estimatedPrice === "number",
      "MaterialCatalog.estimatedPrice must be a number when provided.",
    );
    ensure(
      isOptionalString(catalogItem.sampleUrl),
      "MaterialCatalog.sampleUrl must be a string when provided.",
    );
    ensure(
      isOptionalString(catalogItem.notes),
      "MaterialCatalog.notes must be a string when provided.",
    );
  }

  for (const item of project.items) {
    ensure(isRecord(item), "Each item must be an object.");
    ensure(typeof item.id === "string", "Item.id must be a string.");
    ensure(
      typeof item.sectionId === "string",
      "Item.sectionId must be a string.",
    );
    ensure(
      item.unitId === undefined ||
        item.unitId === null ||
        typeof item.unitId === "string",
      "Item.unitId must be a string or null when provided.",
    );
    ensure(typeof item.title === "string", "Item.title must be a string.");
    ensure(
      typeof item.status === "string" &&
        VALID_STATUS.includes(item.status as ItemStatus),
      `Item.status must be one of: ${VALID_STATUS.join(", ")}.`,
    );
    ensure(
      typeof item.estimate === "number",
      "Item.estimate must be a number.",
    );
    ensure(
      isOptionalString(item.estimatedCompletionDate),
      "Item.estimatedCompletionDate must be a string when provided.",
    );
    ensure(
      isOptionalString(item.actualCompletionDate),
      "Item.actualCompletionDate must be a string when provided.",
    );
    ensure(
      item.performers === undefined || isStringArray(item.performers),
      "Item.performers must be an array of strings when provided.",
    );
    ensure(
      item.materials === undefined || Array.isArray(item.materials),
      "Item.materials must be an array when provided.",
    );
    ensure(
      typeof item.description === "string",
      "Item.description must be a string.",
    );
    ensure(typeof item.note === "string", "Item.note must be a string.");
    ensure(Array.isArray(item.expenses), "Item.expenses must be an array.");
    if (Array.isArray(item.materials)) {
      for (const material of item.materials) {
        ensure(isRecord(material), "Each material must be an object.");
        ensure(
          typeof material.id === "string",
          "Material.id must be a string.",
        );
        ensure(
          typeof material.quantity === "number",
          "Material.quantity must be a number.",
        );
        ensure(
          typeof material.materialId === "string" &&
            materialCatalogIds.has(material.materialId),
          "Material.materialId must reference a valid project materialCatalog entry.",
        );
        ensure(
          typeof material.estimatedPrice === "number",
          "Material.estimatedPrice must be a number.",
        );
        ensure(
          typeof material.url === "string",
          "Material.url must be a string.",
        );
        ensure(
          isOptionalString(material.note),
          "Material.note must be a string when provided.",
        );
      }
    }

    for (const expense of item.expenses) {
      ensure(isRecord(expense), "Each expense must be an object.");
      ensure(typeof expense.id === "string", "Expense.id must be a string.");
      ensure(
        typeof expense.date === "string",
        "Expense.date must be a string.",
      );
      ensure(
        typeof expense.amount === "number",
        "Expense.amount must be a number.",
      );
      ensure(
        typeof expense.type === "string" &&
          VALID_EXPENSE_TYPES.includes(expense.type as ExpenseType),
        `Expense.type must be one of: ${VALID_EXPENSE_TYPES.join(", ")}.`,
      );
      ensure(
        isOptionalString(expense.vendor),
        "Expense.vendor must be a string when provided.",
      );
      ensure(
        isOptionalString(expense.note),
        "Expense.note must be a string when provided.",
      );
    }
  }

  const unitIds = new Set(project.units.map((unit) => unit.id));
  for (const item of project.items) {
    if (typeof item.unitId === "string") {
      ensure(
        unitIds.has(item.unitId),
        `Item.unitId "${item.unitId}" must reference an existing unit.`,
      );
    }
  }

  const attachmentIds = new Set<string>();
  for (const attachment of project.attachments) {
    attachmentIds.add(attachment.id);
  }

  const invoiceIds = new Set<string>();
  const invoiceLineIdsByInvoice = new Map<string, Set<string>>();
  for (const invoice of project.purchaseInvoices) {
    ensure(isRecord(invoice), "Each purchase invoice must be an object.");
    ensure(
      typeof invoice.id === "string",
      "PurchaseInvoice.id must be a string.",
    );
    ensure(
      !invoiceIds.has(invoice.id),
      `PurchaseInvoice.id must be unique: ${invoice.id}.`,
    );
    invoiceIds.add(invoice.id);
    ensure(
      invoice.projectId === project.id,
      "PurchaseInvoice.projectId must match project.id.",
    );
    ensure(
      typeof invoice.status === "string" &&
        ["draft", "confirmed", "voided"].includes(invoice.status),
      "PurchaseInvoice.status must be draft, confirmed, or voided.",
    );
    ensure(
      typeof invoice.attachmentId === "string" &&
        attachmentIds.has(invoice.attachmentId),
      "PurchaseInvoice.attachmentId must reference an existing attachment.",
    );
    ensure(
      typeof invoice.vendorName === "string",
      "PurchaseInvoice.vendorName must be a string.",
    );
    ensure(
      typeof invoice.invoiceNumber === "string",
      "PurchaseInvoice.invoiceNumber must be a string.",
    );
    ensure(
      typeof invoice.invoiceDate === "string",
      "PurchaseInvoice.invoiceDate must be a string.",
    );
    ensure(
      typeof invoice.currency === "string",
      "PurchaseInvoice.currency must be a string.",
    );
    ensure(
      isRecord(invoice.totals),
      "PurchaseInvoice.totals must be an object.",
    );
    ensure(
      typeof invoice.totals.subTotal === "number",
      "PurchaseInvoice.totals.subTotal must be a number.",
    );
    ensure(
      typeof invoice.totals.tax === "number",
      "PurchaseInvoice.totals.tax must be a number.",
    );
    ensure(
      typeof invoice.totals.shipping === "number",
      "PurchaseInvoice.totals.shipping must be a number.",
    );
    ensure(
      typeof invoice.totals.otherFees === "number",
      "PurchaseInvoice.totals.otherFees must be a number.",
    );
    ensure(
      typeof invoice.totals.grandTotal === "number",
      "PurchaseInvoice.totals.grandTotal must be a number.",
    );
    ensure(
      Array.isArray(invoice.lines),
      "PurchaseInvoice.lines must be an array.",
    );
    ensure(
      isRecord(invoice.extraction),
      "PurchaseInvoice.extraction must be an object.",
    );
    ensure(
      typeof invoice.extraction.provider === "string",
      "PurchaseInvoice.extraction.provider must be a string.",
    );
    ensure(
      typeof invoice.extraction.model === "string",
      "PurchaseInvoice.extraction.model must be a string.",
    );
    ensure(
      typeof invoice.extraction.extractedAt === "string",
      "PurchaseInvoice.extraction.extractedAt must be a string.",
    );
    ensure(
      isRecord(invoice.review),
      "PurchaseInvoice.review must be an object.",
    );
    ensure(
      typeof invoice.review.totalsMismatchOverride === "boolean",
      "PurchaseInvoice.review.totalsMismatchOverride must be a boolean.",
    );
    ensure(
      typeof invoice.review.overrideReason === "string",
      "PurchaseInvoice.review.overrideReason must be a string.",
    );
    ensure(
      typeof invoice.createdAt === "string",
      "PurchaseInvoice.createdAt must be a string.",
    );
    ensure(
      typeof invoice.updatedAt === "string",
      "PurchaseInvoice.updatedAt must be a string.",
    );
    ensure(
      invoice.confirmedAt === null ||
        invoice.confirmedAt === undefined ||
        typeof invoice.confirmedAt === "string",
      "PurchaseInvoice.confirmedAt must be string/null/undefined.",
    );

    const lineIds = new Set<string>();
    for (const line of invoice.lines) {
      ensure(isRecord(line), "Each purchase invoice line must be an object.");
      ensure(
        typeof line.id === "string",
        "PurchaseInvoiceLine.id must be a string.",
      );
      ensure(
        !lineIds.has(line.id),
        `PurchaseInvoiceLine.id must be unique per invoice: ${line.id}.`,
      );
      lineIds.add(line.id);
      ensure(
        typeof line.sourceText === "string",
        "PurchaseInvoiceLine.sourceText must be a string.",
      );
      ensure(
        typeof line.description === "string",
        "PurchaseInvoiceLine.description must be a string.",
      );
      ensure(
        typeof line.quantity === "number",
        "PurchaseInvoiceLine.quantity must be a number.",
      );
      ensure(
        typeof line.unitType === "string" &&
          VALID_MATERIAL_UNITS.includes(line.unitType as MaterialUnitType),
        `PurchaseInvoiceLine.unitType must be one of: ${VALID_MATERIAL_UNITS.join(", ")}.`,
      );
      ensure(
        typeof line.unitPrice === "number",
        "PurchaseInvoiceLine.unitPrice must be a number.",
      );
      ensure(
        typeof line.lineTotal === "number",
        "PurchaseInvoiceLine.lineTotal must be a number.",
      );
      ensure(
        line.materialId === undefined ||
          (typeof line.materialId === "string" &&
            materialCatalogIds.has(line.materialId)),
        "PurchaseInvoiceLine.materialId must reference a valid materialCatalog entry when provided.",
      );
      ensure(
        typeof line.confidence === "number",
        "PurchaseInvoiceLine.confidence must be a number.",
      );
      ensure(
        typeof line.needsReview === "boolean",
        "PurchaseInvoiceLine.needsReview must be a boolean.",
      );
      ensure(
        typeof line.notes === "string",
        "PurchaseInvoiceLine.notes must be a string.",
      );
    }
    invoiceLineIdsByInvoice.set(invoice.id, lineIds);
  }

  const ledgerIds = new Set<string>();
  for (const entry of project.purchaseLedger) {
    ensure(isRecord(entry), "Each purchase ledger entry must be an object.");
    ensure(
      typeof entry.id === "string",
      "PurchaseLedgerEntry.id must be a string.",
    );
    ensure(
      !ledgerIds.has(entry.id),
      `PurchaseLedgerEntry.id must be unique: ${entry.id}.`,
    );
    ledgerIds.add(entry.id);
    ensure(
      entry.projectId === project.id,
      "PurchaseLedgerEntry.projectId must match project.id.",
    );
    ensure(
      typeof entry.invoiceId === "string" && invoiceIds.has(entry.invoiceId),
      "PurchaseLedgerEntry.invoiceId must reference an existing invoice.",
    );
    ensure(
      typeof entry.invoiceLineId === "string" &&
        !!invoiceLineIdsByInvoice
          .get(entry.invoiceId)
          ?.has(entry.invoiceLineId),
      "PurchaseLedgerEntry.invoiceLineId must reference an existing line in its invoice.",
    );
    ensure(
      typeof entry.postedAt === "string",
      "PurchaseLedgerEntry.postedAt must be a string.",
    );
    ensure(
      typeof entry.materialId === "string" &&
        materialCatalogIds.has(entry.materialId),
      "PurchaseLedgerEntry.materialId must reference a valid materialCatalog entry.",
    );
    ensure(
      typeof entry.quantity === "number",
      "PurchaseLedgerEntry.quantity must be a number.",
    );
    ensure(
      typeof entry.unitType === "string" &&
        VALID_MATERIAL_UNITS.includes(entry.unitType as MaterialUnitType),
      `PurchaseLedgerEntry.unitType must be one of: ${VALID_MATERIAL_UNITS.join(", ")}.`,
    );
    ensure(
      typeof entry.unitPrice === "number",
      "PurchaseLedgerEntry.unitPrice must be a number.",
    );
    ensure(
      typeof entry.lineTotal === "number",
      "PurchaseLedgerEntry.lineTotal must be a number.",
    );
    ensure(
      typeof entry.vendorName === "string",
      "PurchaseLedgerEntry.vendorName must be a string.",
    );
    ensure(
      typeof entry.invoiceDate === "string",
      "PurchaseLedgerEntry.invoiceDate must be a string.",
    );
    ensure(
      typeof entry.currency === "string",
      "PurchaseLedgerEntry.currency must be a string.",
    );
    ensure(
      typeof entry.entryType === "string" &&
        ["purchase", "adjustment"].includes(entry.entryType),
      "PurchaseLedgerEntry.entryType must be purchase or adjustment.",
    );
    ensure(
      typeof entry.note === "string",
      "PurchaseLedgerEntry.note must be a string.",
    );
  }

  for (const unit of project.units) {
    ensure(isRecord(unit), "Each unit must be an object.");
    ensure(typeof unit.id === "string", "Unit.id must be a string.");
    ensure(typeof unit.name === "string", "Unit.name must be a string.");
    ensure(
      typeof unit.floor === "string" &&
        VALID_UNIT_FLOORS.includes(unit.floor as UnitFloor),
      `Unit.floor must be one of: ${VALID_UNIT_FLOORS.join(", ")}.`,
    );
    ensure(
      typeof unit.totalAreaSqm === "number",
      "Unit.totalAreaSqm must be a number.",
    );
    ensure(
      typeof unit.bedrooms === "number" &&
        Number.isInteger(unit.bedrooms) &&
        unit.bedrooms >= 0,
      "Unit.bedrooms must be a non-negative integer.",
    );
    ensure(
      typeof unit.status === "string" &&
        VALID_UNIT_STATUS.includes(unit.status as UnitStatus),
      `Unit.status must be one of: ${VALID_UNIT_STATUS.join(", ")}.`,
    );
    ensure(
      typeof unit.description === "string",
      "Unit.description must be a string.",
    );
    ensure(Array.isArray(unit.rooms), "Unit.rooms must be an array.");

    for (const room of unit.rooms) {
      ensure(isRecord(room), "Each unit room must be an object.");
      ensure(typeof room.id === "string", "Room.id must be a string.");
      ensure(
        typeof room.roomType === "string" &&
          VALID_UNIT_ROOM_TYPES.includes(room.roomType as UnitRoomType),
        `Room.roomType must be one of: ${VALID_UNIT_ROOM_TYPES.join(", ")}.`,
      );
      ensure(
        typeof room.widthMm === "number",
        "Room.widthMm must be a number.",
      );
      ensure(
        typeof room.lengthMm === "number",
        "Room.lengthMm must be a number.",
      );
      ensure(
        typeof room.heightMm === "number",
        "Room.heightMm must be a number.",
      );
      ensure(
        typeof room.description === "string",
        "Room.description must be a string.",
      );
    }
  }

  for (const serviceSection of project.serviceSections) {
    ensure(isRecord(serviceSection), "Each service section must be an object.");
    ensure(
      typeof serviceSection.id === "string",
      "ServiceSection.id must be a string.",
    );
    ensure(
      typeof serviceSection.name === "string",
      "ServiceSection.name must be a string.",
    );
    ensure(
      Array.isArray(serviceSection.subsections),
      "ServiceSection.subsections must be an array.",
    );

    for (const subsection of serviceSection.subsections) {
      ensure(
        isRecord(subsection),
        "Each service subsection must be an object.",
      );
      ensure(
        typeof subsection.id === "string",
        "ServiceSubsection.id must be a string.",
      );
      ensure(
        typeof subsection.name === "string",
        "ServiceSubsection.name must be a string.",
      );
      ensure(
        Array.isArray(subsection.fields),
        "ServiceSubsection.fields must be an array.",
      );

      for (const field of subsection.fields) {
        ensure(isRecord(field), "Each service field must be an object.");
        ensure(
          typeof field.id === "string",
          "ServiceField.id must be a string.",
        );
        ensure(
          typeof field.name === "string",
          "ServiceField.name must be a string.",
        );
        ensure(
          typeof field.notes === "string",
          "ServiceField.notes must be a string.",
        );
        ensure(
          isStringArray(field.linkedSections),
          "ServiceField.linkedSections must be an array of strings.",
        );
      }
    }
  }

  for (const note of project.notes) {
    ensure(isRecord(note), "Each note must be an object.");
    ensure(typeof note.id === "string", "Note.id must be a string.");
    ensure(typeof note.title === "string", "Note.title must be a string.");
    ensure(typeof note.content === "string", "Note.content must be a string.");
    ensure(
      note.linkedSectionId === undefined ||
        note.linkedSectionId === null ||
        typeof note.linkedSectionId === "string",
      "Note.linkedSectionId must be string/null/undefined.",
    );
  }

  for (const attachment of project.attachments) {
    ensure(isRecord(attachment), "Each attachment must be an object.");
    ensure(
      typeof attachment.id === "string",
      "Attachment.id must be a string.",
    );
    ensure(
      typeof attachment.projectId === "string",
      "Attachment.projectId must be a string.",
    );
    ensure(
      typeof attachment.scopeType === "string" &&
        VALID_ATTACHMENT_SCOPES.includes(
          attachment.scopeType as AttachmentScopeType,
        ),
      `Attachment.scopeType must be one of: ${VALID_ATTACHMENT_SCOPES.join(", ")}.`,
    );
    ensure(
      attachment.scopeId === undefined ||
        attachment.scopeId === null ||
        typeof attachment.scopeId === "string",
      "Attachment.scopeId must be string/null/undefined.",
    );
    ensure(
      typeof attachment.category === "string" &&
        VALID_ATTACHMENT_CATEGORIES.includes(
          attachment.category as (typeof VALID_ATTACHMENT_CATEGORIES)[number],
        ),
      `Attachment.category must be one of: ${VALID_ATTACHMENT_CATEGORIES.join(", ")}.`,
    );
    ensure(
      attachment.fileTitle === undefined ||
        typeof attachment.fileTitle === "string",
      "Attachment.fileTitle must be a string when provided.",
    );
    ensure(
      typeof attachment.originalName === "string",
      "Attachment.originalName must be a string.",
    );
    ensure(
      typeof attachment.mimeType === "string",
      "Attachment.mimeType must be a string.",
    );
    ensure(
      typeof attachment.sizeBytes === "number",
      "Attachment.sizeBytes must be a number.",
    );
    ensure(
      typeof attachment.storageKey === "string",
      "Attachment.storageKey must be a string.",
    );
    ensure(
      typeof attachment.uploadedAt === "string",
      "Attachment.uploadedAt must be a string.",
    );
    ensure(
      attachment.note === undefined || typeof attachment.note === "string",
      "Attachment.note must be a string when provided.",
    );
  }

  return project as RenovationProject;
}
