import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RoleCatalog {
  code: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface DevelopmentInventoryItem {
  id: string;
  name: string;
  role_code: string | null;
  project_id: string | null;
  start_date: string | null;
  end_date: string | null;
  capacity_percent: number;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  role_name?: string;
  project_name?: string;
}

export interface Project {
  id: string;
  name: string;
  key: string;
}

export function useRoleCatalog() {
  return useQuery({
    queryKey: ['role-catalog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_catalog')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return data as RoleCatalog[];
    },
  });
}

export function useProjectsForInventory() {
  return useQuery({
    queryKey: ['projects-for-inventory'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, key')
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data as Project[];
    },
  });
}

export function useDevelopmentInventory() {
  return useQuery({
    queryKey: ['development-inventory'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('development_inventory')
        .select(`
          *,
          role_catalog:role_code (name),
          projects:project_id (name)
        `)
        .order('name', { ascending: true });
      
      if (error) throw error;
      
      return (data || []).map((item: any) => ({
        ...item,
        role_name: item.role_catalog?.name || null,
        project_name: item.projects?.name || null,
      })) as DevelopmentInventoryItem[];
    },
  });
}

export function useCreateDevelopmentInventory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Omit<DevelopmentInventoryItem, 'id' | 'created_at' | 'updated_at' | 'role_name' | 'project_name'>) => {
      const { data: result, error } = await supabase
        .from('development_inventory')
        .insert(data)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['development-inventory'] });
    },
  });
}

export function useUpdateDevelopmentInventory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<DevelopmentInventoryItem> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('development_inventory')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['development-inventory'] });
    },
  });
}

export function useDeleteDevelopmentInventory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('development_inventory')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['development-inventory'] });
    },
  });
}
