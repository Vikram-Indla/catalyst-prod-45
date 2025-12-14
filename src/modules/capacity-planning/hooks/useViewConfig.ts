import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ViewConfig {
  id: string;
  user_id: string;
  resource_ids: string[];
  time_span: '2weeks' | '5weeks';
  view_mode: 'gantt' | 'list';
  group_by: string;
  created_at: string;
  updated_at: string;
}

export function useViewConfig() {
  return useQuery({
    queryKey: ['capacity-view-config'],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return null;

      const { data, error } = await supabase
        .from('capacity_view_config')
        .select('*')
        .eq('user_id', user.user.id)
        .maybeSingle();

      if (error) throw error;
      return data as ViewConfig | null;
    },
  });
}

export function useSaveViewConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: {
      resource_ids?: string[];
      time_span?: '2weeks' | '5weeks';
      view_mode?: 'gantt' | 'list';
      group_by?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data: existing } = await supabase
        .from('capacity_view_config')
        .select('id')
        .eq('user_id', user.user.id)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('capacity_view_config')
          .update(config)
          .eq('user_id', user.user.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('capacity_view_config')
          .insert({
            user_id: user.user.id,
            ...config,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capacity-view-config'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to save view config: ${error.message}`);
    },
  });
}
