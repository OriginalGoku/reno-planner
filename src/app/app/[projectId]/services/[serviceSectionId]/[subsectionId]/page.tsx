import { notFound } from "next/navigation";
import { ServicesWireframe } from "@/components/reno/services-wireframe";
import { loadRenoProject } from "@/lib/reno-project-service";

type ServicesSubsectionPageProps = {
  params: Promise<{
    projectId: string;
    serviceSectionId: string;
    subsectionId: string;
  }>;
};

export default async function ServicesSubsectionPage({
  params,
}: ServicesSubsectionPageProps) {
  const { projectId, serviceSectionId, subsectionId } = await params;
  const project = await loadRenoProject(projectId);

  const serviceSection = project.serviceSections.find(
    (entry) => entry.id === serviceSectionId,
  );
  const subsection = serviceSection?.subsections.find(
    (entry) => entry.id === subsectionId,
  );
  if (!serviceSection || !subsection) {
    notFound();
  }

  return (
    <ServicesWireframe
      projectId={project.id}
      sections={project.sections}
      initialServiceSections={project.serviceSections}
      filterServiceSectionId={serviceSectionId}
      filterSubsectionId={subsectionId}
    />
  );
}
