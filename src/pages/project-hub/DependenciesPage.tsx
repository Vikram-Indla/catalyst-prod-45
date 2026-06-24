/**
 * Project Dependencies — full-bleed canvas of work item dependencies.
 *
 * Route: /project-hub/:key/dependencies
 * Canvas-first (no list): React Flow fills the surface; toolbar + zoom
 * controls live on the canvas; delete happens on the edge. Mirrors Jira
 * Plans' dependency report.
 */

import React, { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useJiraProjects } from '@/hooks/workhub/useJiraProjects';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import Spinner from '@atlaskit/spinner';
import { catalystToast } from '@/lib/catalystToast';
import DependenciesEmptyState from '@/components/project-hub/dependencies/DependenciesEmptyState';
import DependenciesDiagram from '@/components/project-hub/dependencies/DependenciesDiagram';
import AddDependencyModal from '@/components/project-hub/dependencies/AddDependencyModal';
import type { Dependency, IssueMeta, Hierarchy } from '@/components/project-hub/dependencies/types';

const T = {
  surface: 'var(--ds-surface, #FFFFFF)',
};

export default function DependenciesPage() {
  const { key } = useParams<{ key: string }>();
  const [searchParams] = useSearchParams();
  const focusKey = searchParams.get('focus');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data: allProjects = [] } = useJiraProjects();
  const projectOptions = React.useMemo(
    () => allProjects.map((p: any) => ({
      project_key: p.project_key as string,
      name: (p.name as string | null) ?? null,
      color: (p.color as string | null) ?? null,
      avatar_url: (p.avatar_url as string | null) ?? null,
      icon: (p.icon as string | null) ?? null,
    })),
    [allProjects],
  );

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dependencies', key],
    queryFn: async () => {
      if (!key) throw new Error('Project key required');

      const { data, error: supabaseError } = await (supabase as any)
        .from('ph_issue_dependencies')
        .select('*')
        .eq('project_key', key)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (supabaseError) {
        console.error('[Dependencies] load failed', supabaseError);
        throw new Error(supabaseError.message || supabaseError.code || 'Unknown error');
      }

      const { data: projectRow } = await (supabase as any)
        .from('ph_jira_projects')
        .select('name, color')
        .eq('project_key', key)
        .maybeSingle();

      const deps = (data || []) as Dependency[];
      const keys = Array.from(
        new Set(deps.flatMap((d) => [d.source_issue_key, d.target_issue_key])),
      );

      const firstName = (v: any): string | null => {
        if (Array.isArray(v) && v.length) {
          const names = v.map((x: any) => x?.name).filter(Boolean);
          return names.length ? names.join(', ') : null;
        }
        return null;
      };

      const COLS = 'issue_key, issue_type, summary, status, status_category, due_date, assignee_account_id, assignee_display_name, fix_versions, sprint_name, sprint_release, parent_key, project_key';
      let issueMeta: IssueMeta = {};
      const hierarchy: Hierarchy = {};

      if (keys.length > 0) {
        const { data: issues } = await supabase.from('ph_issues').select(COLS).in('issue_key', keys);
        for (const r of (issues || []) as any[]) {
          issueMeta[r.issue_key] = {
            issue_type: r.issue_type ?? null,
            summary: r.summary ?? null,
            status: r.status ?? null,
            status_category: r.status_category ?? null,
            due_date: r.due_date ?? null,
            assignee_account_id: r.assignee_account_id ?? null,
            assignee_display_name: r.assignee_display_name ?? null,
            release: firstName(r.fix_versions),
            sprint: (r.sprint_name && r.sprint_name.trim()) ? r.sprint_name : firstName(r.sprint_release),
            parent_key: r.parent_key ?? null,
            project_key: r.project_key ?? null,
          };
          hierarchy[r.issue_key] = { issue_type: r.issue_type ?? null, parent_key: r.parent_key ?? null, summary: r.summary ?? null };
        }

        /* Walk up the parent chain (for "Roll-up to" Epic/Feature/Story).
           Fetch ancestors not already loaded, up to a safe depth. */
        let frontier = Array.from(
          new Set(Object.values(hierarchy).map((h) => h.parent_key).filter((k): k is string => !!k && !hierarchy[k])),
        );
        let depth = 0;
        while (frontier.length > 0 && depth < 6) {
          const { data: parents } = await supabase.from('ph_issues').select('issue_key, issue_type, summary, parent_key').in('issue_key', frontier);
          for (const p of (parents || []) as any[]) {
            hierarchy[p.issue_key] = { issue_type: p.issue_type ?? null, parent_key: p.parent_key ?? null, summary: p.summary ?? null };
          }
          frontier = Array.from(
            new Set((parents || []).map((p: any) => p.parent_key).filter((k: string | null): k is string => !!k && !hierarchy[k])),
          );
          depth += 1;
        }
      }

      return {
        dependencies: deps,
        issueMeta,
        hierarchy,
        projectName: (projectRow?.name as string | undefined) ?? null,
        projectColor: (projectRow?.color as string | undefined) ?? null,
      };
    },
    enabled: !!key,
  });

  const dependencies = data?.dependencies;
  const issueMeta = data?.issueMeta ?? {};
  const hierarchy = data?.hierarchy ?? {};
  const projectName = data?.projectName ?? null;
  const projectColor = data?.projectColor ?? null;

  const handleAddSuccess = () => {
    setIsModalOpen(false);
    refetch();
    catalystToast.success('Dependency added');
  };

  const isEmpty = !dependencies || dependencies.length === 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: T.surface }}>
      <ProjectPageHeader title="Dependencies" projectKey={key || ''} />

      {/* Explicit responsive height: the project shell does not bound height:100%
          to the viewport, so a flex:1 canvas collapses. 150px ≈ top nav + page header. */}
      <div style={{ height: 'calc(100dvh - 150px)', minHeight: 420, display: 'flex', flexDirection: 'column' }}>
        {isLoading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Spinner size="large" />
          </div>
        ) : error ? (
          <div style={{ padding: 32, color: 'var(--ds-text-danger, #AE2A19)' }}>
            Error loading dependencies: {(error as any)?.message ?? String(error)}
          </div>
        ) : isEmpty ? (
          <DependenciesEmptyState projectKey={key || ''} onAddClick={() => setIsModalOpen(true)} />
        ) : (
          <DependenciesDiagram
            projectKey={key || ''}
            projectName={projectName}
            projectColor={projectColor}
            dependencies={dependencies!}
            issueMeta={issueMeta}
            hierarchy={hierarchy}
            projects={projectOptions}
            focusKey={focusKey}
            onAddClick={() => setIsModalOpen(true)}
            onChanged={refetch}
          />
        )}
      </div>

      <AddDependencyModal
        projectKey={key || ''}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleAddSuccess}
      />
    </div>
  );
}
