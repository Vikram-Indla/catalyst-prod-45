// ============================================================
// SEARCH PROFILES HOOK
// Queries the profiles table to find users for workstream membership
// ============================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SearchableProfile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  avatar_color: string;
  job_title: string | null;
  initials: string;
}

function generateInitials(name: string | null): string {
  if (!name) return '??';
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Generate a deterministic color based on user id/name for avatar
function generateAvatarColor(id: string): string {
  const colors = [
    '#2563eb', '#7c3aed', '#db2777', '#dc2626', 
    '#ea580c', '#16a34a', '#0891b2', '#4f46e5'
  ];
  // Simple hash based on id
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash = hash & hash;
  }
  return colors[Math.abs(hash) % colors.length];
}

export function useSearchProfiles(
  search: string, 
  excludeIds: string[] = []
) {
  // Stabilize excludeIds for query key
  const excludeIdsKey = excludeIds.sort().join(',');
  
  return useQuery({
    queryKey: ['profiles', 'search', search, excludeIdsKey],
    queryFn: async (): Promise<SearchableProfile[]> => {
      // Don't search if less than 2 characters
      if (!search || search.trim().length < 2) {
        return [];
      }

      const searchTerm = search.trim().toLowerCase();

      // Query profiles table with ilike for case-insensitive search
      // Only query approved users
      let query = supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, vendor, role')
        .eq('approval_status', 'APPROVED')
        .or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
        .limit(15);

      // Exclude already added members
      if (excludeIds.length > 0) {
        query = query.not('id', 'in', `(${excludeIds.join(',')})`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error searching profiles:', error);
        throw error;
      }

      // Transform data to include initials and generated colors
      return (data || []).map(user => ({
        id: user.id,
        full_name: user.full_name || 'Unknown User',
        email: user.email || '',
        avatar_url: user.avatar_url,
        avatar_color: generateAvatarColor(user.id),
        job_title: user.vendor || user.role || null,
        initials: generateInitials(user.full_name),
      }));
    },
    enabled: search.trim().length >= 2,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}
