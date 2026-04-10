// useBoards — fetch board list for a project
import { useQuery } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import type { BoardListItem } from '@/types/board';

export function useBoards(projectId: string | undefined) {
  return useQuery<BoardListItem[]>({
    queryKey: ['boards', projectId],
    queryFn: async (): Promise<BoardListItem[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      const uid = user?.id;

      console.log('[useBoards] projectId:', projectId, 'userId:', uid);

      const { data, error } = await typedQuery('boards')
        .select(`
          *,
          board_columns(id),
          board_issue_rank(id),
          board_members(is_starred, last_viewed_at, user_id)
        `)
        .or(`project_id.eq.${projectId},and(is_personal.eq.true,created_by.eq.${uid})`)
        .is('deleted_at', null)
        .order('sort_order', { ascending: true });

      if (error) { console.error('[useBoards] query error:', error); throw error; }
      console.log('[useBoards] fetched', data?.length, 'boards');
      return (data ?? []).map((b: any) => ({
        id: b.id,
        name: b.name,
        description: b.description,
        icon: b.icon,
        color: b.color,
        projectId: b.project_id,
        isPersonal: b.is_personal,
        visibility: b.visibility,
        boardType: b.board_type,
        swimlaneType: b.swimlane_type,
        showSwimlanes: b.show_swimlanes,
        filterProjectIds: b.filter_project_ids ?? [],
        filterConfig: b.filter_config ?? {},
        isStarred: b.board_members?.find((m: any) => m.user_id === uid)?.is_starred ?? b.is_starred,
        sortOrder: b.sort_order,
        lastViewedAt: b.last_viewed_at,
        createdBy: b.created_by,
        createdAt: b.created_at,
        updatedAt: b.updated_at,
        columnCount: b.board_columns?.length ?? 0,
        issueCount: b.board_issue_rank?.length ?? 0,
        createdByName: null,
      }));
    },
    enabled: !!projectId,
  });
}
