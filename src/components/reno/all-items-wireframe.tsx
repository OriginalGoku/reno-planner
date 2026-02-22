"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import {
  getTotalActualForItem,
  STATUS_LABELS,
  type ItemStatus,
  type RenovationItem,
  type RenovationSection,
  type RenovationUnit,
} from "@/lib/reno-data-loader";
import { updateItemStatusAction } from "@/lib/reno-actions";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type AllItemsWireframeProps = {
  projectId: string;
  sections: RenovationSection[];
  units: RenovationUnit[];
  items: RenovationItem[];
};

export function AllItemsWireframe({
  projectId,
  sections,
  units,
  items,
}: AllItemsWireframeProps) {
  const [localItems, setLocalItems] = useState(items);
  const [query, setQuery] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [unitFilter, setUnitFilter] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const filteredItems = useMemo(() => {
    const loweredQuery = query.trim().toLowerCase();

    return localItems.filter((item) => {
      const matchesQuery =
        !loweredQuery ||
        item.title.toLowerCase().includes(loweredQuery) ||
        item.note.toLowerCase().includes(loweredQuery);
      const matchesSection = !sectionFilter || item.sectionId === sectionFilter;
      const matchesStatus = !statusFilter || item.status === statusFilter;
      const matchesUnit =
        !unitFilter ||
        (unitFilter === "__project_wide__"
          ? !item.unitId
          : item.unitId === unitFilter);

      return matchesQuery && matchesSection && matchesStatus && matchesUnit;
    });
  }, [localItems, query, sectionFilter, statusFilter, unitFilter]);

  const estimateTotal = useMemo(
    () => filteredItems.reduce((sum, item) => sum + item.estimate, 0),
    [filteredItems],
  );
  const actualTotal = useMemo(
    () =>
      filteredItems.reduce((sum, item) => sum + getTotalActualForItem(item), 0),
    [filteredItems],
  );
  const variance = estimateTotal - actualTotal;

  function updateStatus(itemId: string, status: ItemStatus) {
    setLocalItems((current) =>
      current.map((item) => (item.id === itemId ? { ...item, status } : item)),
    );

    startTransition(async () => {
      await updateItemStatusAction({ projectId, itemId, status });
      router.refresh();
    });
  }

  const groupedItems = useMemo(() => {
    return sections
      .map((section) => ({
        section,
        items: filteredItems.filter((item) => item.sectionId === section.id),
      }))
      .filter((entry) => entry.items.length > 0);
  }, [filteredItems, sections]);

  return (
    <div className="space-y-6">
      <section className="rounded-lg border p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Items
        </p>
        <h1 className="mt-1 text-2xl font-semibold">All Items</h1>
        <p className="text-sm text-muted-foreground">
          Filter items and update status quickly.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Estimate (Filtered)</p>
          <p className="text-2xl font-semibold">
            ${estimateTotal.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Actual (Filtered)</p>
          <p className="text-2xl font-semibold">
            ${actualTotal.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Variance (Filtered)</p>
          <p className="text-2xl font-semibold">
            {variance >= 0 ? "+" : "-"}${Math.abs(variance).toLocaleString()}
          </p>
        </div>
      </section>

      <section className="rounded-lg border p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Search title or note..."
          />
          <select
            value={sectionFilter}
            onChange={(event) => setSectionFilter(event.target.value)}
            className="rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="">All sections</option>
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.title}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="">All statuses</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={unitFilter}
            onChange={(event) => setUnitFilter(event.target.value)}
            className="rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="">All units</option>
            <option value="__project_wide__">Project-wide items</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="space-y-3">
        {groupedItems.map(({ section, items: sectionItems }) => (
          <Collapsible key={section.id} defaultOpen>
            <div className="rounded-lg border">
              <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-left">
                <div>
                  <p className="font-medium">{section.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {sectionItems.length} item
                    {sectionItems.length > 1 ? "s" : ""}
                  </p>
                </div>
                <ChevronRight className="size-4 transition-transform data-[state=open]:rotate-90" />
              </CollapsibleTrigger>

              <CollapsibleContent className="space-y-3 border-t px-4 py-3">
                {sectionItems.map((item) => (
                  <div key={item.id} className="rounded-lg border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <Link
                          href={`/app/${projectId}/sections/${section.id}#item-${item.id}`}
                          className="font-medium underline-offset-2 hover:underline"
                        >
                          {item.title}
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          {item.note}
                        </p>
                      </div>
                      <div className="w-44 space-y-1">
                        <label className="text-xs text-muted-foreground">
                          Status
                        </label>
                        <select
                          value={item.status}
                          onChange={(event) =>
                            updateStatus(
                              item.id,
                              event.target.value as ItemStatus,
                            )
                          }
                          disabled={isPending}
                          className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                        >
                          {Object.entries(STATUS_LABELS).map(
                            ([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ),
                          )}
                        </select>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Estimate: ${item.estimate.toLocaleString()} • Actual: $
                      {getTotalActualForItem(item).toLocaleString()} • Expenses:{" "}
                      {item.expenses.length}
                    </p>
                  </div>
                ))}
              </CollapsibleContent>
            </div>
          </Collapsible>
        ))}
        {!filteredItems.length ? (
          <p className="text-sm text-muted-foreground">
            No items match your filters.
          </p>
        ) : null}
      </section>
    </div>
  );
}
