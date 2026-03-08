// useBoardCards — fetch cards for a board
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { KanbanCard } from '@/types/board';

export function useBoardCards(boardId: string | undefined) {
  return useQuery<KanbanCard[]>({
    queryKey: ['board-cards', boardId],
    queryFn: async (): Promise<KanbanCard[]> => {
      // Fetch ranked items for this board
      const { data, error } = await (supabase as any)
        .from('board_issue_rank')
        .select('id, board_id, work_item_id, rank_value, column_id')
        .eq('board_id', boardId)
        .order('rank_value', { ascending: true });

      if (error) throw error;

      // Map to KanbanCard shape — work item details will be joined in Stage C
      return (data ?? []).map((r: any) => ({
        id: r.work_item_id,
        key: '',
        title: '',
        type: 'task' as const,
        statusId: '',
        rankValue: r.rank_value,
        storyPoints: null,
        priority: null,
        assignee: null,
        release: null,
        epic: null,
        labels: [],
        isBlocked: false,
        dueDate: null,
        swimlaneId: 'default',
        swimlaneName: 'Default',
      }));
    },
    enabled: !!boardId,
  });
}
