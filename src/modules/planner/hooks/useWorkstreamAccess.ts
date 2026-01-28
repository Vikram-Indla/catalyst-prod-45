/**
 * Workstream Access Control Hook - Planner V9
 * Checks if user can access all workstreams or specific ones
 * Uses security definer functions for consistent access checks
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useUserRole } from '@/hooks/useUserRole';

/**
 * Hook to check if the current user can access all workstreams
 * (i.e., is admin or super_admin)
 */
export function useCanAccessAllWorkstreams() {
  const { user } = useAuth();
  const { isAdmin, isSuperAdmin } = useUserRole();
  
  // For performance, check client-side first
  // Admin/super_admin always have access
  const hasFullAccess = isAdmin || isSuperAdmin;
  
  return {
    canAccessAll: hasFullAccess,
    isLoading: false,
  };
}

/**
 * Hook to get accessible workstream IDs for the current user
 * Returns all workstreams if user is admin/super_admin
 * Otherwise returns only workstreams they are members of
 */
export function useAccessibleWorkstreams() {
  const { user } = useAuth();
  const { isAdmin, isSuperAdmin, isLoading: roleLoading } = useUserRole();
  
  const canAccessAll = isAdmin || isSuperAdmin;

  const { data, isLoading, error } = useQuery({
    queryKey: ['accessible-workstreams', user?.id, canAccessAll],
    queryFn: async () => {
      if (!user) return [];
      
      if (canAccessAll) {
        // Admin/super_admin: get all workstreams
        const { data: workstreams, error } = await supabase
          .from('planner_workstreams')
          .select('id, name, slug, color')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });
        
        if (error) throw error;
        return workstreams || [];
      }
      
      // Regular user: get only workstreams they are members of
      const { data: memberships, error } = await supabase
        .from('workstream_members')
        .select(`
          workstream_id,
          workstream:planner_workstreams(id, name, slug, color, is_active)
        `)
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      // Filter to only active workstreams and extract details
      return (memberships || [])
        .filter(m => (m.workstream as any)?.is_active)
        .map(m => m.workstream as { id: string; name: string; slug: string; color: string });
    },
    enabled: !!user && !roleLoading,
    staleTime: 60000, // 1 minute
  });

  return {
    workstreams: data || [],
    workstreamIds: (data || []).map(w => w.id),
    canAccessAll,
    isLoading: isLoading || roleLoading,
    error,
  };
}

/**
 * Hook to check if user is a member of a specific workstream
 */
export function useIsWorkstreamMember(workstreamId: string | null) {
  const { user } = useAuth();
  const { isAdmin, isSuperAdmin } = useUserRole();

  const { data, isLoading } = useQuery({
    queryKey: ['workstream-membership', user?.id, workstreamId],
    queryFn: async () => {
      if (!user || !workstreamId) return false;
      
      // Admin/super_admin always have access
      if (isAdmin || isSuperAdmin) return true;
      
      const { data, error } = await supabase
        .from('workstream_members')
        .select('id')
        .eq('workstream_id', workstreamId)
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) {
        console.error('Error checking workstream membership:', error);
        return false;
      }
      
      return !!data;
    },
    enabled: !!user && !!workstreamId,
    staleTime: 60000,
  });

  return {
    isMember: data ?? false,
    isLoading,
  };
}
