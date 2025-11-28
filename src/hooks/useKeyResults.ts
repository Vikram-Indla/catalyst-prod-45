import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface KeyResult {
  id: string;
  objective_id: string;
  summary: string;
  metric_type: string;
  baseline_value?: number;
  goal_value: number;
  current_value: number;
  due_date?: string;
  owner_user_id?: string;
  created_at: string;
  updated_at: string;
}

export interface KeyResultCheckIn {
  id: string;
  key_result_id: string;
  checked_in_at: string;
  value: number;
  note_richtext?: string;
  created_by_user_id?: string;
  created_at: string;
}

// Fetch key results for an objective
export const useKeyResults = (objectiveId?: string) => {
  return useQuery({
    queryKey: ['key-results', objectiveId],
    queryFn: async () => {
      if (!objectiveId) return [];

      const { data, error } = await supabase
        .from('key_results_v2')
        .select('*')
        .eq('objective_id', objectiveId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!objectiveId,
  });
};

// Create key result
export const useCreateKeyResult = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (keyResult: any) => {
      const { data, error } = await supabase
        .from('key_results_v2')
        .insert(keyResult)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['key-results', data.objective_id] });
      toast.success('Key result created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create key result');
      console.error(error);
    },
  });
};

// Update key result
export const useUpdateKeyResult = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await supabase
        .from('key_results_v2')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['key-results', data.objective_id] });
      toast.success('Key result updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update key result');
      console.error(error);
    },
  });
};

// Delete key result
export const useDeleteKeyResult = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, objectiveId }: { id: string; objectiveId: string }) => {
      const { error } = await supabase
        .from('key_results_v2')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return objectiveId;
    },
    onSuccess: (objectiveId) => {
      queryClient.invalidateQueries({ queryKey: ['key-results', objectiveId] });
      toast.success('Key result deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete key result');
      console.error(error);
    },
  });
};

// Fetch check-ins for a key result
export const useKeyResultCheckIns = (keyResultId?: string) => {
  return useQuery({
    queryKey: ['key-result-checkins', keyResultId],
    queryFn: async () => {
      if (!keyResultId) return [];

      const { data, error } = await supabase
        .from('key_result_checkins')
        .select('*')
        .eq('key_result_id', keyResultId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!keyResultId,
  });
};

// Create check-in
export const useCreateCheckIn = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (checkIn: any) => {
      const { data, error } = await supabase
        .from('key_result_checkins')
        .insert(checkIn)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['key-result-checkins', data.key_result_id] });
      queryClient.invalidateQueries({ queryKey: ['key-results'] });
      toast.success('Check-in recorded successfully');
    },
    onError: (error) => {
      toast.error('Failed to record check-in');
      console.error(error);
    },
  });
};

// Delete check-in
export const useDeleteCheckIn = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, keyResultId }: { id: string; keyResultId: string }) => {
      const { error } = await supabase
        .from('key_result_checkins')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return keyResultId;
    },
    onSuccess: (keyResultId) => {
      queryClient.invalidateQueries({ queryKey: ['key-result-checkins', keyResultId] });
      toast.success('Check-in deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete check-in');
      console.error(error);
    },
  });
};
