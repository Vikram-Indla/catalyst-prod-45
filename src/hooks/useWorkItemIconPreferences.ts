import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type IconStyle = 'filled' | 'outline' | 'minimal';

export interface WorkItemIconPreference {
  id: string;
  work_item_type: string;
  icon_style: IconStyle;
  created_at: string;
  updated_at: string;
}

export function useWorkItemIconPreferences() {
  const queryClient = useQueryClient();

  // Fetch all icon preferences
  const { data: iconPreferences, isLoading } = useQuery({
    queryKey: ['work-item-icon-preferences'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_item_icon_preferences')
        .select('*')
        .order('work_item_type');
      
      if (error) throw error;
      return data as WorkItemIconPreference[];
    },
  });

  // Real-time subscription for icon preference changes
  useEffect(() => {
    const channel = supabase
      .channel('work-item-icon-preferences-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'work_item_icon_preferences',
        },
        () => {
          // Invalidate queries to refetch data when changes occur
          queryClient.invalidateQueries({ queryKey: ['work-item-icon-preferences'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Build a map for quick lookup: work_item_type -> icon_style
  const iconStyleMap: Record<string, IconStyle> = {};
  iconPreferences?.forEach((pref) => {
    iconStyleMap[pref.work_item_type] = pref.icon_style as IconStyle;
  });

  // Mutation to update a single icon preference
  const updateIconPreference = useMutation({
    mutationFn: async ({ workItemType, iconStyle }: { workItemType: string; iconStyle: IconStyle }) => {
      const { error } = await supabase
        .from('work_item_icon_preferences')
        .update({ icon_style: iconStyle })
        .eq('work_item_type', workItemType);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-item-icon-preferences'] });
    },
    onError: (error) => {
      console.error('Failed to update icon preference:', error);
      toast.error('Failed to update icon preference');
    },
  });

  // Mutation to batch update icon preferences
  const batchUpdateIconPreferences = useMutation({
    mutationFn: async (updates: { workItemType: string; iconStyle: IconStyle }[]) => {
      // Use Promise.all for batch updates
      const promises = updates.map(({ workItemType, iconStyle }) =>
        supabase
          .from('work_item_icon_preferences')
          .update({ icon_style: iconStyle })
          .eq('work_item_type', workItemType)
      );
      
      const results = await Promise.all(promises);
      
      // Check for any errors
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        throw new Error(`Failed to update ${errors.length} icon preferences`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-item-icon-preferences'] });
      toast.success('Icon preferences updated successfully');
    },
    onError: (error) => {
      console.error('Failed to batch update icon preferences:', error);
      toast.error('Failed to update icon preferences');
    },
  });

  // Get icon style for a specific work item type
  const getIconStyle = (workItemType: string): IconStyle => {
    return iconStyleMap[workItemType] || 'filled';
  };

  return {
    iconPreferences,
    iconStyleMap,
    isLoading,
    getIconStyle,
    updateIconPreference,
    batchUpdateIconPreferences,
  };
}
