#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import z from "zod/v4";

// Claude/Desktop MCP may spawn with unexpected cwd (e.g., "/").
// Force cwd to repository root so JSON-backed paths resolve correctly.
const serverDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(serverDir, "../..");
process.chdir(repoRoot);

const { renoService } = await import("../../src/core/reno-service.ts");

const SAFE_MODE = process.env.RENO_MCP_SAFE_MODE === "1";
const QUIET_MODE = process.env.RENO_MCP_QUIET === "1";

function logInfo(message) {
  if (!QUIET_MODE) {
    console.error(message);
  }
}

function asToolError(error) {
  const message = error instanceof Error ? error.message : "Unknown error";
  return {
    isError: true,
    content: [{ type: "text", text: `Error: ${message}` }],
  };
}

function asToolResult(payload) {
  return {
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload,
  };
}

async function resolveProjectId(projectId) {
  if (projectId) {
    return projectId;
  }
  return renoService.getDefaultProjectId();
}

function assertDestructiveAllowed(action, confirm) {
  if (SAFE_MODE && !confirm) {
    throw new Error(
      `${action} is blocked because safe mode is enabled. Re-run with confirm=true.`,
    );
  }
}

function guessMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".pdf":
      return "application/pdf";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".txt":
      return "text/plain";
    case ".csv":
      return "text/csv";
    case ".doc":
      return "application/msword";
    case ".docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    default:
      return "application/octet-stream";
  }
}

const server = new McpServer({
  name: "reno-manager-mcp",
  version: "0.1.0",
});

server.registerResource(
  "reno-project-resource",
  new ResourceTemplate("resource://project/{projectId}", {
    list: async () => {
      const projectIds = await renoService.listProjectIds();
      const projects = await Promise.all(
        projectIds.map((projectId) => renoService.getProjectById(projectId)),
      );

      return {
        resources: projects
          .filter((project) => project !== null)
          .map((project) => ({
            uri: `resource://project/${project.id}`,
            name: project.id,
            title: project.name,
            mimeType: "application/json",
            description: `Project ${project.name}`,
          })),
      };
    },
  }),
  {
    title: "Reno Project",
    description: "Read full project document by projectId",
    mimeType: "application/json",
  },
  async (_uri, variables) => {
    const projectId = variables.projectId;
    if (!projectId) {
      throw new Error("projectId is required.");
    }

    const project = await renoService.getProjectById(projectId);
    if (!project) {
      throw new Error(`Unknown projectId: ${projectId}`);
    }

    return {
      contents: [
        {
          uri: `resource://project/${projectId}`,
          mimeType: "application/json",
          text: JSON.stringify(project, null, 2),
        },
      ],
    };
  },
);

server.registerResource(
  "reno-item-resource",
  new ResourceTemplate("resource://item/{projectId}/{itemId}", {
    list: async () => {
      const projectIds = await renoService.listProjectIds();
      const projects = await Promise.all(
        projectIds.map((projectId) => renoService.getProjectById(projectId)),
      );

      return {
        resources: projects
          .filter((project) => project !== null)
          .flatMap((project) =>
            project.items.map((item) => {
              const sectionTitle =
                project.sections.find(
                  (section) => section.id === item.sectionId,
                )?.title ?? item.sectionId;

              return {
                uri: `resource://item/${project.id}/${item.id}`,
                name: item.id,
                title: item.title,
                mimeType: "application/json",
                description: `${project.name} / ${sectionTitle}`,
              };
            }),
          ),
      };
    },
  }),
  {
    title: "Reno Item",
    description: "Read one item by projectId and itemId",
    mimeType: "application/json",
  },
  async (_uri, variables) => {
    const projectId = variables.projectId;
    const itemId = variables.itemId;
    if (!projectId || !itemId) {
      throw new Error("projectId and itemId are required.");
    }

    const project = await renoService.getProjectById(projectId);
    if (!project) {
      throw new Error(`Unknown projectId: ${projectId}`);
    }

    const item = project.items.find((entry) => entry.id === itemId);
    if (!item) {
      throw new Error(`Unknown itemId: ${itemId}`);
    }

    return {
      contents: [
        {
          uri: `resource://item/${projectId}/${itemId}`,
          mimeType: "application/json",
          text: JSON.stringify(item, null, 2),
        },
      ],
    };
  },
);

server.registerResource(
  "reno-unit-resource",
  new ResourceTemplate("resource://unit/{projectId}/{unitId}", {
    list: async () => {
      const projectIds = await renoService.listProjectIds();
      const projects = await Promise.all(
        projectIds.map((projectId) => renoService.getProjectById(projectId)),
      );

      return {
        resources: projects
          .filter((project) => project !== null)
          .flatMap((project) =>
            project.units.map((unit) => ({
              uri: `resource://unit/${project.id}/${unit.id}`,
              name: unit.id,
              title: unit.name,
              mimeType: "application/json",
              description: `${project.name} / ${unit.floor === "main" ? "Main" : "Basement"} floor`,
            })),
          ),
      };
    },
  }),
  {
    title: "Reno Unit",
    description: "Read one unit by projectId and unitId",
    mimeType: "application/json",
  },
  async (_uri, variables) => {
    const projectId = variables.projectId;
    const unitId = variables.unitId;
    if (!projectId || !unitId) {
      throw new Error("projectId and unitId are required.");
    }

    const project = await renoService.getProjectById(projectId);
    if (!project) {
      throw new Error(`Unknown projectId: ${projectId}`);
    }

    const unit = project.units.find((entry) => entry.id === unitId);
    if (!unit) {
      throw new Error(`Unknown unitId: ${unitId}`);
    }
    const items = project.items.filter((entry) => entry.unitId === unitId);

    return {
      contents: [
        {
          uri: `resource://unit/${projectId}/${unitId}`,
          mimeType: "application/json",
          text: JSON.stringify({ ...unit, items }, null, 2),
        },
      ],
    };
  },
);

