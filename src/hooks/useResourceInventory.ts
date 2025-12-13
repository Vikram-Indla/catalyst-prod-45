import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ResourceRole {
  code: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface ResourceInventoryItem {
  id: string;
  name: string;
  role_code: string | null;
  default_capacity_percent: number;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined field
  role_name?: string;
}

export function useResourceRoles() {
  return useQuery({
    queryKey: ['resource-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resource_roles')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as ResourceRole[];
    },
  });
}

export function useResourceInventory() {
  return useQuery({
    queryKey: ['resource-inventory'],
    queryFn: async () => {
      // Fetch inventory with role join
      const { data: inventory, error: invError } = await supabase
        .from('resource_inventory')
        .select('*')
        .order('name', { ascending: true });

      if (invError) throw invError;

      // Fetch all roles for name mapping
      const { data: roles, error: rolesError } = await supabase
        .from('resource_roles')
        .select('code, name');

      if (rolesError) throw rolesError;

      const roleMap = new Map(roles?.map(r => [r.code, r.name]) || []);

      return (inventory || []).map(item => ({
        ...item,
        role_name: item.role_code ? roleMap.get(item.role_code) || item.role_code : undefined,
      })) as ResourceInventoryItem[];
    },
  });
}

export function useCreateResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      role_code?: string | null;
      default_capacity_percent?: number;
      is_active?: boolean;
      notes?: string | null;
    }) => {
      const { data: result, error } = await supabase
        .from('resource_inventory')
        .insert({
          name: data.name,
          role_code: data.role_code || null,
          default_capacity_percent: data.default_capacity_percent ?? 100,
          is_active: data.is_active ?? true,
          notes: data.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      toast.success('Resource added');
      queryClient.invalidateQueries({ queryKey: ['resource-inventory'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to add resource: ${error.message}`);
    },
  });
}

export function useUpdateResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      name?: string;
      role_code?: string | null;
      default_capacity_percent?: number;
      is_active?: boolean;
      notes?: string | null;
    }) => {
      const { data: result, error } = await supabase
        .from('resource_inventory')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      toast.success('Resource updated');
      queryClient.invalidateQueries({ queryKey: ['resource-inventory'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update resource: ${error.message}`);
    },
  });
}

export function useDeleteResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('resource_inventory')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Resource deleted');
      queryClient.invalidateQueries({ queryKey: ['resource-inventory'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete resource: ${error.message}`);
    },
  });
}
