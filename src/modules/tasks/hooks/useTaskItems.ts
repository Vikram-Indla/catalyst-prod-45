// ============================================================
// PLANNER TASKS HOOK
// Fetches tasks from tasks table and transforms to Planner format
// Now unified with Kanban to use the same data source
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';
import { recordAdvisoryStatusChange } from '@/lib/workflow/canonical/runtime';
import type { PlannerTask, TaskStatus, TaskPriority } from '../types';
import type { PlannerStatus } from './useTaskStatuses';

// Map task_statuses to Planner TaskStatus
const mapStatusFromPlannerStatuses = (statusName: string | null): TaskStatus => {
  const name = statusName?.toLowerCase() || '';
  
  if (name.includes('backlog')) return 'backlog';
  if (name.includes('planned') || name.includes('to do') || name.includes('todo')) return 'planned';
  if (name.includes('progress') || name.includes('active') || name.includes('doing')) return 'in-progress';
  if (name.includes('review') || name.includes('testing') || name.includes('qa')) return 'review';
  if (name.includes('done') || name.includes('complete') || name.includes('closed')) return 'done';
  
  return 'backlog';
};

// Map DB priority to Planner priority
const mapPriority = (dbPriority: string | null): TaskPriority => {
  switch (dbPriority?.toLowerCase()) {
    case 'critical':
    case 'highest':
      return 'critical';
    case 'high':
      return 'high';
    case 'medium':
    case 'normal':
      return 'medium';
    case 'low':
    case 'lowest':
      return 'low';
    default:
      return 'medium';
  }
};

// Transform tasks row to PlannerTask
const transformPlannerTask = (row: any): PlannerTask => ({
  id: row.id,
  // Use task_key first (proper sequential key), then fallback to key, then generate from UUID
  key: row.task_key || row.key || `TSK-${row.id.slice(0, 4).toUpperCase()}`,
  title: row.title || 'Untitled',
  description: row.description || '',
  // Canonical: carry the real task_statuses.slug so custom/admin statuses
  // flow to every view. Fall back to the name-heuristic only when a row has
  // no joined status (legacy/orphan rows).
  status: row.status?.slug || mapStatusFromPlannerStatuses(row.status?.name),
  type: 'task',
  priority: mapPriority(row.priority),
  assigneeId: row.assignee_id,
  assigneeName: row.assignee?.full_name,
  assigneeInitials: row.assignee?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2),
  teamId: row.workstream_id,
  teamName: row.workstream?.name,
  teamColor: row.workstream?.color || 'var(--ds-background-discovery-bold)',
  startDate: row.start_date,
  dueDate: row.due_date,
  parentTaskId: row.parent_task_id ?? null,
  blocked: row.blocked || false,
  blockedReason: row.blocked_reason,
  progress: row.progress || 0,
  comments: 0,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  // Bug 2 fix (2026-06-16): expose `position` so kanban-board reorder writes
  // can compute fractional positions from neighbor values. NULL means
  // unranked — falls through to the `created_at` tiebreaker in the query.
  position: row.position ?? null,
});