server.registerResource(
  "reno-section-resource",
  new ResourceTemplate("resource://section/{projectId}/{sectionId}", {
    list: async () => {
      const projectIds = await renoService.listProjectIds();
      const projects = await Promise.all(
        projectIds.map((projectId) => renoService.getProjectById(projectId)),
      );

      return {
        resources: projects
          .filter((project) => project !== null)
          .flatMap((project) =>
            project.sections.map((section) => ({
              uri: `resource://section/${project.id}/${section.id}`,
              name: section.id,
              title: section.title,
              mimeType: "application/json",
              description: `${project.name} / Section`,
            })),
          ),
      };
    },
  }),
  {
    title: "Reno Section",
    description: "Read one section by projectId and sectionId",
    mimeType: "application/json",
  },
  async (_uri, variables) => {
    const projectId = variables.projectId;
    const sectionId = variables.sectionId;
    if (!projectId || !sectionId) {
      throw new Error("projectId and sectionId are required.");
    }

    const project = await renoService.getProjectById(projectId);
    if (!project) {
      throw new Error(`Unknown projectId: ${projectId}`);
    }

    const section = project.sections.find((entry) => entry.id === sectionId);
    if (!section) {
      throw new Error(`Unknown sectionId: ${sectionId}`);
    }

    return {
      contents: [
        {
          uri: `resource://section/${projectId}/${sectionId}`,
          mimeType: "application/json",
          text: JSON.stringify(section, null, 2),
        },
      ],
    };
  },
);

server.registerResource(
  "reno-note-resource",
  new ResourceTemplate("resource://note/{projectId}/{noteId}", {
    list: async () => {
      const projectIds = await renoService.listProjectIds();
      const projects = await Promise.all(
        projectIds.map((projectId) => renoService.getProjectById(projectId)),
      );

      return {
        resources: projects
          .filter((project) => project !== null)
          .flatMap((project) =>
            project.notes.map((note) => ({
              uri: `resource://note/${project.id}/${note.id}`,
              name: note.id,
              title: note.title,
              mimeType: "application/json",
              description: `${project.name} / Lessons learned`,
            })),
          ),
      };
    },
  }),
  {
    title: "Reno Note",
    description: "Read one note by projectId and noteId",
    mimeType: "application/json",
  },
  async (_uri, variables) => {
    const projectId = variables.projectId;
    const noteId = variables.noteId;
    if (!projectId || !noteId) {
      throw new Error("projectId and noteId are required.");
    }

    const project = await renoService.getProjectById(projectId);
    if (!project) {
      throw new Error(`Unknown projectId: ${projectId}`);
    }

    const note = project.notes.find((entry) => entry.id === noteId);
    if (!note) {
      throw new Error(`Unknown noteId: ${noteId}`);
    }

    return {
      contents: [
        {
          uri: `resource://note/${projectId}/${noteId}`,
          mimeType: "application/json",
          text: JSON.stringify(note, null, 2),
        },
      ],
    };
  },
);

server.registerResource(
  "reno-service-section-resource",
  new ResourceTemplate(
    "resource://service-section/{projectId}/{serviceSectionId}",
    {
      list: async () => {
        const projectIds = await renoService.listProjectIds();
        const projects = await Promise.all(
          projectIds.map((projectId) => renoService.getProjectById(projectId)),
        );

        return {
          resources: projects
            .filter((project) => project !== null)
            .flatMap((project) =>
              project.serviceSections.map((section) => ({
                uri: `resource://service-section/${project.id}/${section.id}`,
                name: section.id,
                title: section.name,
                mimeType: "application/json",
                description: `${project.name} / Service Section`,
              })),
            ),
        };
      },
    },
  ),
  {
    title: "Reno Service Section",
    description: "Read one service section by projectId and serviceSectionId",
    mimeType: "application/json",
  },
  async (_uri, variables) => {
    const projectId = variables.projectId;
    const serviceSectionId = variables.serviceSectionId;
    if (!projectId || !serviceSectionId) {
      throw new Error("projectId and serviceSectionId are required.");
    }

    const project = await renoService.getProjectById(projectId);
    if (!project) {
      throw new Error(`Unknown projectId: ${projectId}`);
    }

    const section = project.serviceSections.find(
      (entry) => entry.id === serviceSectionId,
    );
    if (!section) {
      throw new Error(`Unknown serviceSectionId: ${serviceSectionId}`);
    }

    return {
      contents: [
        {
          uri: `resource://service-section/${projectId}/${serviceSectionId}`,
          mimeType: "application/json",
          text: JSON.stringify(section, null, 2),
        },
      ],
    };
  },
);

server.registerTool(
  "reno_list_projects",
  {
    description: "List available renovation projects",
    inputSchema: {},
  },
  async () => {
    try {
      const projectIds = await renoService.listProjectIds();
      return asToolResult({ projectIds });
    } catch (error) {
      return asToolError(error);
    }
  },
);

server.registerTool(
  "reno_list_service_sections",
  {
    description: "List service sections and their subsections/fields",
    inputSchema: {
      projectId: z.string().optional(),
    },
  },
  async ({ projectId }) => {
    try {
      const resolvedProjectId = await resolveProjectId(projectId);
      const project = await renoService.getProjectById(resolvedProjectId);
      if (!project) {
        throw new Error(`Unknown projectId: ${resolvedProjectId}`);
      }
      return asToolResult({ serviceSections: project.serviceSections });
    } catch (error) {
      return asToolError(error);
    }
  },
);

server.registerTool(
  "reno_add_service_section",
  {
    description: "Add a top-level service section/menu",
    inputSchema: {
      projectId: z.string().optional(),
      name: z.string(),
    },
  },
  async ({ projectId, name }) => {
    try {
      const resolvedProjectId = await resolveProjectId(projectId);
      await renoService.addServiceSection({
        projectId: resolvedProjectId,
        name,
      });
      return asToolResult({ ok: true, projectId: resolvedProjectId });
    } catch (error) {
      return asToolError(error);
    }
  },
);

