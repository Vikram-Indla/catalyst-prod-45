// ============================================================
// useTaskDetailData Hook
// Fetches task detail data with real-time subscription
// ============================================================

import { useEffect, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TaskModalData, TaskNote, ChecklistItem, TaskLink, TaskFile, ActivityItem } from '../types';

interface UseTaskDetailDataResult {
  task: TaskModalData | null;
  notes: TaskNote[];
  checklist: ChecklistItem[];
  links: TaskLink[];
  files: TaskFile[];
  activities: ActivityItem[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export function useTaskDetailData(taskId: string | null): UseTaskDetailDataResult {
  const queryClient = useQueryClient();

  // Fetch task from planner_board_tasks view
  const { data: task, isLoading, isError, refetch } = useQuery({
    queryKey: ['task-detail-modal', taskId],
    queryFn: async (): Promise<TaskModalData | null> => {
      if (!taskId) return null;

      const { data, error } = await supabase
        .from('planner_board_tasks')
        .select('*')
        .eq('id', taskId)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!data) return null;

      // Also fetch the base task for additional fields
      const { data: baseTask } = await supabase
        .from('planner_tasks')
        .select('description, start_date, created_at, updated_at')
        .eq('id', taskId)
        .maybeSingle();

      return {
        id: data.id,
        key: data.key,
        title: data.title,
        description: baseTask?.description || null,
        status: data.status_name || 'Backlog',
        status_id: data.status_id,
        status_slug: data.status_slug,
        priority: data.priority,
        workstream: data.workstream_name || '',
        workstream_id: data.workstream_id,
        workstream_slug: data.workstream_slug,
        assignee_id: data.assignee_id,
        assignee_name: data.assignee_name,
        assignee_initials: data.assignee_name 
          ? data.assignee_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
          : null,
        due_date: data.due_date,
        start_date: baseTask?.start_date || null,
        created_at: baseTask?.created_at || new Date().toISOString(),
        updated_at: baseTask?.updated_at || new Date().toISOString(),
        progress: data.progress || 0,
        blocked: data.blocked || false,
        is_completed_status: data.status_is_done || false,
      };
    },
    enabled: !!taskId,
    staleTime: 10000,
  });

  // Fetch lead notes
  const { data: notesData = [] } = useQuery({
    queryKey: ['task-detail-notes', taskId],
    queryFn: async (): Promise<TaskNote[]> => {
      if (!taskId) return [];

      const { data, error } = await supabase
        .from('planner_task_lead_notes')
        .select(`
          id,
          content,
          created_at,
          profiles:author_id (
            full_name
          )
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });

      if (error) return [];

      return (data || []).map((note: any) => ({
        id: note.id,
        content: note.content,
        author: note.profiles?.full_name || 'Unknown',
        author_initials: note.profiles?.full_name
          ? note.profiles.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
          : 'U',
        author_color: '#8b5cf6',
        created_at: note.created_at,
      }));
    },
    enabled: !!taskId,
  });

  // Fetch external links
  const { data: linksData = [] } = useQuery({
    queryKey: ['task-detail-links', taskId],
    queryFn: async (): Promise<TaskLink[]> => {
      if (!taskId) return [];

      const { data, error } = await supabase
        .from('task_external_links')
        .select('id, url, title')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });

      if (error) return [];

      return (data || []).map((link: any) => ({
        id: link.id,
        url: link.url,
        title: link.title || link.url,
      }));
    },
    enabled: !!taskId,
  });

  // Real-time subscription for task updates
  useEffect(() => {
    if (!taskId) return;

    const channel = supabase
      .channel(`task-detail-modal-${taskId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'planner_tasks',
          filter: `id=eq.${taskId}`,
        },
        () => {
          // Refetch on update
          queryClient.invalidateQueries({ queryKey: ['task-detail-modal', taskId] });
          queryClient.invalidateQueries({ queryKey: ['planner', 'board'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'planner_tasks',
          filter: `id=eq.${taskId}`,
        },
        () => {
          queryClient.removeQueries({ queryKey: ['task-detail-modal', taskId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId, queryClient]);

  return {
    task: task || null,
    notes: notesData,
    checklist: [], // TODO: Implement checklist storage
    links: linksData,
    files: [], // TODO: Implement files from storage
    activities: [], // TODO: Fetch from activity_logs
    isLoading,
    isError,
    refetch,
  };
}
