import { notFound } from "next/navigation";
import {
  getItemsBySectionId,
  getSectionById,
} from "@/lib/reno-data-loader";
import { loadRenoProject } from "@/lib/reno-project-service";
import { SectionItemsWireframe } from "@/components/reno/section-items-wireframe";

type SectionPageProps = {
  params: Promise<{ projectId: string; sectionId: string }>;
};

export default async function SectionPage({ params }: SectionPageProps) {
  const { projectId, sectionId } = await params;
  const project = await loadRenoProject(projectId);
  const section = getSectionById(project, sectionId);

  if (!section) {
    notFound();
  }

  const items = getItemsBySectionId(project, section.id);

  return (
    <SectionItemsWireframe
      projectId={project.id}
      section={section}
      items={items}
    />
  );
}