server.registerTool(
  "reno_update_service_section",
  {
    description: "Update a service section name",
    inputSchema: {
      projectId: z.string().optional(),
      serviceSectionId: z.string(),
      name: z.string(),
    },
  },
  async ({ projectId, serviceSectionId, name }) => {
    try {
      const resolvedProjectId = await resolveProjectId(projectId);
      await renoService.updateServiceSection({
        projectId: resolvedProjectId,
        serviceSectionId,
        name,
      });
      return asToolResult({
        ok: true,
        projectId: resolvedProjectId,
        serviceSectionId,
      });
    } catch (error) {
      return asToolError(error);
    }
  },
);

server.registerTool(
  "reno_delete_service_section",
  {
    description: "Delete a service section (and all subsections/fields)",
    inputSchema: {
      projectId: z.string().optional(),
      serviceSectionId: z.string(),
      confirm: z.boolean().optional(),
    },
  },
  async ({ projectId, serviceSectionId, confirm }) => {
    try {
      assertDestructiveAllowed("reno_delete_service_section", confirm);
      const resolvedProjectId = await resolveProjectId(projectId);
      await renoService.deleteServiceSection({
        projectId: resolvedProjectId,
        serviceSectionId,
      });
      return asToolResult({
        ok: true,
        projectId: resolvedProjectId,
        serviceSectionId,
      });
    } catch (error) {
      return asToolError(error);
    }
  },
);

server.registerTool(
  "reno_add_service_subsection",
  {
    description: "Add a subsection under a service section",
    inputSchema: {
      projectId: z.string().optional(),
      serviceSectionId: z.string(),
      name: z.string(),
    },
  },
  async ({ projectId, serviceSectionId, name }) => {
    try {
      const resolvedProjectId = await resolveProjectId(projectId);
      await renoService.addServiceSubsection({
        projectId: resolvedProjectId,
        serviceSectionId,
        name,
      });
      return asToolResult({
        ok: true,
        projectId: resolvedProjectId,
        serviceSectionId,
      });
    } catch (error) {
      return asToolError(error);
    }
  },
);

server.registerTool(
  "reno_update_service_subsection",
  {
    description: "Update a service subsection name",
    inputSchema: {
      projectId: z.string().optional(),
      serviceSectionId: z.string(),
      subsectionId: z.string(),
      name: z.string(),
    },
  },
  async ({ projectId, serviceSectionId, subsectionId, name }) => {
    try {
      const resolvedProjectId = await resolveProjectId(projectId);
      await renoService.updateServiceSubsection({
        projectId: resolvedProjectId,
        serviceSectionId,
        subsectionId,
        name,
      });
      return asToolResult({
        ok: true,
        projectId: resolvedProjectId,
        serviceSectionId,
        subsectionId,
      });
    } catch (error) {
      return asToolError(error);
    }
  },
);

server.registerTool(
  "reno_delete_service_subsection",
  {
    description: "Delete a service subsection (and all fields)",
    inputSchema: {
      projectId: z.string().optional(),
      serviceSectionId: z.string(),
      subsectionId: z.string(),
      confirm: z.boolean().optional(),
    },
  },
  async ({ projectId, serviceSectionId, subsectionId, confirm }) => {
    try {
      assertDestructiveAllowed("reno_delete_service_subsection", confirm);
      const resolvedProjectId = await resolveProjectId(projectId);
      await renoService.deleteServiceSubsection({
        projectId: resolvedProjectId,
        serviceSectionId,
        subsectionId,
      });
      return asToolResult({
        ok: true,
        projectId: resolvedProjectId,
        serviceSectionId,
        subsectionId,
      });
    } catch (error) {
      return asToolError(error);
    }
  },
);

server.registerTool(
  "reno_add_service_field",
  {
    description: "Add a field under a service subsection",
    inputSchema: {
      projectId: z.string().optional(),
      serviceSectionId: z.string(),
      subsectionId: z.string(),
      name: z.string(),
      notes: z.string().optional(),
      linkedSections: z.array(z.string()).optional(),
    },
  },
  async ({
    projectId,
    serviceSectionId,
    subsectionId,
    name,
    notes,
    linkedSections,
  }) => {
    try {
      const resolvedProjectId = await resolveProjectId(projectId);
      await renoService.addServiceField({
        projectId: resolvedProjectId,
        serviceSectionId,
        subsectionId,
        name,
        notes: notes ?? "",
        linkedSections: linkedSections ?? [],
      });
      return asToolResult({
        ok: true,
        projectId: resolvedProjectId,
        serviceSectionId,
        subsectionId,
      });
    } catch (error) {
      return asToolError(error);
    }
  },
);

server.registerTool(
  "reno_update_service_field",
  {
    description: "Update a service field",
    inputSchema: {
      projectId: z.string().optional(),
      serviceSectionId: z.string(),
      subsectionId: z.string(),
      fieldId: z.string(),
      name: z.string(),
      notes: z.string().optional(),
      linkedSections: z.array(z.string()).optional(),
    },
  },
  async ({
    projectId,
    serviceSectionId,
    subsectionId,
    fieldId,
    name,
    notes,
    linkedSections,
  }) => {
    try {
      const resolvedProjectId = await resolveProjectId(projectId);
      await renoService.updateServiceField({
        projectId: resolvedProjectId,
        serviceSectionId,
        subsectionId,
        fieldId,
        name,
        notes: notes ?? "",
        linkedSections: linkedSections ?? [],
      });
      return asToolResult({
        ok: true,
        projectId: resolvedProjectId,
        serviceSectionId,
        subsectionId,
        fieldId,
      });
    } catch (error) {
      return asToolError(error);
    }
  },
);

server.registerTool(
  "reno_delete_service_field",
  {
    description: "Delete a service field",
    inputSchema: {
      projectId: z.string().optional(),
      serviceSectionId: z.string(),
      subsectionId: z.string(),
      fieldId: z.string(),
      confirm: z.boolean().optional(),
    },
  },
  async ({ projectId, serviceSectionId, subsectionId, fieldId, confirm }) => {
    try {
      assertDestructiveAllowed("reno_delete_service_field", confirm);
      const resolvedProjectId = await resolveProjectId(projectId);
      await renoService.deleteServiceField({
        projectId: resolvedProjectId,
        serviceSectionId,
        subsectionId,
        fieldId,
      });
      return asToolResult({
        ok: true,
        projectId: resolvedProjectId,
        serviceSectionId,
        subsectionId,
        fieldId,
      });
    } catch (error) {
      return asToolError(error);
    }
  },
);

