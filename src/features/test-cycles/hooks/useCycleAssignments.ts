// ============================================================================
// HOOK: useCycleAssignments - Tester assignment operations
// ============================================================================

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { CycleRole } from '../types/cycle-config';

interface RpcResponse {
  success: boolean;
  assignment_id?: string;
  error?: string;
}

interface AvailableUser {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

export function useCycleAssignments(cycleId: string | undefined) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    if (cycleId) {
      queryClient.invalidateQueries({ queryKey: ['cycle-details', cycleId] });
    }
  };

  // Fetch available users (profiles)
  const availableUsersQuery = useQuery({
    queryKey: ['available-users'],
    queryFn: async (): Promise<AvailableUser[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email')
        .order('full_name', { ascending: true })
        .limit(100);

      if (error) throw error;
      return data || [];
    },
    staleTime: 60000,
  });

  const assignTester = useMutation({
    mutationFn: async ({
      userId,
      role = 'tester',
      notes,
    }: {
      userId: string;
      role?: CycleRole;
      notes?: string;
    }) => {
      if (!cycleId) throw new Error('No cycle ID');

      const { data, error } = await supabase.rpc('tm_assign_tester_to_cycle', {
        p_cycle_id: cycleId,
        p_user_id: userId,
        p_role: role,
        p_notes: notes || null,
      });

      if (error) throw error;

      const response = data as unknown as RpcResponse;
      if (!response?.success) {
        throw new Error(response?.error || 'Failed to assign tester');
      }

      return response.assignment_id;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Tester assigned');
    },
    onError: (error: Error) => {
      toast.error(`Failed to assign tester: ${error.message}`);
    },
  });

  const removeTester = useMutation({
    mutationFn: async (userId: string) => {
      if (!cycleId) throw new Error('No cycle ID');

      const { data, error } = await supabase.rpc('tm_remove_tester_from_cycle', {
        p_cycle_id: cycleId,
        p_user_id: userId,
      });

      if (error) throw error;

      const response = data as unknown as RpcResponse;
      if (!response?.success) {
        throw new Error(response?.error || 'Failed to remove tester');
      }
    },
    onSuccess: () => {
      invalidate();
      toast.success('Tester removed');
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove tester: ${error.message}`);
    },
  });

  const updateTesterRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: CycleRole }) => {
      if (!cycleId) throw new Error('No cycle ID');

      // Re-assign with new role (upsert)
      const { data, error } = await supabase.rpc('tm_assign_tester_to_cycle', {
        p_cycle_id: cycleId,
        p_user_id: userId,
        p_role: role,
      });

      if (error) throw error;

      const response = data as unknown as RpcResponse;
      if (!response?.success) {
        throw new Error(response?.error || 'Failed to update role');
      }
    },
    onSuccess: () => {
      invalidate();
      toast.success('Role updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update role: ${error.message}`);
    },
  });

  return {
    availableUsers: availableUsersQuery.data || [],
    isLoadingUsers: availableUsersQuery.isLoading,
    assignTester,
    removeTester,
    updateTesterRole,
    isLoading:
      assignTester.isPending || removeTester.isPending || updateTesterRole.isPending,
  };
}
