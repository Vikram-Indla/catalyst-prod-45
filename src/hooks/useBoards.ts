// useBoards — fetch board list for a project
import { useQuery } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import type { BoardListItem } from '@/types/board';
import { resolveAvatarUrl } from '@/lib/avatars';

export function useBoards(projectId: string | undefined, projectKey?: string) {
  return useQuery<BoardListItem[]>({
    queryKey: ['boards', projectId, projectKey],
    queryFn: async (): Promise<BoardListItem[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      const uid = user?.id;

      // Include: (a) boards tied to the legacy projects UUID, (b) filter-derived
      // boards linked via jira_project_key (project_id=null), (c) personal boards.
      const orClauses = [`project_id.eq.${projectId}`];
      if (projectKey) orClauses.push(`jira_project_key.eq.${projectKey.toUpperCase()}`);
      if (uid) orClauses.push(`and(is_personal.eq.true,created_by.eq.${uid})`);

      const { data, error } = await typedQuery('boards')
        .select(`
          *,
          board_columns(id),
          board_issue_rank(id),
          board_members(is_starred, last_viewed_at, user_id)
        `)
        .or(orClauses.join(','))
        .is('deleted_at', null)
        .order('sort_order', { ascending: true });

      if (error) { console.error('[useBoards] query error:', error); throw error; }

      // Batch-fetch filter owners for the Lead column.
      // Two-step avoids FK alias uncertainty in typedQuery.
      const filterIds = (data ?? []).map((b: any) => b.filter_id).filter(Boolean) as string[];
      const filterOwnerMap: Record<string, { name: string | null; avatarUrl: string | null }> = {};
      if (filterIds.length > 0) {
        const { data: filters } = await supabase
          .from('ph_saved_filters')
          .select('id, owner:profiles!ph_saved_filters_owner_id_fkey(full_name, avatar_url)')
          .in('id', filterIds);
        (filters ?? []).forEach((f: any) => {
          filterOwnerMap[f.id] = {
            name: f.owner?.full_name ?? null,
            avatarUrl: resolveAvatarUrl(f.owner?.full_name ?? null) ?? f.owner?.avatar_url ?? null,
          };
        });
      }

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
        boardQuery: b.board_query ?? null,
        cardLayout: b.card_layout ?? 'default',
        cardColors: b.card_colors ?? [],
        columnCount: b.board_columns?.length ?? 0,
        issueCount: b.board_issue_rank?.length ?? 0,
        createdByName: null,
        filterId: b.filter_id ?? null,
        leadName: b.filter_id ? (filterOwnerMap[b.filter_id]?.name ?? null) : null,
        leadAvatarUrl: b.filter_id ? (filterOwnerMap[b.filter_id]?.avatarUrl ?? null) : null,
        isDefault: b.is_default ?? false,
        primaryWorkItemType: b.primary_work_item_type ?? null,
      }));
    },
    enabled: !!projectId,
  });
}
