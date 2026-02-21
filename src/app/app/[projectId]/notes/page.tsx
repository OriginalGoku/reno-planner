import { ProjectNotesWireframe } from "@/components/reno/project-notes-wireframe";
import { loadRenoProject } from "@/lib/reno-project-service";

type ProjectNotesPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectNotesPage({
  params,
}: ProjectNotesPageProps) {
  const { projectId } = await params;
  const project = await loadRenoProject(projectId);
  return (
    <ProjectNotesWireframe
      projectId={project.id}
      initialNotes={project.notes}
      sections={project.sections}
    />
  );
}
