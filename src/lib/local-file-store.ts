import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const STORAGE_ROOT = path.join(process.cwd(), "storage");

function sanitizeFilename(name: string) {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function buildStorageKey(params: {
  projectId: string;
  scopeType: "project" | "section" | "item" | "expense";
  scopeId?: string | null;
  attachmentId: string;
  originalName: string;
}) {
  const safeName = sanitizeFilename(params.originalName) || "file";
  const scopePart =
    params.scopeType === "project" ? "project" : `${params.scopeType}/${params.scopeId}`;
  return path.posix.join(
    "projects",
    params.projectId,
    scopePart,
    `${params.attachmentId}-${safeName}`,
  );
}

function toAbsolutePath(storageKey: string) {
  return path.join(STORAGE_ROOT, storageKey);
}

export async function saveBufferToStorage(storageKey: string, data: Buffer) {
  const absolutePath = toAbsolutePath(storageKey);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, data);
}

export async function readStorageFile(storageKey: string) {
  const absolutePath = toAbsolutePath(storageKey);
  return readFile(absolutePath);
}

export async function deleteStorageFile(storageKey: string) {
  const absolutePath = toAbsolutePath(storageKey);
  await rm(absolutePath, { force: true });
}
