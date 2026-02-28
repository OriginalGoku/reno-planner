import Link from "next/link";
import { notFound } from "next/navigation";
import { loadRenoProject } from "@/lib/reno-project-service";

type MaterialUsagePageProps = {
  params: Promise<{ projectId: string; materialId: string }>;
};

export default async function MaterialUsagePage({
  params,
}: MaterialUsagePageProps) {
  const { projectId, materialId } = await params;
  const project = await loadRenoProject(projectId);
  const material = project.materialCatalog.find(
    (entry) => entry.id === materialId,
  );

  if (!material) {
    notFound();
  }

  const usages = project.items
    .map((item) => {
      const line = (item.materials ?? []).find(
        (entry) => entry.materialId === materialId,
      );
      if (!line) {
        return null;
      }
      const section = project.sections.find(
        (entry) => entry.id === item.sectionId,
      );
      const unit = item.unitId
        ? project.units.find((entry) => entry.id === item.unitId)
        : undefined;

      return {
        itemId: item.id,
        itemTitle: item.title,
        sectionId: item.sectionId,
        sectionTitle: section?.title ?? item.sectionId,
        unitName: unit?.name ?? null,
        quantity: line.quantity,
        unitEstimate: material.estimatedPrice ?? 0,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .sort((a, b) => a.itemTitle.localeCompare(b.itemTitle));

  return (
    <div className="space-y-4">
      <section className="rounded-lg border p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Catalog Entry Usage
        </p>
        <h1 className="mt-1 text-2xl font-semibold">{material.name}</h1>
        <p className="text-sm text-muted-foreground">
          This material is used by {usages.length} item
          {usages.length === 1 ? "" : "s"}.
        </p>
      </section>

      <section className="rounded-lg border p-4 space-y-3">
        {!usages.length ? (
          <p className="text-sm text-muted-foreground">
            This material is not currently linked to any items.
          </p>
        ) : (
          <div className="space-y-2">
            {usages.map((usage) => (
              <article key={usage.itemId} className="rounded-md border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      <Link
                        href={`/app/${project.id}/items/${usage.itemId}`}
                        className="underline underline-offset-2 hover:text-blue-700"
                      >
                        {usage.itemTitle}
                      </Link>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Section:{" "}
                      <Link
                        href={`/app/${project.id}/sections/${usage.sectionId}`}
                        className="underline underline-offset-2 hover:text-blue-700"
                      >
                        {usage.sectionTitle}
                      </Link>
                      {usage.unitName ? ` • Unit: ${usage.unitName}` : ""}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Qty: {usage.quantity} • Unit est: $
                    {usage.unitEstimate.toLocaleString()} • Line est: $
                    {(usage.quantity * usage.unitEstimate).toLocaleString()}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
