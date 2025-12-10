import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logAuditEntry } from '@/lib/auditLogger';

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

// Create key result - single toast only
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
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['key-results', data.objective_id] });
      queryClient.invalidateQueries({ queryKey: ['objective-detail', data.objective_id] });
      queryClient.invalidateQueries({ queryKey: ['objectives'] });
      
      // Log audit entry for key result creation
      await logAuditEntry({
        entityType: 'key_result',
        entityId: data.id,
        action: 'created',
        afterData: data,
      });
      
      toast.success('Key result created successfully');
    },
    onError: (error: any) => {
      // Show friendly message instead of raw DB constraint errors
      console.error('Create key result error:', error);
      toast.error('Failed to create key result. Please try again.');
    },
  });
};

// Update key result - single toast only
export const useUpdateKeyResult = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      // Fetch before state for audit
      const { data: beforeData } = await supabase
        .from('key_results_v2')
        .select('*')
        .eq('id', id)
        .single();

      const { data, error } = await supabase
        .from('key_results_v2')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data, beforeData };
    },
    onSuccess: async ({ data, beforeData }) => {
      queryClient.invalidateQueries({ queryKey: ['key-results', data.objective_id] });
      queryClient.invalidateQueries({ queryKey: ['objective-detail', data.objective_id] });
      queryClient.invalidateQueries({ queryKey: ['objectives'] });
      
      // Log audit entry for key result update
      await logAuditEntry({
        entityType: 'key_result',
        entityId: data.id,
        action: 'updated',
        beforeData,
        afterData: data,
      });
      
      toast.success('Key result updated successfully');
    },
    onError: (error: any) => {
      console.error('Update key result error:', error);
      toast.error('Failed to update key result. Please try again.');
    },
  });
};

// Delete key result - single toast only
export const useDeleteKeyResult = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, objectiveId }: { id: string; objectiveId: string }) => {
      // Fetch before state for audit
      const { data: beforeData } = await supabase
        .from('key_results_v2')
        .select('*')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('key_results_v2')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { objectiveId, id, beforeData };
    },
    onSuccess: async ({ objectiveId, id, beforeData }) => {
      queryClient.invalidateQueries({ queryKey: ['key-results', objectiveId] });
      queryClient.invalidateQueries({ queryKey: ['objective-detail', objectiveId] });
      queryClient.invalidateQueries({ queryKey: ['objectives'] });
      
      // Log audit entry for key result deletion
      await logAuditEntry({
        entityType: 'key_result',
        entityId: id,
        action: 'deleted',
        beforeData,
      });
      
      toast.success('Key result deleted successfully');
    },
    onError: (error: any) => {
      const message = error?.message || 'Failed to delete key result';
      toast.error(message);
      console.error('Delete key result error:', error);
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

// Create check-in - single toast only
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
      queryClient.invalidateQueries({ queryKey: ['objectives'] });
      toast.success('Check-in recorded successfully');
    },
    onError: (error: any) => {
      const message = error?.message || 'Failed to record check-in';
      toast.error(message);
      console.error('Create check-in error:', error);
    },
  });
};

// Delete check-in - single toast only
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
      queryClient.invalidateQueries({ queryKey: ['key-results'] });
      queryClient.invalidateQueries({ queryKey: ['objectives'] });
      toast.success('Check-in deleted successfully');
    },
    onError: (error: any) => {
      const message = error?.message || 'Failed to delete check-in';
      toast.error(message);
      console.error('Delete check-in error:', error);
    },
  });
};
