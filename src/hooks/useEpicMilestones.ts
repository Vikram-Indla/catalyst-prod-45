import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const MILESTONE_STATES = {
  0: { label: 'Pending', color: 'bg-muted text-muted-foreground' },
  1: { label: 'In Progress', color: 'bg-primary/10 text-primary' },
  2: { label: 'Complete', color: 'bg-success/10 text-success' },
  3: { label: 'Blocked', color: 'bg-destructive/10 text-destructive' }
} as const;

export const useEpicMilestones = (epicId: string) => {
  return useQuery({
    queryKey: ['milestones', epicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('milestones')
        .select(`
          *,
          category:milestone_categories(name)
        `)
        .eq('epic_id', epicId)
        .order('target_date', { ascending: true });

      if (error) throw error;
      return data;
    },
  });
};

export const useMilestoneCategories = () => {
  return useQuery({
    queryKey: ['milestone-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('milestone_categories')
        .select('*');

      if (error) throw error;
      return data;
    },
  });
};

export const useCreateMilestone = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ epicId, title, categoryId, startDate, targetDate }: {
      epicId: string;
      title: string;
      categoryId?: string;
      startDate?: string;
      targetDate: string;
    }) => {
      // Check limit
      const { count } = await supabase
        .from('milestones')
        .select('*', { count: 'exact', head: true })
        .eq('epic_id', epicId);
      
      if (count && count >= 30) {
        throw new Error('Maximum 30 milestones per epic');
      }
      
      const { data, error } = await supabase
        .from('milestones')
        .insert({
          work_item_id: epicId,
          title,
          category_id: categoryId,
          state: '0', // Pending
          start_date: startDate,
          due_date: targetDate
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { epicId }) => {
      queryClient.invalidateQueries({ queryKey: ['milestones', epicId] });
    },
  });
};

export const useUpdateMilestone = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, epicId, ...updates }: any) => {
      // Auto-set completed_date when state changes to Complete
      if (updates.state === 2 && !updates.completed_date) {
        updates.completed_date = new Date().toISOString().split('T')[0];
      }
      
      const { data, error } = await supabase
        .from('milestones')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data, epicId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['milestones', result.epicId] });
    },
  });
};

export const useDeleteMilestone = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, epicId }: { id: string; epicId: string }) => {
      const { error } = await supabase
        .from('milestones')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return epicId;
    },
    onSuccess: (epicId) => {
      queryClient.invalidateQueries({ queryKey: ['milestones', epicId] });
    },
  });
};
