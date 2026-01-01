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
  role_name: string | null;
  default_capacity_percent: number;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  department?: string | null;
  department_id?: string | null;
}

export function useResourceRoles() {
  return useQuery({
    queryKey: ['resource-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_catalog')
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
      const { data, error } = await supabase
        .from('resource_inventory')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      
      // Fetch departments and profiles to map department names
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, department_id');
      
      const { data: departments } = await supabase
        .from('capacity_departments')
        .select('id, name');
      
      const deptMap = new Map(departments?.map(d => [d.id, d.name]) || []);
      const profileDeptMap = new Map(profiles?.map(p => [p.id, p.department_id]) || []);
      
      return (data || []).map(item => {
        const deptId = profileDeptMap.get(item.profile_id);
        return {
          ...item,
          department_id: deptId || null,
          department: deptId ? deptMap.get(deptId) || null : null,
        };
      }) as ResourceInventoryItem[];
    },
  });
}

export function useCreateResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      role_code?: string | null;
      role_name?: string | null;
      default_capacity_percent?: number;
      is_active?: boolean;
      notes?: string | null;
    }) => {
      const { data: result, error } = await supabase
        .from('resource_inventory')
        .insert({
          name: data.name,
          role_code: data.role_code || null,
          role_name: data.role_name || null,
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
      role_name?: string | null;
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
