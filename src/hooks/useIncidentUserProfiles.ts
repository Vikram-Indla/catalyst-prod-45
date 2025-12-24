import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import type { IncidentUserProfile } from '@/types/incident';

// Fetch all incident user profiles (for approver selection)
// With real-time sync when profiles table changes
export function useIncidentUserProfiles() {
  const queryClient = useQueryClient();

  // Set up real-time subscription to sync with profiles changes
  useEffect(() => {
    const channel = supabase
      .channel('incident-user-profiles-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['incident_user_profiles'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'incident_user_profiles',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['incident_user_profiles'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['incident_user_profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incident_user_profiles')
        .select('*')
        .order('full_name');

      if (error) throw error;
      return data as IncidentUserProfile[];
    },
  });
}

// Fetch users who can be committee approvers (usually users with specific roles)
// With real-time sync
export function useAvailableApprovers() {
  const queryClient = useQueryClient();

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('available-approvers-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['available_approvers'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'incident_user_profiles',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['available_approvers'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['available_approvers'],
    queryFn: async () => {
      // Fetch users who can be approvers - typically all active users
      // In a real app, this might filter by role or permission
      const { data, error } = await supabase
        .from('incident_user_profiles')
        .select('*')
        .order('full_name');

      if (error) throw error;
      return data as IncidentUserProfile[];
    },
  });
}
