export type ItemStatus = "todo" | "in_progress" | "blocked" | "done";

export type ExpenseType = "material" | "labor" | "permit" | "tool" | "other";

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
  name: string;
  quantity: number;
  unitType: MaterialUnitType;
  estimatedPrice: number;
  url: string;
  note?: string;
};

export type RenovationItem = {
  id: string;
  sectionId: string;
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

export type RenovationNote = {
  id: string;
  title: string;
  content: string;
  linkedSectionId?: string | null;
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
  notes: RenovationNote[];
};

export const STATUS_LABELS: Record<ItemStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  blocked: "Blocked",
  done: "Done",
};
