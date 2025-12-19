import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { IncidentUserProfile } from '@/types/incident';

// Fetch all incident user profiles (for approver selection)
export function useIncidentUserProfiles() {
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
export function useAvailableApprovers() {
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
