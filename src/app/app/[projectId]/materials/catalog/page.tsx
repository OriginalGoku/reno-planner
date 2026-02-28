import { MaterialCatalogWireframe } from "@/components/reno/material-catalog-wireframe";
import { loadRenoProject } from "@/lib/reno-project-service";

type CatalogEntriesPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function CatalogEntriesPage({
  params,
}: CatalogEntriesPageProps) {
  const { projectId } = await params;
  const project = await loadRenoProject(projectId);

  return (
    <MaterialCatalogWireframe
      projectId={project.id}
      initialCatalog={project.materialCatalog}
      initialCategories={project.materialCategories}
      mode="catalog"
    />
  );
}
