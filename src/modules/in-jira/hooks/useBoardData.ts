/**
 * Board Data Hooks
 * Manages board state, issues, and drag-drop operations
 */

import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { generateRankBetween, compareRanks } from '../utils/lexorank';
import type { Issue, Sprint, BoardConfig, KanbanColumn, StatusCategory } from '../types';
import { toast } from 'sonner';

// Extended issue type with rank
export interface BoardIssue extends Issue {
  rankLexo: string;
}

// Board column from database
export interface DBBoardColumn {
  id: string;
  boardId: string;
  name: string;
  sortOrder: number;
  statusIds: string[];
  maxLimit: number | null;
  minLimit: number | null;
}

// Board state
export interface BoardState {
  issues: BoardIssue[];
  sprints: Sprint[];
  columns: DBBoardColumn[];
  config: BoardConfig | null;
  isLoading: boolean;
  error: Error | null;
}

// Move operation result
export interface MoveResult {
  success: boolean;
  issue?: BoardIssue;
  error?: string;
}

/**
 * Main board data hook
 */
export function useBoardData(boardId: string, projectId: string) {
  const queryClient = useQueryClient();

  // Fetch board configuration
  const boardQuery = useQuery({
    queryKey: ['injira-board', boardId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('injira_boards') as any)
        .select(`
          *,
          columns:injira_board_columns(*)
        `)
        .eq('id', boardId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!boardId,
  });

  // Fetch issues for the board
  const issuesQuery = useQuery({
    queryKey: ['injira-board-issues', boardId, projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('injira_issues')
        .select('*')
        .eq('project_id', projectId)
        .order('rank_lexo', { ascending: true });

      if (error) throw error;
      return (data || []).map(issue => ({
        id: issue.id,
        key: issue.key,
        summary: issue.summary,
        description: typeof issue.description === 'string' ? issue.description : undefined,
        type: issue.issue_type_id as any,
        status: issue.status_id,
        statusCategory: 'to-do' as StatusCategory,
        priority: (issue.priority || 'medium') as any,
        assigneeId: issue.assignee_id,
        reporterId: issue.reporter_id,
        storyPoints: issue.story_points,
        sprintId: issue.sprint_id,
        createdAt: issue.created_at || '',
        updatedAt: issue.updated_at || '',
        parentId: issue.parent_id,
        rankLexo: issue.rank_lexo || 'UUUUUU',
      })) as BoardIssue[];
    },
    enabled: !!projectId,
  });

  // Fetch sprints for the board
  const sprintsQuery = useQuery({
    queryKey: ['injira-sprints', boardId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('injira_sprints') as any)
        .select('*')
        .eq('board_id', boardId)
        .order('start_date', { ascending: false });

      if (error) throw error;
      return (data || []).map(sprint => ({
        id: sprint.id,
        name: sprint.name,
        goal: sprint.goal,
        startDate: sprint.start_date,
        endDate: sprint.end_date,
        state: sprint.state as Sprint['state'],
        projectId: boardId, // Using boardId as reference
      })) as Sprint[];
    },
    enabled: !!boardId,
  });

  // Move issue mutation
  const moveIssueMutation = useMutation({
    mutationFn: async ({
      issueId,
      targetStatusId,
      targetSprintId,
      newRank,
    }: {
      issueId: string;
      targetStatusId?: string;
      targetSprintId?: string | null;
      newRank: string;
    }) => {
      const updates: Record<string, unknown> = {
        rank_lexo: newRank,
        updated_at: new Date().toISOString(),
      };

      if (targetStatusId !== undefined) {
        updates.status_id = targetStatusId;
      }

      if (targetSprintId !== undefined) {
        updates.sprint_id = targetSprintId;
      }

      const { data, error } = await supabase
        .from('injira_issues')
        .update(updates)
        .eq('id', issueId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['injira-board-issues', boardId, projectId] });
    },
    onError: (error) => {
      toast.error('Failed to move issue: ' + error.message);
    },
  });

  // Rank issue within list
  const rankIssue = useCallback(
    (
      issueId: string,
      targetIndex: number,
      issuesInTarget: BoardIssue[]
    ): string => {
      const sortedIssues = [...issuesInTarget].sort((a, b) =>
        compareRanks(a.rankLexo, b.rankLexo)
      );

      const before = targetIndex > 0 ? sortedIssues[targetIndex - 1]?.rankLexo : null;
      const after = targetIndex < sortedIssues.length ? sortedIssues[targetIndex]?.rankLexo : null;

      return generateRankBetween(before, after);
    },
    []
  );

  return {
    board: boardQuery.data,
    issues: issuesQuery.data || [],
    sprints: sprintsQuery.data || [],
    isLoading: boardQuery.isLoading || issuesQuery.isLoading || sprintsQuery.isLoading,
    error: boardQuery.error || issuesQuery.error || sprintsQuery.error,
    moveIssue: moveIssueMutation.mutate,
    isMoving: moveIssueMutation.isPending,
    rankIssue,
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: ['injira-board', boardId] });
      queryClient.invalidateQueries({ queryKey: ['injira-board-issues', boardId, projectId] });
      queryClient.invalidateQueries({ queryKey: ['injira-sprints', boardId] });
    },
  };
}

