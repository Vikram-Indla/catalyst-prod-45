/**
 * useReleasesTimeline — Release Operations timeline data hook.
 *
 * Returns rh_releases shaped as TimelineIssue[] so the canonical
 * TimelineView (project / product / incident hubs) can render releases on
 * the Gantt chart. Flat list — releases have no hierarchy.
 *
 * 2026-06-19 — per CLAUDE.md "ADOPT CANONICAL COMPONENTS — DO NOT
 * REIMPLEMENT". The Release Hub Timeline tab mounts the SAME TimelineView
 * used by every other hub.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TimelineIssue } from '@/components/shared/Timeline';

export const RELEASES_TIMELINE_QUERY_KEY = ['releases-timeline'] as const;

interface ReleaseTimelineRow {
  id: string;
  name: string | null;
  version: string | null;
  status: string;
  health: string | null;
  release_type: string | null;
  target_env: string | null;
  target_date: string | null;
  planned_start_date: string | null;
  planned_release_date: string | null;
  jira_key: string | null;
  release_manager_id: string | null;
}

function statusCategoryFromLifecycle(status: string | null | undefined): string {
  const s = (status ?? '').toLowerCase();
  if (['completed', 'released', 'done'].includes(s)) return 'done';
  if (['draft', 'todo', 'planned', 'planning', 'in_readiness'].includes(s)) return 'default';
  return 'progress';
}

function releaseToTimelineIssue(
  r: ReleaseTimelineRow,
  managerNames: Map<string, string>,
  managerAvatars: Map<string, string | null>,
): TimelineIssue {
  return {
    id: r.id,
    /* SidebarRow hides keys containing '-LOCAL-' or '-NEW-' (line 439).
       Releases without a jira_key OR version are Catalyst-created — render
       icon + summary only, no UUID. Lookups by issueKey still work because
       the cached-tree find() matches the same prefixed value. */
    issueKey: r.jira_key ?? r.version ?? `RELEASE-LOCAL-${r.id}`,
    projectKey: 'RELEASES',
    issueType: 'Release',
    summary: r.name ?? '',
    status: r.status,
    statusCategory: statusCategoryFromLifecycle(r.status),
    priority: null,
    assigneeDisplayName: r.release_manager_id ? (managerNames.get(r.release_manager_id) ?? null) : null,
    assigneeAvatarUrl: r.release_manager_id ? (managerAvatars.get(r.release_manager_id) ?? null) : null,
    parentKey: null,
    /* Only `planned_*` dates feed the timeline bar. `target_date` is the
       legacy NOT-NULL column from migration 20260309 — it's always populated
       so falling back to it would hide the EmptyRowAdd "+" button (line
       1580 of TimelineView: `if (issue.startDate || issue.dueDate) return
       null;`). Releases without `planned_release_date` are intentionally
       "unscheduled" so the user can click "+" on the grid to schedule them. */
    startDate: r.planned_start_date ?? null,
    dueDate: r.planned_release_date ?? null,
    epicColor: null,
    fixVersions: r.version ? [r.version] : [],
    children: [],
  };
}

export function useReleasesTimeline() {
  return useQuery<TimelineIssue[]>({
    queryKey: RELEASES_TIMELINE_QUERY_KEY,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rh_releases')
        .select('id, name, version, status, health, release_type, target_env, target_date, planned_start_date, planned_release_date, jira_key, release_manager_id')
        .neq('status', 'cancelled')
        .order('planned_release_date', { ascending: true, nullsFirst: false })
        .limit(2000);
      if (error) throw error;
      const list = (data ?? []) as ReleaseTimelineRow[];
      const managerIds = Array.from(new Set(list.map((r) => r.release_manager_id).filter(Boolean) as string[]));
      const names = new Map<string, string>();
      const avatars = new Map<string, string | null>();
      if (managerIds.length) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', managerIds);
        (profs ?? []).forEach((p: any) => {
          if (p.full_name) names.set(p.id, p.full_name);
          avatars.set(p.id, p.avatar_url ?? null);
        });
      }
      return list.map((r) => releaseToTimelineIssue(r, names, avatars));
    },
  });
}
