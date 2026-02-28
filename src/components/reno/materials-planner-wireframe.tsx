"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useMemo } from "react";
import type { RenovationProject } from "@/lib/reno-data-loader";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

function unitLabel(unitType: string) {
  return unitType.replaceAll("_", " ");
}

function catalogUnitPrice(
  materialCatalogMap: Map<string, RenovationProject["materialCatalog"][number]>,
  materialId: string,
) {
  return materialCatalogMap.get(materialId)?.estimatedPrice ?? 0;
}

type MaterialsPlannerWireframeProps = {
  project: RenovationProject;
};

type ItemWithMaterials = {
  itemId: string;
  itemTitle: string;
  sectionId: string;
  materials: NonNullable<RenovationProject["items"][number]["materials"]>;
};

export function MaterialsPlannerWireframe({
  project,
}: MaterialsPlannerWireframeProps) {
  const materialCatalogMap = useMemo(
    () => new Map(project.materialCatalog.map((entry) => [entry.id, entry])),
    [project.materialCatalog],
  );
  const materialCategoryMap = useMemo(
    () =>
      new Map(
        project.materialCategories.map((category) => [category.id, category]),
      ),
    [project.materialCategories],
  );

  const itemsWithMaterials = useMemo<ItemWithMaterials[]>(() => {
    return project.items
      .filter((item) => item.materials && item.materials.length > 0)
      .map((item) => ({
        itemId: item.id,
        itemTitle: item.title,
        sectionId: item.sectionId,
        materials: item.materials ?? [],
      }));
  }, [project.items]);

  const groupedBySection = useMemo(() => {
    return project.sections
      .map((section) => ({
        section,
        items: itemsWithMaterials.filter(
          (item) => item.sectionId === section.id,
        ),
      }))
      .filter((entry) => entry.items.length > 0);
  }, [itemsWithMaterials, project.sections]);

  const projectEstimatedMaterialsTotal = useMemo(() => {
    return itemsWithMaterials.reduce((sum, item) => {
      const itemTotal = item.materials.reduce(
        (lineSum, material) =>
          lineSum +
          material.quantity *
            catalogUnitPrice(materialCatalogMap, material.materialId),
        0,
      );
      return sum + itemTotal;
    }, 0);
  }, [itemsWithMaterials, materialCatalogMap]);

  return (
    <div className="space-y-6">
      <section className="rounded-lg border p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Materials Rollup
        </p>
        <h1 className="mt-1 text-2xl font-semibold">Materials Planner</h1>
        <div className="mt-2">
          <span className="rounded-full border border-blue-300 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-800">
            Price source: Material Catalog
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Materials grouped by section and item for purchase planning.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Items With Materials</p>
          <p className="text-2xl font-semibold">{itemsWithMaterials.length}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">
            Estimated Material Total
          </p>
          <p className="text-2xl font-semibold">
            ${projectEstimatedMaterialsTotal.toLocaleString()}
          </p>
        </div>
      </section>

      <section className="space-y-3">
        {groupedBySection.map(({ section, items }) => {
          const sectionTotal = items.reduce((sum, item) => {
            const itemTotal = item.materials.reduce(
              (lineSum, material) =>
                lineSum +
                material.quantity *
                  catalogUnitPrice(materialCatalogMap, material.materialId),
              0,
            );
            return sum + itemTotal;
          }, 0);

          return (
            <Collapsible key={section.id} defaultOpen>
              <div className="rounded-lg border">
                <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-left">
                  <div>
                    <p className="font-medium">{section.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {items.length} item{items.length > 1 ? "s" : ""} • $
                      {sectionTotal.toLocaleString()}
                    </p>
                  </div>
                  <ChevronRight className="size-4 transition-transform data-[state=open]:rotate-90" />
                </CollapsibleTrigger>

                <CollapsibleContent className="space-y-3 border-t px-4 py-3">
                  {items.map((item) => {
                    const itemTotal = item.materials.reduce(
                      (sum, material) =>
                        sum +
                        material.quantity *
                          catalogUnitPrice(
                            materialCatalogMap,
                            material.materialId,
                          ),
                      0,
                    );

                    return (
                      <div key={item.itemId} className="rounded-lg border p-4">
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <Link
                            href={`/app/${project.id}/items/${item.itemId}`}
                            className="font-medium underline-offset-2 hover:underline"
                          >
                            {item.itemTitle}
                          </Link>
                          <span className="text-sm font-semibold">
                            ${itemTotal.toLocaleString()}
                          </span>
                        </div>

                        <div className="space-y-2">
                          {item.materials.map((material) => (
                            <div
                              key={material.id}
                              className="rounded-md border p-3 text-sm text-muted-foreground"
                            >
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-medium text-foreground">
                                      {materialCatalogMap.get(
                                        material.materialId,
                                      )?.name ??
                                        `Unknown material (${material.materialId})`}
                                    </p>
                                    <span className="rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-wide">
                                      {materialCategoryMap.get(
                                        materialCatalogMap.get(
                                          material.materialId,
                                        )?.categoryId ?? "",
                                      )?.name ??
                                        materialCatalogMap.get(
                                          material.materialId,
                                        )?.categoryId ??
                                        "Uncategorized"}
                                    </span>
                                  </div>
                                  <p>
                                    Qty: {material.quantity}{" "}
                                    {unitLabel(
                                      materialCatalogMap.get(
                                        material.materialId,
                                      )?.unitType ?? "other",
                                    )}{" "}
                                    • Unit est: $
                                    {catalogUnitPrice(
                                      materialCatalogMap,
                                      material.materialId,
                                    ).toLocaleString()}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground">
                                    Price source: Material Catalog
                                  </p>
                                  {catalogUnitPrice(
                                    materialCatalogMap,
                                    material.materialId,
                                  ) === 0 ? (
                                    <p className="text-amber-700">
                                      Warning: catalog unit estimate is 0.
                                    </p>
                                  ) : null}
                                  {material.note ? <p>{material.note}</p> : null}
                                </div>
                                <p className="font-medium text-foreground">
                                  $
                                  {(
                                    material.quantity *
                                    catalogUnitPrice(
                                      materialCatalogMap,
                                      material.materialId,
                                    )
                                  ).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}

        {!groupedBySection.length ? (
          <p className="text-sm text-muted-foreground">
            No materials have been added yet.
          </p>
        ) : null}
      </section>
    </div>
  );
}