server.registerTool(
  "reno_list_units",
  {
    description: "List units in a project",
    inputSchema: {
      projectId: z.string().optional(),
    },
  },
  async ({ projectId }) => {
    try {
      const resolvedProjectId = await resolveProjectId(projectId);
      const project = await renoService.getProjectById(resolvedProjectId);
      if (!project) {
        throw new Error(`Unknown projectId: ${resolvedProjectId}`);
      }
      return asToolResult({ units: project.units });
    } catch (error) {
      return asToolError(error);
    }
  },
);

server.registerTool(
  "reno_get_unit",
  {
    description: "Get one unit by ID",
    inputSchema: {
      projectId: z.string().optional(),
      unitId: z.string(),
    },
  },
  async ({ projectId, unitId }) => {
    try {
      const resolvedProjectId = await resolveProjectId(projectId);
      const project = await renoService.getProjectById(resolvedProjectId);
      if (!project) {
        throw new Error(`Unknown projectId: ${resolvedProjectId}`);
      }

      const unit = project.units.find((entry) => entry.id === unitId);
      if (!unit) {
        throw new Error(`Unknown unitId: ${unitId}`);
      }

      const items = project.items.filter((entry) => entry.unitId === unitId);
      return asToolResult({ unit, items });
    } catch (error) {
      return asToolError(error);
    }
  },
);

server.registerTool(
  "reno_add_unit",
  {
    description: "Add a new unit",
    inputSchema: {
      projectId: z.string().optional(),
      name: z.string(),
      floor: z.enum(["main", "basement"]),
      bedrooms: z.number().int().min(0),
      totalAreaSqm: z.number(),
      status: z.enum(["planned", "in_progress", "done"]),
      description: z.string(),
    },
  },
  async (input) => {
    try {
      const resolvedProjectId = await resolveProjectId(input.projectId);
      await renoService.addUnit({
        ...input,
        projectId: resolvedProjectId,
      });
      return asToolResult({ ok: true, projectId: resolvedProjectId });
    } catch (error) {
      return asToolError(error);
    }
  },
);

server.registerTool(
  "reno_update_unit",
  {
    description: "Update unit core fields",
    inputSchema: {
      projectId: z.string().optional(),
      unitId: z.string(),
      name: z.string(),
      floor: z.enum(["main", "basement"]),
      bedrooms: z.number().int().min(0),
      totalAreaSqm: z.number(),
      status: z.enum(["planned", "in_progress", "done"]),
      description: z.string(),
    },
  },
  async (input) => {
    try {
      const resolvedProjectId = await resolveProjectId(input.projectId);
      await renoService.updateUnit({
        ...input,
        projectId: resolvedProjectId,
      });
      return asToolResult({
        ok: true,
        projectId: resolvedProjectId,
        unitId: input.unitId,
      });
    } catch (error) {
      return asToolError(error);
    }
  },
);

server.registerTool(
  "reno_delete_unit",
  {
    description: "Delete a unit and all nested rooms",
    inputSchema: {
      projectId: z.string().optional(),
      unitId: z.string(),
      confirm: z.boolean().optional(),
    },
  },
  async (input) => {
    try {
      assertDestructiveAllowed("reno_delete_unit", input.confirm);
      const resolvedProjectId = await resolveProjectId(input.projectId);
      await renoService.deleteUnit({
        projectId: resolvedProjectId,
        unitId: input.unitId,
      });
      return asToolResult({
        ok: true,
        projectId: resolvedProjectId,
        unitId: input.unitId,
      });
    } catch (error) {
      return asToolError(error);
    }
  },
);

server.registerTool(
  "reno_add_unit_room",
  {
    description: "Add a room under a unit",
    inputSchema: {
      projectId: z.string().optional(),
      unitId: z.string(),
      roomType: z.enum([
        "kitchen",
        "living_area",
        "bedroom",
        "bathroom",
        "storage",
        "other",
      ]),
      widthMm: z.number(),
      lengthMm: z.number(),
      heightMm: z.number(),
      description: z.string(),
    },
  },
  async (input) => {
    try {
      const resolvedProjectId = await resolveProjectId(input.projectId);
      await renoService.addUnitRoom({
        ...input,
        projectId: resolvedProjectId,
      });
      return asToolResult({
        ok: true,
        projectId: resolvedProjectId,
        unitId: input.unitId,
      });
    } catch (error) {
      return asToolError(error);
    }
  },
);

server.registerTool(
  "reno_update_unit_room",
  {
    description: "Update one room under a unit",
    inputSchema: {
      projectId: z.string().optional(),
      unitId: z.string(),
      roomId: z.string(),
      roomType: z.enum([
        "kitchen",
        "living_area",
        "bedroom",
        "bathroom",
        "storage",
        "other",
      ]),
      widthMm: z.number(),
      lengthMm: z.number(),
      heightMm: z.number(),
      description: z.string(),
    },
  },
  async (input) => {
    try {
      const resolvedProjectId = await resolveProjectId(input.projectId);
      await renoService.updateUnitRoom({
        ...input,
        projectId: resolvedProjectId,
      });
      return asToolResult({
        ok: true,
        projectId: resolvedProjectId,
        unitId: input.unitId,
        roomId: input.roomId,
      });
    } catch (error) {
      return asToolError(error);
    }
  },
);

server.registerTool(
  "reno_delete_unit_room",
  {
    description: "Delete one room from a unit",
    inputSchema: {
      projectId: z.string().optional(),
      unitId: z.string(),
      roomId: z.string(),
      confirm: z.boolean().optional(),
    },
  },
  async (input) => {
    try {
      assertDestructiveAllowed("reno_delete_unit_room", input.confirm);
      const resolvedProjectId = await resolveProjectId(input.projectId);
      await renoService.deleteUnitRoom({
        projectId: resolvedProjectId,
        unitId: input.unitId,
        roomId: input.roomId,
      });
      return asToolResult({
        ok: true,
        projectId: resolvedProjectId,
        unitId: input.unitId,
        roomId: input.roomId,
      });
    } catch (error) {
      return asToolError(error);
    }
  },
);

