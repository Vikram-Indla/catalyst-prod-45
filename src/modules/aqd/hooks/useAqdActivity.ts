/**
 * Task¹⁰ Activity Hook - Fetch activity history for an item
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AqdActivity {
  id: string;
  item_id: string;
  action: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  created_by: string | null;
  creatorName: string;
  creatorAvatar: string | null;
}

export function useAqdActivity(itemId: string) {
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['aqd-activity', itemId],
    queryFn: async (): Promise<AqdActivity[]> => {
      const { data, error } = await supabase
        .from('aqd_activity')
        .select(`
          *,
          profiles:created_by (full_name, avatar_url)
        `)
        .eq('item_id', itemId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      
      return (data || []).map((activity: any) => ({
        ...activity,
        creatorName: activity.profiles?.full_name || 'System',
        creatorAvatar: activity.profiles?.avatar_url,
      }));
    },
    enabled: !!itemId,
  });

  return { activities, isLoading };
}
