// ============================================================
// MENTIONABLE USERS HOOK
// Fetches users from resource_inventory for @mention functionality
// ============================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MentionableUser {
  id: string;
  profile_id: string | null;
  name: string;
  email: string | null;
  role: string | null;
  avatar_url: string | null;
  initials: string;
}

export function useMentionableUsers() {
  return useQuery({
    queryKey: ['mentionable-users'],
    queryFn: async (): Promise<MentionableUser[]> => {
      // Fetch active resources from resource_inventory with profile data
      const { data: resources, error } = await supabase
        .from('resource_inventory')
        .select(`
          id,
          profile_id,
          name,
          email,
          role_name
        `)
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error fetching mentionable users:', error);
        return [];
      }

      // Collect profile IDs to fetch avatar and email fallback
      const profileIds = (resources || [])
        .map(r => r.profile_id)
        .filter((id): id is string => !!id);

      const profileDataMap = new Map<string, { email: string | null; avatar_url: string | null }>();
      
      if (profileIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, avatar_url')
          .in('id', profileIds);

        for (const p of profiles || []) {
          profileDataMap.set(p.id, { 
            email: p.email || null, 
            avatar_url: p.avatar_url || null 
          });
        }
      }

      return (resources || []).map((r): MentionableUser => {
        const profileData = r.profile_id ? profileDataMap.get(r.profile_id) : null;
        const resolvedEmail = r.email || profileData?.email || null;
        
        return {
          id: r.id,
          profile_id: r.profile_id,
          name: r.name || 'Unknown',
          email: resolvedEmail,
          role: r.role_name || null,
          avatar_url: profileData?.avatar_url || null,
          initials: getInitials(r.name || ''),
        };
      });
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??';
}

// Helper to extract @mentions from text
export function extractMentions(text: string): string[] {
  const mentionRegex = /@([a-zA-Z0-9._-]+)/g;
  const matches: string[] = [];
  let match;
  while ((match = mentionRegex.exec(text)) !== null) {
    matches.push(match[1]);
  }
  return matches;
}
