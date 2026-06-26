/**
 * Project Dependencies — canonical DependenciesView mounted with the project
 * data adapter. Route: /project-hub/:key/dependencies.
 * Data: ph_issue_dependencies (project_key) + ph_issues meta. The shared UI
 * lives in src/components/shared/dependencies/. (canonical, 2026-06-25)
 */

import React, { useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useJiraProjects } from '@/hooks/workhub/useJiraProjects';
import DependenciesView from '@/components/shared/dependencies/DependenciesView';
import {
  fetchPhIssueMeta,
  createPhDependency,
  deletePhDependency,
  fetchDependenciesByScope,
} from '@/components/shared/dependencies/phDependencyData';
import type { DependencyCandidate, DependencyData, DependencyType } from '@/components/shared/dependencies/types';

export default function DependenciesPage() {
  const { key = '' } = useParams<{ key: string }>();
  const [searchParams] = useSearchParams();
  const focusKey = searchParams.get('focus');
  const { data: allProjects = [] } = useJiraProjects();

  const projects = useMemo(
    () => allProjects.map((p: any) => ({
      project_key: p.project_key as string,
      name: (p.name as string | null) ?? null,
      color: (p.color as string | null) ?? null,
      avatar_url: (p.avatar_url as string | null) ?? null,
      icon: (p.icon as string | null) ?? null,
    })),
    [allProjects],
  );
  const scopeName = projects.find((p) => p.project_key === key)?.name ?? key;
  const scopeColor = projects.find((p) => p.project_key === key)?.color ?? null;

  const query = useQuery({
    queryKey: ['dependencies', key],
    enabled: !!key,
    queryFn: async () => {
      const deps = await fetchDependenciesByScope(key);
      const keys = Array.from(new Set(deps.flatMap((d) => [d.source_issue_key, d.target_issue_key])));
      const { issueMeta, hierarchy } = await fetchPhIssueMeta(keys);
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

  const fetchCandidates = async (): Promise<DependencyCandidate[]> => {
    const { data: rows } = await supabase
      .from('ph_issues')
      .select('issue_key, summary, issue_type')
      .eq('project_key', key)
      .in('source', ['jira', 'jira_parent_ref'])
      .order('issue_key');
    return (rows || []).map((r: any) => ({
      value: r.issue_key,
      label: `${r.issue_key} — ${r.summary || '(no summary)'}`,
      issueType: r.issue_type ?? null,
      projectKey: key,
    }));
  };

  const onCreate = (s: DependencyCandidate, t: DependencyCandidate, type: DependencyType) =>
    createPhDependency(s.projectKey ?? key, s.value, t.value, type);

  return (
    <DependenciesView
      hubType="project"
      scopeKey={key}
      scopeName={scopeName}
      scopeColor={scopeColor}
      data={data}
      fetchCandidates={fetchCandidates}
      onCreate={onCreate}
      onDelete={deletePhDependency}
      getTimelineHref={(k) => `/project-hub/${key}/timeline?locate=${encodeURIComponent(k)}`}
      focusKey={focusKey}
    />
  );
}
