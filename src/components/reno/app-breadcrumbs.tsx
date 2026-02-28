"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  getItemById,
  getSectionById,
  type RenovationProject,
} from "@/lib/reno-data-loader";
import { useRenoData } from "@/components/reno/reno-data-provider";

type Crumb = {
  label: string;
  href?: string;
};

const ROUTE_LABELS: Record<string, string> = {
  items: "All Items",
  purchases: "Purchases",
  materials: "Materials",
  new: "New Materials",
  catalog: "Catalog Entries",
  expenses: "Expenses",
  units: "Units",
  services: "Mechanical & Building Services",
  notes: "Lessons learned",
  settings: "Settings",
};

function titleCase(input: string) {
  return input
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildBreadcrumbs(
  pathname: string,
  project: RenovationProject,
): Crumb[] {
  const segments = pathname.split("/").filter(Boolean);

  if (!segments.length || segments[0] !== "app") {
    return [];
  }

  const projectCrumb: Crumb = {
    label: project.name,
    href: `/app/${project.id}`,
  };
  const crumbs: Crumb[] = [projectCrumb];

  if (segments[1] !== project.id) {
    return [];
  }

  if (segments.length === 2) {
    return [{ label: project.name }];
  }

  if (segments[2] === "notes") {
    crumbs.push({ label: "Lessons learned" });
    return crumbs;
  }

  if (segments[2] === "sections" && segments[3]) {
    const section = getSectionById(project, segments[3]);
    crumbs.push({
      label: section?.title ?? titleCase(segments[3]),
    });
    return crumbs;
  }

  if (segments[2] === "items" && segments[3]) {
    const item = getItemById(project, segments[3]);
    const section = item ? getSectionById(project, item.sectionId) : undefined;

    if (section) {
      crumbs.push({
        label: section.title,
        href: `/app/${project.id}/sections/${section.id}`,
      });
    }

    crumbs.push({
      label: item?.title ?? titleCase(segments[3]),
    });
    return crumbs;
  }

  if (segments[2] === "units" && segments[3]) {
    const unit = project.units.find((entry) => entry.id === segments[3]);
    crumbs.push({
      label: "Units",
      href: `/app/${project.id}/units`,
    });
    crumbs.push({
      label: unit?.name ?? titleCase(segments[3]),
    });
    return crumbs;
  }

  if (segments[2] === "services" && segments[3] && segments[4]) {
    const serviceSection = project.serviceSections.find(
      (entry) => entry.id === segments[3],
    );
    const subsection = serviceSection?.subsections.find(
      (entry) => entry.id === segments[4],
    );
    crumbs.push({
      label: subsection?.name ?? titleCase(segments[4]),
    });
    return crumbs;
  }

  if (segments[2] === "materials" && segments[3] === "catalog" && segments[4]) {
    const material = project.materialCatalog.find(
      (entry) => entry.id === segments[4],
    );
    crumbs.push({
      label: "Materials",
      href: `/app/${project.id}/materials`,
    });
    crumbs.push({
      label: "Catalog Entries",
      href: `/app/${project.id}/materials/catalog`,
    });
    crumbs.push({
      label: material?.name ?? titleCase(segments[4]),
    });
    return crumbs;
  }

  let href = `/app/${project.id}`;
  for (let index = 2; index < segments.length; index += 1) {
    const segment = segments[index];
    href += `/${segment}`;
    crumbs.push({
      label: ROUTE_LABELS[segment] ?? titleCase(segment),
      href: index === segments.length - 1 ? undefined : href,
    });
  }

  return crumbs;
}

export function AppBreadcrumbs() {
  const pathname = usePathname();
  const project = useRenoData();
  const crumbs = buildBreadcrumbs(pathname, project);

  if (!crumbs.length) {
    return null;
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;

          return (
            <Fragment key={`${crumb.label}-${index}`}>
              <BreadcrumbItem>
                {isLast || !crumb.href ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={crumb.href}>{crumb.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast ? <BreadcrumbSeparator /> : null}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