export function useTaskItems(teamId?: string | null) {
  return useQuery({
    // Cache-buster: ensures UI picks up task_key mapping changes immediately
    queryKey: ['planner-tasks', teamId, 'v2-task-key'],
    queryFn: async () => {
      let query = typedQuery('tasks')
        .select(`
          *,
          status:task_statuses(*),
          workstream:task_workstreams(id, name, color, slug),
          assignee:profiles!tasks_assignee_id_fkey(id, full_name, email, avatar_url)
        `)
        .is('deleted_at', null)
        // Bug 2 fix (2026-06-16): order by `position` ASC first so kanban
        // drag-reorder writes are reflected in the visible order. NULLS LAST
        // keeps unranked rows below ranked ones, then `created_at DESC` is the
        // tiebreaker (preserves prior behaviour for unranked tasks).
        .order('position', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(200);

      if (teamId) {
        query = query.eq('workstream_id', teamId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching planner tasks:', error);
        return [];
      }

      return (data || []).map(transformPlannerTask);
    },
    // GUARDRAIL: Treat as "reference-ish" list to avoid flicker during field edits.
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export function useUpdatePlannerTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PlannerTask> }) => {
      const dbUpdates: any = {};
      
      if (updates.priority) {
        dbUpdates.priority = updates.priority;
      }
      
      if (updates.blocked !== undefined) {
        dbUpdates.blocked = updates.blocked;
        dbUpdates.blocked_reason = updates.blockedReason;
      }

      if (updates.progress !== undefined) {
        dbUpdates.progress = updates.progress;
      }

      if (updates.assigneeId !== undefined) {
        dbUpdates.assignee_id = updates.assigneeId || null;
      }

      if (updates.dueDate !== undefined) {
        dbUpdates.due_date = updates.dueDate || null;
      }

      if (updates.startDate !== undefined) {
        dbUpdates.start_date = updates.startDate || null;
      }

      if (updates.title !== undefined) {
        dbUpdates.title = updates.title;
      }

      if (updates.description !== undefined) {
        dbUpdates.description = updates.description;
      }

      // Status: resolve TaskStatus slug → task_statuses.id (UUID) via cached
      // useTaskStatuses query. Falls back to a direct fetch on cache miss.
      // Throws on unknown slug — zero-assumption (no silent default).
      if ('status' in updates && updates.status) {
        let statuses = queryClient.getQueryData<PlannerStatus[]>(['planner-statuses']);
        if (!statuses || statuses.length === 0) {
          const { data, error: statusErr } = await supabase
            .from('task_statuses')
            .select('id, slug, name, color, sort_order');
          if (statusErr) throw statusErr;
          statuses = (data || []).map((s: any) => ({
            id: s.id,
            slug: s.slug,
            name: s.name,
            color: s.color || '',
            order: s.sort_order || 0,
          }));
        }
        const match = statuses.find((s) => s.slug === updates.status);
        if (!match) {
          throw new Error(`Unknown status slug: ${updates.status}`);
        }
        dbUpdates.status_id = match.id;
        // Advisory audit: use workflow_status_key from the resolved task_statuses row.
        const wfKey = (match as any).workflow_status_key ?? updates.status ?? null;
        recordAdvisoryStatusChange({
          entityKey: 'task', entityId: id, projectKey: null,
          fromStatusRaw: null, toStatusRaw: wfKey, sourceSurface: 'task_hub',
        }).catch(() => {/* advisory — non-blocking */});
      }

      // Workstream: direct teamId → workstream_id passthrough. null is valid
      // (clears the workstream). teamName/teamColor are JOIN-derived on read
      // and are NOT separately persisted.
      if (updates.teamId !== undefined) {
        dbUpdates.workstream_id = updates.teamId || null;
      }

      const { error } = await supabase
        .from('tasks')
        .update(dbUpdates)
        .eq('id', id);

      if (error) throw error;
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['planner-tasks'] });

      const previous = queryClient.getQueriesData<PlannerTask[]>({ queryKey: ['planner-tasks'] });

      queryClient.setQueriesData<PlannerTask[]>({ queryKey: ['planner-tasks'] }, (old) => {
        if (!old) return old;
        return old.map((t) => (t.id === id ? { ...t, ...updates } : t));
      });

      return { previous };
    },
    onError: (err, variables, context) => {
      context?.previous?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      // 2026-06-17: surface the error. Previously this rolled back silently,
      // making status/assignee/priority change failures look like the UI just
      // ignored the click. The toast shows the real Postgres/PostgREST error.
      const msg = err instanceof Error ? err.message : String(err);
      console.error('useUpdatePlannerTask failed:', err, 'updates:', variables.updates);
      catalystToast.error('Update failed', msg);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['kanban-tasks'] });
    },
  });
}

export function useDeletePlannerTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Soft delete via backend function (bypasses RLS edge-cases)
      const { error } = await supabase
        .rpc('soft_delete_task', { p_task_id: id });

      if (error) throw error;
      return { id };
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['planner-tasks'] });
      const previousTasks = queryClient.getQueryData(['planner-tasks']);

      queryClient.setQueryData(['planner-tasks'], (old: PlannerTask[] | undefined) => {
        if (!old) return old;
        return old.filter((t) => t.id !== id);
      });

      return { previousTasks };
    },
    onError: (err, id, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['planner-tasks'], context.previousTasks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['kanban-tasks'] });
    },
  });
}

// Helper to check if ID is a seed data ID (not a valid UUID)
const isSeedId = (id: string): boolean => {
  return id.startsWith('seed-') || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

export function useBulkDeletePlannerTasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('tasks')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', ids);

      if (error) throw error;

      return { deletedIds: ids };
    },
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: ['planner-tasks'] });
      const previousTasks = queryClient.getQueriesData<PlannerTask[]>({ queryKey: ['planner-tasks'] });

      queryClient.setQueriesData<PlannerTask[]>({ queryKey: ['planner-tasks'] }, (old) => {
        if (!old) return old;
        return old.filter((t) => !ids.includes(t.id));
      });

      return { previousTasks };
    },
    onError: (err, ids, context) => {
      context?.previousTasks?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['kanban-tasks'] });
    },
  });
}

export function useDuplicatePlannerTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (task: PlannerTask) => {
      // Get the first status as default
      const { data: statuses } = await supabase
        .from('task_statuses')
        .select('id')
        .order('position', { ascending: true })
        .limit(1);
      
      const defaultStatusId = statuses?.[0]?.id;
      if (!defaultStatusId) throw new Error('No statuses found');

      // Key is assigned by the DB trigger (uniform TSK-N) — single source of truth.
      const { data, error } = await supabase
        .from('tasks')
        .insert([{
          title: `${task.title} (Copy)`,
          description: task.description || null,
          status_id: defaultStatusId,
          priority: task.priority,
          assignee_id: task.assigneeId || null,
          workstream_id: task.teamId || null,
          progress: 0,
          blocked: false,
          due_date: task.dueDate || null,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['kanban-tasks'] });
    },
  });
}
