/**
 * useReleasesAllWorkItems — Release Operations All Work data hook.
 *
 * Returns rh_releases joined with release_manager profile, shaped as
 * WorkItem[] so it slots into the canonical ProjectAllWorkView via its
 * `tasksItems` prop. Mirrors useTasksAllWorkItems / incident-mode patterns.
 *
 * 2026-06-19 — per CLAUDE.md "ADOPT CANONICAL COMPONENTS — DO NOT
 * REIMPLEMENT". The Release Hub Work tab mounts the SAME ProjectAllWorkView
 * (tasksItems supplied + entityKind='release') used by project / product /
 * incident / tasks hubs.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { resolveAvatarUrl } from '@/lib/avatars';
import type { WorkItem } from '@/types/workItem.types';

function initialsFromName(name: string | null | undefined): string {
  const n = (name ?? '').trim();
  if (!n) return '??';
  const parts = n.split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
  return (first + last).toUpperCase() || '??';
}

interface ReleaseAllWorkRow {
  id: string;
  name: string | null;
  version: string | null;
  status: string;
  health: string | null;
  release_type: string | null;
  target_env: string | null;
  target_date: string | null;
  planned_release_date: string | null;
  source: string;
  jira_key: string | null;
  created_at: string | null;
  updated_at: string | null;
  product_id: string | null;
  release_manager_id: string | null;
  manager_name?: string | null;
  manager_avatar?: string | null;
}

function categoryForStatus(status: string | null | undefined): 'todo' | 'in_progress' | 'done' {
  const s = (status ?? '').toLowerCase();
  if (['completed', 'released', 'done'].includes(s)) return 'done';
  if (['draft', 'todo', 'planned', 'planning', 'in_readiness'].includes(s)) return 'todo';
  return 'in_progress';
}

function statusDisplayName(status: string | null | undefined): string {
  if (!status) return '';
  return status
    .split('_')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

function releaseRowToWorkItem(r: ReleaseAllWorkRow): WorkItem {
  const displayId = r.jira_key ?? r.version ?? r.id;
  return {
    id: displayId,
    dbId: r.id,
    projectId: 'RELEASES',
    parentId: null,
    parentKey: null,
    parentSummary: null,
    jiraKey: displayId,
    type: 'task' as any,
    rawType: 'Release',
    summary: r.name ?? '',
    status: categoryForStatus(r.status) as any,
    statusName: statusDisplayName(r.status),
    statusCategory: categoryForStatus(r.status) as any,
    assigneeId: r.release_manager_id ?? null,
    assignee: r.manager_name
      ? {
          id: r.release_manager_id ?? r.manager_name,
          name: r.manager_name,
          avatarUrl: r.manager_avatar ?? null,
          initials: initialsFromName(r.manager_name),
          color: 'var(--ds-background-accent-purple-subtle, #6554C0)',
        }
      : undefined,
    reporterId: null,
    reporter: undefined,
    priority: 'medium' as any,
    sprintRelease: r.version ?? null,
    fixVersion: r.version ?? null,
    commentsCount: 0,
    childCount: 0,
    createdAt: r.created_at ?? '',
    updatedAt: r.updated_at ?? '',
    createdBy: null,
    severity: null,
    labels: r.target_env ? [r.target_env] : [],
  } as any;
}

export function useReleasesAllWorkItems() {
  return useQuery<WorkItem[]>({
    queryKey: ['releases-allwork-items'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rh_releases')
        .select('id, name, version, status, health, release_type, target_env, target_date, planned_release_date, source, jira_key, created_at, updated_at, product_id, release_manager_id')
        .neq('status', 'cancelled')
        .order('updated_at', { ascending: false })
        .limit(2000);
      if (error) throw error;
      const list = (data ?? []) as ReleaseAllWorkRow[];
      const managerIds = Array.from(new Set(list.map((r) => r.release_manager_id).filter(Boolean) as string[]));
      const profById = new Map<string, { name: string | null; avatar: string | null }>();
      if (managerIds.length) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', managerIds);
        (profs ?? []).forEach((p: any) => {
          profById.set(p.id, { name: p.full_name ?? null, avatar: resolveAvatarUrl(p.full_name ?? null) ?? p.avatar_url ?? null });
        });
      }
      return list.map((r) => releaseRowToWorkItem({
        ...r,
        manager_name: r.release_manager_id ? profById.get(r.release_manager_id)?.name ?? null : null,
        manager_avatar: r.release_manager_id ? profById.get(r.release_manager_id)?.avatar ?? null : null,
      }));
    },
  });
}
