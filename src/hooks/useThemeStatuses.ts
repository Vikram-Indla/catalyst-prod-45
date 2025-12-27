import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ThemeStatus {
  id: string;
  value: string;
  label: string;
  color: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Fetch all theme statuses (including inactive for admin)
export function useThemeStatuses() {
  return useQuery({
    queryKey: ['theme-statuses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('theme_statuses')
        .select('*')
        .order('sort_order');

      if (error) throw error;
      return data as ThemeStatus[];
    },
  });
}

// Fetch only active theme statuses (for dropdowns)
export function useActiveThemeStatuses() {
  return useQuery({
    queryKey: ['theme-statuses', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('theme_statuses')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      return data as ThemeStatus[];
    },
  });
}

// Get theme status options for dropdowns
export function useThemeStatusOptions() {
  const { data: statuses = [], isLoading } = useActiveThemeStatuses();
  
  const options = statuses.map(status => ({
    value: status.value,
    label: status.label,
  }));

  return { options, isLoading };
}

// Get theme status info helper
export function useGetThemeStatusInfo() {
  const { data: statuses = [] } = useActiveThemeStatuses();
  
  return (value: string | null | undefined) => {
    if (!value) return { label: 'Unknown', color: 'neutral' };
    const normalized = value.toLowerCase();
    const status = statuses.find(s => s.value.toLowerCase() === normalized);
    return status 
      ? { label: status.label, color: status.color || 'neutral' }
      : { label: value.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()), color: 'neutral' };
  };
}

// Create theme status
export function useCreateThemeStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { value: string; label: string; sort_order?: number }) => {
      const { data: result, error } = await supabase
        .from('theme_statuses')
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
      queryClient.invalidateQueries({ queryKey: ['theme-statuses'] });
      toast.success('Theme status added');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add theme status: ${error.message}`);
    },
  });
}

// Update theme status
export function useUpdateThemeStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<ThemeStatus> & { id: string }) => {
      const { error } = await supabase
        .from('theme_statuses')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['theme-statuses'] });
      toast.success('Theme status updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update theme status: ${error.message}`);
    },
  });
}

// Toggle active status
export function useToggleThemeStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('theme_statuses')
        .update({ is_active: !is_active })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['theme-statuses'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });
}

// Delete theme status
export function useDeleteThemeStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('theme_statuses')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['theme-statuses'] });
      toast.success('Theme status deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete theme status: ${error.message}`);
    },
  });
}