server.registerTool(
  "reno_get_project",
  {
    description:
      "Get full project document by ID, or default project when omitted",
    inputSchema: {
      projectId: z.string().optional(),
    },
  },
  async ({ projectId }) => {
    try {
      const resolvedProjectId = await resolveProjectId(projectId);
      const project = await renoService.getProjectById(resolvedProjectId);
      if (!project) {
        throw new Error(`Unknown projectId: ${resolvedProjectId}`);
      }
      return asToolResult({ project });
    } catch (error) {
      return asToolError(error);
    }
  },
);

server.registerTool(
  "reno_update_project_meta",
  {
    description:
      "Update project-level metadata and overview (name, address, phase, target completion, overview details)",
    inputSchema: {
      projectId: z.string().optional(),
      name: z.string(),
      address: z.string(),
      phase: z.string(),
      targetCompletion: z.string(),
      overview: z.object({
        projectDescription: z.string(),
        area: z.object({
          groundFloorSqFtApprox: z.number(),
          basementSqFtApprox: z.number(),
        }),
        occupancyPlan: z.object({
          groundFloorUnits: z.number(),
          basementUnits: z.number(),
          totalUnits: z.number(),
        }),
        currentState: z.object({
          permitObtained: z.boolean(),
          occupancy: z.string(),
          framing: z.string(),
          groundFloorExteriorWalls: z.string(),
          basementExteriorWalls: z.string(),
          hazmat: z.string(),
        }),
        unitMixAndSystems: z.object({
          totalUnits: z.number(),
          bathrooms: z.number(),
          kitchens: z.number(),
          laundry: z.string(),
          hotWater: z.string(),
          basementCeilingHeight: z.string(),
        }),
        tradesAndFinancing: z.object({
          generalContractor: z.string(),
          confirmedTrades: z.array(z.string()),
          pendingBeforeStart: z.array(z.string()),
          financing: z.string(),
        }),
        scopeExclusions: z.array(z.string()),
      }),
    },
  },
  async (input) => {
    try {
      const resolvedProjectId = await resolveProjectId(input.projectId);
      await renoService.updateProjectMeta({
        projectId: resolvedProjectId,
        name: input.name,
        address: input.address,
        phase: input.phase,
        targetCompletion: input.targetCompletion,
        overview: input.overview,
      });
      return asToolResult({ ok: true, projectId: resolvedProjectId });
    } catch (error) {
      return asToolError(error);
    }
  },
);

server.registerTool(
  "reno_get_project_meta",
  {
    description:
      "Get project-level metadata and overview (name, address, phase, target completion, overview)",
    inputSchema: {
      projectId: z.string().optional(),
    },
  },
  async ({ projectId }) => {
    try {
      const resolvedProjectId = await resolveProjectId(projectId);
      const project = await renoService.getProjectById(resolvedProjectId);
      if (!project) {
        throw new Error(`Unknown projectId: ${resolvedProjectId}`);
      }
      return asToolResult({
        projectId: project.id,
        name: project.name,
        address: project.address,
        phase: project.phase,
        targetCompletion: project.targetCompletion,
        overview: project.overview,
      });
    } catch (error) {
      return asToolError(error);
    }
  },
);

server.registerTool(
  "reno_list_attachments",
  {
    description:
      "List project attachments with optional scope/category filters",
    inputSchema: {
      projectId: z.string().optional(),
      scopeType: z.enum(["project", "section", "item", "expense"]).optional(),
      scopeId: z.string().nullable().optional(),
      category: z
        .enum(["drawing", "invoice", "permit", "photo", "other"])
        .optional(),
    },
  },
  async ({ projectId, scopeType, scopeId, category }) => {
    try {
      const resolvedProjectId = await resolveProjectId(projectId);
      const project = await renoService.getProjectById(resolvedProjectId);
      if (!project) {
        throw new Error(`Unknown projectId: ${resolvedProjectId}`);
      }

      const attachments = project.attachments.filter((entry) => {
        const scopeTypeMatch = !scopeType || entry.scopeType === scopeType;
        const scopeIdMatch =
          scopeId === undefined ? true : (entry.scopeId ?? null) === scopeId;
        const categoryMatch = !category || entry.category === category;
        return scopeTypeMatch && scopeIdMatch && categoryMatch;
      });

      return asToolResult({ projectId: resolvedProjectId, attachments });
    } catch (error) {
      return asToolError(error);
    }
  },
);

server.registerTool(
  "reno_add_attachment_from_path",
  {
    description:
      "Attach a local file to a project/section/item/expense using a filesystem path",
    inputSchema: {
      projectId: z.string().optional(),
      scopeType: z.enum(["project", "section", "item", "expense"]),
      scopeId: z.string().nullable().optional(),
      category: z.enum(["drawing", "invoice", "permit", "photo", "other"]),
      filePath: z.string(),
      fileTitle: z.string().optional(),
      note: z.string().optional(),
    },
  },
  async (input) => {
    try {
      const resolvedProjectId = await resolveProjectId(input.projectId);
      const fileBuffer = await readFile(input.filePath);
      const originalName = path.basename(input.filePath);
      const mimeType = guessMimeType(input.filePath);

      await renoService.addAttachment({
        projectId: resolvedProjectId,
        scopeType: input.scopeType,
        scopeId: input.scopeId ?? null,
        category: input.category,
        fileTitle: input.fileTitle,
        note: input.note,
        originalName,
        mimeType,
        sizeBytes: fileBuffer.length,
        fileBuffer,
      });
      return asToolResult({ ok: true, projectId: resolvedProjectId });
    } catch (error) {
      return asToolError(error);
    }
  },
);

