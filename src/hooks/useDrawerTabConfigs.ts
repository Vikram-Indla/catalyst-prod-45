import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DrawerTabConfig {
  id: string;
  business_line_id: string | null;
  tab_key: string;
  display_name: string;
  is_visible: boolean;
  is_required: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

// Fetch drawer tab configs (global or by business line)
export function useDrawerTabConfigs(businessLineId?: string | null) {
  return useQuery({
    queryKey: ['drawer-tab-configs', businessLineId],
    queryFn: async () => {
      // First try to get business line specific configs
      if (businessLineId) {
        const { data, error } = await supabase
          .from('drawer_tab_configs')
          .select('*')
          .eq('business_line_id', businessLineId)
          .order('position');
        
        if (error) throw error;
        if (data && data.length > 0) return data as DrawerTabConfig[];
      }
      
      // Fall back to global configs (business_line_id = NULL)
      const { data, error } = await supabase
        .from('drawer_tab_configs')
        .select('*')
        .is('business_line_id', null)
        .order('position');
      
      if (error) throw error;
      return data as DrawerTabConfig[];
    },
  });
}

// Update a single drawer tab config
export function useUpdateDrawerTabConfig() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DrawerTabConfig> & { id: string }) => {
      const { data, error } = await supabase
        .from('drawer_tab_configs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drawer-tab-configs'] });
    },
    onError: (error) => {
      console.error('Error updating drawer tab config:', error);
      toast.error('Failed to update tab configuration');
    },
  });
}

// Bulk update drawer tab configs
export function useBulkUpdateDrawerTabConfigs() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (configs: Array<Partial<DrawerTabConfig> & { id: string }>) => {
      const results = await Promise.all(
        configs.map(async ({ id, ...updates }) => {
          const { data, error } = await supabase
            .from('drawer_tab_configs')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
          
          if (error) throw error;
          return data;
        })
      );
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drawer-tab-configs'] });
      toast.success('Tab configuration saved');
    },
    onError: (error) => {
      console.error('Error saving drawer tab configs:', error);
      toast.error('Failed to save tab configuration');
    },
  });
}

// Get visible tabs for drawer consumption
export function useVisibleDrawerTabs(businessLineId?: string | null) {
  const { data: configs = [], isLoading } = useDrawerTabConfigs(businessLineId);
  
  const visibleTabs = configs
    .filter(tab => tab.is_visible)
    .sort((a, b) => a.position - b.position)
    .map(tab => ({
      value: tab.tab_key,
      label: tab.display_name,
    }));
  
  return { visibleTabs, isLoading };
}
