import { AllItemsWireframe } from "@/components/reno/all-items-wireframe";
import { loadRenoProject } from "@/lib/reno-project-service";

type AllItemsPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function AllItemsPage({ params }: AllItemsPageProps) {
  const { projectId } = await params;
  const project = await loadRenoProject(projectId);

  return (
    <AllItemsWireframe
      projectId={project.id}
      sections={project.sections}
      units={project.units}
      items={project.items}
    />
  );
}
