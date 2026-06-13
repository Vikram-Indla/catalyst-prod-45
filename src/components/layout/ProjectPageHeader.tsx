/**
 * ProjectPageHeader — breadcrumb + H2 page header for project-hub routes.
 *
 * Vikram directive 2026-06-14: all project-hub routes must render this
 * structure instead of ProjectHeaderChip. Matches the Kanban page pattern
 * (ground truth, DOM-probed 2026-06-13):
 *   <nav> breadcrumbs: "Projects / [Project Name] / [RouteWord]"
 *     — 14px / 400 / rgb(107,110,118) = var(--ds-text-subtlest)
 *   <h2> RouteWord
 *     — 24px / 653 / lineHeight 28px / rgb(41,42,46) = var(--ds-text)
 */
import React from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Breadcrumbs, { BreadcrumbsItem } from '@atlaskit/breadcrumbs';
import Heading from '@atlaskit/heading';
import { supabase } from '@/integrations/supabase/client';
import { deriveRouteWord } from './projectHeaderTitle';

interface Props {
  projectKey: string;
  /** Horizontal padding in px. Default 20px (matches KanbanPage PAGE_PADDING_X). */
  paddingX?: number;
}

export function ProjectPageHeader({ projectKey, paddingX = 20 }: Props) {
  const { pathname } = useLocation();

  const { data: project } = useQuery({
    queryKey: ['project-page-header', projectKey],
    enabled: !!projectKey,
    staleTime: 5 * 60_000,
    queryFn: async () => {
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
        <BreadcrumbsItem text="Projects" href="/project-hub/projects" />
        <BreadcrumbsItem text={projectName} href={`/project-hub/${projectKey}`} />
        <BreadcrumbsItem text={routeWord} />
      </Breadcrumbs>
      <Heading size="large">{routeWord}</Heading>
    </div>
  );
}
