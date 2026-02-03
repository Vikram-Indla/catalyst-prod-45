// ═══════════════════════════════════════════════════════════════════════════════
// HOOK: useT10Users
// Purpose: Fetch users from profiles table for assignee dropdowns
// ═══════════════════════════════════════════════════════════════════════════════

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { T10User } from '../types';

// Query keys
export const t10UserKeys = {
  all: ['t10-users'] as const,
  users: () => [...t10UserKeys.all, 'list'] as const,
  search: (query: string) => [...t10UserKeys.users(), { query }] as const,
};

// Helper to get initials from name
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Fetch all users for assignee dropdown
 * Queries the profiles table
 */
export function useT10Users(searchQuery: string = '') {
  return useQuery({
    queryKey: searchQuery ? t10UserKeys.search(searchQuery) : t10UserKeys.users(),
    queryFn: async (): Promise<T10User[]> => {
      let query = supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url')
        .order('full_name', { ascending: true });

      // Apply search filter
      if (searchQuery && searchQuery.length > 0) {
        query = query.or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query.limit(20);

      if (error) {
        console.error('Error fetching users:', error);
        throw new Error(error.message);
      }

      // Log for Stage D verification
      console.log('[T10] Users fetched:', data?.length, searchQuery ? `(search: ${searchQuery})` : '');

      return (data || []).map(user => ({
        id: user.id,
        email: user.email || '',
        full_name: user.full_name || user.email || 'Unknown',
        avatar_url: user.avatar_url || null,
        initials: getInitials(user.full_name || user.email || 'U')
      }));
    },
    staleTime: 30000,
  });
}

/**
 * Fetch single user by ID
 */
export function useT10User(userId: string | null) {
  return useQuery({
    queryKey: ['t10-user', userId],
    queryFn: async (): Promise<T10User | null> => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user:', error);
        throw new Error(error.message);
      }

      return {
        id: data.id,
        email: data.email || '',
        full_name: data.full_name || data.email || 'Unknown',
        avatar_url: data.avatar_url || null,
        initials: getInitials(data.full_name || data.email || 'U')
      };
    },
    enabled: !!userId,
  });
}
