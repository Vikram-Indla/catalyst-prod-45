// useBoardCards — fetch cards for a board with work item details
import { useQuery } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import type { KanbanCard } from '@/types/board';

export function useBoardCards(boardId: string | undefined) {
  return useQuery<KanbanCard[]>({
    queryKey: ['board-cards', boardId],
    queryFn: async (): Promise<KanbanCard[]> => {
      // Fetch ranked items with column mapping
      const { data: ranks, error: rankError } = await typedQuery('board_issue_rank')
        .select('work_item_id, rank_value, column_id')
        .eq('board_id', boardId)
        .order('rank_value', { ascending: true });

      if (rankError) throw rankError;
      if (!ranks || ranks.length === 0) return [];

      const workItemIds = ranks.map((r: any) => r.work_item_id);
      
      // Fetch work items (ph_issues) for these IDs
      const { data: items, error: itemError } = await typedQuery('ph_issues')
        .select('id, issue_key, summary, issue_type, status, status_category, priority, story_points, assignee_display_name, assignee_account_id, fix_versions, parent_key, labels, due_date')
        .in('id', workItemIds)
        .is('archived_at', null)
        .limit(5000);

      if (itemError) throw itemError;

      const itemMap = new Map((items ?? []).map((i: any) => [i.id, i]));

      return ranks.map((r: any) => {
        const item: any = itemMap.get(r.work_item_id);
        if (!item) {
          return {
            id: r.work_item_id,
            key: '',
            title: 'Unknown item',
            type: 'task' as const,
            statusId: r.column_id ?? '',
            rankValue: r.rank_value,
            columnId: r.column_id,
            storyPoints: null,
            priority: null,
            assignee: null,
            release: null,
            epic: null,
            labels: [],
            isBlocked: false,
            dueDate: null,
            swimlaneId: 'default',
            swimlaneName: 'All Issues',
          };
        }

        // Map issue_type to card type
        const typeMap: Record<string, string> = {
          Bug: 'bug', Story: 'story', Task: 'task', Epic: 'epic',
          'Sub-task': 'subtask', Improvement: 'improvement', 'New Feature': 'new_feature',
        };

        // Map priority
        const priorityColors: Record<string, string> = {
          Critical: '#FF5630', Highest: '#FF5630', High: '#FF7452',
          Medium: '#D97706', Low: '#94A3B8', Lowest: '#94A3B8',
        };
        const pName = item.priority ?? '';
        const priorityObj = pName ? {
          id: pName.toLowerCase(),
          name: pName.toLowerCase() as any,
          color: priorityColors[pName] ?? '#94A3B8',
        } : null;

        // Parse fix_versions
        let releaseObj = null;
        if (item.fix_versions) {
          try {
            const fv = typeof item.fix_versions === 'string' ? JSON.parse(item.fix_versions) : item.fix_versions;
            if (Array.isArray(fv) && fv.length > 0) {
              releaseObj = { id: fv[0].id ?? fv[0].name, name: fv[0].name };
            }
          } catch {}
        }

        // Assignee
        const assignee = item.assignee_display_name ? {
          id: item.assignee_account_id ?? item.assignee_display_name,
          displayName: item.assignee_display_name,
          avatarUrl: null,
          initials: item.assignee_display_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase(),
        } : null;

        // Labels
        let labelsList: Array<{ id: string; name: string; color: string }> = [];
        if (item.labels) {
          try {
            const parsed = typeof item.labels === 'string' ? JSON.parse(item.labels) : item.labels;
            if (Array.isArray(parsed)) {
              labelsList = parsed.map((l: any) => ({
                id: typeof l === 'string' ? l : l.id ?? l.name,
                name: typeof l === 'string' ? l : l.name,
                color: typeof l === 'object' ? l.color ?? '#94A3B8' : '#94A3B8',
              }));
            }
          } catch {}
        }

        return {
          id: r.work_item_id,
          key: item.issue_key ?? '',
          title: item.summary ?? 'Untitled',
          type: (typeMap[item.issue_type] ?? 'task') as KanbanCard['type'],
          statusId: r.column_id ?? '',
          rankValue: r.rank_value,
          columnId: r.column_id,
          storyPoints: item.story_points ?? null,
          priority: priorityObj,
          assignee,
          release: releaseObj,
          epic: item.parent_key ? { id: item.parent_key, key: item.parent_key, title: item.parent_key, color: '#6554C0' } : null,
          labels: labelsList,
          isBlocked: false,
          dueDate: item.due_date ?? null,
          swimlaneId: 'default',
          swimlaneName: 'All Issues',
        };
      });
    },
    enabled: !!boardId,
  });
}
