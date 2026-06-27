/**
 * TestHubDependenciesPage — /testhub/dependencies
 *
 * Canonical DependenciesView mounted with the Test Hub data adapter — the same
 * component Project / Product / Incident hubs use. Links are cycle → cycle,
 * aggregated across ALL projects (global). Cycles are referenced by UUID id.
 * Data: tm_test_cycle_dependencies + tm_test_cycles meta.
 */

import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProjects } from '@/hooks/test-management/useProjects';
import DependenciesView from '@/components/shared/dependencies/DependenciesView';
import {
  fetchCycleMeta,
  fetchTestCycleDependencies,
  createTestCycleDependency,
  deleteTestCycleDependency,
} from '@/components/shared/dependencies/testCycleDependencyData';
import type { DependencyCandidate, DependencyData, DependencyType } from '@/components/shared/dependencies/types';

export default function TestHubDependenciesPage() {
  const [searchParams] = useSearchParams();
  const focusKey = searchParams.get('focus');
  const { data: tmProjects = [] } = useProjects();

  const projects = useMemo(
    () => tmProjects.map((p) => ({ project_key: p.key, name: p.name ?? null })),
    [tmProjects],
  );

  const query = useQuery({
    queryKey: ['testhub-dependencies'],
    queryFn: async () => {
      const deps = await fetchTestCycleDependencies();
      const ids = Array.from(new Set(deps.flatMap((d) => [d.source_issue_key, d.target_issue_key])));
      const { issueMeta, hierarchy } = await fetchCycleMeta(ids);
      return { deps, issueMeta, hierarchy };
    },
  });

  const data: DependencyData = {
    dependencies: query.data?.deps ?? [],
    issueMeta: query.data?.issueMeta ?? {},
    hierarchy: query.data?.hierarchy ?? {},
    projects,
    isLoading: query.isLoading,
    error: query.error,
    refetch: () => { query.refetch(); },
  };

  // Candidates = every test cycle across all projects. value = cycle UUID.
  const fetchCandidates = async (): Promise<DependencyCandidate[]> => {
    const { data: cycles } = await supabase
      .from('tm_test_cycles')
      .select('id, cycle_key, name, project_id')
      .order('cycle_key', { ascending: true });
    const projectIds = Array.from(new Set((cycles || []).map((c: any) => c.project_id).filter(Boolean)));
    const keyById = new Map<string, string>();
    if (projectIds.length) {
      const { data: projRows } = await supabase.from('tm_projects').select('id, key').in('id', projectIds);
      for (const p of (projRows || []) as any[]) keyById.set(p.id, p.key);
    }
    return (cycles || []).map((c: any) => {
      const projectKey = keyById.get(c.project_id) ?? null;
      const readableKey = projectKey ? `${projectKey} ${c.cycle_key ?? ''}`.trim() : (c.cycle_key ?? '');
      return {
        value: c.id,
        label: `${readableKey} — ${c.name || '(no name)'}`,
        issueType: 'Test Cycle',
        projectKey,
      };
    });
  };

  const onCreate = (s: DependencyCandidate, t: DependencyCandidate, type: DependencyType) =>
    createTestCycleDependency(s.projectKey ?? null, s.value, t.value, type);

  return (
    <DependenciesView
      hubType="test"
      scopeKey="TESTHUB"
      scopeName="Test Hub"
      data={data}
      fetchCandidates={fetchCandidates}
      onCreate={onCreate}
      onDelete={deleteTestCycleDependency}
      getTimelineHref={() => '/testhub/timeline'}
      focusKey={focusKey}
    />
  );
}
