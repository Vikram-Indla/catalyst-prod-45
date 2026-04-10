// useBoard — fetch single board + columns
import { useQuery } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import type { Board, BoardColumn } from '@/types/board';

export function useBoard(boardId: string | undefined) {
  return useQuery<{ board: Board; columns: BoardColumn[] } | null>({
    queryKey: ['board', boardId],
    queryFn: async () => {
      const { data, error } = await typedQuery('boards')
        .select('*, board_columns(*)')
        .eq('id', boardId)
        .is('deleted_at', null)
        .single();

      if (error) throw error;
      if (!data) return null;

      const board: Board = {
        id: data.id,
        name: data.name,
        description: data.description,
        icon: data.icon,
        color: data.color,
        projectId: data.project_id,
        isPersonal: data.is_personal,
        visibility: data.visibility,
        boardType: data.board_type,
        swimlaneType: data.swimlane_type,
        showSwimlanes: data.show_swimlanes,
        filterProjectIds: data.filter_project_ids ?? [],
        filterConfig: data.filter_config ?? {},
        isStarred: data.is_starred,
        sortOrder: data.sort_order,
        lastViewedAt: data.last_viewed_at,
        createdBy: data.created_by,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      const columns: BoardColumn[] = (data.board_columns ?? [])
        .sort((a: any, b: any) => a.position - b.position)
        .map((c: any) => ({
          id: c.id,
          boardId: c.board_id,
          name: c.name,
          position: c.position,
          color: c.color,
          statusIds: c.status_ids ?? [],
          isBacklog: c.is_backlog,
          isDone: c.is_done,
        }));

      return { board, columns };
    },
    enabled: !!boardId,
  });
}