/**
 * Sprint management hook
 */
export function useSprintManagement(boardId: string, tenantId: string) {
  const queryClient = useQueryClient();

  const createSprintMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      goal?: string;
      startDate?: string;
      endDate?: string;
    }) => {
      const { data: sprint, error } = await supabase
        .from('injira_sprints')
        .insert({
          board_id: boardId,
          tenant_id: tenantId,
          name: data.name,
          goal: data.goal,
          start_date: data.startDate,
          end_date: data.endDate,
          state: 'future',
        })
        .select()
        .single();

      if (error) throw error;
      return sprint;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['injira-sprints', boardId] });
      toast.success('Sprint created');
    },
  });

  const startSprintMutation = useMutation({
    mutationFn: async (sprintId: string) => {
      // Close any currently active sprint first
      await supabase
        .from('injira_sprints')
        .update({ state: 'closed' })
        .eq('board_id', boardId)
        .eq('state', 'active');

      const { data, error } = await supabase
        .from('injira_sprints')
        .update({
          state: 'active',
          start_date: new Date().toISOString(),
        })
        .eq('id', sprintId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['injira-sprints', boardId] });
      toast.success('Sprint started');
    },
  });

  const completeSprintMutation = useMutation({
    mutationFn: async ({
      sprintId,
      moveIncompleteToSprintId,
    }: {
      sprintId: string;
      moveIncompleteToSprintId?: string;
    }) => {
      // Move incomplete issues if specified
      if (moveIncompleteToSprintId) {
        await supabase
          .from('injira_issues')
          .update({ sprint_id: moveIncompleteToSprintId })
          .eq('sprint_id', sprintId)
          .neq('status_id', 'done');
      }

      const { data, error } = await supabase
        .from('injira_sprints')
        .update({
          state: 'closed',
          complete_date: new Date().toISOString(),
        })
        .eq('id', sprintId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['injira-sprints', boardId] });
      queryClient.invalidateQueries({ queryKey: ['injira-board-issues'] });
      toast.success('Sprint completed');
    },
  });

  return {
    createSprint: createSprintMutation.mutate,
    startSprint: startSprintMutation.mutate,
    completeSprint: completeSprintMutation.mutate,
    isCreating: createSprintMutation.isPending,
    isStarting: startSprintMutation.isPending,
    isCompleting: completeSprintMutation.isPending,
  };
}

/**
 * Board columns management
 */
export function useBoardColumns(boardId: string) {
  const queryClient = useQueryClient();

  const columnsQuery = useQuery({
    queryKey: ['injira-board-columns', boardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('injira_board_columns')
        .select('*')
        .eq('board_id', boardId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return (data || []).map(col => ({
        id: col.id,
        boardId: col.board_id,
        name: col.name,
        sortOrder: col.sort_order,
        statusIds: col.status_ids || [],
        maxLimit: col.max_limit,
        minLimit: col.min_limit,
      })) as DBBoardColumn[];
    },
    enabled: !!boardId,
  });

  const updateWipLimitMutation = useMutation({
    mutationFn: async ({ columnId, maxLimit }: { columnId: string; maxLimit: number | null }) => {
      const { data, error } = await supabase
        .from('injira_board_columns')
        .update({ max_limit: maxLimit })
        .eq('id', columnId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['injira-board-columns', boardId] });
    },
  });

  return {
    columns: columnsQuery.data || [],
    isLoading: columnsQuery.isLoading,
    updateWipLimit: updateWipLimitMutation.mutate,
  };
}
