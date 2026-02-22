import { ProjectSettingsForm } from "@/components/reno/project-settings-form";
import { AttachmentManager } from "@/components/reno/attachment-manager";
import { loadRenoProject } from "@/lib/reno-project-service";

type SettingsPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { projectId } = await params;
  const project = await loadRenoProject(projectId);

  return (
    <div className="space-y-4">
      <section className="rounded-lg border p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Settings
        </p>
        <h1 className="mt-1 text-2xl font-semibold">Project Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage project-level metadata and overview details.
        </p>
      </section>
      <ProjectSettingsForm project={project} />
      <AttachmentManager
        projectId={project.id}
        scopeType="project"
        attachments={project.attachments}
        title="Project Files (Drawings, Permits, etc.)"
      />
    </div>
  );
}
