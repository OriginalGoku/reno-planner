import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const dataDir = path.join(process.cwd(), "src", "data", "reno");
const indexPath = path.join(dataDir, "projects-index.json");
const backupsDir = path.join(dataDir, "backups");

function parseArgs(argv) {
  const args = { source: "", projectId: "", dryRun: false };

  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    if (current === "--source") {
      args.source = argv[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (current === "--project-id") {
      args.projectId = argv[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (current === "--dry-run") {
      args.dryRun = true;
    }
  }

  return args;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function validateProject(project) {
  assert(
    typeof project === "object" && project !== null,
    "Project must be an object",
  );
  assert(
    typeof project.id === "string" && project.id.length > 0,
    "project.id must be a non-empty string",
  );
  assert(typeof project.name === "string", "project.name must be a string");
  assert(
    typeof project.address === "string",
    "project.address must be a string",
  );
  assert(typeof project.phase === "string", "project.phase must be a string");
  assert(
    typeof project.targetCompletion === "string",
    "project.targetCompletion must be a string",
  );
  assert(Array.isArray(project.sections), "project.sections must be an array");
  assert(Array.isArray(project.items), "project.items must be an array");
  assert(Array.isArray(project.notes), "project.notes must be an array");

  const sectionIds = new Set();
  for (const section of asArray(project.sections)) {
    assert(
      typeof section.id === "string" && section.id.length > 0,
      "section.id must be a non-empty string",
    );
    assert(!sectionIds.has(section.id), `Duplicate section.id: ${section.id}`);
    sectionIds.add(section.id);
    assert(
      typeof section.title === "string",
      `section ${section.id}: title must be a string`,
    );
    assert(
      typeof section.description === "string",
      `section ${section.id}: description must be a string`,
    );
  }

  const itemIds = new Set();
  for (const item of asArray(project.items)) {
    assert(
      typeof item.id === "string" && item.id.length > 0,
      "item.id must be a non-empty string",
    );
    assert(!itemIds.has(item.id), `Duplicate item.id: ${item.id}`);
    itemIds.add(item.id);
    assert(
      sectionIds.has(item.sectionId),
      `item ${item.id}: unknown sectionId ${item.sectionId}`,
    );
    assert(
      typeof item.title === "string",
      `item ${item.id}: title must be a string`,
    );
    assert(
      ["todo", "in_progress", "blocked", "done"].includes(item.status),
      `item ${item.id}: invalid status ${item.status}`,
    );
    assert(
      typeof item.estimate === "number",
      `item ${item.id}: estimate must be number`,
    );
    assert(
      typeof item.description === "string",
      `item ${item.id}: description must be string`,
    );
    assert(
      typeof item.note === "string",
      `item ${item.id}: note must be string`,
    );
    assert(
      item.performers == null || Array.isArray(item.performers),
      `item ${item.id}: performers must be array when provided`,
    );
    assert(
      item.materials == null || Array.isArray(item.materials),
      `item ${item.id}: materials must be array when provided`,
    );
    assert(
      Array.isArray(item.expenses),
      `item ${item.id}: expenses must be array`,
    );
  }

  for (const note of asArray(project.notes)) {
    assert(
      typeof note.id === "string" && note.id.length > 0,
      "note.id must be a non-empty string",
    );
    assert(
      typeof note.title === "string",
      `note ${note.id}: title must be string`,
    );
    assert(
      typeof note.content === "string",
      `note ${note.id}: content must be string`,
    );
    if (note.linkedSectionId != null) {
      assert(
        sectionIds.has(note.linkedSectionId),
        `note ${note.id}: unknown linkedSectionId ${note.linkedSectionId}`,
      );
    }
  }
}

function timestampKey() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const sec = String(now.getSeconds()).padStart(2, "0");
  return `${yyyy}${mm}${dd}-${hh}${min}${sec}`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  assert(args.source, "Missing required --source argument");

  const sourcePath = path.isAbsolute(args.source)
    ? args.source
    : path.join(process.cwd(), args.source);

  const sourceRaw = await readFile(sourcePath, "utf8");
  const sourceProject = JSON.parse(sourceRaw);
  validateProject(sourceProject);

  const projectId = args.projectId || sourceProject.id;
  assert(
    typeof projectId === "string" && projectId.length > 0,
    "projectId must be a non-empty string",
  );

  if (sourceProject.id !== projectId) {
    sourceProject.id = projectId;
  }

  const indexRaw = await readFile(indexPath, "utf8");
  const index = JSON.parse(indexRaw);
  assert(
    Array.isArray(index.projects),
    "projects-index.json: projects must be an array",
  );

  const existing = index.projects.find((entry) => entry.id === projectId);
  const targetFile = existing?.file ?? `${projectId}.json`;
  const targetPath = path.join(dataDir, targetFile);
  const wouldAddIndexEntry = !existing;
  const wouldCreateBackup = existsSync(targetPath);

  if (args.dryRun) {
    console.log("Dry run: no files will be changed.");
    console.log(`Source file: ${path.relative(process.cwd(), sourcePath)}`);
    console.log(`Project ID: ${projectId}`);
    console.log(
      `Target data file: ${path.relative(process.cwd(), targetPath)}`,
    );
    console.log(`Would create backup: ${wouldCreateBackup ? "yes" : "no"}`);
    console.log(
      `Would update projects-index.json: ${wouldAddIndexEntry ? "yes (add project entry)" : "no"}`,
    );
    execSync("node scripts/validate-reno-data.mjs", { stdio: "inherit" });
    console.log("Dry run complete.");
    return;
  }

  await mkdir(backupsDir, { recursive: true });

  if (existsSync(targetPath)) {
    const backupPath = path.join(
      backupsDir,
      `${projectId}-${timestampKey()}.json`,
    );
    await copyFile(targetPath, backupPath);
    console.log(`Backup created: ${path.relative(process.cwd(), backupPath)}`);
  }

  await writeFile(
    targetPath,
    `${JSON.stringify(sourceProject, null, 2)}\n`,
    "utf8",
  );

  if (!existing) {
    index.projects.push({ id: projectId, file: targetFile });
    if (!index.defaultProjectId) {
      index.defaultProjectId = projectId;
    }
  }

  await writeFile(indexPath, `${JSON.stringify(index, null, 2)}\n`, "utf8");

  execSync("node scripts/validate-reno-data.mjs", { stdio: "inherit" });

  console.log("Import complete.");
  console.log(`Project ID: ${projectId}`);
  console.log(`Data file: ${path.relative(process.cwd(), targetPath)}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
