import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface T10Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  initials: string;
}

function getInitials(name: string | null | undefined): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function useProfiles(search?: string) {
  return useQuery({
    queryKey: ['t10-profiles', search],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .eq('status', 'active')
        .order('full_name', { ascending: true })
        .limit(50);

      if (search && search.trim()) {
        query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
      }

      const { data, error } = await query;

      if (error) throw new Error(error.message);

      return (data || []).map((p): T10Profile => ({
        id: p.id,
        full_name: p.full_name || p.email || 'Unknown',
        email: p.email || '',
        avatar_url: p.avatar_url || undefined,
        initials: getInitials(p.full_name),
      }));
    },
    staleTime: 5 * 60 * 1000,
  });
}
