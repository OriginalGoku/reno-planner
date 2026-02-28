import { readFile } from "node:fs/promises";
import path from "node:path";

const dataDir = path.join(process.cwd(), "src", "data", "reno");
const indexPath = path.join(dataDir, "projects-index.json");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function validateProject(project, fileName) {
  assert(
    typeof project.id === "string",
    `${fileName}: project.id must be string`,
  );
  assert(
    typeof project.name === "string",
    `${fileName}: project.name must be string`,
  );
  assert(
    Array.isArray(project.sections),
    `${fileName}: sections must be array`,
  );
  assert(Array.isArray(project.items), `${fileName}: items must be array`);
  assert(Array.isArray(project.notes), `${fileName}: notes must be array`);
  const hasMaterialCategories = Array.isArray(project.materialCategories);
  const hasMaterialCatalog = Array.isArray(project.materialCatalog);

  const sectionIds = new Set();
  for (const section of asArray(project.sections)) {
    assert(
      typeof section.id === "string",
      `${fileName}: section.id must be string`,
    );
    assert(
      !sectionIds.has(section.id),
      `${fileName}: duplicate section.id ${section.id}`,
    );
    sectionIds.add(section.id);
  }

  const categoryIds = new Set();
  if (hasMaterialCategories) {
    for (const category of asArray(project.materialCategories)) {
      assert(
        typeof category.id === "string",
        `${fileName}: materialCategory.id must be string`,
      );
      assert(
        !categoryIds.has(category.id),
        `${fileName}: duplicate materialCategory.id ${category.id}`,
      );
      categoryIds.add(category.id);
      assert(
        typeof category.name === "string",
        `${fileName}: materialCategory.name must be string`,
      );
    }
  }

  const catalogIds = new Set();
  if (hasMaterialCatalog && hasMaterialCategories) {
    for (const material of asArray(project.materialCatalog)) {
      assert(
        typeof material.id === "string",
        `${fileName}: materialCatalog.id must be string`,
      );
      assert(
        !catalogIds.has(material.id),
        `${fileName}: duplicate materialCatalog.id ${material.id}`,
      );
      catalogIds.add(material.id);
      assert(
        typeof material.categoryId === "string" &&
          categoryIds.has(material.categoryId),
        `${fileName}: materialCatalog ${material.id} references unknown category ${material.categoryId}`,
      );
      assert(
        typeof material.name === "string",
        `${fileName}: materialCatalog ${material.id} name must be string`,
      );
    }
  }

  const itemIds = new Set();
  for (const item of asArray(project.items)) {
    assert(typeof item.id === "string", `${fileName}: item.id must be string`);
    assert(!itemIds.has(item.id), `${fileName}: duplicate item.id ${item.id}`);
    itemIds.add(item.id);
    assert(
      sectionIds.has(item.sectionId),
      `${fileName}: item ${item.id} references unknown section ${item.sectionId}`,
    );
    assert(
      ["todo", "in_progress", "blocked", "done"].includes(item.status),
      `${fileName}: item ${item.id} invalid status ${item.status}`,
    );

    for (const expense of asArray(item.expenses)) {
      assert(
        typeof expense.amount === "number",
        `${fileName}: item ${item.id} expense amount must be number`,
      );
      assert(
        typeof expense.date === "string",
        `${fileName}: item ${item.id} expense date must be string`,
      );
    }

    for (const material of asArray(item.materials)) {
      if (
        hasMaterialCatalog &&
        hasMaterialCategories &&
        typeof material.materialId === "string"
      ) {
        assert(
          catalogIds.has(material.materialId),
          `${fileName}: item ${item.id} material.materialId must reference a known materialCatalog entry`,
        );
      } else {
        assert(
          typeof material.name === "string",
          `${fileName}: item ${item.id} material name must be string`,
        );
      }
      assert(
        typeof material.quantity === "number",
        `${fileName}: item ${item.id} material quantity must be number`,
      );
      assert(
        typeof material.url === "string",
        `${fileName}: item ${item.id} material url must be string`,
      );
    }
  }

  for (const note of asArray(project.notes)) {
    assert(typeof note.id === "string", `${fileName}: note.id must be string`);
    if (note.linkedSectionId != null) {
      assert(
        sectionIds.has(note.linkedSectionId),
        `${fileName}: note ${note.id} references unknown section ${note.linkedSectionId}`,
      );
    }
  }
}

async function main() {
  const indexRaw = await readFile(indexPath, "utf8");
  const index = JSON.parse(indexRaw);

  assert(
    typeof index.defaultProjectId === "string",
    "projects-index: defaultProjectId must be string",
  );
  assert(
    Array.isArray(index.projects),
    "projects-index: projects must be an array",
  );
  assert(
    index.projects.length > 0,
    "projects-index: projects must not be empty",
  );

  const ids = new Set();
  for (const entry of index.projects) {
    assert(
      typeof entry.id === "string",
      "projects-index: entry.id must be string",
    );
    assert(
      typeof entry.file === "string",
      "projects-index: entry.file must be string",
    );
    assert(
      !ids.has(entry.id),
      `projects-index: duplicate project id ${entry.id}`,
    );
    ids.add(entry.id);

    const projectPath = path.join(dataDir, entry.file);
    const projectRaw = await readFile(projectPath, "utf8");
    const project = JSON.parse(projectRaw);
    validateProject(project, entry.file);

    assert(
      project.id === entry.id,
      `${entry.file}: id mismatch with projects-index entry`,
    );
  }

  assert(
    ids.has(index.defaultProjectId),
    "projects-index: defaultProjectId is not listed in projects",
  );
  console.log(`Validated ${ids.size} project file(s) successfully.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
