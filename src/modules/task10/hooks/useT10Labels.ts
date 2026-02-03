import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { T10Label } from '../types';

export function useT10Labels() {
  return useQuery({
    queryKey: ['t10-labels'],
    queryFn: async (): Promise<T10Label[]> => {
      const { data, error } = await supabase
        .from('t10_labels')
        .select('id, name, color, description')
        .order('name');
      
      if (error) throw error;
      return (data || []) as T10Label[];
    },
    staleTime: 60000,
  });
}

export function useCreateT10Label() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }): Promise<T10Label> => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('t10_labels')
        .insert({ 
          name, 
          color,
          created_by: user?.id 
        })
        .select('id, name, color, description')
        .single();
      
      if (error) throw error;
      return data as T10Label;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['t10-labels'] });
    },
  });
}
