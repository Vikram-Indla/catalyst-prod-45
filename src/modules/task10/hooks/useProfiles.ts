// ═══════════════════════════════════════════════════════════════════════════
// PROFILES HOOK FOR TASK¹⁰
// Fetch profiles for assignee dropdown
// ═══════════════════════════════════════════════════════════════════════════

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProfileOption {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

// Query keys
export const profilesKeys = {
  all: ['profiles'] as const,
  list: () => [...profilesKeys.all, 'list'] as const,
};

/**
 * Fetch all profiles for assignee dropdown
 */
export function useProfiles() {
  return useQuery({
    queryKey: profilesKeys.list(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .order('full_name', { ascending: true });

      if (error) throw new Error(error.message);
      return (data || []) as ProfileOption[];
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}

export default useProfiles;
