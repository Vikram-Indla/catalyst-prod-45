/**
 * tasksBacklogSource — BacklogDataSource adapter for the Tasks Hub.
 *
 * 2026-06-17: per CLAUDE.md "ADOPT CANONICAL COMPONENTS — DO NOT
 * REIMPLEMENT". Same shape as `useBusinessRequestsSource` (product hub)
 * — provides extraStories + status vocabulary + mutations so the
 * canonical BacklogPage renders identically with `tasks` data.
 *
 *  - extraStories: tasks rows mapped to BacklogStory shape, tagged with
 *    source=BIZ_SOURCE so BacklogPage routes mutations to this adapter.
 *  - statusOptions: from task_statuses (slug=value, name=label).
 *  - onUpdate: translates BacklogPage's field names (title/status/priority/
 *    due_date/assignee_id) to the `tasks` column set, resolves status name
 *    → status_id via task_statuses.
 *  - onCreate / onDelete: insert / soft-delete in `tasks`.
 *  - resolveItemType: returns 'task' so the detail panel opens the right
 *    view instead of the default 'business_request'.
 */
import { useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useGlobalSearchStore } from '@/store/globalSearchStore';
import type {
  StatusOption,
  LozengeAppearance,
} from '@/components/shared/JiraTable';
import type { BacklogStory } from '@/modules/project-work-hub/types/backlog.types';
import {
  BIZ_SOURCE,
  type BacklogDataSource,
} from '@/modules/project-work-hub/adapters/backlogDataSource';

interface TaskStatusRow {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  position: number;
}

interface TaskRow {
  id: string;
  key: string | null;
  task_key?: string | null;
  title: string | null;
  description: string | null;
  status_id: string | null;
  status?: { id: string; name: string; slug: string } | null;
  priority: string | null;
  assignee_id: string | null;
  assignee?: { id: string; full_name: string | null } | null;
  workstream_id: string | null;
  start_date: string | null;
  due_date: string | null;
  position: number | null;
  blocked: boolean | null;
  progress: number | null;
  created_at: string | null;
  updated_at: string | null;
}

/* Map a task slug to the canonical LozengeAppearance — same heuristic as
   tasksKanbanSource so the pill colours match the kanban board. */
function categoryAppearanceForSlug(slug: string | null | undefined): LozengeAppearance {
  if (!slug) return 'default';
  const s = slug.toLowerCase();
  if (/done|complete|closed|finished/.test(s)) return 'success';
  if (/progress|review|qa|testing|doing/.test(s)) return 'inprogress';
  return 'default';
}

/* Tasks row → BacklogStory shape that BacklogPage normalises. */
function taskToBacklogStory(row: TaskRow): BacklogStory {
  return {
    id: row.id,
    /* story_key drives the displayed key in the Key column. Prefer
       task_key (PLN-001 etc.), then key, then UUID fallback. */
    story_key: row.task_key ?? row.key ?? row.id,
    title: row.title ?? '',
    name: row.title ?? null,
    description: row.description ?? null,
    /* status carries the STATUS NAME (not slug) so the StatusPill renders
       the human label and statusAppearance/statusLabel resolve correctly. */
    status: row.status?.name ?? null,
    feature_id: null,
    assignee_id: row.assignee_id ?? null,
    assignee_name: row.assignee?.full_name ?? null,
    reporter_name: null,
    start_date: row.start_date ?? null,
    priority: row.priority ?? null,
    deleted_at: null,
    jira_created_at: row.created_at ?? null,
    jira_updated_at: row.updated_at ?? null,
    /* BIZ_SOURCE = adapter-owned. BacklogPage routes every mutation through
       this adapter when it sees this source tag. */
    source: BIZ_SOURCE as any,
    issue_type: 'Task',
    parent_key: null,
    parent_summary: null,
    labels: null,
    sprint_release: null,
    rank_order: typeof row.position === 'number' ? row.position : null,
    feature: null,
    /* BR-specific fields left undefined — tasks don't have these. */
  } as BacklogStory;
}

