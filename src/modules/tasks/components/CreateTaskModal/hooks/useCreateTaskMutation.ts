/**
 * Create Task Mutation Hook
 * Handles task creation with optimistic updates.
 *
 * 2026-06-17 (Vikram): tasks are identified by the `key` column (PLN-N base
 * trigger). Read & write only `key`.
 *
 * CAT-TASKS-20260627-001 Slice 7:
 *  - DEFECT-004: derive the task key from the selected workstream's
 *    `key_prefix` (e.g. JKT-1) instead of the global PLN-N. Client-side so it
 *    needs no DB migration; the DB trigger only assigns PLN-N when key is null,
 *    so passing a computed key takes precedence. Falls back to the trigger
 *    (PLN-N) when the workstream has no usable prefix OR a key collision occurs
 *    — so create never fails and existing keys are never overwritten.
 *  - DEFECT-003: surface a Catalyst/ADS success flag on create (the platform
 *    `catalystToast.success` wrapper is suppressed; `showFlag` renders the
 *    canonical @atlaskit/flag directly).
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';
import { showFlag } from '@/components/shared/JiraTable/flags';
import type { TaskPriority } from '../../../types';

export interface CreateTaskInput {
  title: string;
  description?: string;
  workstream_id: string;
  assignee_id?: string;
  priority: TaskPriority;
  due_date?: string;
  start_date: string;
  status_id?: string;
}

interface CreateTaskResult {
  id: string;
  key: string;
}

/**
 * Compute the next `PREFIX-N` key for a workstream (DEFECT-004). Returns null
 * when the workstream has no usable key_prefix → caller lets the DB trigger
 * assign PLN-N.
 */
async function computeWorkstreamKey(workstreamId: string | undefined): Promise<string | null> {
  if (!workstreamId) return null;
  const { data: ws } = await supabase
    .from('task_workstreams')
    .select('key_prefix')
    .eq('id', workstreamId)
    .single();
  const prefix = ((ws as { key_prefix?: string | null } | null)?.key_prefix ?? '').trim().toUpperCase();
  if (!prefix) return null;

  const { data: existing } = await supabase
    .from('tasks')
    .select('key')
    .ilike('key', `${prefix}-%`);
  let maxN = 0;
  (existing ?? []).forEach((r: { key: string | null }) => {
    const m = /-(\d+)$/.exec(r.key ?? '');
    if (m) maxN = Math.max(maxN, parseInt(m[1], 10));
  });
  return `${prefix}-${maxN + 1}`;
}

export function useCreateTaskMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTaskInput): Promise<CreateTaskResult> => {
      const { data: { user } } = await supabase.auth.getUser();

      // Resolve default 'backlog' status when not provided.
      let statusId = input.status_id;
      if (!statusId) {
        const { data: backlogStatus } = await supabase
          .from('task_statuses')
          .select('id')
          .eq('slug', 'backlog')
          .single();
        statusId = backlogStatus?.id || undefined;
      }

      const computedKey = await computeWorkstreamKey(input.workstream_id);

      const baseBody: Record<string, unknown> = {
        title: input.title,
        description: input.description || null,
        workstream_id: input.workstream_id || null,
        assignee_id: input.assignee_id || null,
        priority: input.priority,
        due_date: input.due_date || null,
        start_date: input.start_date,
        status_id: statusId || null,
        created_by: user?.id || null,
      };

      const insertTask = (withKey: string | null) =>
        supabase
          .from('tasks')
          .insert((withKey ? { ...baseBody, key: withKey } : baseBody) as never)
          .select('id, key')
          .single();

      let { data, error } = await insertTask(computedKey);
      // DEFECT-004 safety: on a key collision, fall back to the DB trigger key
      // so create always succeeds and no existing key is touched.
      if (error && computedKey && /duplicate|unique|23505/i.test(error.message)) {
        ({ data, error } = await insertTask(null));
      }

      if (error) {
        console.error('Error creating task:', error);
        throw new Error(error.message);
      }

      return {
        id: (data as { id: string }).id,
        key: (data as { key: string | null }).key ?? '',
      };
    },
    onSuccess: (result) => {
      // Refresh every task surface (overview / board / list / timeline / calendar).
      queryClient.invalidateQueries({ queryKey: ['planner-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['planner-board-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['planner-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['timeline-tasks-v2'] });
      queryClient.invalidateQueries({ queryKey: ['kanban-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['planner-task-list'] });
      queryClient.invalidateQueries({ queryKey: ['planner-calendar'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-tasks'] });

      // DEFECT-003: canonical ADS success flag (showFlag bypasses the
      // platform-suppressed success wrapper, per the explicit ask to surface
      // task-creation feedback).
      showFlag({
        title: result.key ? `Task ${result.key} created` : 'Task created',
        appearance: 'success',
      });
    },
    onError: (error: Error) => {
      catalystToast.error(`Failed to create task: ${error.message}`);
    },
  });
}
