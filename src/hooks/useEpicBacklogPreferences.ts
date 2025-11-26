import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EpicBacklogPreferences {
  id?: string;
  user_id: string;
  selected_columns_main: string[];
  selected_columns_small: string[];
  last_view: 'list' | 'kanban';
  last_kanban_subview: 'state' | 'process' | 'column';
  labels_display: 'program' | 'parent';
}

export function useEpicBacklogPreferences() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['epic-backlog-preferences'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_epic_backlog_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as EpicBacklogPreferences | null;
    },
  });

  const updatePreferences = useMutation({
    mutationFn: async (updates: Partial<EpicBacklogPreferences>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('user_epic_backlog_preferences')
        .upsert({
          user_id: user.id,
          ...updates,
        }, {
          onConflict: 'user_id',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epic-backlog-preferences'] });
    },
    onError: () => {
      toast({ 
        title: 'Failed to save preferences', 
        variant: 'destructive' 
      });
    },
  });

  return {
    preferences,
    isLoading,
    updatePreferences: updatePreferences.mutate,
  };
}
