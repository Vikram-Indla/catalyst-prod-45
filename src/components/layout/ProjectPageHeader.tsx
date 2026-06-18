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
import React from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Breadcrumbs, { BreadcrumbsItem } from '@atlaskit/breadcrumbs';
import Heading from '@atlaskit/heading';
import { supabase } from '@/integrations/supabase/client';
import { deriveRouteWord } from './projectHeaderTitle';
import { WorkItemStarButton } from '@/components/shared/WorkItemStarButton';
import type { StarredItemType } from '@/hooks/home/useStarredItems';

interface Props {
  projectKey: string;
  /** Horizontal padding in px. Default 20px (matches KanbanPage PAGE_PADDING_X). */
  paddingX?: number;
  /** 'project' renders "Projects / …" breadcrumb; 'product' renders "Products / …". */
  hubType?: 'project' | 'product';
}

// Which project/product surfaces are starrable. Only these route words get a
// star control; anything else returns undefined (no guessed star affordance).
const SURFACE_STAR_TYPE: Record<string, StarredItemType> = {
  backlog: 'backlog',
  dashboard: 'dashboard',
};

export function surfaceStarType(routeWord: string): StarredItemType | undefined {
  return SURFACE_STAR_TYPE[routeWord.trim().toLowerCase()];
}

export function ProjectPageHeader({ projectKey, paddingX = 20, hubType = 'project' }: Props) {
  const { pathname } = useLocation();

  const { data: project } = useQuery({
    queryKey: ['project-page-header', hubType, projectKey],
    enabled: !!projectKey,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      if (hubType === 'product') {
        const { data } = await (supabase as any)
          .from('products')
          .select('name')
          .eq('code', projectKey.toUpperCase())
          .eq('is_active', true)
          .maybeSingle();
        return { name: (data as { name?: string } | null)?.name ?? projectKey };
      }
      const [jiraRes, phRes] = await Promise.all([
        (supabase as any)
          .from('ph_jira_projects')
          .select('name')
          .eq('project_key', projectKey)
          .maybeSingle(),
        (supabase as any)
          .from('ph_projects')
          .select('name')
          .eq('key', projectKey)
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
  const starType = surfaceStarType(routeWord);

  const rootLabel = hubType === 'product' ? 'Products' : 'Projects';
  const rootHref = hubType === 'product' ? '/product-hub' : '/project-hub/projects';
  const entityHref = hubType === 'product'
    ? `/product-hub/${projectKey}`
    : `/project-hub/${projectKey}`;

  return (
    <div
      style={{
        padding: `0 ${paddingX}px`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 2,
        minHeight: 56,
        flexShrink: 0,
      }}
    >
      <Breadcrumbs>
        {/* Home root — the always-on, one-click path home from any hub
            surface (2026-06-18 nav mental-model: every breadcrumb roots at
            Home, no new icon). */}
        <BreadcrumbsItem text="Home" href="/for-you" />
        <BreadcrumbsItem text={rootLabel} href={rootHref} />
        <BreadcrumbsItem text={projectName} href={entityHref} />
        <BreadcrumbsItem text={routeWord} />
      </Breadcrumbs>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Heading size="large">{routeWord}</Heading>
        {starType && (
          // Star this surface instance. item_id = pathname (unique per surface);
          // metadata carries label/route so the Starred hub can render + open it.
          <WorkItemStarButton
            itemId={pathname}
            itemType={starType}
            metadata={{ label: routeWord, subtitle: projectName, route: pathname }}
            size="md"
            showTooltip
          />
        )}
      </div>
    </div>
  );
}
