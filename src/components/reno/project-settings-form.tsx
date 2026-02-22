"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { RenovationProject } from "@/lib/reno-data-loader";
import { updateProjectMetaAction } from "@/lib/reno-actions";

type ProjectSettingsFormProps = {
  project: RenovationProject;
};

type Feedback = {
  type: "success" | "error";
  message: string;
} | null;

function toLines(value: string[]) {
  return value.join("\n");
}

function fromLines(value: string) {
  return value
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function ProjectSettingsForm({ project }: ProjectSettingsFormProps) {
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: project.name,
    address: project.address,
    phase: project.phase,
    targetCompletion: project.targetCompletion,
    projectDescription: project.overview.projectDescription,
    groundFloorSqFtApprox: String(project.overview.area.groundFloorSqFtApprox),
    basementSqFtApprox: String(project.overview.area.basementSqFtApprox),
    groundFloorUnits: String(project.overview.occupancyPlan.groundFloorUnits),
    basementUnits: String(project.overview.occupancyPlan.basementUnits),
    totalUnitsOccupancy: String(project.overview.occupancyPlan.totalUnits),
    permitObtained: project.overview.currentState.permitObtained,
    occupancy: project.overview.currentState.occupancy,
    framing: project.overview.currentState.framing,
    groundFloorExteriorWalls:
      project.overview.currentState.groundFloorExteriorWalls,
    basementExteriorWalls: project.overview.currentState.basementExteriorWalls,
    hazmat: project.overview.currentState.hazmat,
    totalUnitsSystems: String(project.overview.unitMixAndSystems.totalUnits),
    bathrooms: String(project.overview.unitMixAndSystems.bathrooms),
    kitchens: String(project.overview.unitMixAndSystems.kitchens),
    laundry: project.overview.unitMixAndSystems.laundry,
    hotWater: project.overview.unitMixAndSystems.hotWater,
    basementCeilingHeight:
      project.overview.unitMixAndSystems.basementCeilingHeight,
    generalContractor: project.overview.tradesAndFinancing.generalContractor,
    confirmedTrades: toLines(
      project.overview.tradesAndFinancing.confirmedTrades,
    ),
    pendingBeforeStart: toLines(
      project.overview.tradesAndFinancing.pendingBeforeStart,
    ),
    financing: project.overview.tradesAndFinancing.financing,
    scopeExclusions: toLines(project.overview.scopeExclusions),
  });
  const router = useRouter();

  function onSubmit() {
    const toNumber = (value: string) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    };

    setFeedback(null);
    startTransition(async () => {
      try {
        await updateProjectMetaAction({
          projectId: project.id,
          name: form.name,
          address: form.address,
          phase: form.phase,
          targetCompletion: form.targetCompletion,
          overview: {
            projectDescription: form.projectDescription,
            area: {
              groundFloorSqFtApprox: toNumber(form.groundFloorSqFtApprox),
              basementSqFtApprox: toNumber(form.basementSqFtApprox),
            },
            occupancyPlan: {
              groundFloorUnits: toNumber(form.groundFloorUnits),
              basementUnits: toNumber(form.basementUnits),
              totalUnits: toNumber(form.totalUnitsOccupancy),
            },
            currentState: {
              permitObtained: form.permitObtained,
              occupancy: form.occupancy,
              framing: form.framing,
              groundFloorExteriorWalls: form.groundFloorExteriorWalls,
              basementExteriorWalls: form.basementExteriorWalls,
              hazmat: form.hazmat,
            },
            unitMixAndSystems: {
              totalUnits: toNumber(form.totalUnitsSystems),
              bathrooms: toNumber(form.bathrooms),
              kitchens: toNumber(form.kitchens),
              laundry: form.laundry,
              hotWater: form.hotWater,
              basementCeilingHeight: form.basementCeilingHeight,
            },
            tradesAndFinancing: {
              generalContractor: form.generalContractor,
              confirmedTrades: fromLines(form.confirmedTrades),
              pendingBeforeStart: fromLines(form.pendingBeforeStart),
              financing: form.financing,
            },
            scopeExclusions: fromLines(form.scopeExclusions),
          },
        });
        setFeedback({ type: "success", message: "Project details updated." });
        router.refresh();
      } catch {
        setFeedback({
          type: "error",
          message: "Could not update project details. Please try again.",
        });
        router.refresh();
      }
    });
  }

  return (
    <section className="rounded-lg border p-4 space-y-4">
      <h2 className="text-base font-semibold">Project Profile</h2>
      <p className="text-xs text-muted-foreground">
        Edit all project-level metadata and baseline assumptions.
      </p>
      <h3 className="text-sm font-semibold">Core Info</h3>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Project Name</label>
          <input
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={form.name}
            onChange={(event) =>
              setForm((current) => ({ ...current, name: event.target.value }))
            }
            placeholder="Project name"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Address</label>
          <input
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={form.address}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                address: event.target.value,
              }))
            }
            placeholder="Project address"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Phase</label>
          <input
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={form.phase}
            onChange={(event) =>
              setForm((current) => ({ ...current, phase: event.target.value }))
            }
            placeholder="Planning / Execution / Complete"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">
            Target Completion Date
          </label>
          <input
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={form.targetCompletion}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                targetCompletion: event.target.value,
              }))
            }
            placeholder="YYYY-MM-DD"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">
          Project Description
        </label>
        <textarea
          rows={3}
          className="w-full rounded-md border bg-background p-3 text-sm"
          value={form.projectDescription}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              projectDescription: event.target.value,
            }))
          }
          placeholder="Describe the project goal and scope..."
        />
      </div>

      <h3 className="text-sm font-semibold">Area & Occupancy Plan</h3>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">
            Ground Floor Area (sq ft, approx)
          </label>
          <input
            type="number"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={form.groundFloorSqFtApprox}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                groundFloorSqFtApprox: event.target.value,
              }))
            }
            placeholder="1000"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">
            Basement Area (sq ft, approx)
          </label>
          <input
            type="number"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={form.basementSqFtApprox}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                basementSqFtApprox: event.target.value,
              }))
            }
            placeholder="1000"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">
            Ground Floor Units
          </label>
          <input
            type="number"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={form.groundFloorUnits}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                groundFloorUnits: event.target.value,
              }))
            }
            placeholder="4"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">
            Basement Units
          </label>
          <input
            type="number"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={form.basementUnits}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                basementUnits: event.target.value,
              }))
            }
            placeholder="3"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">
            Total Units (Occupancy Plan)
          </label>
          <input
            type="number"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={form.totalUnitsOccupancy}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                totalUnitsOccupancy: event.target.value,
              }))
            }
            placeholder="7"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Permit Status</label>
          <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={form.permitObtained}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  permitObtained: event.target.checked,
                }))
              }
            />
            Permit obtained
          </label>
        </div>
      </div>

      <h3 className="text-sm font-semibold">Current State</h3>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Occupancy</label>
        <textarea
          rows={2}
          className="w-full rounded-md border bg-background p-3 text-sm"
          value={form.occupancy}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              occupancy: event.target.value,
            }))
          }
          placeholder="e.g., Fully vacant"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">
          Framing / Interior Status
        </label>
        <textarea
          rows={3}
          className="w-full rounded-md border bg-background p-3 text-sm"
          value={form.framing}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              framing: event.target.value,
            }))
          }
          placeholder="Describe framing progress..."
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">
          Ground Floor Exterior Walls
        </label>
        <textarea
          rows={2}
          className="w-full rounded-md border bg-background p-3 text-sm"
          value={form.groundFloorExteriorWalls}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              groundFloorExteriorWalls: event.target.value,
            }))
          }
          placeholder="State and requirements..."
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">
          Basement Exterior Walls
        </label>
        <textarea
          rows={2}
          className="w-full rounded-md border bg-background p-3 text-sm"
          value={form.basementExteriorWalls}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              basementExteriorWalls: event.target.value,
            }))
          }
          placeholder="State and requirements..."
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Hazmat Status</label>
        <input
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          value={form.hazmat}
          onChange={(event) =>
            setForm((current) => ({ ...current, hazmat: event.target.value }))
          }
          placeholder="e.g., No asbestos/hazmat risk"
        />
      </div>

      <h3 className="text-sm font-semibold">Unit Mix & Systems</h3>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">
            Total Units (Systems)
          </label>
          <input
            type="number"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={form.totalUnitsSystems}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                totalUnitsSystems: event.target.value,
              }))
            }
            placeholder="7"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Bathrooms</label>
          <input
            type="number"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={form.bathrooms}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                bathrooms: event.target.value,
              }))
            }
            placeholder="5"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Kitchens</label>
          <input
            type="number"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={form.kitchens}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                kitchens: event.target.value,
              }))
            }
            placeholder="7"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Laundry Setup</label>
          <input
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={form.laundry}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                laundry: event.target.value,
              }))
            }
            placeholder="e.g., in-unit laundry"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">
            Hot Water System
          </label>
          <input
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={form.hotWater}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                hotWater: event.target.value,
              }))
            }
            placeholder="e.g., shared tankless"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">
            Basement Ceiling Height
          </label>
          <input
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={form.basementCeilingHeight}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                basementCeilingHeight: event.target.value,
              }))
            }
            placeholder="e.g., compliant for legal use"
          />
        </div>
      </div>

      <h3 className="text-sm font-semibold">Trades & Financing</h3>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">
          General Contractor
        </label>
        <input
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          value={form.generalContractor}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              generalContractor: event.target.value,
            }))
          }
          placeholder="Owner-managed / contractor name"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">
          Confirmed Trades
        </label>
        <p className="text-xs text-muted-foreground">One trade per line.</p>
        <textarea
          rows={3}
          className="w-full rounded-md border bg-background p-3 text-sm"
          value={form.confirmedTrades}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              confirmedTrades: event.target.value,
            }))
          }
          placeholder="Architect/Designer&#10;Plumber&#10;Electrician"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">
          Pending Before Start
        </label>
        <p className="text-xs text-muted-foreground">One action per line.</p>
        <textarea
          rows={3}
          className="w-full rounded-md border bg-background p-3 text-sm"
          value={form.pendingBeforeStart}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              pendingBeforeStart: event.target.value,
            }))
          }
          placeholder="Trade scheduling meeting&#10;Material procurement"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Financing</label>
        <input
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          value={form.financing}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              financing: event.target.value,
            }))
          }
          placeholder="e.g., fully funded"
        />
      </div>

      <h3 className="text-sm font-semibold">Scope Exclusions</h3>
      <p className="text-xs text-muted-foreground">One exclusion per line.</p>
      <textarea
        rows={4}
        className="w-full rounded-md border bg-background p-3 text-sm"
        value={form.scopeExclusions}
        onChange={(event) =>
          setForm((current) => ({
            ...current,
            scopeExclusions: event.target.value,
          }))
        }
        placeholder="No egress additions required&#10;No asbestos/hazmat remediation"
      />

      <button
        type="button"
        onClick={onSubmit}
        disabled={isPending}
        className="rounded-md bg-foreground px-3 py-2 text-sm text-background disabled:opacity-60"
      >
        {isPending ? "Saving..." : "Save Project Profile"}
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
    </section>
  );
}
