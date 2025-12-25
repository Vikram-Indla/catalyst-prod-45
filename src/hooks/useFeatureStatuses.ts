import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FeatureStatus {
  id: string;
  value: string;
  label: string;
  sort_order: number;
  is_active: boolean;
  color: string | null;
  created_at: string;
  updated_at: string;
}

// Fetch all feature statuses (including inactive for admin)
export function useFeatureStatuses() {
  return useQuery({
    queryKey: ['feature-statuses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feature_statuses')
        .select('*')
        .order('sort_order');

      if (error) throw error;
      return data as FeatureStatus[];
    },
  });
}

// Fetch only active feature statuses (for dropdowns)
export function useActiveFeatureStatuses() {
  return useQuery({
    queryKey: ['feature-statuses', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feature_statuses')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      return data as FeatureStatus[];
    },
  });
}

// Get feature status options for dropdowns
export function useFeatureStatusOptions() {
  const { data: statuses = [], isLoading } = useActiveFeatureStatuses();
  
  const options = statuses.map(status => ({
    value: status.value,
    label: status.label,
    color: status.color,
  }));

  return { options, isLoading };
}

// Get feature status info helper
export function useGetFeatureStatusInfo() {
  const { data: statuses = [] } = useActiveFeatureStatuses();
  
  return (value: string | null | undefined) => {
    if (!value) return { label: 'Unknown', color: null };
    const normalized = value.toLowerCase();
    const status = statuses.find(s => s.value.toLowerCase() === normalized);
    return status 
      ? { label: status.label, color: status.color }
      : { label: value.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()), color: null };
  };
}

// Create feature status
export function useCreateFeatureStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { value: string; label: string; sort_order?: number }) => {
      const { data: result, error } = await supabase
        .from('feature_statuses')
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
      queryClient.invalidateQueries({ queryKey: ['feature-statuses'] });
      toast.success('Feature status added');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add feature status: ${error.message}`);
    },
  });
}

// Update feature status
export function useUpdateFeatureStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<FeatureStatus> & { id: string }) => {
      const { error } = await supabase
        .from('feature_statuses')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-statuses'] });
      toast.success('Feature status updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update feature status: ${error.message}`);
    },
  });
}

// Toggle active status
export function useToggleFeatureStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('feature_statuses')
        .update({ is_active: !is_active })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-statuses'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });
}

// Delete feature status
export function useDeleteFeatureStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('feature_statuses')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-statuses'] });
      toast.success('Feature status deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete feature status: ${error.message}`);
    },
  });
}

// Check for linked features before deleting
export function useLinkedFeatures(statusValue: string | null) {
  return useQuery({
    queryKey: ['linked-features', statusValue],
    queryFn: async () => {
      if (!statusValue) return { count: 0, features: [] };
      
      const { data, error, count } = await supabase
        .from('features')
        .select('id, display_id, title', { count: 'exact' })
        .eq('status', statusValue)
        .is('deleted_at', null)
        .limit(50);

      if (error) throw error;
      return { count: count || 0, features: data || [] };
    },
    enabled: !!statusValue,
  });
}

// Reassign features to a new status
export function useReassignFeatures() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ fromStatus, toStatus }: { fromStatus: string; toStatus: string }) => {
      const { error } = await supabase
        .from('features')
        .update({ status: toStatus })
        .eq('status', fromStatus)
        .is('deleted_at', null);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linked-features'] });
      queryClient.invalidateQueries({ queryKey: ['features'] });
      toast.success('Features reassigned successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to reassign features: ${error.message}`);
    },
  });
}
