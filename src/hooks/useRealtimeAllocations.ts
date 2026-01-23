import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: any;
  old: any;
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
        (payload: any) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;
          
          // Check if change was made by another user
          const isExternalChange = newRecord?.updated_by !== currentUserId;
          
          if (eventType === 'INSERT') {
            queryClient.setQueryData(['resource-allocations'], (old: any[]) => {
              if (!old) return [newRecord];
              if (old.some(a => a.id === newRecord.id)) return old;
              return [...old, newRecord];
            });
            
            if (isExternalChange) {
              toast.info('New allocation added', {
                description: 'An allocation was added by another user',
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
              toast.info('Allocation updated', {
                description: 'An allocation was modified by another user',
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
              toast.info('Allocation removed', {
                description: 'An allocation was deleted by another user',
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
