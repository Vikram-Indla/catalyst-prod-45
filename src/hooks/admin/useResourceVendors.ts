import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { toast } from 'sonner';

export interface ResourceVendor {
  id: string;
  name: string;
  description: string | null;
  vendor_code: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string | null;
  updated_at: string | null;
}

export function useResourceVendors() {
  const queryClient = useQueryClient();

  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ['resource-vendors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resource_vendors')
        .select('*')
        .order('sort_order');
      
      if (error) throw error;
      return data as ResourceVendor[];
    },
  });

  const { data: allVendors = [], isLoading: isLoadingAll } = useQuery({
    queryKey: ['resource-vendors-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resource_vendors')
        .select('*')
        .order('sort_order');
      
      if (error) throw error;
      return data as ResourceVendor[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel('resource-vendors-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resource_vendors' }, () => {
        queryClient.invalidateQueries({ queryKey: ['resource-vendors'] });
        queryClient.invalidateQueries({ queryKey: ['resource-vendors-all'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const createVendor = useMutation({
    mutationFn: async (input: { name: string; description?: string }) => {
      const maxOrder = vendors.length > 0 ? Math.max(...vendors.map(v => v.sort_order)) : 0;
      const { data, error } = await supabase
        .from('resource_vendors')
        .insert({
          name: input.name,
          description: input.description || null,
          sort_order: maxOrder + 1,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as ResourceVendor;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['resource-vendors'] });
      queryClient.invalidateQueries({ queryKey: ['resource-vendors-all'] });
      toast.success(`Vendor "${data.name}" created`);
    },
    onError: (error) => {
      toast.error(`Failed to create vendor: ${error.message}`);
    },
  });

  const updateVendor = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ResourceVendor> }) => {
      const { data, error } = await supabase
        .from('resource_vendors')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as ResourceVendor;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-vendors'] });
      queryClient.invalidateQueries({ queryKey: ['resource-vendors-all'] });
      toast.success('Vendor updated');
    },
    onError: (error) => {
      toast.error(`Failed to update vendor: ${error.message}`);
    },
  });

  const deleteVendor = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('resource_vendors')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-vendors'] });
      queryClient.invalidateQueries({ queryKey: ['resource-vendors-all'] });
      toast.success('Vendor deleted');
    },
    onError: (error) => {
      toast.error(`Failed to delete vendor: ${error.message}`);
    },
  });

  return {
    vendors: vendors.filter(v => v.is_active),
    allVendors,
    isLoading,
    isLoadingAll,
    createVendor,
    updateVendor,
    deleteVendor,
  };
}
