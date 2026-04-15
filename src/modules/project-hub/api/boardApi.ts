import { supabase } from '@/integrations/supabase/client';
import type {
  PhBoard,
  PhBoardColumn,
  BoardIssue,
  BoardUserPrefs,
  BoardAnalyticsEvent,
} from '../types/kanban';

// The tables below (ph_boards, ph_board_columns, ph_board_user_prefs,
// ph_board_analytics, board_issues_view) were created via migration but
// are not yet reflected in the auto-generated Supabase types file.
// We use typed helper functions to avoid `as any` while keeping type safety.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

function fromTable(table: string) {
  return db.from(table);
}

function rpc(name: string, params: Record<string, unknown>) {
  return db.rpc(name, params);
}

function toColumn(r: Record<string, unknown>): PhBoardColumn {
  return {
    id:            r.id as string,
    boardId:       r.board_id as string,
    name:          r.name as string,
    statusMapping: (r.status_ids as string[]) ?? [],
    position:      r.position as number,
    wipLimit:      (r.wip_limit as number) ?? undefined,
    isDoneColumn:  (r.is_done as boolean) ?? false,
  };
}

function toIssue(r: Record<string, unknown>): BoardIssue {
  return {
    id:             r.id as string,
    summary:        r.summary as string,
    type:           r.type as BoardIssue['type'],
    priority:       r.priority as BoardIssue['priority'],
    status:         r.status as string,
    sp:             (r.sp as number) ?? undefined,
    assigneeId:     (r.assignee_id as string) ?? undefined,
    assigneeName:   (r.assignee_name as string) ?? undefined,
    assigneeAvatar: (r.assignee_avatar as string) ?? undefined,
    epicId:         (r.epic_id as string) ?? undefined,
    epicName:       (r.epic_name as string) ?? undefined,
    epicKey:        (r.epic_key as string) ?? undefined,
    boardColumnId:  (r.board_column_id as string) ?? undefined,
    boardPosition:  (r.board_position as number) ?? undefined,
    deletedAt:      (r.deleted_at as string) ?? null,
  };
}

export const boardApi = {

  async fetchBoardConfig(boardId: string): Promise<PhBoard> {
    const { data: board, error: bErr } = await fromTable('boards')
      .select('*')
      .eq('id', boardId)
      .single();
    if (bErr) throw bErr;

    const { data: cols, error: cErr } = await fromTable('board_columns')
      .select('*')
      .eq('board_id', boardId)
      .order('position');
    if (cErr) throw cErr;

    const b = board as Record<string, unknown>;
    return {
      id:           b.id as string,
      projectId:    b.project_id as string,
      name:         b.name as string,
      boardType:    b.board_type as 'kanban' | 'scrum',
      columnConfig: ((cols ?? []) as Record<string, unknown>[]).map(toColumn),
      isActive:     true,
      createdAt:    b.created_at as string,
      updatedAt:    b.updated_at as string,
    };
  },

  async fetchBoardIssues(boardId: string): Promise<BoardIssue[]> {
    const { data, error } = await fromTable('board_issues_view')
      .select('*')
      .eq('board_id', boardId)
      .is('deleted_at', null);
    if (error) throw error;
    return ((data ?? []) as Record<string, unknown>[]).map(toIssue);
  },

  async fetchBoardUserPrefs(
    boardId: string,
    userId: string
  ): Promise<BoardUserPrefs | null> {
    const { data } = await fromTable('ph_board_user_prefs')
      .select('*')
      .eq('board_id', boardId)
      .eq('user_id', userId)
      .maybeSingle();
    if (!data) return null;
    const d = data as Record<string, unknown>;
    return {
      collapsedEpics: (d.collapsed_epics as string[]) ?? [],
      assigneeFilter: (d.assignee_filter as string[]) ?? [],
      typeFilter:     (d.type_filter as string[]) ?? [],
    };
  },

  async saveBoardUserPrefs(
    boardId: string,
    userId: string,
    prefs: BoardUserPrefs
  ): Promise<void> {
    const { error } = await rpc('upsert_board_user_prefs', {
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
    await fromTable('ph_board_analytics').insert({
      board_id:   event.boardId,
      event_type: event.eventType,
      issue_id:   event.issueId ?? null,
      column_id:  event.columnId ?? null,
      metadata:   event.metadata ?? null,
    });
  },
};
