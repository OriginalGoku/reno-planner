import type {
  ExpenseType,
  ItemStatus,
  RenovationProject,
} from "./reno-types.ts";

const VALID_STATUS: ItemStatus[] = ["todo", "in_progress", "blocked", "done"];
const VALID_EXPENSE_TYPES: ExpenseType[] = [
  "material",
  "labor",
  "permit",
  "tool",
  "other",
];

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

  ensure(Array.isArray(project.sections), "Project.sections must be an array.");
  ensure(Array.isArray(project.items), "Project.items must be an array.");
  ensure(Array.isArray(project.notes), "Project.notes must be an array.");

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
  }

  for (const item of project.items) {
    ensure(isRecord(item), "Each item must be an object.");
    ensure(typeof item.id === "string", "Item.id must be a string.");
    ensure(
      typeof item.sectionId === "string",
      "Item.sectionId must be a string.",
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
          typeof material.name === "string",
          "Material.name must be a string.",
        );
        ensure(
          typeof material.quantity === "number",
          "Material.quantity must be a number.",
        );
        ensure(
          typeof material.estimatedPrice === "number",
          "Material.estimatedPrice must be a number.",
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

  return project as RenovationProject;
}
