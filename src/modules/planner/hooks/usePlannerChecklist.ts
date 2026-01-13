// ============================================================
// PLANNER CHECKLIST HOOK
// CRUD operations for checklist items with realtime sync
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export interface ChecklistItem {
  id: string;
  story_id: string;
  content: string;
  is_header: boolean;
  is_completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  sort_order: number;
  created_at: string;
  created_by: string | null;
}

const QUERY_KEY = 'planner-checklist';

/**
 * Fetch checklist items for a specific task
 */
export function usePlannerChecklist(storyId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, storyId],
    queryFn: async () => {
      if (!storyId) return [];
      
      const { data, error } = await supabase
        .from('planner_checklist_items')
        .select('*')
        .eq('story_id', storyId)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Error fetching checklist:', error);
        throw error;
      }

      return data as ChecklistItem[];
    },
    enabled: !!storyId,
  });
}

/**
 * Subscribe to realtime changes for a task's checklist
 */
export function usePlannerChecklistRealtime(storyId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!storyId) return;

    const channel = supabase
      .channel(`checklist-${storyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'planner_checklist_items',
          filter: `story_id=eq.${storyId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: [QUERY_KEY, storyId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [storyId, queryClient]);
}

/**
 * Toggle completion status of a checklist item
 */
export function useToggleChecklistItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, isCompleted }: { itemId: string; isCompleted: boolean }) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('planner_checklist_items')
        .update({
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null,
          completed_by: isCompleted ? userData.user?.id : null,
        })
        .eq('id', itemId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      // Invalidate all checklist queries since we don't know the story_id
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

/**
 * Add a single checklist item
 */
export function useAddChecklistItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      storyId, 
      content, 
      isHeader = false,
      sortOrder 
    }: { 
      storyId: string; 
      content: string; 
      isHeader?: boolean;
      sortOrder: number;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('planner_checklist_items')
        .insert({
          story_id: storyId,
          content,
          is_header: isHeader,
          sort_order: sortOrder,
          created_by: userData.user?.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

/**
 * Delete a checklist item
 */
export function useDeleteChecklistItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from('planner_checklist_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

/**
 * Bulk insert checklist items (for AI generation)
 */
export function useBulkInsertChecklist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      storyId, 
      items 
    }: { 
      storyId: string; 
      items: { content: string; is_header: boolean; sort_order: number }[];
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      
      // First, delete existing items
      const { error: deleteError } = await supabase
        .from('planner_checklist_items')
        .delete()
        .eq('story_id', storyId);

      if (deleteError) throw deleteError;

      // Then insert new items
      const insertItems = items.map(item => ({
        story_id: storyId,
        content: item.content,
        is_header: item.is_header,
        sort_order: item.sort_order,
        created_by: userData.user?.id,
      }));

      const { error: insertError } = await supabase
        .from('planner_checklist_items')
        .insert(insertItems);

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

/**
 * Calculate progress from checklist items
 */
export function calculateChecklistProgress(items: ChecklistItem[]): number {
  const completableItems = items.filter(item => !item.is_header);
  if (completableItems.length === 0) return 0;
  
  const completedCount = completableItems.filter(item => item.is_completed).length;
  return Math.round((completedCount / completableItems.length) * 100);
}