server.registerTool(
  "reno_delete_attachment",
  {
    description: "Delete one attachment by ID",
    inputSchema: {
      projectId: z.string().optional(),
      attachmentId: z.string(),
      confirm: z.boolean().optional(),
    },
  },
  async ({ projectId, attachmentId, confirm }) => {
    try {
      assertDestructiveAllowed("reno_delete_attachment", confirm);
      const resolvedProjectId = await resolveProjectId(projectId);
      await renoService.deleteAttachment({
        projectId: resolvedProjectId,
        attachmentId,
      });
      return asToolResult({
        ok: true,
        projectId: resolvedProjectId,
        attachmentId,
      });
    } catch (error) {
      return asToolError(error);
    }
  },
);

server.registerTool(
  "reno_get_attachment_download_url",
  {
    description: "Get app download URL for an attachment",
    inputSchema: {
      projectId: z.string().optional(),
      attachmentId: z.string(),
      baseUrl: z.string().optional(),
    },
  },
  async ({ projectId, attachmentId, baseUrl }) => {
    try {
      const resolvedProjectId = await resolveProjectId(projectId);
      const effectiveBase =
        baseUrl || process.env.RENO_APP_BASE_URL || "http://localhost:3000";
      const downloadUrl = `${effectiveBase.replace(/\/$/, "")}/api/files/${attachmentId}/download?projectId=${encodeURIComponent(resolvedProjectId)}`;
      return asToolResult({
        projectId: resolvedProjectId,
        attachmentId,
        downloadUrl,
      });
    } catch (error) {
      return asToolError(error);
    }
  },
);

server.registerTool(
  "reno_list_sections",
  {
    description: "List sections in a project",
    inputSchema: {
      projectId: z.string().optional(),
    },
  },
  async ({ projectId }) => {
    try {
      const resolvedProjectId = await resolveProjectId(projectId);
      const project = await renoService.getProjectById(resolvedProjectId);
      if (!project) {
        throw new Error(`Unknown projectId: ${resolvedProjectId}`);
      }
      return asToolResult({ sections: project.sections });
    } catch (error) {
      return asToolError(error);
    }
  },
);

server.registerTool(
  "reno_list_items",
  {
    description: "List items with optional section/status filtering",
    inputSchema: {
      projectId: z.string().optional(),
      sectionId: z.string().optional(),
      unitId: z.string().optional(),
      status: z.enum(["todo", "in_progress", "blocked", "done"]).optional(),
    },
  },
  async ({ projectId, sectionId, unitId, status }) => {
    try {
      const resolvedProjectId = await resolveProjectId(projectId);
      const project = await renoService.getProjectById(resolvedProjectId);
      if (!project) {
        throw new Error(`Unknown projectId: ${resolvedProjectId}`);
      }

      const items = project.items.filter((item) => {
        const sectionMatch = !sectionId || item.sectionId === sectionId;
        const unitMatch = !unitId || item.unitId === unitId;
        const statusMatch = !status || item.status === status;
        return sectionMatch && unitMatch && statusMatch;
      });
      return asToolResult({ items });
    } catch (error) {
      return asToolError(error);
    }
  },
);

server.registerTool(
  "reno_get_item",
  {
    description: "Get one item by ID",
    inputSchema: {
      projectId: z.string().optional(),
      itemId: z.string(),
    },
  },
  async ({ projectId, itemId }) => {
    try {
      const resolvedProjectId = await resolveProjectId(projectId);
      const project = await renoService.getProjectById(resolvedProjectId);
      if (!project) {
        throw new Error(`Unknown projectId: ${resolvedProjectId}`);
      }

      const item = project.items.find((entry) => entry.id === itemId);
      if (!item) {
        throw new Error(`Unknown itemId: ${itemId}`);
      }

      return asToolResult({ item });
    } catch (error) {
      return asToolError(error);
    }
  },
);

server.registerTool(
  "reno_update_item_fields",
  {
    description:
      "Update core item fields (title, estimate, status, dates, performers, overview, note)",
    inputSchema: {
      projectId: z.string().optional(),
      itemId: z.string(),
      title: z.string(),
      estimate: z.number(),
      status: z.enum(["todo", "in_progress", "blocked", "done"]),
      unitId: z.string().nullable().optional(),
      estimatedCompletionDate: z.string().optional(),
      actualCompletionDate: z.string().optional(),
      performers: z.array(z.string()),
      description: z.string(),
      note: z.string(),
    },
  },
  async (input) => {
    try {
      const resolvedProjectId = await resolveProjectId(input.projectId);
      await renoService.updateItemFields({
        ...input,
        projectId: resolvedProjectId,
      });
      return asToolResult({
        ok: true,
        projectId: resolvedProjectId,
        itemId: input.itemId,
      });
    } catch (error) {
      return asToolError(error);
    }
  },
);

server.registerTool(
  "reno_update_item_status",
  {
    description: "Quickly update item status only",
    inputSchema: {
      projectId: z.string().optional(),
      itemId: z.string(),
      status: z.enum(["todo", "in_progress", "blocked", "done"]),
    },
  },
  async ({ projectId, itemId, status }) => {
    try {
      const resolvedProjectId = await resolveProjectId(projectId);
      await renoService.updateItemStatus({
        projectId: resolvedProjectId,
        itemId,
        status,
      });
      return asToolResult({
        ok: true,
        projectId: resolvedProjectId,
        itemId,
        status,
      });
    } catch (error) {
      return asToolError(error);
    }
  },
);

server.registerTool(
  "reno_add_expense",
  {
    description: "Add an expense to an item",
    inputSchema: {
      projectId: z.string().optional(),
      itemId: z.string(),
      date: z.string(),
      amount: z.number(),
      type: z.enum(["material", "labor", "permit", "tool", "other"]),
      vendor: z.string().optional(),
      note: z.string().optional(),
    },
  },
  async (input) => {
    try {
      const resolvedProjectId = await resolveProjectId(input.projectId);
      await renoService.addItemExpense({
        ...input,
        projectId: resolvedProjectId,
      });
      return asToolResult({
        ok: true,
        projectId: resolvedProjectId,
        itemId: input.itemId,
      });
    } catch (error) {
      return asToolError(error);
    }
  },
);

