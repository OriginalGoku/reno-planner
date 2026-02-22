import { UnitsWireframe } from "@/components/reno/units-wireframe";
import { loadRenoProject } from "@/lib/reno-project-service";

type ProjectUnitsPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectUnitsPage({
  params,
}: ProjectUnitsPageProps) {
  const { projectId } = await params;
  const project = await loadRenoProject(projectId);

  return (
    <UnitsWireframe
      projectId={project.id}
      initialUnits={project.units}
      sections={project.sections}
      initialItems={project.items}
    />
  );
}
