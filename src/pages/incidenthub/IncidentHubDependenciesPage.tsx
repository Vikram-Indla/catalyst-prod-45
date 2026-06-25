/**
 * Incident Dependencies — canonical DependenciesView, GLOBAL scope (all
 * Production Incidents across projects, like the incident timeline).
 * Route: /incident-hub/dependencies.
 * Data: ph_issue_dependencies where either endpoint is a Production Incident,
 * meta from ph_issues. (canonical, 2026-06-25)
 */

import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useJiraProjects } from '@/hooks/workhub/useJiraProjects';
import DependenciesView from '@/components/shared/dependencies/DependenciesView';
import {
  fetchPhIssueMeta,
  createPhDependency,
  deletePhDependency,
} from '@/components/shared/dependencies/phDependencyData';
import type { Dependency, DependencyCandidate, DependencyData, DependencyType } from '@/components/shared/dependencies/types';

const INCIDENT_TYPE = 'Production Incident';

export default function IncidentHubDependenciesPage() {
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

  const query = useQuery({
    queryKey: ['dependencies', 'incidents'],
    queryFn: async () => {
      // All Production Incident keys (global).
      const { data: piRows } = await supabase
        .from('ph_issues')
        .select('issue_key')
        .eq('issue_type', INCIDENT_TYPE)
        .in('source', ['jira', 'jira_parent_ref']);
      const piKeys = (piRows || []).map((r: any) => r.issue_key as string);
      if (piKeys.length === 0) return { deps: [] as Dependency[], issueMeta: {}, hierarchy: {} };

      // Dependencies where EITHER endpoint is a Production Incident.
      const list = piKeys.map((k) => `"${k}"`).join(',');
      const { data: depRows } = await (supabase as any)
        .from('ph_issue_dependencies')
        .select('*')
        .is('deleted_at', null)
        .or(`source_issue_key.in.(${list}),target_issue_key.in.(${list})`)
        .order('created_at', { ascending: false });
      const deps = (depRows || []) as Dependency[];

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

  // Candidates: all Production Incidents (carry their own project_key for insert).
  const fetchCandidates = async (): Promise<DependencyCandidate[]> => {
    const { data: rows } = await supabase
      .from('ph_issues')
      .select('issue_key, summary, issue_type, project_key')
      .eq('issue_type', INCIDENT_TYPE)
      .in('source', ['jira', 'jira_parent_ref'])
      .order('issue_key');
    return (rows || []).map((r: any) => ({
      value: r.issue_key,
      label: `${r.issue_key} — ${r.summary || '(no summary)'}`,
      issueType: r.issue_type ?? INCIDENT_TYPE,
      projectKey: r.project_key ?? null,
    }));
  };

  const onCreate = (s: DependencyCandidate, t: DependencyCandidate, type: DependencyType) =>
    createPhDependency(s.projectKey ?? t.projectKey ?? 'INCIDENTS', s.value, t.value, type);

  return (
    <DependenciesView
      hubType="incident"
      scopeKey="incidents"
      scopeName="Incidents"
      data={data}
      fetchCandidates={fetchCandidates}
      onCreate={onCreate}
      onDelete={deletePhDependency}
      getTimelineHref={(k) => `/incident-hub/timeline?locate=${encodeURIComponent(k)}`}
      focusKey={focusKey}
    />
  );
}
