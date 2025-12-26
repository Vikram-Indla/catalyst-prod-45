import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EpicStatus {
  id: string;
  value: string;
  label: string;
  sort_order: number;
  is_active: boolean;
  color: string | null;
  created_at: string;
  updated_at: string;
}

// Fetch all epic statuses (including inactive for admin) with real-time sync
export function useEpicStatuses() {
  const queryClient = useQueryClient();

  // Subscribe to real-time changes
  useEffect(() => {
    const channel = supabase
      .channel('epic-statuses-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'epic_statuses',
        },
        () => {
          // Invalidate cache on any change
          queryClient.invalidateQueries({ queryKey: ['epic-statuses'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['epic-statuses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epic_statuses')
        .select('*')
        .order('sort_order');

      if (error) throw error;
      return data as EpicStatus[];
    },
  });
}

// Fetch only active epic statuses (for dropdowns)
export function useActiveEpicStatuses() {
  return useQuery({
    queryKey: ['epic-statuses', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epic_statuses')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      return data as EpicStatus[];
    },
  });
}

// Get epic status options for dropdowns
export function useEpicStatusOptions() {
  const { data: statuses = [], isLoading } = useActiveEpicStatuses();
  
  const options = statuses.map(status => ({
    value: status.value,
    label: status.label,
    color: status.color,
  }));

  return { options, isLoading };
}

// Get epic status info helper
export function useGetEpicStatusInfo() {
  const { data: statuses = [] } = useActiveEpicStatuses();
  
  return (value: string | null | undefined) => {
    if (!value) return { label: 'Unknown', color: null };
    const normalized = value.toLowerCase();
    const status = statuses.find(s => s.value.toLowerCase() === normalized);
    return status 
      ? { label: status.label, color: status.color }
      : { label: value.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()), color: null };
  };
}

// Create epic status
export function useCreateEpicStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { value: string; label: string; sort_order?: number }) => {
      const { data: result, error } = await supabase
        .from('epic_statuses')
        .insert({
          value: data.value.toLowerCase().replace(/\s+/g, '_'),
          label: data.label,
          sort_order: data.sort_order ?? 0,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epic-statuses'] });
      toast.success('Epic status added');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add epic status: ${error.message}`);
    },
  });
}

// Update epic status
export function useUpdateEpicStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<EpicStatus> & { id: string }) => {
      const { error } = await supabase
        .from('epic_statuses')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epic-statuses'] });
      toast.success('Epic status updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update epic status: ${error.message}`);
    },
  });
}

// Toggle active status
export function useToggleEpicStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('epic_statuses')
        .update({ is_active: !is_active })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epic-statuses'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });
}

// Delete epic status
export function useDeleteEpicStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('epic_statuses')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epic-statuses'] });
      toast.success('Epic status deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete epic status: ${error.message}`);
    },
  });
}

// Check for linked epics before deleting
export function useLinkedEpics(statusValue: string | null) {
  return useQuery({
    queryKey: ['linked-epics', statusValue],
    queryFn: async () => {
      if (!statusValue) return { count: 0, epics: [] as { id: string; epic_key: string | null; title: string }[] };
      
      const { data, error, count } = await supabase
        .from('epics')
        .select('id, epic_key, name', { count: 'exact' })
        .eq('status', statusValue as any)
        .is('deleted_at', null)
        .limit(50);

      if (error) throw error;
      // Map name to title for display
      const epics = (data || []).map(e => ({
        id: e.id,
        epic_key: e.epic_key,
        title: e.name || '',
      }));
      return { count: count || 0, epics };
    },
    enabled: !!statusValue,
  });
}

// Reassign epics to a new status
export function useReassignEpics() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ fromStatus, toStatus }: { fromStatus: string; toStatus: string }) => {
      const { error } = await supabase
        .from('epics')
        .update({ status: toStatus as any })
        .eq('status', fromStatus as any)
        .is('deleted_at', null);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linked-epics'] });
      queryClient.invalidateQueries({ queryKey: ['epics'] });
      toast.success('Epics reassigned successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to reassign epics: ${error.message}`);
    },
  });
}
