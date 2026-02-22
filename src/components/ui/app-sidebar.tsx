"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import Link from "next/link";
import { useTransition, type ComponentType } from "react";
import {
  ChevronRight,
  ClipboardList,
  FileText,
  FolderKanban,
  LayoutDashboard,
  PackageSearch,
  Pencil,
  Receipt,
  Settings,
  Trash2,
} from "lucide-react";
import { useRenoData } from "@/components/reno/reno-data-provider";
import { deleteSectionAction, updateSectionAction } from "@/lib/reno-actions";
import { useRouter } from "next/navigation";

type NavChild = {
  id: string;
  title: string;
  href: string;
};

type NavItem = {
  title: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  children?: NavChild[];
};

export function AppSidebar() {
  const project = useRenoData();
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function editSection(sectionId: string) {
    const section = project.sections.find((entry) => entry.id === sectionId);
    if (!section) {
      return;
    }

    const nextTitle = window.prompt("Section title", section.title);
    if (!nextTitle) {
      return;
    }

    const nextDescription = window.prompt(
      "Section description",
      section.description ?? "",
    );
    if (nextDescription === null) {
      return;
    }

    const title = nextTitle.trim();
    const description = nextDescription.trim();
    if (!title || !description) {
      return;
    }

    startTransition(async () => {
      try {
        await updateSectionAction({
          projectId: project.id,
          sectionId,
          title,
          description,
        });
        router.refresh();
      } catch {
        router.refresh();
      }
    });
  }

  function removeSection(sectionId: string) {
    const section = project.sections.find((entry) => entry.id === sectionId);
    const sectionTitle = section?.title ?? "this section";
    const confirmed = window.confirm(
      `Delete "${sectionTitle}"? This will also remove all items in this section and unlink related notes.`,
    );
    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      try {
        await deleteSectionAction({
          projectId: project.id,
          sectionId,
        });
        router.refresh();
      } catch {
        router.refresh();
      }
    });
  }

  const mainNav: NavItem[] = [
    {
      title: "Dashboard",
      href: `/app/${project.id}`,
      icon: LayoutDashboard,
    },
    {
      title: project.name,
      href: `/app/${project.id}`,
      icon: FolderKanban,
      children: project.sections.map((section) => ({
        id: section.id,
        title: section.title,
        href: `/app/${project.id}/sections/${section.id}`,
      })),
    },
    {
      title: "All Items",
      href: `/app/${project.id}/items`,
      icon: ClipboardList,
    },
    {
      title: "Purchases",
      href: `/app/${project.id}/purchases`,
      icon: PackageSearch,
    },
    {
      title: "Expenses",
      href: `/app/${project.id}/expenses`,
      icon: Receipt,
    },
    {
      title: "Lessons learned",
      href: `/app/${project.id}/notes`,
      icon: FileText,
    },
  ];

  const secondaryNav: NavItem[] = [
    {
      title: "Settings",
      href: `/app/${project.id}/settings`,
      icon: Settings,
    },
  ];

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="px-2 py-1 text-sm font-semibold">Reno Manager</div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <Collapsible
                  key={item.title}
                  asChild
                  defaultOpen={item.title === project.name}
                >
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                    {item.children?.length ? (
                      <>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuAction
                            showOnHover
                            aria-label={`Toggle ${item.title} submenu`}
                            className="data-[state=open]:rotate-90"
                          >
                            <ChevronRight />
                          </SidebarMenuAction>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.children.map((child) => (
                              <SidebarMenuSubItem key={child.id}>
                                <SidebarMenuSubButton asChild>
                                  <Link href={child.href}>
                                    <span>{child.title}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                                <div className="absolute top-1 right-1 flex gap-1 opacity-0 transition-opacity group-hover/menu-sub-item:opacity-100">
                                  <button
                                    type="button"
                                    aria-label={`Edit ${child.title}`}
                                    onClick={(event) => {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      editSection(child.id);
                                    }}
                                    disabled={isPending}
                                    className="inline-flex size-5 items-center justify-center rounded border bg-background text-muted-foreground hover:bg-muted"
                                  >
                                    <Pencil className="size-3" />
                                  </button>
                                  <button
                                    type="button"
                                    aria-label={`Delete ${child.title}`}
                                    onClick={(event) => {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      removeSection(child.id);
                                    }}
                                    disabled={isPending}
                                    className="inline-flex size-5 items-center justify-center rounded border border-red-200 bg-background text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="size-3" />
                                  </button>
                                </div>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </>
                    ) : null}
                  </SidebarMenuItem>
                </Collapsible>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {/* <SidebarGroup>
          <SidebarGroupLabel>Shadcn UI Ideas</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {uiIdeasNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup> */}
        <SidebarGroup>
          <SidebarGroupLabel>Preferences</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="px-2 py-1 text-xs text-muted-foreground">
          Single-tenant mode: admin
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
