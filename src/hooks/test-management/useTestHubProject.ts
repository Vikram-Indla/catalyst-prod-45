// ============================================================================
// HOOK: useTestHubProject — the single source of truth for "which Test Space
// (tm_projects row) is the active one" across every TestHub operational surface.
//
// CAT-TESTHUB-REBUILD-20260704-001 Phase C, root-cause fix for the seed-vs-real
// project split (defects D001/D002/D003/D017/D031/D038/D051/D052/D057): pages
// used `useProjects()[0]`, which is the alphabetically-first tm_projects row —
// the "Demo Project" seed — instead of the real active project ("Senaei BAU").
//
// Resolution order: persisted selection (localStorage) -> active project with
// the most test cases -> first active -> first. Selection is switchable via
// `setProjectId` so a Test Space switcher can drive it later with zero rewiring.
// ============================================================================

import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TMProject } from '@/types/test-management';
import { useProjects } from './useProjects';

const STORAGE_KEY = 'testhub.activeProjectId';

/** Per-project test-case counts, used to rank the default Test Space. */
function useProjectCaseCounts(enabled: boolean) {
  return useQuery({
    queryKey: ['tm-project-case-counts'],
    enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Record<string, number>> => {
      const { data, error } = await supabase
        .from('tm_test_cases')
        .select('project_id');
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data ?? []).forEach((r: { project_id: string | null }) => {
        if (r.project_id) counts[r.project_id] = (counts[r.project_id] ?? 0) + 1;
      });
      return counts;
    },
  });
}

export interface UseTestHubProjectResult {
  projectId: string | undefined;
  project: TMProject | undefined;
  projects: TMProject[];
  isLoading: boolean;
  setProjectId: (id: string) => void;
}

export function useTestHubProject(): UseTestHubProjectResult {
  const queryClient = useQueryClient();
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const { data: caseCounts = {}, isLoading: countsLoading } =
    useProjectCaseCounts(projects.length > 0);

  const persistedId =
    typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;

  const projectId = useMemo<string | undefined>(() => {
    if (projects.length === 0) return undefined;

    // 1. Persisted selection, if it still exists.
    if (persistedId && projects.some((p) => p.id === persistedId)) return persistedId;

    // 2. Active project with the most test cases (real space wins over seed).
    const active = projects.filter((p) => p.is_active !== false);
    const pool = active.length > 0 ? active : projects;
    const ranked = [...pool].sort(
      (a, b) => (caseCounts[b.id] ?? 0) - (caseCounts[a.id] ?? 0),
    );
    return ranked[0]?.id;
  }, [projects, caseCounts, persistedId]);

  const project = useMemo(
    () => projects.find((p) => p.id === projectId),
    [projects, projectId],
  );

  const setProjectId = useCallback(
    (id: string) => {
      if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, id);
      // Nudge consumers that key off the resolver-derived id.
      queryClient.invalidateQueries({ queryKey: ['tm-project-case-counts'] });
    },
    [queryClient],
  );

  return {
    projectId,
    project,
    projects,
    isLoading: projectsLoading || countsLoading,
    setProjectId,
  };
}