server.registerTool(
  "reno_update_expense",
  {
    description: "Update an existing item expense",
    inputSchema: {
      projectId: z.string().optional(),
      itemId: z.string(),
      expenseId: z.string(),
      date: z.string(),
      amount: z.number(),
      type: z.enum(["material", "labor", "permit", "tool", "other"]),
      vendor: z.string().optional(),
      note: z.string().optional(),
    },
  },
  async (input) => {
    try {
      const resolvedProjectId = await resolveProjectId(input.projectId);
      await renoService.updateItemExpense({
        ...input,
        projectId: resolvedProjectId,
      });
      return asToolResult({
        ok: true,
        projectId: resolvedProjectId,
        itemId: input.itemId,
        expenseId: input.expenseId,
      });
    } catch (error) {
      return asToolError(error);
    }
  },
);

server.registerTool(
  "reno_delete_expense",
  {
    description: "Delete an expense from an item",
    inputSchema: {
      projectId: z.string().optional(),
      itemId: z.string(),
      expenseId: z.string(),
      confirm: z.boolean().optional(),
    },
  },
  async (input) => {
    try {
      assertDestructiveAllowed("reno_delete_expense", input.confirm);
      const resolvedProjectId = await resolveProjectId(input.projectId);
      await renoService.removeItemExpense({
        ...input,
        projectId: resolvedProjectId,
      });
      return asToolResult({
        ok: true,
        projectId: resolvedProjectId,
        itemId: input.itemId,
        expenseId: input.expenseId,
      });
    } catch (error) {
      return asToolError(error);
    }
  },
);

server.registerTool(
  "reno_add_item",
  {
    description: "Add a new item under a section",
    inputSchema: {
      projectId: z.string().optional(),
      sectionId: z.string(),
      unitId: z.string().nullable().optional(),
      title: z.string(),
      estimate: z.number().optional(),
    },
  },
  async (input) => {
    try {
      const resolvedProjectId = await resolveProjectId(input.projectId);
      await renoService.addSectionItem({
        ...input,
        projectId: resolvedProjectId,
      });
      return asToolResult({
        ok: true,
        projectId: resolvedProjectId,
        sectionId: input.sectionId,
      });
    } catch (error) {
      return asToolError(error);
    }
  },
);

server.registerTool(
  "reno_delete_item",
  {
    description: "Delete an item by ID",
    inputSchema: {
      projectId: z.string().optional(),
      itemId: z.string(),
      confirm: z.boolean().optional(),
    },
  },
  async (input) => {
    try {
      assertDestructiveAllowed("reno_delete_item", input.confirm);
      const resolvedProjectId = await resolveProjectId(input.projectId);
      await renoService.deleteItem({
        ...input,
        projectId: resolvedProjectId,
      });
      return asToolResult({
        ok: true,
        projectId: resolvedProjectId,
        itemId: input.itemId,
      });
    } catch (error) {
      return asToolError(error);
    }
  },
);

server.registerTool(
  "reno_add_material",
  {
    description: "Add a material line to an item",
    inputSchema: {
      projectId: z.string().optional(),
      itemId: z.string(),
      name: z.string(),
      quantity: z.number(),
      unitType: z.enum([
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
      ]),
      estimatedPrice: z.number(),
      url: z.string(),
      note: z.string().optional(),
    },
  },
  async (input) => {
    try {
      const resolvedProjectId = await resolveProjectId(input.projectId);
      await renoService.addItemMaterial({
        ...input,
        projectId: resolvedProjectId,
      });
      return asToolResult({
        ok: true,
        projectId: resolvedProjectId,
        itemId: input.itemId,
      });
    } catch (error) {
      return asToolError(error);
    }
  },
);

server.registerTool(
  "reno_update_material",
  {
    description: "Update an existing item material line",
    inputSchema: {
      projectId: z.string().optional(),
      itemId: z.string(),
      materialId: z.string(),
      name: z.string(),
      quantity: z.number(),
      unitType: z.enum([
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
      ]),
      estimatedPrice: z.number(),
      url: z.string(),
      note: z.string().optional(),
    },
  },
  async (input) => {
    try {
      const resolvedProjectId = await resolveProjectId(input.projectId);
      await renoService.updateItemMaterial({
        ...input,
        projectId: resolvedProjectId,
      });
      return asToolResult({
        ok: true,
        projectId: resolvedProjectId,
        itemId: input.itemId,
        materialId: input.materialId,
      });
    } catch (error) {
      return asToolError(error);
    }
  },
);

server.registerTool(
  "reno_delete_material",
  {
    description: "Delete a material line from an item",
    inputSchema: {
      projectId: z.string().optional(),
      itemId: z.string(),
      materialId: z.string(),
      confirm: z.boolean().optional(),
    },
  },
  async (input) => {
    try {
      assertDestructiveAllowed("reno_delete_material", input.confirm);
      const resolvedProjectId = await resolveProjectId(input.projectId);
      await renoService.removeItemMaterial({
        ...input,
        projectId: resolvedProjectId,
      });
      return asToolResult({
        ok: true,
        projectId: resolvedProjectId,
        itemId: input.itemId,
        materialId: input.materialId,
      });
    } catch (error) {
      return asToolError(error);
    }
  },
);

server.registerTool(
  "reno_add_section",
  {
    description: "Add a section to a project",
    inputSchema: {
      projectId: z.string().optional(),
      title: z.string(),
      description: z.string(),
    },
  },
  async (input) => {
    try {
      const resolvedProjectId = await resolveProjectId(input.projectId);
      await renoService.addSection({
        ...input,
        projectId: resolvedProjectId,
      });
      return asToolResult({
        ok: true,
        projectId: resolvedProjectId,
      });
    } catch (error) {
      return asToolError(error);
    }
  },
);

