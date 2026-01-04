/**
 * Hook to fetch unique roles from the database with real-time subscription
 * Used for role dropdown in Find Available Resources panel
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RoleOption {
  name: string;
  displayName: string;
  count: number;
}

/**
 * Formats a database role name to human-readable format
 * e.g., "program_manager" -> "Program Manager"
 */
function formatRoleName(role: string): string {
  // If it already looks properly formatted (has space or first letter is uppercase with no underscores)
  if (!role.includes('_') && role.charAt(0) === role.charAt(0).toUpperCase()) {
    return role;
  }
  
  return role
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

async function fetchResourceRoles(): Promise<RoleOption[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .not('role', 'is', null)
    .order('role');

  if (error) {
    console.error('Error fetching roles:', error);
    throw error;
  }

  // Build unique role counts
  const roleMap = new Map<string, number>();
  data?.forEach(item => {
    if (item.role) {
      roleMap.set(item.role, (roleMap.get(item.role) || 0) + 1);
    }
  });

  return Array.from(roleMap.entries())
    .map(([name, count]) => ({ 
      name,
      displayName: formatRoleName(name),
      count 
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export function useResourceRoles() {
  const queryClient = useQueryClient();

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('profiles-role-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'profiles',
        },
        () => {
          // Invalidate and refetch roles when profiles change
          queryClient.invalidateQueries({ queryKey: ['resource-roles'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['resource-roles'],
    queryFn: fetchResourceRoles,
    staleTime: 30 * 1000, // 30 seconds (reduced since we have realtime)
  });
}
