import { AppBreadcrumbs } from "@/components/reno/app-breadcrumbs";
import { RenoDataLoader } from "@/components/reno/reno-data-loader";
import { AppSidebar } from "@/components/ui/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

type ProjectLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
};

export default async function ProjectLayout({
  children,
  params,
}: ProjectLayoutProps) {
  const { projectId } = await params;

  return (
    <RenoDataLoader projectId={projectId}>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex min-h-12 shrink-0 items-center gap-2 border-b px-3 py-2">
            <SidebarTrigger />
            <AppBreadcrumbs />
          </header>
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </RenoDataLoader>
  );
}
