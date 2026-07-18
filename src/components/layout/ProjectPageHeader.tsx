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
import AkReleaseIcon from "@atlaskit/icon/core/release";
import AkSprintIcon from "@atlaskit/icon/core/sprint";
import AkTargetIcon from "@atlaskit/icon/core/target";
import AkRoadmapIcon from "@atlaskit/icon/core/roadmap";

/** Canonical breadcrumb icons for entity-list surfaces. Keyed by the breadcrumb
 *  TEXT so trail entries and auto-derived route words pick up the same icon.
 *  Render at xsmall (12px) to match the ProjectIcon size used on the entity
 *  crumb — keeps visual hierarchy uniform across hub surfaces. */
const ENTITY_BREADCRUMB_ICON: Record<string, React.ReactElement> = {
  Releases:   <AkReleaseIcon  label="" color="currentColor" />,
  Sprints:    <AkSprintIcon   label="" color="currentColor" />,
  Milestones: <AkTargetIcon   label="" color="currentColor" />,
  Roadmaps:   <AkRoadmapIcon  label="" color="currentColor" />,
};

/** href→to adapter so STRATA crumbs actually navigate. The ads Breadcrumbs
 *  contract calls LinkComponent with `href`, but a raw react-router <Link>
 *  ignores an `href` prop and recomputes it from `to` (undefined here) — so
 *  every crumb rendered through a raw Link points at the current page.
 *  Ring-fenced to the STRATA hub (2026-07-18 directive); other hubs keep the
 *  raw Link until separately approved. */
const StrataCrumbLink = React.forwardRef<
  HTMLAnchorElement,
  React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }
>(function StrataCrumbLink({ href, children, ...rest }, ref) {
  return (
    <Link ref={ref} to={href} {...rest}>
      {children}
    </Link>
  );
});

function withEntityIcon(item: BreadcrumbItem): BreadcrumbItem {
  if (item.iconBefore) return item;
  // Only the root/link crumb gets the entity icon — the current (last) crumb
  // is bold + already carries the page title; icon there reads as a duplicate.
  if (item.isCurrent) return item;
  const icon = ENTITY_BREADCRUMB_ICON[item.text];
  return icon ? { ...item, iconBefore: icon } : item;
}

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
  hubType?: "project" | "product" | "incident" | "release" | "test" | "folio" | "strata";
  /**
   * Detail-page trail. When provided, the breadcrumb renders
   * "Home / [Root] / ...trail" instead of the auto-derived route word — so a
   * detail page can show "Home / Releases / Change Records / CHG8841". Each
   * entry except the last should carry an href; the last is the current page.
   */
  trail?: { text: string; href?: string; onClick?: () => void }[];
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
  folio: { label: "Folio", href: "/folio" },
  strata: { label: "STRATA", href: "/strata" },
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
    hubType === "incident" || hubType === "release" || hubType === "test" ||
    hubType === "folio" || hubType === "strata";

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

  // Breadcrumb: entity name acts as root (no "Home / Hub" prefix).
  // Level-1 pages (no trail): breadcrumb shows [entity] only — the Heading
  // below already names the page; repeating routeWord as a terminal crumb
  // creates a confusing "X / X" visual for pages that are one hop from root.
  // Level-2+ pages (trail provided): breadcrumb shows [entity] / trail…
  // where the trail supplies real back-links and a terminal current-page crumb.
  // STRATA breadcrumb semantics (2026-07-18 QA criteria, ring-fenced):
  //  - on the hub root itself, "STRATA" is the non-clickable current location
  //    (aria-current), never a self-link;
  //  - on every other page the title renders INSIDE the nav as the terminal
  //    crumb (same 18/22px heading visuals) so the current page carries
  //    aria-current="page" within the breadcrumb set.
  const strataAtRoot =
    hubType === "strata" && (pathname === rootHref || pathname === `${rootHref}/`);
  const titleNode = title ?? routeWord;
  const strataTitleInNav =
    hubType === "strata" && !strataAtRoot && !hideTitle && !!titleNode;

  const trailItems = trail
    ? trail.map((c, i) => ({
        key: `trail-${i}`,
        text: c.text,
        href: c.href,
        onClick: c.onClick,
        // When the STRATA title is the terminal crumb, a trailing href-less
        // trail entry is an ancestor label, not the current page — only one
        // element in the set may carry aria-current.
        isCurrent: i === trail.length - 1 && !c.href && !strataTitleInNav,
      }))
    : [];

  const strataCurrentItem: BreadcrumbItem[] = strataTitleInNav
    ? [{
        key: "current-page",
        text: "",
        ariaLabel: typeof titleNode === "string" ? titleNode : undefined,
        render: () => (
          // ads-scanner:ignore-next-line — depth-aware heading: 22px level-1 / 18px level-2; no ADS token maps to these exact values
          <h2 aria-current="page" style={{ fontSize: trail ? 18 : 22, fontWeight: 600, lineHeight: 1.2, color: 'var(--ds-text)', margin: 0, whiteSpace: 'nowrap' }}>
            {titleNode}
          </h2>
        ),
      }]
    : [];

  const breadcrumbItems: BreadcrumbItem[] = isGlobalHub
    ? [
        strataAtRoot
          ? { key: "root", text: rootLabel, isCurrent: true }
          : { key: "root", text: rootLabel, href: rootHref },
        ...trailItems,
        ...strataCurrentItem,
      ]
    : [
        {
          key: "entity",
          text: projectName,
          href: entityHref,
          iconBefore: <ProjectIcon projectKey={projectKey} size="xsmall" name={projectName} />,
          ariaLabel: projectName,
        },
        ...trailItems,
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
        style={{ fontSize: 'var(--ds-font-size-200)', flexShrink: 0, opacity: 0.8 }}
      >
        <Breadcrumbs
          items={breadcrumbItems.map(withEntityIcon)}
          LinkComponent={hubType === "strata" ? StrataCrumbLink : Link}
          maxItems={hubType === "strata" ? 8 : 4}
        />
      </div>

      {/* STRATA: the title is the terminal crumb inside the nav — only the
          right-side actions remain out here. */}
      {strataTitleInNav && actions && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
            marginLeft: "auto",
          }}
        >
          {actions}
        </div>
      )}

      {/* No dangling "/" when there is no title to follow it (Products/Projects
          index pages derive an empty route word). Global hubs additionally
          suppress a derived title that merely repeats the root crumb —
          otherwise /release-hub/releases-management reads "Releases / Releases"
          (same for Incidents). An explicit `title` prop always renders. */}
      {!strataTitleInNav && !hideTitle && (title ?? routeWord) &&
        !(isGlobalHub && !title && routeWord.toLowerCase() === rootLabel.toLowerCase()) && (
        <>
          <span
            aria-hidden
            style={{
              color: "var(--ds-text-subtlest)",
              fontSize: 'var(--ds-font-size-400)',
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
            {/* ads-scanner:ignore-next-line — depth-aware heading: 22px level-1 / 18px level-2; no ADS token maps to these exact values */}
            <h2 style={{ fontSize: trail ? 18 : 22, fontWeight: 600, lineHeight: 1.2, color: 'var(--ds-text)', margin: 0 }}>
              {title ?? routeWord}
            </h2>
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
