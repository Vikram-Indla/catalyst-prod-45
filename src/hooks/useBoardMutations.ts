// useBoardMutations — create, update, delete, star board
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, typedQuery, typedRpc } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';
import type { CreateBoardInput, BoardVisibility, SwimlaneType, CardColorMethod, EpicDisplayMode, ColumnConstraintType, WorkingDaysConfig } from '@/types/board';

export function useCreateBoard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateBoardInput) => {
      const { data, error } = await typedRpc('create_board', {
        p_name: input.name,
        p_project_id: input.projectId ?? null,
        p_is_personal: input.isPersonal ?? false,
        p_visibility: input.visibility ?? 'project',
        p_board_type: input.boardType ?? 'kanban',
        p_swimlane_type: input.swimlaneType ?? 'none',
        p_color: input.color ?? 'var(--ds-link)',
        p_columns: input.columns ? JSON.stringify(input.columns) : null,
        p_board_query: input.boardQuery ?? null,
        p_is_default: input.isDefault ?? false,
        p_primary_work_item_type: input.primaryWorkItemType ?? null,
        p_user_id: null,
      });
      if (error) throw error;
      const boardId = data as string;
      // Wire filter_id post-creation (create_board RPC has no p_filter_id param)
      if (input.filterId && boardId) {
        await (typedQuery as any)('boards')
          .update({ filter_id: input.filterId, updated_at: new Date().toISOString() })
          .eq('id', boardId);
      }
      return { boardId, name: input.name, projectId: input.projectId };
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['boards', result.projectId] });
      catalystToast.success(`"${result.name}" board created`);
    },
    onError: (err: Error) => {
      catalystToast.error(`Failed to create board: ${err.message}`);
    },
  });
}

export function useUpdateBoard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ boardId, projectId, ...fields }: {
      boardId: string;
      projectId?: string;
      name?: string;
      description?: string | null;
      color?: string;
      visibility?: BoardVisibility;
      board_type?: 'kanban' | 'scrum';
      swimlane_type?: SwimlaneType;
      swimlane_jql?: string | null;
      show_swimlanes?: boolean;
      board_query?: string | null;
      sub_filter_query?: string | null;
      completed_issues_cutoff?: string | null;
      filter_id?: string | null;
      card_layout?: 'default' | 'compact';
      card_colors?: Array<{ id: string; label: string; jql: string; color: string }>;
      card_color_method?: CardColorMethod;
      card_extra_fields?: string[];
      days_in_column_enabled?: boolean;
      working_days_config?: WorkingDaysConfig;
      timeline_enabled?: boolean;
      timeline_include_children?: boolean;
      kanban_backlog_enabled?: boolean;
      epic_display_mode?: EpicDisplayMode;
      column_constraint_type?: ColumnConstraintType;
    }) => {
      const update: Record<string, any> = { updated_at: new Date().toISOString() };
      if (fields.name !== undefined) update.name = fields.name;
      if (fields.description !== undefined) update.description = fields.description;
      if (fields.color !== undefined) update.color = fields.color;
      if (fields.visibility !== undefined) update.visibility = fields.visibility;
      if (fields.board_type !== undefined) update.board_type = fields.board_type;
      if (fields.swimlane_type !== undefined) update.swimlane_type = fields.swimlane_type;
      if (fields.swimlane_jql !== undefined) update.swimlane_jql = fields.swimlane_jql;
      if (fields.show_swimlanes !== undefined) update.show_swimlanes = fields.show_swimlanes;
      if (fields.board_query !== undefined) update.board_query = fields.board_query;
      if (fields.sub_filter_query !== undefined) update.sub_filter_query = fields.sub_filter_query;
      if (fields.completed_issues_cutoff !== undefined) update.completed_issues_cutoff = fields.completed_issues_cutoff;
      if (fields.filter_id !== undefined) update.filter_id = fields.filter_id;
      if (fields.card_layout !== undefined) update.card_layout = fields.card_layout;
      if (fields.card_colors !== undefined) update.card_colors = fields.card_colors;
      if (fields.card_extra_fields !== undefined) update.card_extra_fields = fields.card_extra_fields;
      if (fields.days_in_column_enabled !== undefined) update.days_in_column_enabled = fields.days_in_column_enabled;
      if (fields.working_days_config !== undefined) update.working_days_config = fields.working_days_config;
      if (fields.timeline_enabled !== undefined) update.timeline_enabled = fields.timeline_enabled;
      if (fields.timeline_include_children !== undefined) update.timeline_include_children = fields.timeline_include_children;
      if (fields.kanban_backlog_enabled !== undefined) update.kanban_backlog_enabled = fields.kanban_backlog_enabled;
      if (fields.epic_display_mode !== undefined) update.epic_display_mode = fields.epic_display_mode;
      if (fields.column_constraint_type !== undefined) update.column_constraint_type = fields.column_constraint_type;

      const { error } = await typedQuery('boards')
        .update(update)
        .eq('id', boardId);
      if (error) throw error;
      return { boardId, projectId };
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['board', result.boardId] });
      if (result.projectId) qc.invalidateQueries({ queryKey: ['boards', result.projectId] });
      catalystToast.success('Board settings saved');
    },
    onError: (err: Error) => {
      catalystToast.error(`Failed to save: ${err.message}`);
    },
  });
}

