import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Check if current user is watching an incident
export function useIsWatching(incidentId: string) {
  return useQuery({
    queryKey: ['incident-watchers', incidentId, 'is-watching'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase
        .from('incident_watchers')
        .select('id')
        .eq('incident_id', incidentId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!incidentId,
  });
}

// Get watcher count for an incident
export function useWatcherCount(incidentId: string) {
  return useQuery({
    queryKey: ['incident-watchers', incidentId, 'count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('incident_watchers')
        .select('*', { count: 'exact', head: true })
        .eq('incident_id', incidentId);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!incidentId,
  });
}

// Toggle watch status
export function useToggleWatch(incidentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (isCurrentlyWatching: boolean) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (isCurrentlyWatching) {
        // Remove watch
        const { error } = await supabase
          .from('incident_watchers')
          .delete()
          .eq('incident_id', incidentId)
          .eq('user_id', user.id);

        if (error) throw error;
        return false;
      } else {
        // Add watch
        const { error } = await supabase
          .from('incident_watchers')
          .insert({ incident_id: incidentId, user_id: user.id });

        if (error) throw error;
        return true;
      }
    },
    onSuccess: (isNowWatching) => {
      queryClient.invalidateQueries({ queryKey: ['incident-watchers', incidentId] });
      toast.success(isNowWatching ? 'Now watching this incident' : 'Stopped watching this incident');
    },
    onError: () => {
      toast.error('Failed to update watch status');
    },
  });
}
