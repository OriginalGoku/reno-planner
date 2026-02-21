import { PurchasesWireframe } from "@/components/reno/purchases-wireframe";
import { loadRenoProject } from "@/lib/reno-project-service";

type PurchasesPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function PurchasesPage({ params }: PurchasesPageProps) {
  const { projectId } = await params;
  const project = await loadRenoProject(projectId);
  return <PurchasesWireframe project={project} />;
}
