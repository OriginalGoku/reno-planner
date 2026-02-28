import { MaterialsPlannerWireframe } from "@/components/reno/materials-planner-wireframe";
import { loadRenoProject } from "@/lib/reno-project-service";

type MaterialsPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function MaterialsPage({ params }: MaterialsPageProps) {
  const { projectId } = await params;
  const project = await loadRenoProject(projectId);

  return <MaterialsPlannerWireframe project={project} />;
}
