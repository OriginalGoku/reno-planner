import Link from "next/link";
import { loadRenoProject } from "@/lib/reno-project-service";

type ServicesPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ServicesPage({ params }: ServicesPageProps) {
  const { projectId } = await params;
  const project = await loadRenoProject(projectId);
  const subsectionLinks = project.serviceSections.flatMap((serviceSection) =>
    serviceSection.subsections.map((subsection) => ({
      id: `${serviceSection.id}-${subsection.id}`,
      parentName: serviceSection.name,
      name: subsection.name,
      href: `/app/${project.id}/services/${serviceSection.id}/${subsection.id}`,
    })),
  );

  return (
    <div className="space-y-6">
      <section className="rounded-lg border p-4">
        <h1 className="text-lg font-semibold">Service Menus</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Open a submenu to manage only its own fields and notes.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        {subsectionLinks.map((entry) => (
          <Link
            key={entry.id}
            href={entry.href}
            className="rounded-lg border p-4 transition-colors hover:bg-muted/40"
          >
            <p className="text-base font-semibold">{entry.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {entry.parentName}
            </p>
          </Link>
        ))}
        {!subsectionLinks.length ? (
          <div className="rounded-lg border p-4 text-sm text-muted-foreground">
            No service submenu found.
          </div>
        ) : null}
      </section>
    </div>
  );
}
