/**
 * useTestHubTimeline — data adapter for the Test Hub timeline (/testhub/timeline).
 *
 * Test Hub is GLOBAL: unlike /testhub/cycles (which scopes to projects[0]), this
 * aggregates test cycles across ALL projects into the canonical TimelineView.
 * Rows are test cycles (flat — cycles have no parent hierarchy). Bars are driven
 * by tm_test_cycles.planned_start / planned_end.
 *
 * Identity note: cycle_key (CY-001) is unique only WITHIN a project, so across
 * the global aggregate it collides. We therefore key each row by the cycle UUID
 * (`id`) and build a readable, globally-unique `issueKey` = "<PROJECT_KEY> CY-001"
 * for the sidebar chip. The page maps issueKey → id for routing/mutations.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import type { TimelineIssue } from '@/components/shared/Timeline';

const CYCLE_FIELDS = 'id, cycle_key, name, status, project_id, planned_start, planned_end';

/** Map tm_test_cycles.status (lowercase DB enum) → TimelineView status category. */
function statusCategory(status: string | null): string | null {
  switch ((status ?? '').toLowerCase()) {
    case 'completed':
      return 'done';
    case 'active':
    case 'in_progress':
      return 'progress';
    case 'draft':
    case 'planned':
    case 'paused':
    case 'archived':
      return 'default';
    default:
      return null;
  }
}

function mapCycle(row: any, projectKey: string | null): TimelineIssue {
  const cycleKey = row.cycle_key ?? '';
  const issueKey = projectKey ? `${projectKey} ${cycleKey}` : cycleKey;
  return {
    id: row.id,
    issueKey,
    projectKey: projectKey ?? '',
    issueType: 'Test Cycle',
    summary: row.name ?? '(Untitled cycle)',
    status: row.status ?? '',
    statusCategory: statusCategory(row.status),
    priority: null,
    assigneeDisplayName: null,
    assigneeAvatarUrl: null,
    parentKey: null,
    // Zero-assumption: cycles with no planned dates render no bar (no fake default).
    startDate: row.planned_start ?? null,
    dueDate: row.planned_end ?? null,
    epicColor: null,
    fixVersions: [],
    sprintEndDate: null,
    sprintName: null,
    releaseDate: null,
    releaseName: null,
    children: [],
  };
}

export function useTestHubTimeline() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['testhub-timeline'],
    queryFn: async (): Promise<TimelineIssue[]> => {
      // Project id → key map (for the readable, unique row chip).
      const { data: projects, error: projErr } = await supabase
        .from('tm_projects')
        .select('id, key');
      if (projErr) throw projErr;
      const keyById = new Map<string, string>(
        (projects ?? []).map((p: any) => [p.id, p.key as string]),
      );

      // ALL cycles across ALL projects (global aggregate — no project_id filter).
      const { data, error } = await supabase
        .from('tm_test_cycles')
        .select(CYCLE_FIELDS)
        .order('planned_start', { ascending: true, nullsFirst: false });
      if (error) throw error;

      return (data ?? []).map((row: any) => mapCycle(row, keyById.get(row.project_id) ?? null));
    },
    enabled: !!user,
    staleTime: 30_000,
  });
}
