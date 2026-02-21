import "server-only";

import { projectRepository } from "@/lib/reno-repository";
import type { RenovationProject } from "@/lib/reno-types";

export async function loadRenoProject(
  projectId?: string,
): Promise<RenovationProject> {
  const resolvedProjectId =
    projectId ?? (await projectRepository.getDefaultProjectId());
  const project = await projectRepository.getProjectById(resolvedProjectId);

  if (!project) {
    throw new Error(`Unknown projectId: ${resolvedProjectId}`);
  }

  return project;
}

export async function loadDefaultProjectId(): Promise<string> {
  return projectRepository.getDefaultProjectId();
}

export async function listProjectIds(): Promise<string[]> {
  return projectRepository.listProjectIds();
}
