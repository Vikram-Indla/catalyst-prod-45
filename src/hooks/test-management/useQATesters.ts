/**
 * Hook to fetch QA Testers - users with the 'qa_tester' role in user_product_roles
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export interface QATester {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

/**
 * Fetches users who have the 'qa_tester' product role
 * with real-time subscription for sync
 */
export function useQATesters() {
  const queryClient = useQueryClient();

  // Set up real-time subscription for changes
  useEffect(() => {
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['qa-testers'] });
    
    const channel = supabase
      .channel('qa-testers-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_product_roles' }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, invalidate)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['qa-testers'],
    queryFn: async () => {
      // First, get the qa_tester role ID
      const { data: roleData, error: roleError } = await supabase
        .from('product_roles')
        .select('id')
        .eq('code', 'qa_tester')
        .single();

      if (roleError) {
        console.error('Error fetching qa_tester role:', roleError);
        return [];
      }

      if (!roleData) {
        console.warn('qa_tester role not found in product_roles');
        return [];
      }

      // Get user IDs with qa_tester role
      const { data: userRoles, error: userRolesError } = await supabase
        .from('user_product_roles')
        .select('user_id')
        .eq('role_id', roleData.id);

      if (userRolesError) {
        console.error('Error fetching user product roles:', userRolesError);
        return [];
      }

      if (!userRoles || userRoles.length === 0) {
        return [];
      }

      const userIds = userRoles.map(ur => ur.user_id);

      // Fetch profile info for QA testers
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', userIds)
        .eq('approval_status', 'APPROVED')
        .order('full_name');

      if (profilesError) {
        console.error('Error fetching QA tester profiles:', profilesError);
        return [];
      }

      return (profiles || []) as QATester[];
    },
    staleTime: 1000 * 60, // 1 minute
  });
}
