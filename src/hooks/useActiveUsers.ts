import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useRef } from 'react';

export interface ActiveUser {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

// Global subscription manager to prevent multiple subscriptions
let globalSubscription: ReturnType<typeof supabase.channel> | null = null;
let subscriberCount = 0;

/**
 * Fetches active users (APPROVED status) from profiles table
 * with debounced real-time subscription for sync with admin/users
 * 
 * GUARDRAIL: This hook uses aggressive caching to prevent UI flickering:
 * - staleTime: 5 minutes - data is considered fresh for 5 minutes
 * - gcTime: 30 minutes - keep data in cache even when unmounted
 * - refetchOnMount/WindowFocus: false - don't refetch when component mounts or window focuses
 * - Debounced real-time updates - only sync every 30 seconds max
 */
export function useActiveUsers() {
  const queryClient = useQueryClient();
  const lastInvalidationRef = useRef<number>(0);
  const DEBOUNCE_MS = 30000; // 30 seconds debounce for real-time updates

  // Set up shared real-time subscription for profiles changes
  useEffect(() => {
    subscriberCount++;
    
    // Only create subscription if it doesn't exist
    if (!globalSubscription) {
      globalSubscription = supabase
        .channel('active-users-sync-global')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
          const now = Date.now();
          // Debounce invalidations to prevent rapid re-fetches
          if (now - lastInvalidationRef.current > DEBOUNCE_MS) {
            lastInvalidationRef.current = now;
            queryClient.invalidateQueries({ queryKey: ['active-users'] });
          }
        })
        .subscribe();
    }

    return () => {
      subscriberCount--;
      // Only remove channel when all subscribers are gone
      if (subscriberCount === 0 && globalSubscription) {
        supabase.removeChannel(globalSubscription);
        globalSubscription = null;
      }
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['active-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .eq('approval_status', 'APPROVED')
        .order('full_name');

      if (error) throw error;
      return (data || []) as ActiveUser[];
    },
    // GUARDRAIL: Aggressive caching to prevent flickering in user pickers
    staleTime: 5 * 60 * 1000, // 5 minutes - user list rarely changes
    gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache when unmounted
    refetchOnMount: false, // Don't refetch when component mounts if data exists
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: false, // Don't refetch on reconnect
  });
}
