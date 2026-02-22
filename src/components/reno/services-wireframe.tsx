"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type {
  RenovationSection,
  ServiceSection,
  ServiceSubsection,
} from "@/lib/reno-data-loader";
import {
  addServiceFieldAction,
  addServiceSectionAction,
  addServiceSubsectionAction,
  deleteServiceFieldAction,
  deleteServiceSectionAction,
  deleteServiceSubsectionAction,
  updateServiceFieldAction,
  updateServiceSectionAction,
  updateServiceSubsectionAction,
} from "@/lib/reno-actions";

type ServicesWireframeProps = {
  projectId: string;
  sections: RenovationSection[];
  initialServiceSections: ServiceSection[];
  filterServiceSectionId?: string;
  filterSubsectionId?: string;
};

type Feedback = {
  type: "success" | "error";
  message: string;
} | null;

type FieldDraft = {
  name: string;
  notes: string;
  linkedSections: string[];
};

function emptyFieldDraft(): FieldDraft {
  return {
    name: "",
    notes: "",
    linkedSections: [],
  };
}

export function ServicesWireframe({
  projectId,
  sections,
  initialServiceSections,
  filterServiceSectionId,
  filterSubsectionId,
}: ServicesWireframeProps) {
  const [serviceSections] = useState(initialServiceSections);
  const [newSectionName, setNewSectionName] = useState("");
  const [newSubsectionBySection, setNewSubsectionBySection] = useState<
    Record<string, string>
  >({});
  const [newFieldBySubsection, setNewFieldBySubsection] = useState<
    Record<string, FieldDraft>
  >({});
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionName, setEditingSectionName] = useState("");
  const [editingSubsectionKey, setEditingSubsectionKey] = useState<
    string | null
  >(null);
  const [editingSubsectionName, setEditingSubsectionName] = useState("");
  const [editingFieldKey, setEditingFieldKey] = useState<string | null>(null);
  const [editingFieldDraft, setEditingFieldDraft] = useState<FieldDraft | null>(
    null,
  );
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const sectionOptions = useMemo(
    () =>
      [...sections]
        .sort((a, b) => a.position - b.position)
        .map((section) => ({ id: section.id, title: section.title })),
    [sections],
  );

  const visibleServiceSections = useMemo(() => {
    let next = serviceSections;
    if (filterServiceSectionId) {
      next = next.filter((entry) => entry.id === filterServiceSectionId);
    }
    if (filterSubsectionId) {
      next = next
        .map((entry) => ({
          ...entry,
          subsections: entry.subsections.filter(
            (subsection) => subsection.id === filterSubsectionId,
          ),
        }))
        .filter((entry) => entry.subsections.length > 0);
    }
    return next;
  }, [serviceSections, filterServiceSectionId, filterSubsectionId]);

  const isFocusedSubsectionView = Boolean(
    filterServiceSectionId && filterSubsectionId,
  );

  const focusedSubsection = useMemo(() => {
    if (!isFocusedSubsectionView) {
      return null;
    }
    const serviceSection = visibleServiceSections[0];
    return serviceSection?.subsections[0] ?? null;
  }, [isFocusedSubsectionView, visibleServiceSections]);

  const focusedContext = useMemo(() => {
    if (!isFocusedSubsectionView) {
      return null;
    }
    const serviceSection = visibleServiceSections[0];
    const subsection = serviceSection?.subsections[0];
    if (!serviceSection || !subsection) {
      return null;
    }
    return {
      serviceSection,
      subsection,
      subsectionKey: `${serviceSection.id}:${subsection.id}`,
    };
  }, [isFocusedSubsectionView, visibleServiceSections]);

  function addServiceSection() {
    const name = newSectionName.trim();
    if (!name) return;
    setFeedback(null);

    startTransition(async () => {
      try {
        await addServiceSectionAction({ projectId, name });
        setNewSectionName("");
        setFeedback({ type: "success", message: "Section added." });
        router.refresh();
      } catch {
        setFeedback({ type: "error", message: "Could not add section." });
        router.refresh();
      }
    });
  }

  function beginEditSection(section: ServiceSection) {
    setEditingSectionId(section.id);
    setEditingSectionName(section.name);
  }

  function saveSection(sectionId: string) {
    const name = editingSectionName.trim();
    if (!name) return;
    setFeedback(null);
    startTransition(async () => {
      try {
        await updateServiceSectionAction({
          projectId,
          serviceSectionId: sectionId,
          name,
        });
        setEditingSectionId(null);
        setEditingSectionName("");
        setFeedback({ type: "success", message: "Section updated." });
        router.refresh();
      } catch {
        setFeedback({ type: "error", message: "Could not update section." });
        router.refresh();
      }
    });
  }

  function removeSection(sectionId: string, name: string) {
    if (!window.confirm(`Delete "${name}" and all subsections/fields?`)) return;
    setFeedback(null);
    startTransition(async () => {
      try {
        await deleteServiceSectionAction({
          projectId,
          serviceSectionId: sectionId,
        });
        setFeedback({ type: "success", message: "Section deleted." });
        router.refresh();
      } catch {
        setFeedback({ type: "error", message: "Could not delete section." });
        router.refresh();
      }
    });
  }

  function addSubsection(serviceSectionId: string) {
    const name = (newSubsectionBySection[serviceSectionId] ?? "").trim();
    if (!name) return;
    setFeedback(null);
    startTransition(async () => {
      try {
        await addServiceSubsectionAction({
          projectId,
          serviceSectionId,
          name,
        });
        setNewSubsectionBySection((current) => ({
          ...current,
          [serviceSectionId]: "",
        }));
        setFeedback({ type: "success", message: "Subsection added." });
        router.refresh();
      } catch {
        setFeedback({ type: "error", message: "Could not add subsection." });
        router.refresh();
      }
    });
  }

  function beginEditSubsection(
    serviceSectionId: string,
    subsection: ServiceSubsection,
  ) {
    setEditingSubsectionKey(`${serviceSectionId}:${subsection.id}`);
    setEditingSubsectionName(subsection.name);
  }

  function saveSubsection(serviceSectionId: string, subsectionId: string) {
    const name = editingSubsectionName.trim();
    if (!name) return;
    setFeedback(null);
    startTransition(async () => {
      try {
        await updateServiceSubsectionAction({
          projectId,
          serviceSectionId,
          subsectionId,
          name,
        });
        setEditingSubsectionKey(null);
        setEditingSubsectionName("");
        setFeedback({ type: "success", message: "Subsection updated." });
        router.refresh();
      } catch {
        setFeedback({ type: "error", message: "Could not update subsection." });
        router.refresh();
      }
    });
  }

  function removeSubsection(
    serviceSectionId: string,
    subsectionId: string,
    name: string,
  ) {
    if (!window.confirm(`Delete "${name}" and all fields?`)) return;
    setFeedback(null);
    startTransition(async () => {
      try {
        await deleteServiceSubsectionAction({
          projectId,
          serviceSectionId,
          subsectionId,
        });
        setFeedback({ type: "success", message: "Subsection deleted." });
        router.refresh();
      } catch {
        setFeedback({ type: "error", message: "Could not delete subsection." });
        router.refresh();
      }
    });
  }

  function addField(serviceSectionId: string, subsectionId: string) {
    const key = `${serviceSectionId}:${subsectionId}`;
    const draft = newFieldBySubsection[key] ?? emptyFieldDraft();
    const name = draft.name.trim();
    if (!name) return;
    setFeedback(null);
    startTransition(async () => {
      try {
        await addServiceFieldAction({
          projectId,
          serviceSectionId,
          subsectionId,
          name,
          notes: draft.notes,
          linkedSections: draft.linkedSections,
        });
        setNewFieldBySubsection((current) => ({
          ...current,
          [key]: emptyFieldDraft(),
        }));
        setFeedback({ type: "success", message: "Field added." });
        router.refresh();
      } catch {
        setFeedback({ type: "error", message: "Could not add field." });
        router.refresh();
      }
    });
  }

  function beginEditField(
    serviceSectionId: string,
    subsectionId: string,
    field: ServiceSubsection["fields"][number],
  ) {
    setEditingFieldKey(`${serviceSectionId}:${subsectionId}:${field.id}`);
    setEditingFieldDraft({
      name: field.name,
      notes: field.notes,
      linkedSections: field.linkedSections,
    });
  }

  function saveField(
    serviceSectionId: string,
    subsectionId: string,
    fieldId: string,
  ) {
    if (!editingFieldDraft) return;
    const name = editingFieldDraft.name.trim();
    if (!name) return;
    setFeedback(null);
    startTransition(async () => {
      try {
        await updateServiceFieldAction({
          projectId,
          serviceSectionId,
          subsectionId,
          fieldId,
          name,
          notes: editingFieldDraft.notes,
          linkedSections: editingFieldDraft.linkedSections,
        });
        setEditingFieldKey(null);
        setEditingFieldDraft(null);
        setFeedback({ type: "success", message: "Field updated." });
        router.refresh();
      } catch {
        setFeedback({ type: "error", message: "Could not update field." });
        router.refresh();
      }
    });
  }

  function removeField(
    serviceSectionId: string,
    subsectionId: string,
    fieldId: string,
    name: string,
  ) {
    if (!window.confirm(`Delete field "${name}"?`)) return;
    setFeedback(null);
    startTransition(async () => {
      try {
        await deleteServiceFieldAction({
          projectId,
          serviceSectionId,
          subsectionId,
          fieldId,
        });
        setFeedback({ type: "success", message: "Field deleted." });
        router.refresh();
      } catch {
        setFeedback({ type: "error", message: "Could not delete field." });
        router.refresh();
      }
    });
  }

  function toggleLinkedSection(
    source: FieldDraft,
    sectionId: string,
    checked: boolean,
  ): FieldDraft {
    return {
      ...source,
      linkedSections: checked
        ? Array.from(new Set([...source.linkedSections, sectionId]))
        : source.linkedSections.filter((entry) => entry !== sectionId),
    };
  }

  if (isFocusedSubsectionView && focusedContext) {
    const { serviceSection, subsection, subsectionKey } = focusedContext;
    const fieldDraft = newFieldBySubsection[subsectionKey] ?? emptyFieldDraft();

    return (
      <div className="space-y-6">
        <section className="rounded-lg border p-4">
          <h1 className="text-lg font-semibold">{subsection.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage fields for this submenu.
          </p>
        </section>

        {feedback ? (
          <div
            className={`rounded-md border px-3 py-2 text-sm ${
              feedback.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {feedback.message}
          </div>
        ) : null}

        <section
          id={`service-subsection-${serviceSection.id}-${subsection.id}`}
          className="rounded-lg border p-4"
        >
          <div className="space-y-3">
            {subsection.fields.map((field) => {
              const fieldKey = `${serviceSection.id}:${subsection.id}:${field.id}`;
              const isEditing = editingFieldKey === fieldKey;
              return (
                <article
                  key={field.id}
                  id={`service-field-${serviceSection.id}-${subsection.id}-${field.id}`}
                  className="rounded-md border p-3"
                >
                  {isEditing && editingFieldDraft ? (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">
                          Field Name
                        </label>
                        <input
                          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                          value={editingFieldDraft.name}
                          onChange={(event) =>
                            setEditingFieldDraft((current) =>
                              current
                                ? {
                                    ...current,
                                    name: event.target.value,
                                  }
                                : current,
                            )
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">
                          Notes
                        </label>
                        <textarea
                          className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm"
                          value={editingFieldDraft.notes}
                          onChange={(event) =>
                            setEditingFieldDraft((current) =>
                              current
                                ? {
                                    ...current,
                                    notes: event.target.value,
                                  }
                                : current,
                            )
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">
                          Linked Renovation Sections
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {sectionOptions.map((option) => {
                            const checked =
                              editingFieldDraft.linkedSections.includes(
                                option.id,
                              );
                            return (
                              <label
                                key={option.id}
                                className="inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs"
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(event) =>
                                    setEditingFieldDraft((current) =>
                                      current
                                        ? toggleLinkedSection(
                                            current,
                                            option.id,
                                            event.target.checked,
                                          )
                                        : current,
                                    )
                                  }
                                />
                                {option.title}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            saveField(
                              serviceSection.id,
                              subsection.id,
                              field.id,
                            )
                          }
                          disabled={isPending}
                          className="rounded-md border px-2 py-1 text-xs hover:bg-muted disabled:opacity-60"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingFieldKey(null);
                            setEditingFieldDraft(null);
                          }}
                          disabled={isPending}
                          className="rounded-md border px-2 py-1 text-xs hover:bg-muted disabled:opacity-60"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">{field.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Linked:{" "}
                            {field.linkedSections.length
                              ? field.linkedSections.join(", ")
                              : "None"}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              beginEditField(
                                serviceSection.id,
                                subsection.id,
                                field,
                              )
                            }
                            disabled={isPending}
                            className="rounded-md border px-2 py-1 text-xs hover:bg-muted disabled:opacity-60"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              removeField(
                                serviceSection.id,
                                subsection.id,
                                field.id,
                                field.name,
                              )
                            }
                            disabled={isPending}
                            className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-60"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {field.notes || "No notes."}
                      </p>
                    </div>
                  )}
                </article>
              );
            })}
            {!subsection.fields.length ? (
              <p className="text-sm text-muted-foreground">No fields yet.</p>
            ) : null}
          </div>

          <div className="mt-4 space-y-2 rounded-md border border-dashed p-3">
            <p className="text-xs font-semibold text-muted-foreground">
              Add Field
            </p>
            <input
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={fieldDraft.name}
              onChange={(event) =>
                setNewFieldBySubsection((current) => ({
                  ...current,
                  [subsectionKey]: {
                    ...fieldDraft,
                    name: event.target.value,
                  },
                }))
              }
              placeholder="Field name"
            />
            <textarea
              className="min-h-16 w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={fieldDraft.notes}
              onChange={(event) =>
                setNewFieldBySubsection((current) => ({
                  ...current,
                  [subsectionKey]: {
                    ...fieldDraft,
                    notes: event.target.value,
                  },
                }))
              }
              placeholder="Notes"
            />
            <div className="flex flex-wrap gap-2">
              {sectionOptions.map((option) => {
                const checked = fieldDraft.linkedSections.includes(option.id);
                return (
                  <label
                    key={option.id}
                    className="inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) =>
                        setNewFieldBySubsection((current) => ({
                          ...current,
                          [subsectionKey]: toggleLinkedSection(
                            fieldDraft,
                            option.id,
                            event.target.checked,
                          ),
                        }))
                      }
                    />
                    {option.title}
                  </label>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => addField(serviceSection.id, subsection.id)}
              disabled={isPending}
              className="rounded-md border px-3 py-2 text-sm hover:bg-muted disabled:opacity-60"
            >
              Add Field
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border p-4">
        <h1 className="text-lg font-semibold">
          {focusedSubsection?.name ?? "Mechanical & Building Services"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isFocusedSubsectionView
            ? "Manage fields for this subsection."
            : "Manage service categories, subsections, and field-level notes with linked renovation sections."}
        </p>
      </section>

      {feedback ? (
        <div
          className={`rounded-md border px-3 py-2 text-sm ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      {!isFocusedSubsectionView ? (
        <section className="rounded-lg border p-4">
          <h2 className="text-base font-semibold">Add Main Menu</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              className="min-w-80 flex-1 rounded-md border bg-background px-3 py-2 text-sm"
              value={newSectionName}
              onChange={(event) => setNewSectionName(event.target.value)}
              placeholder="e.g., Mechanical & Building Services"
            />
            <button
              type="button"
              disabled={isPending}
              onClick={addServiceSection}
              className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60"
            >
              Add
            </button>
          </div>
        </section>
      ) : null}

      <section className="space-y-4">
        {visibleServiceSections.map((serviceSection) => (
          <article
            key={serviceSection.id}
            id={`service-section-${serviceSection.id}`}
            className="rounded-lg border p-4"
          >
            {!isFocusedSubsectionView ? (
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-2">
                  {editingSectionId === serviceSection.id ? (
                    <div className="flex gap-2">
                      <input
                        className="min-w-72 rounded-md border bg-background px-3 py-2 text-sm"
                        value={editingSectionName}
                        onChange={(event) =>
                          setEditingSectionName(event.target.value)
                        }
                      />
                      <button
                        type="button"
                        onClick={() => saveSection(serviceSection.id)}
                        disabled={isPending}
                        className="rounded-md border px-2 py-1 text-xs hover:bg-muted disabled:opacity-60"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSectionId(null);
                          setEditingSectionName("");
                        }}
                        disabled={isPending}
                        className="rounded-md border px-2 py-1 text-xs hover:bg-muted disabled:opacity-60"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <h3 className="text-base font-semibold">
                      {serviceSection.name}
                    </h3>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => beginEditSection(serviceSection)}
                    disabled={isPending}
                    className="rounded-md border px-2 py-1 text-xs hover:bg-muted disabled:opacity-60"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      removeSection(serviceSection.id, serviceSection.name)
                    }
                    disabled={isPending}
                    className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-60"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ) : null}

            {!isFocusedSubsectionView ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <input
                  className="min-w-80 flex-1 rounded-md border bg-background px-3 py-2 text-sm"
                  value={newSubsectionBySection[serviceSection.id] ?? ""}
                  onChange={(event) =>
                    setNewSubsectionBySection((current) => ({
                      ...current,
                      [serviceSection.id]: event.target.value,
                    }))
                  }
                  placeholder="Add subsection"
                />
                <button
                  type="button"
                  onClick={() => addSubsection(serviceSection.id)}
                  disabled={isPending}
                  className="rounded-md border px-3 py-2 text-sm hover:bg-muted disabled:opacity-60"
                >
                  Add Subsection
                </button>
              </div>
            ) : null}

            <div className="mt-4 space-y-3">
              {serviceSection.subsections.map((subsection) => {
                const subsectionKey = `${serviceSection.id}:${subsection.id}`;
                const fieldDraft =
                  newFieldBySubsection[subsectionKey] ?? emptyFieldDraft();

                return (
                  <section
                    key={subsection.id}
                    id={`service-subsection-${serviceSection.id}-${subsection.id}`}
                    className="rounded-md border p-3"
                  >
                    {!isFocusedSubsectionView ? (
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="space-y-2">
                          {editingSubsectionKey === subsectionKey ? (
                            <div className="flex gap-2">
                              <input
                                className="min-w-72 rounded-md border bg-background px-3 py-2 text-sm"
                                value={editingSubsectionName}
                                onChange={(event) =>
                                  setEditingSubsectionName(event.target.value)
                                }
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  saveSubsection(
                                    serviceSection.id,
                                    subsection.id,
                                  )
                                }
                                disabled={isPending}
                                className="rounded-md border px-2 py-1 text-xs hover:bg-muted disabled:opacity-60"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingSubsectionKey(null);
                                  setEditingSubsectionName("");
                                }}
                                disabled={isPending}
                                className="rounded-md border px-2 py-1 text-xs hover:bg-muted disabled:opacity-60"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <h4 className="text-sm font-semibold">
                              <Link
                                href={`/app/${projectId}/services/${serviceSection.id}/${subsection.id}`}
                                className="hover:underline"
                              >
                                {subsection.name}
                              </Link>
                            </h4>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              beginEditSubsection(serviceSection.id, subsection)
                            }
                            disabled={isPending}
                            className="rounded-md border px-2 py-1 text-xs hover:bg-muted disabled:opacity-60"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              removeSubsection(
                                serviceSection.id,
                                subsection.id,
                                subsection.name,
                              )
                            }
                            disabled={isPending}
                            className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-60"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-3 space-y-3">
                      {subsection.fields.map((field) => {
                        const fieldKey = `${serviceSection.id}:${subsection.id}:${field.id}`;
                        const isEditing = editingFieldKey === fieldKey;
                        return (
                          <article
                            key={field.id}
                            id={`service-field-${serviceSection.id}-${subsection.id}-${field.id}`}
                            className="rounded-md border p-3"
                          >
                            {isEditing && editingFieldDraft ? (
                              <div className="space-y-3">
                                <div className="space-y-1">
                                  <label className="text-xs text-muted-foreground">
                                    Field Name
                                  </label>
                                  <input
                                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                                    value={editingFieldDraft.name}
                                    onChange={(event) =>
                                      setEditingFieldDraft((current) =>
                                        current
                                          ? {
                                              ...current,
                                              name: event.target.value,
                                            }
                                          : current,
                                      )
                                    }
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-xs text-muted-foreground">
                                    Notes
                                  </label>
                                  <textarea
                                    className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm"
                                    value={editingFieldDraft.notes}
                                    onChange={(event) =>
                                      setEditingFieldDraft((current) =>
                                        current
                                          ? {
                                              ...current,
                                              notes: event.target.value,
                                            }
                                          : current,
                                      )
                                    }
                                  />
                                </div>
                                <div className="space-y-2">
                                  <p className="text-xs text-muted-foreground">
                                    Linked Renovation Sections
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {sectionOptions.map((option) => {
                                      const checked =
                                        editingFieldDraft.linkedSections.includes(
                                          option.id,
                                        );
                                      return (
                                        <label
                                          key={option.id}
                                          className="inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={(event) =>
                                              setEditingFieldDraft((current) =>
                                                current
                                                  ? toggleLinkedSection(
                                                      current,
                                                      option.id,
                                                      event.target.checked,
                                                    )
                                                  : current,
                                              )
                                            }
                                          />
                                          {option.title}
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      saveField(
                                        serviceSection.id,
                                        subsection.id,
                                        field.id,
                                      )
                                    }
                                    disabled={isPending}
                                    className="rounded-md border px-2 py-1 text-xs hover:bg-muted disabled:opacity-60"
                                  >
                                    Save
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingFieldKey(null);
                                      setEditingFieldDraft(null);
                                    }}
                                    disabled={isPending}
                                    className="rounded-md border px-2 py-1 text-xs hover:bg-muted disabled:opacity-60"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                  <div>
                                    <p className="text-sm font-medium">
                                      {field.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      Linked:{" "}
                                      {field.linkedSections.length
                                        ? field.linkedSections.join(", ")
                                        : "None"}
                                    </p>
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        beginEditField(
                                          serviceSection.id,
                                          subsection.id,
                                          field,
                                        )
                                      }
                                      disabled={isPending}
                                      className="rounded-md border px-2 py-1 text-xs hover:bg-muted disabled:opacity-60"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        removeField(
                                          serviceSection.id,
                                          subsection.id,
                                          field.id,
                                          field.name,
                                        )
                                      }
                                      disabled={isPending}
                                      className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-60"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {field.notes || "No notes."}
                                </p>
                              </div>
                            )}
                          </article>
                        );
                      })}
                    </div>

                    <div className="mt-3 space-y-2 rounded-md border p-3">
                      <p className="text-xs font-semibold text-muted-foreground">
                        Add Field
                      </p>
                      <input
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                        value={fieldDraft.name}
                        onChange={(event) =>
                          setNewFieldBySubsection((current) => ({
                            ...current,
                            [subsectionKey]: {
                              ...fieldDraft,
                              name: event.target.value,
                            },
                          }))
                        }
                        placeholder="Field name"
                      />
                      <textarea
                        className="min-h-16 w-full rounded-md border bg-background px-3 py-2 text-sm"
                        value={fieldDraft.notes}
                        onChange={(event) =>
                          setNewFieldBySubsection((current) => ({
                            ...current,
                            [subsectionKey]: {
                              ...fieldDraft,
                              notes: event.target.value,
                            },
                          }))
                        }
                        placeholder="Notes"
                      />
                      <div className="flex flex-wrap gap-2">
                        {sectionOptions.map((option) => {
                          const checked = fieldDraft.linkedSections.includes(
                            option.id,
                          );
                          return (
                            <label
                              key={option.id}
                              className="inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(event) =>
                                  setNewFieldBySubsection((current) => ({
                                    ...current,
                                    [subsectionKey]: toggleLinkedSection(
                                      fieldDraft,
                                      option.id,
                                      event.target.checked,
                                    ),
                                  }))
                                }
                              />
                              {option.title}
                            </label>
                          );
                        })}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          addField(serviceSection.id, subsection.id)
                        }
                        disabled={isPending}
                        className="rounded-md border px-3 py-2 text-sm hover:bg-muted disabled:opacity-60"
                      >
                        Add Field
                      </button>
                    </div>
                  </section>
                );
              })}
              {!serviceSection.subsections.length ? (
                <p className="text-sm text-muted-foreground">
                  No subsections yet.
                </p>
              ) : null}
            </div>
          </article>
        ))}
        {!visibleServiceSections.length ? (
          <div className="rounded-lg border p-4 text-sm text-muted-foreground">
            No service menus yet.
          </div>
        ) : null}
      </section>
    </div>
  );
}
