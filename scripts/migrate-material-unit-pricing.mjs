#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "src", "data", "reno");
const INDEX_PATH = path.join(DATA_DIR, "projects-index.json");

function toId(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function makeUniqueId(existingIds, base) {
  let next = base || "material";
  let suffix = 2;
  while (existingIds.has(next)) {
    next = `${base}-${suffix}`;
    suffix += 1;
  }
  return next;
}

async function readJson(filePath) {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function deriveUnitPrice(legacyEstimatedPrice, quantity) {
  if (
    typeof legacyEstimatedPrice !== "number" ||
    !Number.isFinite(legacyEstimatedPrice) ||
    legacyEstimatedPrice <= 0
  ) {
    return null;
  }
  if (
    typeof quantity !== "number" ||
    !Number.isFinite(quantity) ||
    quantity <= 0
  ) {
    return null;
  }
  return legacyEstimatedPrice / quantity;
}

function normalizeProject(project) {
  const categoryId = "uncategorized";
  if (!Array.isArray(project.materialCategories)) {
    project.materialCategories = [];
  }
  if (!project.materialCategories.some((entry) => entry.id === categoryId)) {
    project.materialCategories.push({
      id: categoryId,
      name: "Uncategorized",
      description: "Fallback category for imported materials.",
      displayOrder: 0,
    });
  }

  if (!Array.isArray(project.materialCatalog)) {
    project.materialCatalog = [];
  }
  const existingIds = new Set(project.materialCatalog.map((entry) => entry.id));
  const catalogById = new Map(
    project.materialCatalog.map((entry) => [entry.id, entry]),
  );
  const catalogByNameUnit = new Map(
    project.materialCatalog.map((entry) => [
      `${String(entry.name ?? "").toLowerCase()}::${entry.unitType ?? "other"}`,
      entry,
    ]),
  );

  const items = Array.isArray(project.items) ? project.items : [];
  for (const item of items) {
    if (!Array.isArray(item.materials)) {
      item.materials = [];
      continue;
    }

    item.materials = item.materials.map((material) => {
      let materialId =
        typeof material.materialId === "string" &&
        material.materialId.trim().length > 0
          ? material.materialId
          : null;

      if (!materialId) {
        const legacyName =
          typeof material.name === "string" && material.name.trim().length > 0
            ? material.name.trim()
            : "Uncategorized Material";
        const unitType =
          typeof material.unitType === "string" &&
          material.unitType.trim().length > 0
            ? material.unitType
            : "other";
        const key = `${legacyName.toLowerCase()}::${unitType}`;
        let catalogEntry = catalogByNameUnit.get(key);
        if (!catalogEntry) {
          const baseId = toId(legacyName);
          const id = makeUniqueId(existingIds, baseId);
          existingIds.add(id);
          catalogEntry = {
            id,
            categoryId,
            name: legacyName,
            unitType,
            estimatedPrice: undefined,
            sampleUrl: "",
            notes: "",
          };
          project.materialCatalog.push(catalogEntry);
          catalogByNameUnit.set(key, catalogEntry);
          catalogById.set(id, catalogEntry);
        }
        materialId = catalogEntry.id;
      }

      const catalogEntry = catalogById.get(materialId);
      if (catalogEntry) {
        const derived = deriveUnitPrice(
          material.estimatedPrice,
          material.quantity,
        );
        const existing =
          typeof catalogEntry.estimatedPrice === "number" &&
          Number.isFinite(catalogEntry.estimatedPrice) &&
          catalogEntry.estimatedPrice > 0
            ? catalogEntry.estimatedPrice
            : null;
        if (existing === null && derived !== null) {
          catalogEntry.estimatedPrice = derived;
        }
      }

      return {
        id: typeof material.id === "string" ? material.id : randomUUID(),
        materialId,
        quantity: typeof material.quantity === "number" ? material.quantity : 0,
        url: typeof material.url === "string" ? material.url : "",
        note: typeof material.note === "string" ? material.note : "",
      };
    });
  }
}

async function main() {
  const index = await readJson(INDEX_PATH);
  const projects = Array.isArray(index.projects) ? index.projects : [];
  let migrated = 0;

  for (const entry of projects) {
    if (!entry?.id || !entry?.file) {
      continue;
    }
    const projectPath = path.join(DATA_DIR, entry.file);
    const project = await readJson(projectPath);
    normalizeProject(project);
    await writeJson(projectPath, project);
    migrated += 1;
  }

  console.log(`Migrated material pricing for ${migrated} project file(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