export function useDeleteBoard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ boardId, projectId }: { boardId: string; projectId: string }) => {
      const { error } = await typedQuery('boards')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', boardId);
      if (error) throw error;
      return { projectId };
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['boards', vars.projectId] });
      catalystToast.success('Board deleted');
    },
    onError: (err: Error) => {
      catalystToast.error(`Failed to delete board: ${err.message}`);
    },
  });
}

export function useToggleBoardStar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ boardId, projectId, isStarred, starMeta }: { boardId: string; projectId: string; isStarred: boolean; starMeta?: { label?: string; subtitle?: string; route?: string } }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upsert board_members row
      const { error } = await typedQuery('board_members')
        .upsert({
          board_id: boardId,
          user_id: user.id,
          is_starred: isStarred,
          role: 'viewer',
        }, { onConflict: 'board_id,user_id' });
      if (error) throw error;

      // Bridge to user_starred_items so the board surfaces on Home/For You
      if (isStarred) {
        await supabase.from('user_starred_items').upsert({
          user_id: user.id,
          item_id: boardId,
          item_type: 'board',
          starred_at: new Date().toISOString(),
          ...(starMeta ? { metadata: starMeta } : {}),
        }, { onConflict: 'user_id,item_id,item_type' });
      } else {
        await supabase.from('user_starred_items')
          .delete()
          .eq('user_id', user.id)
          .eq('item_id', boardId)
          .eq('item_type', 'board');
      }
      return { projectId };
    },
    onMutate: async ({ boardId, projectId, isStarred }) => {
      await qc.cancelQueries({ queryKey: ['boards', projectId] });
      const prev = qc.getQueryData(['boards', projectId]);
      qc.setQueryData(['boards', projectId], (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.map((b: any) => b.id === boardId ? { ...b, isStarred } : b);
      });
      return { prev, projectId };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['boards', ctx.projectId], ctx.prev);
      catalystToast.error('Failed to update star');
    },
    onSettled: (_d, _e, vars) => {
      qc.invalidateQueries({ queryKey: ['boards', vars.projectId] });
    },
  });
}

export function useUpdateBoardLastViewed() {
  return useMutation({
    mutationFn: async (boardId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // Update board_members last_viewed_at
      await typedQuery('board_members')
        .upsert({
          board_id: boardId,
          user_id: user.id,
          last_viewed_at: new Date().toISOString(),
          role: 'viewer',
        }, { onConflict: 'board_id,user_id' });
      // Also update boards.last_viewed_at
      await typedQuery('boards')
        .update({ last_viewed_at: new Date().toISOString() })
        .eq('id', boardId);
    },
  });
}

// Column mutations
export function useAddColumn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ boardId, name, position }: { boardId: string; name: string; position: number }) => {
      const { error } = await typedQuery('board_columns')
        .insert({ board_id: boardId, name, position, status_ids: [] });
      if (error) throw error;
      return { boardId };
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['board', r.boardId] });
      catalystToast.success('Column added');
    },
    onError: (err: Error) => catalystToast.error(`Failed to add column: ${err.message}`),
  });
}

export function useUpdateColumn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ columnId, boardId, ...fields }: {
      columnId: string; boardId: string;
      name?: string; position?: number; status_ids?: string[];
    }) => {
      const update: Record<string, any> = { updated_at: new Date().toISOString() };
      if (fields.name !== undefined) update.name = fields.name;
      if (fields.position !== undefined) update.position = fields.position;
      if (fields.status_ids !== undefined) update.status_ids = fields.status_ids;
      const { error } = await typedQuery('board_columns')
        .update(update)
        .eq('id', columnId);
      if (error) throw error;
      return { boardId };
    },
    onSuccess: (r) => qc.invalidateQueries({ queryKey: ['board', r.boardId] }),
    onError: (err: Error) => catalystToast.error(`Failed to update column: ${err.message}`),
  });
}

export function useDeleteColumn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ columnId, boardId }: { columnId: string; boardId: string }) => {
      const { error } = await typedQuery('board_columns')
        .delete()
        .eq('id', columnId);
      if (error) throw error;
      return { boardId };
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['board', r.boardId] });
      catalystToast.success('Column removed');
    },
    onError: (err: Error) => catalystToast.error(`Failed to remove column: ${err.message}`),
  });
}

