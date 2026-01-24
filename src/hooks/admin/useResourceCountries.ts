import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { toast } from 'sonner';

export interface ResourceCountry {
  id: string;
  name: string;
  code: string | null;
  country_id: string | null;  // C01, C02 format
  flag_svg: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string | null;
  updated_at: string | null;
}

export function useResourceCountries() {
  const queryClient = useQueryClient();

  const { data: countries = [], isLoading } = useQuery({
    queryKey: ['resource-countries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resource_countries')
        .select('*')
        .order('sort_order');
      
      if (error) throw error;
      return data as ResourceCountry[];
    },
  });

  const { data: allCountries = [], isLoading: isLoadingAll } = useQuery({
    queryKey: ['resource-countries-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resource_countries')
        .select('*')
        .order('sort_order');
      
      if (error) throw error;
      return data as ResourceCountry[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel('resource-countries-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resource_countries' }, () => {
        queryClient.invalidateQueries({ queryKey: ['resource-countries'] });
        queryClient.invalidateQueries({ queryKey: ['resource-countries-all'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const createCountry = useMutation({
    mutationFn: async (input: { name: string; code?: string; flag_svg?: string }) => {
      const maxOrder = countries.length > 0 ? Math.max(...countries.map(c => c.sort_order)) : 0;
      const { data, error } = await supabase
        .from('resource_countries')
        .insert({
          name: input.name,
          code: input.code || null,
          flag_svg: input.flag_svg || null,
          sort_order: maxOrder + 1,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as ResourceCountry;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['resource-countries'] });
      queryClient.invalidateQueries({ queryKey: ['resource-countries-all'] });
      toast.success(`Country "${data.name}" created`);
    },
    onError: (error) => {
      toast.error(`Failed to create country: ${error.message}`);
    },
  });

  const updateCountry = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ResourceCountry> }) => {
      const { data, error } = await supabase
        .from('resource_countries')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as ResourceCountry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-countries'] });
      queryClient.invalidateQueries({ queryKey: ['resource-countries-all'] });
      toast.success('Country updated');
    },
    onError: (error) => {
      toast.error(`Failed to update country: ${error.message}`);
    },
  });

  const deleteCountry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('resource_countries')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-countries'] });
      queryClient.invalidateQueries({ queryKey: ['resource-countries-all'] });
      toast.success('Country deleted');
    },
    onError: (error) => {
      toast.error(`Failed to delete country: ${error.message}`);
    },
  });

  return {
    countries: countries.filter(c => c.is_active),
    allCountries,
    isLoading,
    isLoadingAll,
    createCountry,
    updateCountry,
    deleteCountry,
  };
}
