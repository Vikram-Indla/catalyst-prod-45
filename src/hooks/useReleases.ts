// =====================================================
// RELEASES HOOK
// React Query hooks for release operations
// =====================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Release {
  id: string;
  name: string;
  target_date: string | null;
  status: string;
  readiness_pct: number | null;
  notes: string | null;
  release_vehicle_id: string;
  created_at: string;
}

export const releaseKeys = {
  all: ['releases'] as const,
  forVehicle: (vehicleId: string) => [...releaseKeys.all, 'vehicle', vehicleId] as const,
};

// Get releases for release vehicle
export function useReleases(vehicleId: string) {
  return useQuery({
    queryKey: releaseKeys.forVehicle(vehicleId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('releases')
        .select('*')
        .eq('release_vehicle_id', vehicleId)
        .order('target_date', { ascending: true });

      if (error) throw error;
      return data as Release[];
    },
    enabled: !!vehicleId,
  });
}

// Create release
export function useCreateRelease() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: {
      release_vehicle_id: string;
      name: string;
      target_date?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('releases')
        .insert({
          release_vehicle_id: input.release_vehicle_id,
          name: input.name,
          target_date: input.target_date || null,
          notes: input.notes || null,
          status: 'planned',
          version: 'v1.0'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: releaseKeys.forVehicle(variables.release_vehicle_id) 
      });
      toast({
        title: 'Release Created',
        description: 'New release added.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
