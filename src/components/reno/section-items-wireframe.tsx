"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  getTotalActualForItem,
  STATUS_LABELS,
  type ItemStatus,
  type RenovationItem,
  type RenovationSection,
} from "@/lib/reno-data-loader";
import { updateItemStatusAction } from "@/lib/reno-actions";

type SectionItemsWireframeProps = {
  projectId: string;
  section: RenovationSection;
  items: RenovationItem[];
};

export function SectionItemsWireframe({
  projectId,
  section,
  items,
}: SectionItemsWireframeProps) {
  const [localItems, setLocalItems] = useState(items);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const estimateTotal = useMemo(
    () => localItems.reduce((sum, item) => sum + item.estimate, 0),
    [localItems],
  );
  const actualTotal = useMemo(
    () => localItems.reduce((sum, item) => sum + getTotalActualForItem(item), 0),
    [localItems],
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

  return (
    <div className="space-y-6">
      <section className="rounded-lg border p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Section
        </p>
        <h1 className="mt-1 text-2xl font-semibold">{section.title}</h1>
        <p className="text-sm text-muted-foreground">{section.description}</p>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Estimate Total</p>
          <p className="text-2xl font-semibold">${estimateTotal.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Actual Total</p>
          <p className="text-2xl font-semibold">${actualTotal.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Variance</p>
          <p className="text-2xl font-semibold">
            {variance >= 0 ? "+" : "-"}${Math.abs(variance).toLocaleString()}
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Items</h2>
        {localItems.map((item) => {
          const actual = getTotalActualForItem(item);

          return (
            <div key={item.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <Link
                    href={`/app/${projectId}/items/${item.id}`}
                    className="font-medium underline-offset-2 hover:underline"
                  >
                    {item.title}
                  </Link>
                  <p className="text-sm text-muted-foreground">{item.note}</p>
                </div>

                <div className="w-44 space-y-1">
                  <label className="text-xs text-muted-foreground">Status</label>
                  <select
                    value={item.status}
                    onChange={(event) =>
                      updateStatus(item.id, event.target.value as ItemStatus)
                    }
                    disabled={isPending}
                    className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                  >
                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <p className="mt-2 text-xs text-muted-foreground">
                Estimate: ${item.estimate.toLocaleString()} • Actual: $
                {actual.toLocaleString()} • Expenses: {item.expenses.length}
              </p>
            </div>
          );
        })}
      </section>
    </div>
  );
}
