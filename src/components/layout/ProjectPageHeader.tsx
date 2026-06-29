/**
 * ProjectPageHeader — breadcrumb + H2 page header for project-hub and product-hub routes.
 *
 * Vikram directive 2026-06-14: all project-hub AND product-hub routes must
 * render this structure (breadcrumb + H1) instead of ProjectHeaderChip /
 * ProductHeaderChip. Matches the Kanban page pattern (ground truth,
 * DOM-probed 2026-06-13):
 *   <nav> breadcrumbs: "Projects / [Project Name] / [RouteWord]"
 *     — 14px / 400 / rgb(107,110,118) = var(--ds-text-subtlest)
 *   <h2> RouteWord
 *     — 24px / 653 / lineHeight 28px / rgb(41,42,46) = var(--ds-text)
 *
 * hubType prop:
 *   'project' (default) → "Projects" root, queries ph_jira_projects + ph_projects
 *   'product'           → "Products" root, queries products table
 */
import React from "react";
import { useLocation, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/ads";
import Heading from "@atlaskit/heading";
import { supabase } from "@/integrations/supabase/client";
import { deriveRouteWord } from "./projectHeaderTitle";
import { WorkItemStarButton } from "@/components/shared/WorkItemStarButton";
import type { StarredItemType } from "@/hooks/home/useStarredItems";
import ProjectIcon from "@/components/shared/ProjectIcon";

interface Props {
  projectKey?: string;
  /** Horizontal padding in px. Default 20px (matches KanbanPage PAGE_PADDING_X). */
  paddingX?: number;
  /**
   * 'project' → "Projects / [name] / …"; 'product' → "Products / [name] / …"
   * (4-crumb, entity-scoped). 'incident' / 'release' / 'testhub' are GLOBAL
   * hubs with no entity — they render a 3-crumb breadcrumb
   * "Home / [Root] / [RouteWord]", skip the DB name lookup, and show no star.
   */
  hubType?: "project" | "product" | "incident" | "release" | "test";
  /**
   * Detail-page trail. When provided, the breadcrumb renders
   * "Home / [Root] / ...trail" instead of the auto-derived route word — so a
   * detail page can show "Home / Releases / Change Records / CHG8841". Each
   * entry except the last should carry an href; the last is the current page.
   */
  trail?: { text: string; href?: string }[];
  /** Hide the H2 title row (detail pages render their own rich header below). */
  hideTitle?: boolean;
  /** Override the auto-derived title (e.g. entity name on detail pages). */
  title?: React.ReactNode;
  /** Optional actions rendered on the right side of the title row. */
  actions?: React.ReactNode;
}

/** Root crumb label + href per hub type. Global hubs have no entity crumb. */
const HUB_ROOT: Record<
  NonNullable<Props["hubType"]>,
  { label: string; href: string }
> = {
  project: { label: "Projects", href: "/project-hub/projects" },
  product: { label: "Products", href: "/product-hub" },
  incident: { label: "Incidents", href: "/incident-hub" },
  release: { label: "Releases", href: "/release-hub/overview" },
  test: { label: "Test Hub", href: "/testhub/dashboard" },
};

// Which project/product surfaces are starrable. Only these route words get a
// star control; anything else returns undefined (no guessed star affordance).
const SURFACE_STAR_TYPE: Record<string, StarredItemType> = {
  backlog: "backlog",
  dashboard: "dashboard",
};

export function surfaceStarType(
  routeWord: string
): StarredItemType | undefined {
  return SURFACE_STAR_TYPE[routeWord.trim().toLowerCase()];
}

export function ProjectPageHeader({
  projectKey = "",
  paddingX = 20,
  hubType = "project",
  trail,
  hideTitle,
  title,
  actions,
}: Props) {
  const { pathname } = useLocation();
  const isGlobalHub =
    hubType === "incident" || hubType === "release" || hubType === "test";

  const { data: project } = useQuery({
    queryKey: ["project-page-header", hubType, projectKey],
    // Global hubs (incident/release) have no project/product entity — skip the
    // name lookup entirely; the breadcrumb omits the entity crumb.
    enabled: !!projectKey && !isGlobalHub,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      if (hubType === "product") {
        const { data } = await (supabase as any)
          .from("products")
          .select("name")
          .eq("code", projectKey.toUpperCase())
          .eq("is_active", true)
          .maybeSingle();
        return { name: (data as { name?: string } | null)?.name ?? projectKey };
      }
      const [jiraRes, phRes] = await Promise.all([
        (supabase as any)
          .from("ph_jira_projects")
          .select("name")
          .eq("project_key", projectKey)
          .maybeSingle(),
        (supabase as any)
          .from("ph_projects")
          .select("name")
          .eq("key", projectKey)
          .maybeSingle(),
      ]);
      const name =
        (jiraRes.data as { name?: string } | null)?.name ??
        (phRes.data as { name?: string } | null)?.name ??
        projectKey;
      return { name };
    },
  });

  const projectName = project?.name ?? projectKey;
  const routeWord = deriveRouteWord(pathname) ?? projectKey;
  // No star on global hubs — star items are project/product-scoped instances.
  const starType = isGlobalHub ? undefined : surfaceStarType(routeWord);

  const { label: rootLabel, href: rootHref } = HUB_ROOT[hubType];
  const entityHref =
    hubType === "product"
      ? `/product-hub/${projectKey}`
      : `/project-hub/${projectKey}`;

  const breadcrumbItems: BreadcrumbItem[] = [
    { key: "home", text: "Home", href: "/for-you" },
    { key: "root", text: rootLabel, href: rootHref },
    ...(!isGlobalHub && !trail
      ? [{
          key: "entity",
          text: projectName,
          href: entityHref,
          iconBefore: <ProjectIcon projectKey={projectKey} size="xsmall" name={projectName} />,
          ariaLabel: projectName,
        }]
      : []),
    ...(trail
      ? trail.map((c, i) => ({
          key: `trail-${i}`,
          text: c.text,
          href: c.href,
          isCurrent: i === trail.length - 1 && !c.href,
        }))
      : [{ key: "current", text: routeWord, isCurrent: true }]),
  ];

  return (
    <div
      style={{
        padding: `4px ${paddingX}px 0px`,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        flexShrink: 0,
        minHeight: 36,
      }}
    >
      {/* Breadcrumb inline — de-emphasised, left side */}
      <div
        className="cat-breadcrumb-host"
        style={{ fontSize: 12, flexShrink: 0, opacity: 0.8 }}
      >
        <Breadcrumbs items={breadcrumbItems} LinkComponent={Link} />
      </div>

      {!hideTitle && (
        <>
          <span
            aria-hidden
            style={{
              color: "var(--ds-border-bold)",
              fontSize: 14,
              lineHeight: 1,
              flexShrink: 0,
              userSelect: "none",
            }}
          >
            /
          </span>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              minWidth: 0,
              flex: 1,
            }}
          >
            <Heading size="large">{title ?? routeWord}</Heading>
            {starType && (
              <WorkItemStarButton
                itemId={pathname}
                itemType={starType}
                metadata={{
                  label: routeWord,
                  subtitle: projectName,
                  route: pathname,
                }}
                size="md"
                showTooltip
              />
            )}
          </div>

          {actions && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexShrink: 0,
              }}
            >
              {actions}
            </div>
          )}
        </>
      )}
    </div>
  );
}
