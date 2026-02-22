import { NextResponse } from "next/server";
import { renoService } from "@/core/reno-service";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const projectId = formData.get("projectId");
    const scopeType = formData.get("scopeType");
    const scopeId = formData.get("scopeId");
    const category = formData.get("category");
    const fileTitle = formData.get("fileTitle");
    const note = formData.get("note");
    const file = formData.get("file");

    if (
      typeof projectId !== "string" ||
      typeof scopeType !== "string" ||
      typeof category !== "string"
    ) {
      return NextResponse.json(
        { error: "projectId, scopeType and category are required." },
        { status: 400 },
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    await renoService.addAttachment({
      projectId,
      scopeType: scopeType as "project" | "section" | "item" | "expense",
      scopeId: typeof scopeId === "string" && scopeId.trim() ? scopeId : null,
      category: category as "drawing" | "invoice" | "permit" | "photo" | "other",
      fileTitle: typeof fileTitle === "string" ? fileTitle : undefined,
      note: typeof note === "string" ? note : undefined,
      originalName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      fileBuffer: buffer,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
