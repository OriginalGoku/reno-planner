"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  AttachmentScopeType,
  RenovationAttachment,
} from "@/lib/reno-data-loader";

const attachmentCategories = [
  "drawing",
  "invoice",
  "permit",
  "photo",
  "other",
] as const;

type Feedback = {
  type: "success" | "error";
  message: string;
} | null;

type AttachmentManagerProps = {
  projectId: string;
  scopeType: AttachmentScopeType;
  scopeId?: string | null;
  attachments: RenovationAttachment[];
  title: string;
  compact?: boolean;
};

export function AttachmentManager({
  projectId,
  scopeType,
  scopeId,
  attachments,
  title,
  compact = false,
}: AttachmentManagerProps) {
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] =
    useState<RenovationAttachment["category"]>("other");
  const [fileTitle, setFileTitle] = useState("");
  const [note, setNote] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const filteredAttachments = useMemo(
    () =>
      attachments.filter(
        (attachment) =>
          attachment.scopeType === scopeType &&
          (attachment.scopeId ?? null) === (scopeId ?? null),
      ),
    [attachments, scopeId, scopeType],
  );

  function upload() {
    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.set("projectId", projectId);
    formData.set("scopeType", scopeType);
    if (scopeId) {
      formData.set("scopeId", scopeId);
    }
    formData.set("category", category);
    if (fileTitle.trim()) {
      formData.set("fileTitle", fileTitle.trim());
    }
    if (note.trim()) {
      formData.set("note", note.trim());
    }
    formData.set("file", file);

    setFeedback(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/files/upload", {
          method: "POST",
          body: formData,
        });
        if (!response.ok) {
          throw new Error("Upload failed.");
        }

        setFile(null);
        setFileTitle("");
        setNote("");
        setCategory("other");
        setFeedback({ type: "success", message: "File uploaded." });
        router.refresh();
      } catch {
        setFeedback({
          type: "error",
          message: "Could not upload file. Please try again.",
        });
      }
    });
  }

  function removeAttachment(attachment: RenovationAttachment) {
    const confirmed = window.confirm(
      `Delete "${attachment.fileTitle || attachment.originalName}"?`,
    );
    if (!confirmed) {
      return;
    }

    setFeedback(null);
    startTransition(async () => {
      try {
        const response = await fetch(
          `/api/files/${attachment.id}?projectId=${encodeURIComponent(projectId)}`,
          { method: "DELETE" },
        );
        if (!response.ok) {
          throw new Error("Delete failed.");
        }
        setFeedback({ type: "success", message: "File deleted." });
        router.refresh();
      } catch {
        setFeedback({
          type: "error",
          message: "Could not delete file. Please try again.",
        });
      }
    });
  }

  return (
    <section className={`rounded-lg border p-4 ${compact ? "space-y-3" : "space-y-4"}`}>
      <h3 className="text-sm font-semibold">{title}</h3>

      <div className={`grid gap-2 ${compact ? "md:grid-cols-2" : "md:grid-cols-5"}`}>
        <input
          type="file"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className="rounded-md border bg-background px-2 py-1.5 text-sm md:col-span-2"
        />
        <select
          value={category}
          onChange={(event) =>
            setCategory(event.target.value as RenovationAttachment["category"])
          }
          className="rounded-md border bg-background px-2 py-1.5 text-sm"
        >
          {attachmentCategories.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <input
          value={fileTitle}
          onChange={(event) => setFileTitle(event.target.value)}
          className="rounded-md border bg-background px-2 py-1.5 text-sm"
          placeholder="Optional file title"
        />
        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className="rounded-md border bg-background px-2 py-1.5 text-sm"
          placeholder="Optional note"
        />
      </div>
      <button
        type="button"
        onClick={upload}
        disabled={isPending || !file}
        className="rounded-md bg-foreground px-3 py-1.5 text-sm text-background disabled:opacity-60"
      >
        {isPending ? "Uploading..." : "Upload File"}
      </button>
      {feedback ? (
        <p
          className={`text-xs ${
            feedback.type === "success" ? "text-emerald-700" : "text-red-700"
          }`}
        >
          {feedback.message}
        </p>
      ) : null}

      <div className="space-y-2">
        {filteredAttachments.length ? (
          filteredAttachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex flex-wrap items-start justify-between gap-2 rounded-md border p-2 text-sm"
            >
              <div className="min-w-0 space-y-1">
                <p className="font-medium">
                  {attachment.fileTitle || attachment.originalName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {attachment.category} • {(attachment.sizeBytes / 1024).toFixed(1)} KB
                </p>
                {attachment.note ? (
                  <p className="text-xs text-muted-foreground">{attachment.note}</p>
                ) : null}
              </div>
              <div className="flex gap-2">
                <a
                  href={`/api/files/${attachment.id}/download?projectId=${encodeURIComponent(projectId)}`}
                  className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                >
                  Download
                </a>
                <button
                  type="button"
                  onClick={() => removeAttachment(attachment)}
                  disabled={isPending}
                  className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-60"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-xs text-muted-foreground">No files uploaded yet.</p>
        )}
      </div>
    </section>
  );
}
