import {
  getProjectFinancialSnapshot,
  getProjectSummary,
  getSectionFinancials,
  getTotalActualForItem,
  STATUS_LABELS,
  type ItemStatus,
} from "@/lib/reno-data-loader";
import { loadRenoProject } from "@/lib/reno-project-service";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight } from "lucide-react";

const statusStyles: Record<ItemStatus, string> = {
  todo: "bg-slate-100 text-slate-700",
  in_progress: "bg-blue-100 text-blue-700",
  blocked: "bg-amber-100 text-amber-700",
  done: "bg-emerald-100 text-emerald-700",
};

function sectionProgressPercent(done: number, total: number) {
  if (!total) return 0;
  return Math.round((done / total) * 100);
}

type ProjectPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  const project = await loadRenoProject(projectId);
  const summary = getProjectSummary(project);
  const projectFinancials = getProjectFinancialSnapshot(project);
  const upcomingPurchases = project.items
    .filter((item) => item.status !== "done" && item.estimate > 0)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <section className="rounded-lg border p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Project
        </p>
        <h1 className="mt-1 text-2xl font-semibold">{project.name}</h1>
        <p className="text-sm text-muted-foreground">
          {project.address} • Phase: {project.phase} • Target completion:{" "}
          {project.targetCompletion}
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Sections</p>
          <p className="text-2xl font-semibold">{summary.totalSections}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Total items</p>
          <p className="text-2xl font-semibold">{summary.totalItems}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">In progress</p>
          <p className="text-2xl font-semibold">{summary.in_progress}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Blocked</p>
          <p className="text-2xl font-semibold">{summary.blocked}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Done</p>
          <p className="text-2xl font-semibold">{summary.done}</p>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Budget Estimate</p>
          <p className="text-2xl font-semibold">
            ${projectFinancials.estimateFromItems.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Actual (Purchased)</p>
          <p className="text-2xl font-semibold">
            ${projectFinancials.actualFromLedger.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Actual (Expenses)</p>
          <p className="text-2xl font-semibold">
            ${projectFinancials.actualFromExpenses.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Variance vs Purchased</p>
          <p className="text-2xl font-semibold">
            {projectFinancials.varianceVsLedger >= 0 ? "+" : "-"}$
            {Math.abs(projectFinancials.varianceVsLedger).toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Invoice Drafts</p>
          <p className="text-2xl font-semibold">
            {projectFinancials.draftInvoiceCount}
          </p>
          <p className="text-xs text-muted-foreground">
            Value: ${projectFinancials.draftInvoiceTotal.toLocaleString()}
          </p>
        </div>
      </section>

      <section className="grid gap-3">
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">
            Estimated Material Total
          </p>
          <p className="text-2xl font-semibold">
            ${projectFinancials.estimatedMaterialsTotal.toLocaleString()}
          </p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Collapsible
          defaultOpen
          className="rounded-lg border p-4 lg:col-span-2"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Section Progress</h2>
            <CollapsibleTrigger className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-muted">
              <ChevronRight className="size-3.5" />
              Toggle
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent className="mt-4 space-y-4">
            {project.sections.map((section) => {
              const sectionItems = project.items.filter(
                (item) => item.sectionId === section.id,
              );
              const total = sectionItems.length;
              const done = sectionItems.filter(
                (item) => item.status === "done",
              ).length;
              const progress = sectionProgressPercent(done, total);
              const sectionFinancials = getSectionFinancials(
                project,
                section.id,
              );

              return (
                <div key={section.id} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{section.title}</span>
                    <span className="text-muted-foreground">
                      {done}/{total} complete ({progress}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-foreground/80"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sectionItems.slice(0, 3).map((item) => (
                      <span
                        key={item.id}
                        className={`inline-flex rounded-md px-2 py-1 text-xs ${statusStyles[item.status]}`}
                      >
                        {item.title} • {STATUS_LABELS[item.status]}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Estimate: $
                    {sectionFinancials.estimateTotal.toLocaleString()} • Actual
                    (Expenses): $
                    {sectionFinancials.actualTotal.toLocaleString()} • Variance:{" "}
                    {sectionFinancials.variance >= 0 ? "+" : "-"}$
                    {Math.abs(sectionFinancials.variance).toLocaleString()}
                  </p>
                </div>
              );
            })}
          </CollapsibleContent>
        </Collapsible>

        <div className="space-y-6">
          <div className="rounded-lg border p-4">
            <h2 className="text-base font-semibold">Planned Purchases</h2>
            <div className="mt-3 space-y-3 text-sm">
              {upcomingPurchases.map((item) => (
                <div key={item.id} className="rounded-md border p-2">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {
                      project.sections.find(
                        (section) => section.id === item.sectionId,
                      )?.title
                    }{" "}
                    • Est. ${item.estimate}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Actual (Expenses): $
                    {getTotalActualForItem(item).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