// Card rank mutation for DnD
export function useUpdateCardRank() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ boardId, workItemId, columnId, rankValue }: {
      boardId: string; workItemId: string; columnId: string; rankValue: string;
    }) => {
      const { error } = await typedQuery('board_issue_rank')
        .upsert({
          board_id: boardId,
          work_item_id: workItemId,
          column_id: columnId,
          rank_value: rankValue,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'board_id,work_item_id' });
      if (error) throw error;
      return { boardId };
    },
    onSettled: (r) => {
      if (r?.boardId) {
        setTimeout(() => qc.invalidateQueries({ queryKey: ['board-cards', r.boardId] }), 300);
      }
    },
    onError: (err: Error) => catalystToast.error(`Failed to update card position: ${err.message}`),
  });
}

// Quick-filter mutations (Board Settings → Query tab)
export function useAddQuickFilter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ boardId, name, jql, description }: { boardId: string; name: string; jql: string; description?: string }) => {
      const { error } = await typedQuery('board_quick_filters' as any)
        .insert({
          board_id: boardId,
          name,
          filter_type: 'jql',
          filter_value: { jql },
          jql_query: jql,
          description: description ?? null,
          is_system: false,
          sort_order: Date.now(),
        });
      if (error) throw error;
      return { boardId };
    },
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ['board-quick-filters', r.boardId] }); },
    onError: (err: Error) => catalystToast.error(`Failed to add filter: ${err.message}`),
  });
}

export function useDeleteQuickFilter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ filterId, boardId }: { filterId: string; boardId: string }) => {
      const { error } = await typedQuery('board_quick_filters' as any).delete().eq('id', filterId);
      if (error) throw error;
      return { boardId };
    },
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ['board-quick-filters', r.boardId] }); },
    onError: (err: Error) => catalystToast.error(`Failed to delete filter: ${err.message}`),
  });
}

export function useMoveBoard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ boardId, fromProjectId, toProjectId }: { boardId: string; fromProjectId: string; toProjectId: string }) => {
      const { error } = await typedQuery('boards')
        .update({ project_id: toProjectId, updated_at: new Date().toISOString() })
        .eq('id', boardId);
      if (error) throw error;
      return { boardId, fromProjectId, toProjectId };
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['boards', result.fromProjectId] });
      qc.invalidateQueries({ queryKey: ['boards', result.toProjectId] });
      catalystToast.success('Board moved');
    },
    onError: (err: Error) => {
      catalystToast.error(`Failed to move board: ${err.message}`);
    },
  });
}

export function useCopyBoard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ boardId, toProjectId, newName }: { boardId: string; toProjectId: string; newName: string }) => {
      // Fetch the source board and its columns
      const { data: src, error: srcErr } = await typedQuery('boards').select('*').eq('id', boardId).single();
      if (srcErr || !src) throw srcErr ?? new Error('Board not found');

      const { data: cols, error: colsErr } = await typedQuery('board_columns')
        .select('name, position, color, status_ids, is_backlog, is_done')
        .eq('board_id', boardId)
        .order('position', { ascending: true });
      if (colsErr) throw colsErr;

      // Create the new board (config copy — no issue_rank rows)
      const { data: newBoard, error: boardErr } = await typedRpc('create_board', {
        p_name: newName,
        p_project_id: toProjectId,
        p_is_personal: (src as any).is_personal ?? false,
        p_visibility: (src as any).visibility ?? 'project',
        p_board_type: (src as any).board_type ?? 'kanban',
        p_swimlane_type: (src as any).swimlane_type ?? 'none',
        p_color: (src as any).color ?? 'var(--ds-link)',
        p_columns: null,
        p_board_query: (src as any).board_query ?? null,
        p_user_id: null,
      });
      if (boardErr) throw boardErr;

      const newBoardId = newBoard as string;

      // Copy columns if any
      if (cols && cols.length > 0) {
        const colInserts = cols.map((c: any) => ({
          board_id: newBoardId,
          name: c.name,
          position: c.position,
          color: c.color,
          status_ids: c.status_ids ?? [],
          is_backlog: c.is_backlog ?? false,
          is_done: c.is_done ?? false,
        }));
        const { error: colInsertErr } = await typedQuery('board_columns').insert(colInserts);
        if (colInsertErr) throw colInsertErr;
      }

      return { toProjectId, newBoardId };
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['boards', result.toProjectId] });
      catalystToast.success('Board copied');
    },
    onError: (err: Error) => {
      catalystToast.error(`Failed to copy board: ${err.message}`);
    },
  });
}

export function useBoardMutations() {
  const createBoard = useCreateBoard();
  const deleteBoard = useDeleteBoard();
  return { createBoard, deleteBoard };
}
