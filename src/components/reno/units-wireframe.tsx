"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  RenovationUnit,
  UnitFloor,
  UnitRoomType,
  UnitStatus,
} from "@/lib/reno-data-loader";
import {
  addUnitAction,
  addUnitRoomAction,
  deleteUnitAction,
  deleteUnitRoomAction,
  updateUnitAction,
  updateUnitRoomAction,
} from "@/lib/reno-actions";

type UnitsWireframeProps = {
  projectId: string;
  initialUnits: RenovationUnit[];
};

type Feedback = {
  type: "success" | "error";
  message: string;
} | null;

type UnitDraft = {
  name: string;
  floor: UnitFloor;
  bedrooms: string;
  totalAreaSqm: string;
  status: UnitStatus;
  description: string;
};

type RoomDraft = {
  roomType: UnitRoomType;
  widthMm: string;
  lengthMm: string;
  heightMm: string;
  description: string;
};

const floorOptions: Array<{ value: UnitFloor; label: string }> = [
  { value: "main", label: "Main" },
  { value: "basement", label: "Basement" },
];

const unitStatusOptions: Array<{ value: UnitStatus; label: string }> = [
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

const roomTypeOptions: Array<{ value: UnitRoomType; label: string }> = [
  { value: "kitchen_living_area", label: "Kitchen / Living Area" },
  { value: "bathroom", label: "Bathroom" },
  { value: "storage", label: "Storage" },
  { value: "other", label: "Other" },
];

function roomTypeLabel(roomType: UnitRoomType) {
  return (
    roomTypeOptions.find((option) => option.value === roomType)?.label ??
    roomType
  );
}

function toUnitDraft(unit: RenovationUnit): UnitDraft {
  return {
    name: unit.name,
    floor: unit.floor,
    bedrooms: String(unit.bedrooms),
    totalAreaSqm: String(unit.totalAreaSqm),
    status: unit.status,
    description: unit.description,
  };
}

function toRoomDraft(room: RenovationUnit["rooms"][number]): RoomDraft {
  return {
    roomType: room.roomType,
    widthMm: String(room.widthMm),
    lengthMm: String(room.lengthMm),
    heightMm: String(room.heightMm),
    description: room.description,
  };
}

function emptyUnitDraft(): UnitDraft {
  return {
    name: "",
    floor: "main",
    bedrooms: "0",
    totalAreaSqm: "",
    status: "planned",
    description: "",
  };
}

function emptyRoomDraft(): RoomDraft {
  return {
    roomType: "kitchen_living_area",
    widthMm: "",
    lengthMm: "",
    heightMm: "",
    description: "",
  };
}

export function UnitsWireframe({
  projectId,
  initialUnits,
}: UnitsWireframeProps) {
  const [units, setUnits] = useState(initialUnits);
  const [newUnit, setNewUnit] = useState<UnitDraft>(emptyUnitDraft);
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [editingUnitDraft, setEditingUnitDraft] = useState<UnitDraft | null>(
    null,
  );
  const [newRoomByUnitId, setNewRoomByUnitId] = useState<
    Record<string, RoomDraft>
  >({});
  const [editingRoomKey, setEditingRoomKey] = useState<string | null>(null);
  const [editingRoomDraft, setEditingRoomDraft] = useState<RoomDraft | null>(
    null,
  );
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const sortedUnits = useMemo(() => {
    return [...units].sort((a, b) => a.name.localeCompare(b.name));
  }, [units]);

  function setUnitRoomDraft(unitId: string, next: RoomDraft) {
    setNewRoomByUnitId((current) => ({ ...current, [unitId]: next }));
  }

  function addUnit() {
    const name = newUnit.name.trim();
    const bedrooms = Number(newUnit.bedrooms);
    const area = Number(newUnit.totalAreaSqm);
    if (
      !name ||
      Number.isNaN(area) ||
      Number.isNaN(bedrooms) ||
      !Number.isInteger(bedrooms) ||
      bedrooms < 0
    ) {
      return;
    }

    const localId = `local-unit-${Date.now()}`;
    const optimisticUnit: RenovationUnit = {
      id: localId,
      name,
      floor: newUnit.floor,
      bedrooms,
      totalAreaSqm: area,
      status: newUnit.status,
      description: newUnit.description.trim(),
      rooms: [
        {
          id: `local-room-${Date.now()}-1`,
          roomType: "kitchen_living_area",
          widthMm: 0,
          lengthMm: 0,
          heightMm: 0,
          description: "",
        },
        {
          id: `local-room-${Date.now()}-2`,
          roomType: "bathroom",
          widthMm: 0,
          lengthMm: 0,
          heightMm: 0,
          description: "",
        },
        {
          id: `local-room-${Date.now()}-3`,
          roomType: "storage",
          widthMm: 0,
          lengthMm: 0,
          heightMm: 0,
          description: "",
        },
        {
          id: `local-room-${Date.now()}-4`,
          roomType: "other",
          widthMm: 0,
          lengthMm: 0,
          heightMm: 0,
          description: "",
        },
      ],
    };

    setUnits((current) => [optimisticUnit, ...current]);
    setNewUnit(emptyUnitDraft);
    setFeedback(null);

    startTransition(async () => {
      try {
        await addUnitAction({
          projectId,
          name,
          floor: optimisticUnit.floor,
          bedrooms: optimisticUnit.bedrooms,
          totalAreaSqm: optimisticUnit.totalAreaSqm,
          status: optimisticUnit.status,
          description: optimisticUnit.description,
        });
        setFeedback({ type: "success", message: "Unit added." });
        router.refresh();
      } catch {
        setFeedback({ type: "error", message: "Could not add unit." });
        router.refresh();
      }
    });
  }

  function beginEditUnit(unit: RenovationUnit) {
    setEditingUnitId(unit.id);
    setEditingUnitDraft(toUnitDraft(unit));
  }

  function cancelEditUnit() {
    setEditingUnitId(null);
    setEditingUnitDraft(null);
  }

  function saveUnit() {
    if (!editingUnitId || !editingUnitDraft) {
      return;
    }
    const name = editingUnitDraft.name.trim();
    const bedrooms = Number(editingUnitDraft.bedrooms);
    const area = Number(editingUnitDraft.totalAreaSqm);
    if (
      !name ||
      Number.isNaN(area) ||
      Number.isNaN(bedrooms) ||
      !Number.isInteger(bedrooms) ||
      bedrooms < 0
    ) {
      return;
    }

    const payload = {
      projectId,
      unitId: editingUnitId,
      name,
      floor: editingUnitDraft.floor,
      bedrooms,
      totalAreaSqm: area,
      status: editingUnitDraft.status,
      description: editingUnitDraft.description.trim(),
    } as const;

    setUnits((current) =>
      current.map((unit) =>
        unit.id === editingUnitId ? { ...unit, ...payload } : unit,
      ),
    );
    cancelEditUnit();
    setFeedback(null);

    if (editingUnitId.startsWith("local-unit-")) {
      return;
    }

    startTransition(async () => {
      try {
        await updateUnitAction(payload);
        setFeedback({ type: "success", message: "Unit updated." });
        router.refresh();
      } catch {
        setFeedback({ type: "error", message: "Could not update unit." });
        router.refresh();
      }
    });
  }

  function removeUnit(unitId: string, unitName: string) {
    const confirmed = window.confirm(`Delete "${unitName}" and all its rooms?`);
    if (!confirmed) {
      return;
    }

    setUnits((current) => current.filter((unit) => unit.id !== unitId));
    if (editingUnitId === unitId) {
      cancelEditUnit();
    }
    setFeedback(null);

    if (unitId.startsWith("local-unit-")) {
      setFeedback({ type: "success", message: "Unit deleted." });
      return;
    }

    startTransition(async () => {
      try {
        await deleteUnitAction({ projectId, unitId });
        setFeedback({ type: "success", message: "Unit deleted." });
        router.refresh();
      } catch {
        setFeedback({ type: "error", message: "Could not delete unit." });
        router.refresh();
      }
    });
  }

  function addRoom(unitId: string) {
    const draft = newRoomByUnitId[unitId] ?? emptyRoomDraft();
    const widthMm = Number(draft.widthMm);
    const lengthMm = Number(draft.lengthMm);
    const heightMm = Number(draft.heightMm);
    if (
      Number.isNaN(widthMm) ||
      Number.isNaN(lengthMm) ||
      Number.isNaN(heightMm)
    ) {
      return;
    }

    const localRoomId = `local-room-${Date.now()}`;
    const optimisticRoom: RenovationUnit["rooms"][number] = {
      id: localRoomId,
      roomType: draft.roomType,
      widthMm,
      lengthMm,
      heightMm,
      description: draft.description.trim(),
    };

    setUnits((current) =>
      current.map((unit) =>
        unit.id === unitId
          ? { ...unit, rooms: [optimisticRoom, ...unit.rooms] }
          : unit,
      ),
    );
    setUnitRoomDraft(unitId, emptyRoomDraft());
    setFeedback(null);

    if (unitId.startsWith("local-unit-")) {
      return;
    }

    startTransition(async () => {
      try {
        await addUnitRoomAction({
          projectId,
          unitId,
          roomType: optimisticRoom.roomType,
          widthMm: optimisticRoom.widthMm,
          lengthMm: optimisticRoom.lengthMm,
          heightMm: optimisticRoom.heightMm,
          description: optimisticRoom.description,
        });
        setFeedback({ type: "success", message: "Room added." });
        router.refresh();
      } catch {
        setFeedback({ type: "error", message: "Could not add room." });
        router.refresh();
      }
    });
  }

  function beginEditRoom(
    unitId: string,
    room: RenovationUnit["rooms"][number],
  ) {
    setEditingRoomKey(`${unitId}:${room.id}`);
    setEditingRoomDraft(toRoomDraft(room));
  }

  function cancelEditRoom() {
    setEditingRoomKey(null);
    setEditingRoomDraft(null);
  }

  function saveRoom(unitId: string, roomId: string) {
    if (!editingRoomDraft) {
      return;
    }
    const widthMm = Number(editingRoomDraft.widthMm);
    const lengthMm = Number(editingRoomDraft.lengthMm);
    const heightMm = Number(editingRoomDraft.heightMm);
    if (
      Number.isNaN(widthMm) ||
      Number.isNaN(lengthMm) ||
      Number.isNaN(heightMm)
    ) {
      return;
    }

    const payload = {
      projectId,
      unitId,
      roomId,
      roomType: editingRoomDraft.roomType,
      widthMm,
      lengthMm,
      heightMm,
      description: editingRoomDraft.description.trim(),
    } as const;

    setUnits((current) =>
      current.map((unit) =>
        unit.id !== unitId
          ? unit
          : {
              ...unit,
              rooms: unit.rooms.map((room) =>
                room.id === roomId ? { ...room, ...payload } : room,
              ),
            },
      ),
    );
    cancelEditRoom();
    setFeedback(null);

    if (unitId.startsWith("local-unit-") || roomId.startsWith("local-room-")) {
      return;
    }

    startTransition(async () => {
      try {
        await updateUnitRoomAction(payload);
        setFeedback({ type: "success", message: "Room updated." });
        router.refresh();
      } catch {
        setFeedback({ type: "error", message: "Could not update room." });
        router.refresh();
      }
    });
  }

  function removeRoom(unitId: string, roomId: string) {
    const confirmed = window.confirm("Delete this room?");
    if (!confirmed) {
      return;
    }

    setUnits((current) =>
      current.map((unit) =>
        unit.id === unitId
          ? { ...unit, rooms: unit.rooms.filter((room) => room.id !== roomId) }
          : unit,
      ),
    );
    if (editingRoomKey === `${unitId}:${roomId}`) {
      cancelEditRoom();
    }
    setFeedback(null);

    if (unitId.startsWith("local-unit-") || roomId.startsWith("local-room-")) {
      return;
    }

    startTransition(async () => {
      try {
        await deleteUnitRoomAction({ projectId, unitId, roomId });
        setFeedback({ type: "success", message: "Room deleted." });
        router.refresh();
      } catch {
        setFeedback({ type: "error", message: "Could not delete room." });
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border p-4">
        <h1 className="text-lg font-semibold">Units</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage unit-level planning with one level of room sub-items.
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

      <section className="rounded-lg border p-4">
        <h2 className="text-base font-semibold">Add Unit</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Unit Name</label>
            <input
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={newUnit.name}
              onChange={(event) =>
                setNewUnit((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              placeholder="e.g., Unit 1 - Main Floor"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Floor</label>
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={newUnit.floor}
              onChange={(event) =>
                setNewUnit((current) => ({
                  ...current,
                  floor: event.target.value as UnitFloor,
                }))
              }
            >
              {floorOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">
              No. Bedrooms
            </label>
            <input
              type="number"
              min={0}
              step={1}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={newUnit.bedrooms}
              onChange={(event) =>
                setNewUnit((current) => ({
                  ...current,
                  bedrooms: event.target.value,
                }))
              }
              placeholder="0"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">
              Total Area (sqm)
            </label>
            <input
              type="number"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={newUnit.totalAreaSqm}
              onChange={(event) =>
                setNewUnit((current) => ({
                  ...current,
                  totalAreaSqm: event.target.value,
                }))
              }
              placeholder="0"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Status</label>
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={newUnit.status}
              onChange={(event) =>
                setNewUnit((current) => ({
                  ...current,
                  status: event.target.value as UnitStatus,
                }))
              }
            >
              {unitStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="text-xs text-muted-foreground">Description</label>
            <textarea
              className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={newUnit.description}
              onChange={(event) =>
                setNewUnit((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder="General notes for this unit."
            />
          </div>
        </div>
        <button
          type="button"
          onClick={addUnit}
          disabled={isPending}
          className="mt-3 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60"
        >
          Add Unit
        </button>
      </section>

      <section className="space-y-4">
        {sortedUnits.map((unit) => {
          const unitRoomDraft = newRoomByUnitId[unit.id] ?? emptyRoomDraft();
          const isEditingUnit = editingUnitId === unit.id && editingUnitDraft;
          return (
            <article
              key={unit.id}
              id={`unit-${unit.id}`}
              className="rounded-lg border p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold">{unit.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {unit.floor === "main" ? "Main" : "Basement"} •{" "}
                    {unit.bedrooms} bedroom{unit.bedrooms === 1 ? "" : "s"} •{" "}
                    {unit.totalAreaSqm} sqm •{" "}
                    {
                      unitStatusOptions.find(
                        (option) => option.value === unit.status,
                      )?.label
                    }
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => beginEditUnit(unit)}
                    className="rounded-md border px-2 py-1 text-xs hover:bg-muted disabled:opacity-60"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => removeUnit(unit.id, unit.name)}
                    className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-60"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {isEditingUnit ? (
                <div className="mt-3 grid gap-3 rounded-md border p-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      Unit Name
                    </label>
                    <input
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={editingUnitDraft.name}
                      onChange={(event) =>
                        setEditingUnitDraft((current) =>
                          current
                            ? { ...current, name: event.target.value }
                            : current,
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      Floor
                    </label>
                    <select
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={editingUnitDraft.floor}
                      onChange={(event) =>
                        setEditingUnitDraft((current) =>
                          current
                            ? {
                                ...current,
                                floor: event.target.value as UnitFloor,
                              }
                            : current,
                        )
                      }
                    >
                      {floorOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      No. Bedrooms
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={editingUnitDraft.bedrooms}
                      onChange={(event) =>
                        setEditingUnitDraft((current) =>
                          current
                            ? { ...current, bedrooms: event.target.value }
                            : current,
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      Total Area (sqm)
                    </label>
                    <input
                      type="number"
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={editingUnitDraft.totalAreaSqm}
                      onChange={(event) =>
                        setEditingUnitDraft((current) =>
                          current
                            ? { ...current, totalAreaSqm: event.target.value }
                            : current,
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      Status
                    </label>
                    <select
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={editingUnitDraft.status}
                      onChange={(event) =>
                        setEditingUnitDraft((current) =>
                          current
                            ? {
                                ...current,
                                status: event.target.value as UnitStatus,
                              }
                            : current,
                        )
                      }
                    >
                      {unitStatusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-xs text-muted-foreground">
                      Description
                    </label>
                    <textarea
                      className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={editingUnitDraft.description}
                      onChange={(event) =>
                        setEditingUnitDraft((current) =>
                          current
                            ? { ...current, description: event.target.value }
                            : current,
                        )
                      }
                    />
                  </div>
                  <div className="md:col-span-2 flex gap-2">
                    <button
                      type="button"
                      onClick={saveUnit}
                      disabled={isPending}
                      className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60"
                    >
                      Save Unit
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditUnit}
                      disabled={isPending}
                      className="rounded-md border px-3 py-2 text-sm text-muted-foreground hover:bg-muted disabled:opacity-60"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}

              <p className="mt-3 text-sm text-muted-foreground">
                {unit.description || "No description."}
              </p>

              <div className="mt-4 rounded-md border p-3">
                <h4 className="text-sm font-semibold">Rooms</h4>
                <div className="mt-2 space-y-2">
                  {unit.rooms.map((room) => {
                    const roomKey = `${unit.id}:${room.id}`;
                    const isEditingRoom = editingRoomKey === roomKey;
                    return (
                      <div key={room.id} className="rounded-md border p-2">
                        {isEditingRoom && editingRoomDraft ? (
                          <div className="grid gap-2 md:grid-cols-2">
                            <div className="space-y-1">
                              <label className="text-xs text-muted-foreground">
                                Room Type
                              </label>
                              <select
                                className="w-full rounded-md border bg-background px-2 py-1 text-sm"
                                value={editingRoomDraft.roomType}
                                onChange={(event) =>
                                  setEditingRoomDraft((current) =>
                                    current
                                      ? {
                                          ...current,
                                          roomType: event.target
                                            .value as UnitRoomType,
                                        }
                                      : current,
                                  )
                                }
                              >
                                {roomTypeOptions.map((option) => (
                                  <option
                                    key={option.value}
                                    value={option.value}
                                  >
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-muted-foreground">
                                Width (mm)
                              </label>
                              <input
                                type="number"
                                className="w-full rounded-md border bg-background px-2 py-1 text-sm"
                                value={editingRoomDraft.widthMm}
                                onChange={(event) =>
                                  setEditingRoomDraft((current) =>
                                    current
                                      ? {
                                          ...current,
                                          widthMm: event.target.value,
                                        }
                                      : current,
                                  )
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-muted-foreground">
                                Length (mm)
                              </label>
                              <input
                                type="number"
                                className="w-full rounded-md border bg-background px-2 py-1 text-sm"
                                value={editingRoomDraft.lengthMm}
                                onChange={(event) =>
                                  setEditingRoomDraft((current) =>
                                    current
                                      ? {
                                          ...current,
                                          lengthMm: event.target.value,
                                        }
                                      : current,
                                  )
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-muted-foreground">
                                Height (mm)
                              </label>
                              <input
                                type="number"
                                className="w-full rounded-md border bg-background px-2 py-1 text-sm"
                                value={editingRoomDraft.heightMm}
                                onChange={(event) =>
                                  setEditingRoomDraft((current) =>
                                    current
                                      ? {
                                          ...current,
                                          heightMm: event.target.value,
                                        }
                                      : current,
                                  )
                                }
                              />
                            </div>
                            <div className="space-y-1 md:col-span-2">
                              <label className="text-xs text-muted-foreground">
                                Description / Notes
                              </label>
                              <textarea
                                className="min-h-16 w-full rounded-md border bg-background px-2 py-1 text-sm"
                                value={editingRoomDraft.description}
                                onChange={(event) =>
                                  setEditingRoomDraft((current) =>
                                    current
                                      ? {
                                          ...current,
                                          description: event.target.value,
                                        }
                                      : current,
                                  )
                                }
                              />
                            </div>
                            <div className="md:col-span-2 flex gap-2">
                              <button
                                type="button"
                                onClick={() => saveRoom(unit.id, room.id)}
                                disabled={isPending}
                                className="rounded-md border px-2 py-1 text-xs hover:bg-muted disabled:opacity-60"
                              >
                                Save Room
                              </button>
                              <button
                                type="button"
                                onClick={cancelEditRoom}
                                disabled={isPending}
                                className="rounded-md border px-2 py-1 text-xs text-muted-foreground hover:bg-muted disabled:opacity-60"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-medium">
                                {roomTypeLabel(room.roomType)}
                              </p>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  disabled={isPending}
                                  onClick={() => beginEditRoom(unit.id, room)}
                                  className="rounded-md border px-2 py-1 text-xs hover:bg-muted disabled:opacity-60"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  disabled={isPending}
                                  onClick={() => removeRoom(unit.id, room.id)}
                                  className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-60"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {room.widthMm}mm × {room.lengthMm}mm ×{" "}
                              {room.heightMm}
                              mm
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {room.description || "No notes."}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {!unit.rooms.length ? (
                    <p className="text-xs text-muted-foreground">
                      No rooms yet.
                    </p>
                  ) : null}
                </div>

                <div className="mt-3 grid gap-2 rounded-md border p-2 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      Room Type
                    </label>
                    <select
                      className="w-full rounded-md border bg-background px-2 py-1 text-sm"
                      value={unitRoomDraft.roomType}
                      onChange={(event) =>
                        setUnitRoomDraft(unit.id, {
                          ...unitRoomDraft,
                          roomType: event.target.value as UnitRoomType,
                        })
                      }
                    >
                      {roomTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      Width (mm)
                    </label>
                    <input
                      type="number"
                      className="w-full rounded-md border bg-background px-2 py-1 text-sm"
                      value={unitRoomDraft.widthMm}
                      onChange={(event) =>
                        setUnitRoomDraft(unit.id, {
                          ...unitRoomDraft,
                          widthMm: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      Length (mm)
                    </label>
                    <input
                      type="number"
                      className="w-full rounded-md border bg-background px-2 py-1 text-sm"
                      value={unitRoomDraft.lengthMm}
                      onChange={(event) =>
                        setUnitRoomDraft(unit.id, {
                          ...unitRoomDraft,
                          lengthMm: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      Height (mm)
                    </label>
                    <input
                      type="number"
                      className="w-full rounded-md border bg-background px-2 py-1 text-sm"
                      value={unitRoomDraft.heightMm}
                      onChange={(event) =>
                        setUnitRoomDraft(unit.id, {
                          ...unitRoomDraft,
                          heightMm: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-xs text-muted-foreground">
                      Description / Notes
                    </label>
                    <textarea
                      className="min-h-16 w-full rounded-md border bg-background px-2 py-1 text-sm"
                      value={unitRoomDraft.description}
                      onChange={(event) =>
                        setUnitRoomDraft(unit.id, {
                          ...unitRoomDraft,
                          description: event.target.value,
                        })
                      }
                      placeholder="e.g., fire-rated door needed"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <button
                      type="button"
                      onClick={() => addRoom(unit.id)}
                      disabled={isPending}
                      className="rounded-md border px-2 py-1 text-xs hover:bg-muted disabled:opacity-60"
                    >
                      Add Room
                    </button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}

        {!sortedUnits.length ? (
          <div className="rounded-lg border p-4 text-sm text-muted-foreground">
            No units yet. Add your first unit above.
          </div>
        ) : null}
      </section>
    </div>
  );
}
