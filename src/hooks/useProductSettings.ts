import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Types
export interface BusinessLine {
  id: string;
  key: string;
  name: string;
  description: string | null;
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DemandTabConfig {
  id: string;
  business_line_id: string | null;
  tab_key: string;
  display_name: string;
  is_active: boolean;
  is_required: boolean;
  position: number;
}

export interface DemandSectionConfig {
  id: string;
  business_line_id: string | null;
  tab_key: string;
  section_key: string;
  name: string;
  is_visible: boolean;
  is_required: boolean;
  collapsed_by_default: boolean;
  position: number;
}

export interface DemandFieldConfig {
  id: string;
  business_line_id: string | null;
  field_key: string;
  label: string;
  tab_key: string;
  section_key: string;
  is_active: boolean;
  is_required: boolean;
  is_system: boolean;
  rules_json: Record<string, unknown> | null;
  position: number;
}

export interface ProductStatusConfig {
  id: string;
  status_key: string;
  name: string;
  category: 'todo' | 'inprogress' | 'done' | 'other';
  is_default: boolean;
  position: number;
  color: string | null;
}

export interface ProductViewConfig {
  id: string;
  business_line_id: string | null;
  view_type: 'list' | 'kanban';
  column_key: string;
  display_name: string;
  is_visible: boolean;
  position: number;
  is_default_sort: boolean;
  sort_direction: 'asc' | 'desc' | null;
}

// Hooks
export function useBusinessLines() {
  return useQuery({
    queryKey: ['business-lines'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_lines')
        .select('*')
        .order('sort_order');
      
      if (error) throw error;
      return data as BusinessLine[];
    },
  });
}

export function useCreateBusinessLine() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (businessLine: Omit<BusinessLine, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('business_lines')
        .insert(businessLine)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-lines'] });
      toast.success('Business line created');
    },
    onError: (error) => {
      console.error('Error creating business line:', error);
      toast.error('Failed to create business line');
    },
  });
}

export function useUpdateBusinessLine() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BusinessLine> & { id: string }) => {
      const { data, error } = await supabase
        .from('business_lines')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-lines'] });
    },
    onError: (error) => {
      console.error('Error updating business line:', error);
      toast.error('Failed to update business line');
    },
  });
}

export function useDeleteBusinessLine() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('business_lines')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-lines'] });
      toast.success('Business line deleted');
    },
    onError: (error) => {
      console.error('Error deleting business line:', error);
      toast.error('Failed to delete business line');
    },
  });
}

export function useProductStatusConfigs() {
  return useQuery({
    queryKey: ['product-status-configs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_status_configs')
        .select('*')
        .order('position');
      
      if (error) throw error;
      return data as ProductStatusConfig[];
    },
  });
}

export function useUpdateProductStatusConfig() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ProductStatusConfig> & { id: string }) => {
      const { data, error } = await supabase
        .from('product_status_configs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-status-configs'] });
    },
  });
}

export function useCreateProductStatusConfig() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (status: Omit<ProductStatusConfig, 'id'>) => {
      const { data, error } = await supabase
        .from('product_status_configs')
        .insert(status)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-status-configs'] });
      toast.success('Status created');
    },
  });
}

export function useDeleteProductStatusConfig() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('product_status_configs')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-status-configs'] });
      toast.success('Status deleted');
    },
  });
}

export function useProductViewConfigs(businessLineId?: string | null, viewType?: 'list' | 'kanban') {
  return useQuery({
    queryKey: ['product-view-configs', businessLineId, viewType],
    queryFn: async () => {
      let query = supabase
        .from('product_view_configs')
        .select('*')
        .order('position');
      
      if (businessLineId) {
        query = query.eq('business_line_id', businessLineId);
      }
      if (viewType) {
        query = query.eq('view_type', viewType);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as ProductViewConfig[];
    },
  });
}
