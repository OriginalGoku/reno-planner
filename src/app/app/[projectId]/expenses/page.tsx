import { ExpensesWireframe } from "@/components/reno/expenses-wireframe";
import { loadRenoProject } from "@/lib/reno-project-service";

type ExpensesPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ExpensesPage({ params }: ExpensesPageProps) {
  const { projectId } = await params;
  const project = await loadRenoProject(projectId);
  return <ExpensesWireframe project={project} />;
}
