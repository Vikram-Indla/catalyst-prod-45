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
        .select([
          'id, name, description, color, visibility, swimlane_type, board_query, filter_id',
          'card_layout, card_colors, card_color_method, card_extra_fields, project_id',
          'sub_filter_query, completed_issues_cutoff, working_days_config',
          'timeline_enabled, timeline_include_children',
          'days_in_column_enabled, kanban_backlog_enabled',
          'epic_display_mode, column_constraint_type, swimlane_jql',
          'show_swimlanes, filter_project_ids, filter_config, board_type',
          'is_personal, is_starred, sort_order, last_viewed_at, created_by, created_at, updated_at',
        ].join(', '))
        .eq('id', boardId)
        .maybeSingle();
      if (error || !data) return null;
      return {
        id: data.id,
        name: data.name,
        description: data.description ?? null,
        icon: data.icon ?? '',
        color: data.color ?? 'var(--ds-link, #0052CC)',
        projectId: data.project_id ?? null,
        isPersonal: data.is_personal ?? false,
        visibility: data.visibility ?? 'project',
        boardType: data.board_type ?? 'kanban',
        swimlaneType: data.swimlane_type ?? 'none',
        swimlaneJql: data.swimlane_jql ?? null,
        showSwimlanes: data.show_swimlanes ?? false,
        filterProjectIds: data.filter_project_ids ?? [],
        filterConfig: data.filter_config ?? {},
        boardQuery: data.board_query ?? null,
        subFilterQuery: data.sub_filter_query ?? null,
        completedIssuesCutoff: data.completed_issues_cutoff ?? '-2w',
        cardLayout: data.card_layout ?? 'default',
        cardColors: data.card_colors ?? [],
        cardColorMethod: data.card_color_method ?? 'none',
        cardExtraFields: data.card_extra_fields ?? [],
        daysInColumnEnabled: data.days_in_column_enabled ?? false,
        workingDaysConfig: data.working_days_config ?? {
          region: 'System default',
          timezone: '',
          workdays: [true, true, true, true, true, false, false],
          nonWorkingDates: [],
        },
        timelineEnabled: data.timeline_enabled ?? false,
        timelineIncludeChildren: data.timeline_include_children ?? false,
        kanbanBacklogEnabled: data.kanban_backlog_enabled ?? false,
        epicDisplayMode: data.epic_display_mode ?? 'board',
        columnConstraintType: data.column_constraint_type ?? 'none',
        isStarred: data.is_starred ?? false,
        sortOrder: data.sort_order ?? 0,
        lastViewedAt: data.last_viewed_at ?? null,
        createdBy: data.created_by ?? '',
        createdAt: data.created_at ?? '',
        updatedAt: data.updated_at ?? '',
        filterId: data.filter_id ?? null,
        columnCount: 0,
        issueCount: 0,
        createdByName: null,
        leadName: null,
        leadAvatarUrl: null,
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