server.registerTool(
  "reno_update_section",
  {
    description: "Update section title/description",
    inputSchema: {
      projectId: z.string().optional(),
      sectionId: z.string(),
      title: z.string(),
      description: z.string(),
    },
  },
  async (input) => {
    try {
      const resolvedProjectId = await resolveProjectId(input.projectId);
      await renoService.updateSection({
        ...input,
        projectId: resolvedProjectId,
      });
      return asToolResult({
        ok: true,
        projectId: resolvedProjectId,
        sectionId: input.sectionId,
      });
    } catch (error) {
      return asToolError(error);
    }
  },
);

server.registerTool(
  "reno_delete_section",
  {
    description: "Delete a section (also removes its items and unlinks notes)",
    inputSchema: {
      projectId: z.string().optional(),
      sectionId: z.string(),
      confirm: z.boolean().optional(),
    },
  },
  async (input) => {
    try {
      assertDestructiveAllowed("reno_delete_section", input.confirm);
      const resolvedProjectId = await resolveProjectId(input.projectId);
      await renoService.deleteSection({
        ...input,
        projectId: resolvedProjectId,
      });
      return asToolResult({
        ok: true,
        projectId: resolvedProjectId,
        sectionId: input.sectionId,
      });
    } catch (error) {
      return asToolError(error);
    }
  },
);

server.registerTool(
  "reno_move_section",
  {
    description: "Move a section up or down in display order",
    inputSchema: {
      projectId: z.string().optional(),
      sectionId: z.string(),
      direction: z.enum(["up", "down"]),
    },
  },
  async (input) => {
    try {
      const resolvedProjectId = await resolveProjectId(input.projectId);
      await renoService.moveSection({
        projectId: resolvedProjectId,
        sectionId: input.sectionId,
        direction: input.direction,
      });
      return asToolResult({
        ok: true,
        projectId: resolvedProjectId,
        sectionId: input.sectionId,
        direction: input.direction,
      });
    } catch (error) {
      return asToolError(error);
    }
  },
);

server.registerTool(
  "reno_set_section_position",
  {
    description:
      "Set a section's exact display position (0-based). Other sections are reindexed automatically.",
    inputSchema: {
      projectId: z.string().optional(),
      sectionId: z.string(),
      position: z.number().int().min(0),
    },
  },
  async (input) => {
    try {
      const resolvedProjectId = await resolveProjectId(input.projectId);
      await renoService.setSectionPosition({
        projectId: resolvedProjectId,
        sectionId: input.sectionId,
        position: input.position,
      });
      return asToolResult({
        ok: true,
        projectId: resolvedProjectId,
        sectionId: input.sectionId,
        position: input.position,
      });
    } catch (error) {
      return asToolError(error);
    }
  },
);

server.registerTool(
  "reno_add_note",
  {
    description: "Add a project lesson-learned note",
    inputSchema: {
      projectId: z.string().optional(),
      title: z.string(),
      content: z.string(),
      linkedSectionId: z.string().nullable().optional(),
    },
  },
  async (input) => {
    try {
      const resolvedProjectId = await resolveProjectId(input.projectId);
      await renoService.addProjectNote({
        ...input,
        projectId: resolvedProjectId,
      });
      return asToolResult({ ok: true, projectId: resolvedProjectId });
    } catch (error) {
      return asToolError(error);
    }
  },
);

server.registerTool(
  "reno_list_notes",
  {
    description: "List lessons-learned notes, optionally filtered by section",
    inputSchema: {
      projectId: z.string().optional(),
      linkedSectionId: z.string().nullable().optional(),
    },
  },
  async ({ projectId, linkedSectionId }) => {
    try {
      const resolvedProjectId = await resolveProjectId(projectId);
      const project = await renoService.getProjectById(resolvedProjectId);
      if (!project) {
        throw new Error(`Unknown projectId: ${resolvedProjectId}`);
      }

      const notes = project.notes.filter((note) => {
        if (linkedSectionId === undefined) return true;
        return (note.linkedSectionId ?? null) === linkedSectionId;
      });
      return asToolResult({ notes });
    } catch (error) {
      return asToolError(error);
    }
  },
);

server.registerTool(
  "reno_update_note",
  {
    description: "Update an existing note title/content",
    inputSchema: {
      projectId: z.string().optional(),
      noteId: z.string(),
      title: z.string(),
      content: z.string(),
    },
  },
  async (input) => {
    try {
      const resolvedProjectId = await resolveProjectId(input.projectId);
      await renoService.updateProjectNoteContent({
        ...input,
        projectId: resolvedProjectId,
      });
      return asToolResult({
        ok: true,
        projectId: resolvedProjectId,
        noteId: input.noteId,
      });
    } catch (error) {
      return asToolError(error);
    }
  },
);

server.registerTool(
  "reno_delete_note",
  {
    description: "Delete a lesson-learned note by ID",
    inputSchema: {
      projectId: z.string().optional(),
      noteId: z.string(),
      confirm: z.boolean().optional(),
    },
  },
  async (input) => {
    try {
      assertDestructiveAllowed("reno_delete_note", input.confirm);
      const resolvedProjectId = await resolveProjectId(input.projectId);
      await renoService.deleteProjectNote({
        projectId: resolvedProjectId,
        noteId: input.noteId,
      });
      return asToolResult({
        ok: true,
        projectId: resolvedProjectId,
        noteId: input.noteId,
      });
    } catch (error) {
      return asToolError(error);
    }
  },
);

server.registerTool(
  "reno_link_note",
  {
    description: "Link a note to a section (or null for whole project)",
    inputSchema: {
      projectId: z.string().optional(),
      noteId: z.string(),
      linkedSectionId: z.string().nullable().optional(),
    },
  },
  async (input) => {
    try {
      const resolvedProjectId = await resolveProjectId(input.projectId);
      await renoService.updateProjectNoteLink({
        ...input,
        projectId: resolvedProjectId,
      });
      return asToolResult({
        ok: true,
        projectId: resolvedProjectId,
        noteId: input.noteId,
      });
    } catch (error) {
      return asToolError(error);
    }
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logInfo(
    `reno-manager MCP server running on stdio (safe_mode=${SAFE_MODE ? "on" : "off"})`,
  );
}

main().catch((error) => {
  console.error("MCP server failed:", error);
  process.exit(1);
});
