import { NextResponse } from "next/server";
import { renoService } from "@/core/reno-service";

type RouteContext = {
  params: Promise<{ attachmentId: string }>;
};

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { attachmentId } = await context.params;
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId is required." },
        { status: 400 },
      );
    }

    await renoService.deleteAttachment({ projectId, attachmentId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delete failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