/* useTasksBacklogSource — builds a BacklogDataSource for /tasks/list. */
export function useTasksBacklogSource(): BacklogDataSource | null {
  const qc = useQueryClient();
  const globalOpenDetail = useGlobalSearchStore((s) => s.openDetail);

  /* Task statuses — drives column status vocabulary + status_id resolution
     for inline edits. */
  const { data: statusRows = [] } = useQuery<TaskStatusRow[]>({
    queryKey: ['tasks-backlog-statuses'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('task_statuses')
        .select('id, name, slug, color, position')
        .order('position', { ascending: true });
      if (error) throw error;
      return (data ?? []) as TaskStatusRow[];
    },
  });

  /* Tasks rows. SELECT * + joined status & assignee. */
  const { data: rows = [], isLoading } = useQuery<TaskRow[]>({
    queryKey: ['tasks-backlog-rows'],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('tasks')
        .select(
          '*, status:task_statuses(id, name, slug), assignee:profiles!tasks_assignee_id_fkey(id, full_name)',
        )
        .is('deleted_at', null)
        .order('position', { ascending: true, nullsFirst: false })
        .order('updated_at', { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as TaskRow[];
    },
  });

  const statusByName = useMemo(
    () => new Map(statusRows.map((s) => [s.name, s])),
    [statusRows],
  );

  const extraStories = useMemo(
    () => rows.map(taskToBacklogStory),
    [rows],
  );

  const statusOptions = useMemo<StatusOption[]>(
    () =>
      statusRows.map((s) => ({
        value: s.name,
        label: s.name,
        appearance: categoryAppearanceForSlug(s.slug),
        group: 'Status',
      })),
    [statusRows],
  );

  const allStatuses = useMemo(() => statusRows.map((s) => s.name), [statusRows]);

  const resolvedStatusAppearance = useCallback(
    (status: string | null | undefined): LozengeAppearance => {
      if (!status) return 'default';
      const s = statusByName.get(status);
      return s ? categoryAppearanceForSlug(s.slug) : 'default';
    },
    [statusByName],
  );

  const resolvedStatusLabel = useCallback(
    (status: string | null | undefined): string => {
      if (!status) return '—';
      return statusByName.get(status)?.name ?? status;
    },
    [statusByName],
  );

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['tasks-backlog-rows'] });
    /* Also bust the kanban + planner caches so the Board + Dashboard
       widgets refresh after edits made from the list. */
    qc.invalidateQueries({ queryKey: ['kb-tasks-rows'] });
    qc.invalidateQueries({ queryKey: ['planner-tasks'] });
  }, [qc]);

  return useMemo<BacklogDataSource | null>(() => {
    return {
      sourceTag: BIZ_SOURCE,
      extraStories,
      extraEpics: [],
      isLoading,

      statusOptions,
      statusAppearance: resolvedStatusAppearance,
      statusLabel: resolvedStatusLabel,
      allStatuses,

      /* Sentinel productId — the canonical Backlog uses this for the
         CreateBusinessRequestModal, which we never trigger for tasks. */
      productId: 'TASKS',

      /* 2026-06-17: tell BacklogPage the detail panel routing —
         entityKind drives CatalystDetailRouter's short-circuit to
         TaskCatalystView; resolveItemType keeps the type-icon resolution
         consistent (CatalystViewBusinessRequest never mounts for tasks). */
      entityKind: 'task' as const,
      resolveItemType: () => 'task',

      onOpenItem: (_key, id) => {
        /* 2026-06-17: tasks open via the canonical detail router with
           entityKind='task' — CatalystDetailRouter short-circuits to
           TaskCatalystView (the tasks table has its own canonical view;
           ph_issues lookup would 404). itemId is the tasks.id UUID. */
        if (id) globalOpenDetail({ id, entityKind: 'task' });
      },

      onUpdate: async (id, patch) => {
        /* Translate BacklogPage field names → tasks columns. */
        const taskPatch: Record<string, any> = {};
        for (const [k, v] of Object.entries(patch)) {
          if (k === 'updated_at' || k === 'jira_updated_at') continue;
          switch (k) {
            case 'title':
              taskPatch.title = v;
              break;
            case 'status': {
              /* v is the status NAME. Resolve to status_id. */
              const s = statusByName.get(v as string);
              if (s) taskPatch.status_id = s.id;
              break;
            }
            case 'priority':
              taskPatch.priority = v;
              break;
            case 'due_date':
              taskPatch.due_date = v;
              break;
            case 'assignee_id':
              taskPatch.assignee_id = v;
              break;
            case 'start_date':
              taskPatch.start_date = v;
              break;
            default:
              /* Unknown keys silently dropped. */
              break;
          }
        }
        if (Object.keys(taskPatch).length === 0) return;
        taskPatch.updated_at = new Date().toISOString();
        const { error } = await (supabase as any)
          .from('tasks').update(taskPatch).eq('id', id);
        if (error) throw error;
        invalidate();
      },

      onDelete: async (id) => {
        const { error } = await (supabase as any)
          .from('tasks').update({ deleted_at: new Date().toISOString() }).eq('id', id);
        if (error) throw error;
        invalidate();
      },

      onBulkDelete: async (ids) => {
        const { error } = await (supabase as any)
          .from('tasks')
          .update({ deleted_at: new Date().toISOString() })
          .in('id', ids);
        if (error) throw error;
        invalidate();
      },

      onCreate: async ({ title }) => {
        /* Default to the first status in position order. */
        const first = statusRows[0];
        if (!first) throw new Error('No task statuses configured');
        const nowIso = new Date().toISOString();
        const { error } = await (supabase as any).from('tasks').insert({
          title,
          status_id: first.id,
          priority: 'medium',
          created_at: nowIso,
          updated_at: nowIso,
        });
        if (error) throw error;
        invalidate();
      },

      onSetRank: async (id, rank) => {
        const { error } = await (supabase as any)
          .from('tasks').update({ position: rank, updated_at: new Date().toISOString() }).eq('id', id);
        if (error) throw error;
        invalidate();
      },

      invalidationKeys: [
        ['tasks-backlog-rows'],
        ['kb-tasks-rows'],
        ['planner-tasks'],
      ],
    };
  }, [
    extraStories,
    isLoading,
    statusOptions,
    allStatuses,
    resolvedStatusAppearance,
    resolvedStatusLabel,
    statusByName,
    statusRows,
    globalOpenDetail,
    invalidate,
  ]);
}
