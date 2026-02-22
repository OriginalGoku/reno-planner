import { notFound } from "next/navigation";
import { UnitsWireframe } from "@/components/reno/units-wireframe";
import { loadRenoProject } from "@/lib/reno-project-service";

type ProjectUnitDetailPageProps = {
  params: Promise<{ projectId: string; unitId: string }>;
};

export default async function ProjectUnitDetailPage({
  params,
}: ProjectUnitDetailPageProps) {
  const { projectId, unitId } = await params;
  const project = await loadRenoProject(projectId);
  const unitExists = project.units.some((unit) => unit.id === unitId);
  if (!unitExists) {
    notFound();
  }

  return (
    <UnitsWireframe
      projectId={project.id}
      initialUnits={project.units}
      sections={project.sections}
      initialItems={project.items}
      focusUnitId={unitId}
    />
  );
}
