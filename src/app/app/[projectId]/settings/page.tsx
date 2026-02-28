import { ProjectSettingsForm } from "@/components/reno/project-settings-form";
import { AttachmentManager } from "@/components/reno/attachment-manager";
import { SectionManager } from "@/components/reno/section-manager";
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

      <section id="sections" className="space-y-2">
        <div className="rounded-lg border p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Structure
          </p>
          <h2 className="mt-1 text-xl font-semibold">Section Management</h2>
          <p className="text-sm text-muted-foreground">
            Add, edit, delete, and reorder project sections.
          </p>
        </div>
        <SectionManager
          projectId={project.id}
          initialSections={project.sections}
        />
      </section>

      <AttachmentManager
        projectId={project.id}
        scopeType="project"
        attachments={project.attachments}
        title="Project Files (Drawings, Permits, etc.)"
      />
    </div>
  );
}
