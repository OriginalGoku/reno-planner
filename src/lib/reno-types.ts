export type ItemStatus = "todo" | "in_progress" | "blocked" | "done";

export type ExpenseType = "material" | "labor" | "permit" | "tool" | "other";

export type UnitFloor = "main" | "basement";

export type UnitStatus = "planned" | "in_progress" | "done";

export type UnitRoomType =
  | "kitchen"
  | "living_area"
  | "bedroom"
  | "bathroom"
  | "storage"
  | "other";

export type MaterialUnitType =
  | "linear_ft"
  | "sqft"
  | "sqm"
  | "piece"
  | "bundle"
  | "box"
  | "roll"
  | "sheet"
  | "bag"
  | "gallon"
  | "liter"
  | "kg"
  | "lb"
  | "meter"
  | "other";

export type RenovationExpense = {
  id: string;
  date: string;
  amount: number;
  type: ExpenseType;
  vendor?: string;
  note?: string;
};

export type RenovationMaterial = {
  id: string;
  materialId: string;
  quantity: number;
  estimatedPrice: number;
  url: string;
  note?: string;
};

export type MaterialCatalogItem = {
  id: string;
  categoryId: string;
  name: string;
  unitType: MaterialUnitType;
  estimatedPrice?: number;
  sampleUrl?: string;
  notes?: string;
};

export type MaterialCategory = {
  id: string;
  name: string;
  description?: string;
  sortOrder: number;
};

export type PurchaseInvoiceStatus = "draft" | "confirmed" | "voided";

export type PurchaseInvoiceTotals = {
  subTotal: number;
  tax: number;
  shipping: number;
  otherFees: number;
  grandTotal: number;
};

export type PurchaseInvoiceLine = {
  id: string;
  sourceText: string;
  description: string;
  quantity: number;
  unitType: MaterialUnitType;
  unitPrice: number;
  lineTotal: number;
  materialId?: string;
  confidence: number;
  needsReview: boolean;
  notes: string;
};

export type PurchaseInvoiceExtraction = {
  provider: string;
  model: string;
  extractedAt: string;
  rawOutput: unknown;
};

export type PurchaseInvoiceReview = {
  totalsMismatchOverride: boolean;
  overrideReason: string;
};

export type PurchaseInvoice = {
  id: string;
  status: PurchaseInvoiceStatus;
  projectId: string;
  attachmentId: string;
  vendorName: string;
  invoiceNumber: string;
  invoiceDate: string;
  currency: string;
  totals: PurchaseInvoiceTotals;
  lines: PurchaseInvoiceLine[];
  extraction: PurchaseInvoiceExtraction;
  review: PurchaseInvoiceReview;
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string | null;
};

export type PurchaseLedgerEntryType = "purchase" | "adjustment";

export type PurchaseLedgerEntry = {
  id: string;
  projectId: string;
  invoiceId: string;
  invoiceLineId: string;
  postedAt: string;
  materialId: string;
  quantity: number;
  unitType: MaterialUnitType;
  unitPrice: number;
  lineTotal: number;
  vendorName: string;
  invoiceDate: string;
  currency: string;
  entryType: PurchaseLedgerEntryType;
  note: string;
};

export type RenovationItem = {
  id: string;
  sectionId: string;
  unitId?: string | null;
  title: string;
  status: ItemStatus;
  estimate: number;
  estimatedCompletionDate?: string;
  actualCompletionDate?: string;
  performers?: string[];
  description: string;
  note: string;
  materials?: RenovationMaterial[];
  expenses: RenovationExpense[];
};

export type RenovationSection = {
  id: string;
  title: string;
  description: string;
  position: number;
};

export type RenovationUnitRoom = {
  id: string;
  roomType: UnitRoomType;
  widthMm: number;
  lengthMm: number;
  heightMm: number;
  description: string;
};

export type RenovationUnit = {
  id: string;
  name: string;
  floor: UnitFloor;
  bedrooms: number;
  totalAreaSqm: number;
  status: UnitStatus;
  description: string;
  rooms: RenovationUnitRoom[];
};

export type RenovationNote = {
  id: string;
  title: string;
  content: string;
  linkedSectionId?: string | null;
};

export type ServiceField = {
  id: string;
  name: string;
  notes: string;
  linkedSections: string[];
};

export type ServiceSubsection = {
  id: string;
  name: string;
  fields: ServiceField[];
};

export type ServiceSection = {
  id: string;
  name: string;
  subsections: ServiceSubsection[];
};

export type AttachmentScopeType = "project" | "section" | "item" | "expense";

export type RenovationAttachment = {
  id: string;
  projectId: string;
  scopeType: AttachmentScopeType;
  scopeId?: string | null;
  category: "drawing" | "invoice" | "permit" | "photo" | "other";
  fileTitle?: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  uploadedAt: string;
  note?: string;
};

export type ProjectOverview = {
  projectDescription: string;
  area: {
    groundFloorSqFtApprox: number;
    basementSqFtApprox: number;
  };
  occupancyPlan: {
    groundFloorUnits: number;
    basementUnits: number;
    totalUnits: number;
  };
  currentState: {
    permitObtained: boolean;
    occupancy: string;
    framing: string;
    groundFloorExteriorWalls: string;
    basementExteriorWalls: string;
    hazmat: string;
  };
  unitMixAndSystems: {
    totalUnits: number;
    bathrooms: number;
    kitchens: number;
    laundry: string;
    hotWater: string;
    basementCeilingHeight: string;
  };
  tradesAndFinancing: {
    generalContractor: string;
    confirmedTrades: string[];
    pendingBeforeStart: string[];
    financing: string;
  };
  scopeExclusions: string[];
};

export type RenovationProject = {
  id: string;
  name: string;
  address: string;
  phase: string;
  targetCompletion: string;
  overview: ProjectOverview;
  sections: RenovationSection[];
  items: RenovationItem[];
  units: RenovationUnit[];
  serviceSections: ServiceSection[];
  materialCategories: MaterialCategory[];
  materialCatalog: MaterialCatalogItem[];
  purchaseInvoices: PurchaseInvoice[];
  purchaseLedger: PurchaseLedgerEntry[];
  notes: RenovationNote[];
  attachments: RenovationAttachment[];
};

export const STATUS_LABELS: Record<ItemStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  blocked: "Blocked",
  done: "Done",
};
