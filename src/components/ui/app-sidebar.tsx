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
import type { ComponentType } from "react";
import {
  ChevronRight,
  ClipboardList,
  FileText,
  FolderKanban,
  LayoutDashboard,
  PackageSearch,
  Receipt,
  Settings,
} from "lucide-react";
import { useRenoData } from "@/components/reno/reno-data-provider";

type NavChild = {
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
                              <SidebarMenuSubItem key={child.title}>
                                <SidebarMenuSubButton asChild>
                                  <Link href={child.href}>
                                    <span>{child.title}</span>
                                  </Link>
                                </SidebarMenuSubButton>
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
