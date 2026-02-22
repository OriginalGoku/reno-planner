import { readStorageFile } from "@/lib/local-file-store";
import { loadRenoProject } from "@/lib/reno-project-service";

type RouteContext = {
  params: Promise<{ attachmentId: string }>;
};

function encodeFilename(name: string) {
  return name.replace(/"/g, "");
}

export async function GET(request: Request, context: RouteContext) {
  const { attachmentId } = await context.params;
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");

  if (!projectId) {
    return new Response("projectId is required.", { status: 400 });
  }

  const project = await loadRenoProject(projectId);
  const attachment = project.attachments.find((entry) => entry.id === attachmentId);
  if (!attachment) {
    return new Response("Attachment not found.", { status: 404 });
  }

  try {
    const data = await readStorageFile(attachment.storageKey);
    const filename = encodeFilename(attachment.originalName);
    return new Response(data, {
      status: 200,
      headers: {
        "Content-Type": attachment.mimeType || "application/octet-stream",
        "Content-Length": String(attachment.sizeBytes),
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch {
    return new Response("File not found in storage.", { status: 404 });
  }
}
