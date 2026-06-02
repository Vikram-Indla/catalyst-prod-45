// ============================================================
// WORKSTREAM LEAD ACCESS HOOK
// Check if current user is a lead of a specific workstream
// Used for access control (e.g., task deletion)
// ============================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useUserRole } from '@/hooks/useUserRole';

interface WorkstreamLeadAccess {
  isLeadOf: (workstreamId: string | null | undefined) => boolean;
  isLeadOfAny: boolean;
  leadWorkstreamIds: string[];
  isLoading: boolean;
  canDeleteTask: (taskWorkstreamId: string | null | undefined) => boolean;
}

/**
 * Hook to check if the current user is a lead of workstreams.
 * Admins and super_admins bypass this check and have full access.
 */
export function useWorkstreamLeadAccess(): WorkstreamLeadAccess {
  const { user } = useAuth();
  const { isAdmin, isSuperAdmin, isProgramManager, isLoading: roleLoading } = useUserRole();

  // Check if user has elevated privileges (admin, super_admin, or program_manager)
  const hasElevatedAccess = isAdmin || isSuperAdmin || isProgramManager;

  const { data: leadWorkstreamIds = [], isLoading: membershipLoading } = useQuery({
    queryKey: ['workstream-lead-access', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('workstream_members')
        .select('workstream_id')
        .eq('user_id', user.id)
        .eq('role', 'lead');

      if (error) {
        console.error('Error fetching lead memberships:', error);
        return [];
      }

      return (data || []).map(m => m.workstream_id);
    },
    enabled: !!user?.id && !hasElevatedAccess,
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = roleLoading || membershipLoading;

  const isLeadOf = (workstreamId: string | null | undefined): boolean => {
    if (!workstreamId) return false;
    if (hasElevatedAccess) return true;
    return leadWorkstreamIds.includes(workstreamId);
  };

  const isLeadOfAny = hasElevatedAccess || leadWorkstreamIds.length > 0;

  /**
   * Check if user can delete a task.
   * - Admins/super_admins/program_managers can always delete
   * - Leads can delete tasks in their workstreams
   * - Tasks without a workstream can only be deleted by elevated users
   */
  const canDeleteTask = (taskWorkstreamId: string | null | undefined): boolean => {
    if (hasElevatedAccess) return true;
    if (!taskWorkstreamId) return false;
    return leadWorkstreamIds.includes(taskWorkstreamId);
  };

  return {
    isLeadOf,
    isLeadOfAny,
    leadWorkstreamIds,
    isLoading,
    canDeleteTask,
  };
}
