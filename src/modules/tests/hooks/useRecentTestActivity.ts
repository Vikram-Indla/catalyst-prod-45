/**
 * useRecentTestActivity Hook
 * Fetches recent test activity for dashboard
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { ScopeType } from './useGlobalTestScope';

export interface TestActivity {
  id: string;
  user_id: string;
  user_name?: string;
  activity_type: string;
  entity_type: string;
  entity_id: string;
  entity_title: string;
  description: string;
  created_at: string;
}

export function useRecentTestActivity(
  scopeType: ScopeType,
  scopeId: string | null,
  limit: number = 10
) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['recent-test-activity', scopeType, scopeId, limit],
    queryFn: async (): Promise<TestActivity[]> => {
      let query = supabase
        .from('test_activity_log')
        .select(`
          id,
          user_id,
          activity_type,
          entity_type,
          entity_id,
          entity_title,
          description,
          created_at,
          program_id,
          project_id
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (scopeType === 'program' && scopeId) {
        query = query.eq('program_id', scopeId);
      } else if (scopeType === 'project' && scopeId) {
        query = query.eq('project_id', scopeId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch user profiles for activity
      const userIds = [...new Set((data || []).map(a => a.user_id).filter(Boolean))];
      
      let profiles: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);
        
        profileData?.forEach(p => {
          profiles[p.id] = p.full_name || 'Unknown User';
        });
      }

      return (data || []).map(activity => ({
        ...activity,
        user_name: profiles[activity.user_id] || 'Unknown User',
      }));
    },
    enabled: !!user,
    staleTime: 15000,
  });
}
