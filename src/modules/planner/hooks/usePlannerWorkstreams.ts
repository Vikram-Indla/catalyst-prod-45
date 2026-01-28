// ============================================================
// PLANNER WORKSTREAMS HOOK
// Fetches workstreams from planner_workstreams with task counts
// Respects workstream access control - admins see all, others see only their memberships
// ============================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useUserRole } from '@/hooks/useUserRole';
import type { PlannerTeam } from '../types';

export function usePlannerWorkstreams() {
  const { user } = useAuth();
  const { isAdmin, isSuperAdmin, isLoading: roleLoading } = useUserRole();
  
  const canAccessAll = isAdmin || isSuperAdmin;

  return useQuery({
    queryKey: ['planner-workstreams', user?.id, canAccessAll],
    queryFn: async () => {
      if (!user) return [];

      let workstreamsData: { id: string; name: string; color: string; slug: string | null }[] = [];

      if (canAccessAll) {
        // Admin/super_admin: fetch all active workstreams
        const { data, error } = await supabase
          .from('planner_workstreams')
          .select('id, name, color, slug')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });

        if (error) {
          console.error('Error fetching planner workstreams:', error);
          return [];
        }
        workstreamsData = data || [];
      } else {
        // Regular user: fetch only workstreams they are members of
        const { data: memberships, error } = await supabase
          .from('workstream_members')
          .select(`
            workstream_id,
            workstream:planner_workstreams(id, name, color, slug, is_active)
          `)
          .eq('user_id', user.id);

        if (error) {
          console.error('Error fetching workstream memberships:', error);
          return [];
        }

        // Filter to only active workstreams
        workstreamsData = (memberships || [])
          .filter(m => (m.workstream as any)?.is_active)
          .map(m => m.workstream as { id: string; name: string; color: string; slug: string | null });
      }

      // Map to PlannerTeam format
      const workstreams: PlannerTeam[] = workstreamsData.map(ws => ({
        id: ws.id,
        name: ws.name,
        shortName: ws.name.slice(0, 3).toUpperCase(),
        slug: ws.slug || ws.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        description: undefined,
        memberCount: 0, // Will be populated when member counts are needed
        color: ws.color || '#10b981',
        leadId: undefined,
      }));

      return workstreams;
    },
    enabled: !!user && !roleLoading,
  });
}

// Alias for backward compatibility
export const usePlannerTeams = usePlannerWorkstreams;
