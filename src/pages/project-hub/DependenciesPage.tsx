/**
 * Project Dependencies — full-bleed canvas of work item dependencies.
 *
 * Route: /project-hub/:key/dependencies
 * Canvas-first (no list): React Flow fills the surface; toolbar + zoom
 * controls live on the canvas; delete happens on the edge. Mirrors Jira
 * Plans' dependency report.
 */

import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import Spinner from '@atlaskit/spinner';
import { catalystToast } from '@/lib/catalystToast';
import DependenciesEmptyState from '@/components/project-hub/dependencies/DependenciesEmptyState';
import DependenciesDiagram from '@/components/project-hub/dependencies/DependenciesDiagram';
import AddDependencyModal from '@/components/project-hub/dependencies/AddDependencyModal';
import type { Dependency, IssueMeta } from '@/components/project-hub/dependencies/types';

const T = {
  surface: 'var(--ds-surface, #FFFFFF)',
};

export default function DependenciesPage() {
  const { key } = useParams<{ key: string }>();
  const [isModalOpen, setIsModalOpen] = useState(false);

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

      const deps = (data || []) as Dependency[];
      const keys = Array.from(
        new Set(deps.flatMap((d) => [d.source_issue_key, d.target_issue_key])),
      );
      let issueMeta: IssueMeta = {};
      if (keys.length > 0) {
        const { data: issues } = await supabase
          .from('ph_issues')
          .select('issue_key, issue_type, summary, status, status_category, due_date, assignee_account_id')
          .in('issue_key', keys);
        issueMeta = Object.fromEntries(
          (issues || []).map((r: any) => [
            r.issue_key,
            {
              issue_type: r.issue_type ?? null,
              summary: r.summary ?? null,
              status: r.status ?? null,
              status_category: r.status_category ?? null,
              due_date: r.due_date ?? null,
              assignee_account_id: r.assignee_account_id ?? null,
            },
          ]),
        );
      }

      return { dependencies: deps, issueMeta };
    },
    enabled: !!key,
  });

  const dependencies = data?.dependencies;
  const issueMeta = data?.issueMeta ?? {};

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
            dependencies={dependencies!}
            issueMeta={issueMeta}
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
