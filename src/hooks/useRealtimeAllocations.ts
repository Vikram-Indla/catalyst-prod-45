import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: any;
  old: any;
}

/**
 * Fetches user display name from profiles table
 */
async function fetchUserName(userId: string | null | undefined): Promise<string | null> {
  if (!userId) return null;
  
  try {
    const { data, error } = await (supabase as any)
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single();
    
    if (error || !data) return null;
    return data.full_name || null;
  } catch {
    return null;
  }
}

export function useRealtimeAllocations() {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    // Get current user for conflict detection
    let currentUserId: string | undefined;
    supabase.auth.getUser().then(({ data: { user } }) => {
      currentUserId = user?.id;
    });
    
    // Subscribe to resource_allocations table
    const channel = supabase
      .channel('allocations-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'resource_allocations',
        },
        async (payload: any) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;
          
          // Check if change was made by another user
          const modifierId = newRecord?.updated_by || newRecord?.created_by;
          const isExternalChange = modifierId && modifierId !== currentUserId;
          
          if (eventType === 'INSERT') {
            queryClient.setQueryData(['resource-allocations'], (old: any[]) => {
              if (!old) return [newRecord];
              if (old.some(a => a.id === newRecord.id)) return old;
              return [...old, newRecord];
            });
            
            if (isExternalChange) {
              const userName = await fetchUserName(modifierId);
              toast.info('New allocation added', {
                description: userName 
                  ? `An allocation was added by ${userName}`
                  : 'An allocation was added by another user',
              });
            }
            
          } else if (eventType === 'UPDATE') {
            queryClient.setQueryData(['resource-allocations'], (old: any[]) => {
              if (!old) return old;
              return old.map(alloc => 
                alloc.id === newRecord.id ? newRecord : alloc
              );
            });
            
            if (isExternalChange) {
              const userName = await fetchUserName(modifierId);
              toast.info('Allocation updated', {
                description: userName
                  ? `An allocation was modified by ${userName}`
                  : 'An allocation was modified by another user',
                action: {
                  label: 'View',
                  onClick: () => {
                    const element = document.querySelector(`[data-allocation-id="${newRecord.id}"]`);
                    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    element?.classList.add('ring-2', 'ring-amber-400');
                    setTimeout(() => {
                      element?.classList.remove('ring-2', 'ring-amber-400');
                    }, 2000);
                  },
                },
              });
            }
            
          } else if (eventType === 'DELETE') {
            queryClient.setQueryData(['resource-allocations'], (old: any[]) => {
              if (!old) return old;
              return old.filter(alloc => alloc.id !== oldRecord.id);
            });
            
            if (isExternalChange) {
              // For deletes, we might not have the user who deleted, so check old record
              const deleterId = oldRecord?.updated_by;
              const userName = await fetchUserName(deleterId);
              toast.info('Allocation removed', {
                description: userName
                  ? `An allocation was deleted by ${userName}`
                  : 'An allocation was deleted by another user',
              });
            }
          }
          
          // Invalidate related queries for bi-directional sync
          queryClient.invalidateQueries({ queryKey: ['capacity-summary'] });
          queryClient.invalidateQueries({ queryKey: ['capacity-planner-resources'] });
          // Also invalidate resource-utilization for all years
          queryClient.invalidateQueries({ queryKey: ['resource-utilization'] });
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
