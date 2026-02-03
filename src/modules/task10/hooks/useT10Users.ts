import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { T10User } from '../types';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function useT10Users(searchQuery: string = '') {
  return useQuery({
    queryKey: ['t10-users', searchQuery],
    queryFn: async (): Promise<T10User[]> => {
      let query = supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url')
        .order('full_name');
      
      if (searchQuery) {
        query = query.or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
      }
      
      const { data, error } = await query.limit(20);
      
      if (error) throw error;
      
      return (data || []).map(user => ({
        id: user.id,
        email: user.email || '',
        full_name: user.full_name || user.email || 'Unknown',
        avatar_url: user.avatar_url || undefined,
        initials: getInitials(user.full_name || user.email || 'U')
      }));
    },
    staleTime: 30000,
  });
}
