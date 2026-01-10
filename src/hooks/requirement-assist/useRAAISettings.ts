import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { RAAISettings, UpdateRAAISettings } from '@/types/requirement-assist';

// Fetch AI settings (singleton)
export function useRAAISettings() {
  return useQuery({
    queryKey: ['ra-ai-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ra_ai_settings')
        .select('*')
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data as RAAISettings | null;
    },
  });
}

// Update AI settings
export function useUpdateRAAISettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateRAAISettings & { id: string }) => {
      const { data, error } = await supabase
        .from('ra_ai_settings')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as RAAISettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ra-ai-settings'] });
      toast.success('Settings saved');
    },
    onError: (error) => {
      console.error('Error updating settings:', error);
      toast.error('Failed to save settings');
    },
  });
}

// Create AI settings if none exist
export function useCreateRAAISettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Partial<RAAISettings>) => {
      const { data, error } = await supabase
        .from('ra_ai_settings')
        .insert(settings)
        .select()
        .single();
      if (error) throw error;
      return data as RAAISettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ra-ai-settings'] });
    },
    onError: (error) => {
      console.error('Error creating settings:', error);
      toast.error('Failed to create settings');
    },
  });
}
