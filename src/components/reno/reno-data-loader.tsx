import { loadRenoProject } from "@/lib/reno-project-service";
import { RenoDataProvider } from "@/components/reno/reno-data-provider";

type RenoDataLoaderProps = {
  children: React.ReactNode;
  projectId?: string;
};

export async function RenoDataLoader({
  children,
  projectId,
}: RenoDataLoaderProps) {
  const project = await loadRenoProject(projectId);
  return <RenoDataProvider project={project}>{children}</RenoDataProvider>;
}
