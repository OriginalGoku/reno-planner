#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";

const serverDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(serverDir, "../..");
process.chdir(repoRoot);

async function main() {
  const { renoService } = await import("../../src/core/reno-service.ts");

  const projectIds = await renoService.listProjectIds();
  if (!projectIds.length) {
    throw new Error("No projects found in projects-index.json.");
  }

  const defaultProjectId = await renoService.getDefaultProjectId();
  const defaultProject = await renoService.getProjectById(defaultProjectId);
  if (!defaultProject) {
    throw new Error(`Default project not found: ${defaultProjectId}`);
  }

  const firstItemId = defaultProject.items[0]?.id ?? null;
  const sampleProjectResource = `resource://project/${defaultProjectId}`;
  const sampleItemResource = firstItemId
    ? `resource://item/${defaultProjectId}/${firstItemId}`
    : null;

  const report = {
    ok: true,
    cwd: process.cwd(),
    projectCount: projectIds.length,
    defaultProjectId,
    defaultProjectName: defaultProject.name,
    sectionCount: defaultProject.sections.length,
    itemCount: defaultProject.items.length,
    sampleProjectResource,
    sampleItemResource,
  };

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(
    JSON.stringify(
      {
        ok: false,
        cwd: process.cwd(),
        error: message,
      },
      null,
      2,
    ),
  );
  process.exit(1);
});
