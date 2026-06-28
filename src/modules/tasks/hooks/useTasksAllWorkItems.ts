/**
 * useTasksAllWorkItems — Tasks Hub All Work data hook.
 *
 * Returns the `tasks` table joined with `task_statuses` + assignee/reporter
 * profiles, shaped as WorkItem[] so it slots into the canonical
 * ProjectAllWorkView via its `tasksItems` prop. Mirrors the incident-mode
 * shape (id = key, dbId = UUID, statusCategory derived from slug).
 *
 * 2026-06-17 — per CLAUDE.md "ADOPT CANONICAL COMPONENTS — DO NOT
 * REIMPLEMENT". The Tasks Hub Work tab mounts the SAME ProjectAllWorkView
 * (mode=undefined + tasksItems supplied) used by project / product /
 * incident hubs.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { WorkItem } from '@/types/workItem.types';

/* Local copy of the initialsFromName helper used by ProjectAllWorkView's
   mapBrToWorkItem. Not exported from @/lib/avatars (which only exposes
   slugifyName / resolveAvatarUrl). Two-letter uppercase, falls back to
   '??' for blank input. */
function initialsFromName(name: string | null | undefined): string {
  const n = (name ?? '').trim();
  if (!n) return '??';
  const parts = n.split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
  return (first + last).toUpperCase() || '??';
}

interface TaskAllWorkRow {
  id: string;
  key: string | null;
  title: string | null;
  description: string | null;
  priority: string | null;
  assignee_id: string | null;
  status_id: string | null;
  start_date: string | null;
  due_date: string | null;
  position: number | null;
  created_at: string | null;
  updated_at: string | null;
  workstream_id: string | null;
  status?: { id: string; name: string; slug: string } | null;
  assignee?: { id: string; full_name: string | null; avatar_url: string | null } | null;
  workstream?: { id: string; name: string; key_prefix: string | null } | null;
}

/* Map task_statuses.slug → WorkItem status category. Matches
   tasksBacklogSource categoryAppearanceForSlug heuristic so list / board /
   work all colour-code identically. */
function categoryForSlug(slug: string | null | undefined): 'todo' | 'in_progress' | 'done' {
  if (!slug) return 'todo';
  const s = slug.toLowerCase();
  if (/done|complete|closed|finished/.test(s)) return 'done';
  if (/progress|review|qa|testing|doing/.test(s)) return 'in_progress';
  return 'todo';
}

function taskRowToWorkItem(r: TaskAllWorkRow): WorkItem {
  /* Display key prefers `key` (PLN-N). UUID fallback so the navigator
     can still surface freshly-inserted rows that haven't picked up a
     trigger-generated key yet. */
  const displayId = r.key ?? r.id;
  return {
    id: displayId,
    dbId: r.id,
    projectId: r.workstream?.key_prefix ?? 'TASKS',
    parentId: null,
    parentKey: null,
    parentSummary: null,
    jiraKey: displayId,
    type: 'task' as any,
    rawType: 'Task',
    summary: r.title ?? '',
    status: 'in_progress' as any,
    statusName: r.status?.name ?? '',
    statusCategory: categoryForSlug(r.status?.slug) as any,
    assigneeId: r.assignee_id ?? null,
    assignee: r.assignee
      ? {
          id: r.assignee.id,
          name: r.assignee.full_name ?? 'Unknown',
          avatarUrl: r.assignee.avatar_url ?? null,
          initials: initialsFromName(r.assignee.full_name ?? ''),
          color: 'var(--ds-background-accent-purple-subtle)',
        }
      : undefined,
    reporterId: null,
    reporter: undefined,
    /* Tasks store priority lowercase (critical/high/medium/low). The
       navigator / toolbar tolerate the lowercase value because they use
       it as an opaque grouping key. The detail panel handles the
       capitalize-on-read round-trip separately. */
    priority: (r.priority ?? 'medium') as any,
    sprintRelease: null,
    fixVersion: null,
    commentsCount: 0,
    childCount: 0,
    createdAt: r.created_at ?? '',
    updatedAt: r.updated_at ?? '',
    createdBy: null,
    severity: null,
    labels: [],
  } as any;
}

export function useTasksAllWorkItems() {
  return useQuery<WorkItem[]>({
    queryKey: ['tasks-allwork-items'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('tasks')
        .select(
          '*, status:task_statuses(id, name, slug), assignee:profiles!tasks_assignee_id_fkey(id, full_name, avatar_url), workstream:task_workstreams(id, name, key_prefix)',
        )
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(2000);
      if (error) throw error;
      return ((data ?? []) as TaskAllWorkRow[]).map(taskRowToWorkItem);
    },
  });
}
