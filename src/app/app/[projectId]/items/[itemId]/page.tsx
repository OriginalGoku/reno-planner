import { notFound } from "next/navigation";
import { ItemDetailWireframe } from "@/components/reno/item-detail-wireframe";
import {
  getItemById,
  getSectionById,
} from "@/lib/reno-data-loader";
import { loadRenoProject } from "@/lib/reno-project-service";

type ItemPageProps = {
  params: Promise<{ projectId: string; itemId: string }>;
};

export default async function ItemPage({ params }: ItemPageProps) {
  const { projectId, itemId } = await params;
  const project = await loadRenoProject(projectId);
  const item = getItemById(project, itemId);

  if (!item) {
    notFound();
  }

  const section = getSectionById(project, item.sectionId);

  return (
    <ItemDetailWireframe
      projectId={project.id}
      item={item}
      sectionTitle={section?.title ?? "Unknown Section"}
    />
  );
}
