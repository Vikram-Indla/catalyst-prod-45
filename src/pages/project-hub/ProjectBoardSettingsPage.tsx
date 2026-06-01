/**
 * ProjectHub Board Settings wrapper — resolves boardId + projectKey
 * then renders BoardSettingsPage (full-page Jira-parity layout).
 * Route: /project-hub/:key/boards/:boardId/settings/:section?
 */
import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import BoardSettingsPage from './BoardSettingsPage';
import type { BoardListItem } from '@/types/board';

export default function ProjectBoardSettingsPage() {
  const { key, boardId } = useParams<{ key: string; boardId: string }>();

  const { data: board, isLoading } = useQuery<BoardListItem | null>({
    queryKey: ['board-for-settings', boardId],
    queryFn: async () => {
      if (!boardId) return null;
      const { data, error } = await (typedQuery as any)('boards')
        .select('id, name, description, color, visibility, swimlane_type, board_query, filter_id, card_layout, card_colors, project_id')
        .eq('id', boardId)
        .maybeSingle();
      if (error || !data) return null;
      return {
        id: data.id,
        name: data.name,
        description: data.description ?? null,
        color: data.color,
        visibility: data.visibility,
        swimlaneType: data.swimlane_type,
        boardQuery: data.board_query ?? '',
        filterId: data.filter_id ?? '',
        cardLayout: data.card_layout ?? 'default',
        cardColors: data.card_colors ?? [],
        projectId: data.project_id,
      } as BoardListItem;
    },
    enabled: !!boardId,
  });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--ds-background-brand-bold, #0052CC)' }} />
      </div>
    );
  }

  if (!board || !key) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--ds-text-subtlest, #6B778C)', fontSize: 14 }}>
        Board not found
      </div>
    );
  }

  return <BoardSettingsPage board={board} projectKey={key.toUpperCase()} />;
}
