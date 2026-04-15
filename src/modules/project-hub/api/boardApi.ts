import { supabase } from '@/integrations/supabase/client';
import type {
  PhBoard,
  PhBoardColumn,
  BoardIssue,
  BoardUserPrefs,
  BoardAnalyticsEvent,
} from '../types/kanban';

function toColumn(r: Record<string, unknown>): PhBoardColumn {
  return {
    id:            r.id as string,
    boardId:       r.board_id as string,
    name:          r.name as string,
    statusMapping: (r.status_mapping as string[]) ?? [],
    position:      r.position as number,
    wipLimit:      r.wip_limit as number | undefined,
    isDoneColumn:  r.is_done_column as boolean,
  };
}

function toIssue(r: Record<string, unknown>): BoardIssue {
  return {
    id:             r.id as string,
    summary:        r.summary as string,
    type:           r.type as BoardIssue['type'],
    priority:       r.priority as BoardIssue['priority'],
    status:         r.status as string,
    sp:             r.sp as number | undefined,
    assigneeId:     r.assignee_id as string | undefined,
    assigneeName:   r.assignee_name as string | undefined,
    assigneeAvatar: r.assignee_avatar as string | undefined,
    epicId:         r.epic_id as string | undefined,
    epicName:       r.epic_name as string | undefined,
    epicKey:        r.epic_key as string | undefined,
    boardColumnId:  r.board_column_id as string | undefined,
    boardPosition:  r.board_position as number | undefined,
    deletedAt:      r.deleted_at as string | null,
  };
}

export const boardApi = {
  async fetchBoardConfig(boardId: string): Promise<PhBoard> {
    const { data: board, error: bErr } = await supabase
      .from('ph_boards')
      .select('*')
      .eq('id', boardId)
      .eq('is_active', true)
      .single();
    if (bErr) throw bErr;

    const { data: cols, error: cErr } = await supabase
      .from('ph_board_columns')
      .select('*')
      .eq('board_id', boardId)
      .order('position');
    if (cErr) throw cErr;

    return {
      id:           board.id,
      projectId:    board.project_id ?? '',
      name:         board.name,
      boardType:    (board.board_type as 'kanban' | 'scrum') ?? 'kanban',
      columnConfig: (cols ?? []).map((c) => toColumn(c as unknown as Record<string, unknown>)),
      isActive:     board.is_active ?? true,
      createdAt:    board.created_at ?? '',
      updatedAt:    board.updated_at ?? '',
    };
  },

  async fetchBoardIssues(boardId: string): Promise<BoardIssue[]> {
    const { data, error } = await supabase
      .from('board_issues_view')
      .select('*')
      .eq('board_id', boardId)
      .is('deleted_at', null);
    if (error) throw error;
    return (data ?? []).map((r) => toIssue(r as unknown as Record<string, unknown>));
  },

  async fetchBoardUserPrefs(
    boardId: string,
    userId: string
  ): Promise<BoardUserPrefs | null> {
    const { data } = await supabase
      .from('ph_board_user_prefs')
      .select('*')
      .eq('board_id', boardId)
      .eq('user_id', userId)
      .maybeSingle();
    if (!data) return null;
    return {
      collapsedEpics: data.collapsed_epics ?? [],
      assigneeFilter: data.assignee_filter ?? [],
      typeFilter:     data.type_filter ?? [],
    };
  },

  async saveBoardUserPrefs(
    boardId: string,
    userId: string,
    prefs: BoardUserPrefs
  ): Promise<void> {
    const { error } = await supabase.rpc('upsert_board_user_prefs', {
      p_board_id: boardId,
      p_user_id:  userId,
      p_prefs: {
        collapsed_epics: prefs.collapsedEpics,
        assignee_filter: prefs.assigneeFilter,
        type_filter:     prefs.typeFilter,
      },
    });
    if (error) throw error;
  },

  async trackBoardEvent(event: BoardAnalyticsEvent): Promise<void> {
    await supabase.from('ph_board_analytics').insert({
      board_id:   event.boardId,
      event_type: event.eventType,
      issue_id:   event.issueId ?? null,
      column_id:  event.columnId ?? null,
      metadata:   event.metadata ?? null,
    });
  },
};
