import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { toast } from 'sonner';

export interface ResourceLocation {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string | null;
  updated_at: string | null;
}

export function useResourceLocations() {
  const queryClient = useQueryClient();

  const { data: locations = [], isLoading } = useQuery({
    queryKey: ['resource-locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resource_locations')
        .select('*')
        .order('sort_order');
      
      if (error) throw error;
      return data as ResourceLocation[];
    },
  });

  const { data: allLocations = [], isLoading: isLoadingAll } = useQuery({
    queryKey: ['resource-locations-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resource_locations')
        .select('*')
        .order('sort_order');
      
      if (error) throw error;
      return data as ResourceLocation[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel('resource-locations-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resource_locations' }, () => {
        queryClient.invalidateQueries({ queryKey: ['resource-locations'] });
        queryClient.invalidateQueries({ queryKey: ['resource-locations-all'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const createLocation = useMutation({
    mutationFn: async (input: { name: string; description?: string }) => {
      const maxOrder = locations.length > 0 ? Math.max(...locations.map(l => l.sort_order)) : 0;
      const { data, error } = await supabase
        .from('resource_locations')
        .insert({
          name: input.name,
          description: input.description || null,
          sort_order: maxOrder + 1,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as ResourceLocation;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['resource-locations'] });
      queryClient.invalidateQueries({ queryKey: ['resource-locations-all'] });
      toast.success(`Location "${data.name}" created`);
    },
    onError: (error) => {
      toast.error(`Failed to create location: ${error.message}`);
    },
  });

  const updateLocation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ResourceLocation> }) => {
      const { data, error } = await supabase
        .from('resource_locations')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as ResourceLocation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-locations'] });
      queryClient.invalidateQueries({ queryKey: ['resource-locations-all'] });
      toast.success('Location updated');
    },
    onError: (error) => {
      toast.error(`Failed to update location: ${error.message}`);
    },
  });

  const deleteLocation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('resource_locations')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-locations'] });
      queryClient.invalidateQueries({ queryKey: ['resource-locations-all'] });
      toast.success('Location deleted');
    },
    onError: (error) => {
      toast.error(`Failed to delete location: ${error.message}`);
    },
  });

  return {
    locations: locations.filter(l => l.is_active),
    allLocations,
    isLoading,
    isLoadingAll,
    createLocation,
    updateLocation,
    deleteLocation,
  };
}
