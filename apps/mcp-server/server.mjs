#!/usr/bin/env node

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
      status: z.enum(["todo", "in_progress", "blocked", "done"]).optional(),
    },
  },
  async ({ projectId, sectionId, status }) => {
    try {
      const resolvedProjectId = await resolveProjectId(projectId);
      const project = await renoService.getProjectById(resolvedProjectId);
      if (!project) {
        throw new Error(`Unknown projectId: ${resolvedProjectId}`);
      }

      const items = project.items.filter((item) => {
        const sectionMatch = !sectionId || item.sectionId === sectionId;
        const statusMatch = !status || item.status === status;
        return sectionMatch && statusMatch;
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
      estimatedPrice: z.number(),
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
      estimatedPrice: z.number(),
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
