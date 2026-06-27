/**
 * Create Task Mutation Hook
 * Handles task creation with optimistic updates.
 *
 * 2026-06-17 (Vikram): tasks are identified by the `key` column. Read & write
 * only `key`.
 *
 * CAT-TASKS-20260627-001 Slice 9A:
 *  - Uniform `TSK-` prefix across the whole module. The DB trigger
 *    (`generate_task_key`) is the SINGLE SOURCE OF TRUTH: we insert with NO key
 *    and use the row the DB returns. Computing a key client-side previously
 *    caused navigated-key vs stored-key drift → task-detail "Issue not found".
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
  /** Rich-text ADF (Slice 9B canonical-modal parity). Stored in tasks.description_adf. */
  description_adf?: unknown;
  workstream_id: string;
  assignee_id?: string;
  reporter_id?: string;
  labels?: string[];
  priority: TaskPriority;
  due_date?: string;
  /** Optional — dates are set in the detail view, not the canonical create modal. */
  start_date?: string;
  status_id?: string;
  /**
   * Optional work item to link as the task's parent. A task may link to ANY
   * work item type EXCEPT sub-task (enforced by the task_work_item_links CHECK).
   * The work_item_type is resolved server-side from ph_issues.
   */
  parent_work_item_key?: string;
}

interface CreateTaskResult {
  id: string;
  key: string;
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

      // Insert with NO key — the DB trigger assigns the uniform TSK-N and we
      // navigate/optimistically-update using the key it returns. Single source
      // of truth; no client-side key computation (which caused detail drift).
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title: input.title,
          description: input.description || null,
          description_adf: input.description_adf ?? null,
          workstream_id: input.workstream_id || null,
          assignee_id: input.assignee_id || null,
          reporter_id: input.reporter_id || null,
          labels: input.labels?.length ? input.labels : null,
          priority: input.priority,
          due_date: input.due_date || null,
          start_date: input.start_date ?? null,
          status_id: statusId || null,
          created_by: user?.id || null,
        } as never)
        .select('id, key')
        .single();

      if (error) {
        console.error('Error creating task:', error);
        throw new Error(error.message);
      }

      const created = {
        id: (data as { id: string }).id,
        key: (data as { key: string | null }).key ?? '',
      };

      // Optional parent link → task_work_item_links. Resolve the work item's
      // type from ph_issues (the table's CHECK forbids linking a sub-task).
      if (input.parent_work_item_key) {
        const { data: wi } = await supabase
          .from('ph_issues')
          .select('issue_type')
          .eq('issue_key', input.parent_work_item_key)
          .maybeSingle();
        const workItemType = (wi as { issue_type?: string } | null)?.issue_type ?? null;
        if (workItemType && workItemType.toLowerCase() !== 'sub-task') {
          const { error: linkErr } = await supabase
            .from('task_work_item_links')
            .insert({
              task_id: created.id,
              work_item_key: input.parent_work_item_key,
              work_item_type: workItemType,
              link_type: 'relates',
              created_by: user?.id || null,
            } as never);
          if (linkErr) {
            console.warn('[useCreateTask] parent link failed:', linkErr.message);
          }
        }
      }

      return created;
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
