import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type MetricType = 'number' | 'percentage' | 'currency' | 'boolean';
export type Direction = 'increase' | 'decrease' | 'maintain';
export type UpdateFrequency = 'weekly' | 'monthly' | 'quarterly';

export interface KeyResultV2 {
  id: string;
  objective_id: string;
  summary: string;
  metric_type: MetricType;
  baseline_value: number;
  target_value: number;
  current_value: number;
  goal_value: number;
  direction: Direction;
  update_frequency: UpdateFrequency;
  progress: number;
  owner_id?: string;
  created_at: string;
  updated_at: string;
  owner_name?: string;
  work_contributions_count?: number;
}

export interface CreateKeyResultInput {
  objective_id: string;
  summary: string;
  metric_type: MetricType;
  baseline_value?: number;
  goal_value: number;
  direction?: Direction;
  owner_id?: string;
}

function calculateKRProgress(baseline: number, current: number, goal: number, direction: Direction): number {
  if (goal === baseline) return 0;
  let progress = direction === 'increase' 
    ? ((current - baseline) / (goal - baseline)) * 100
    : ((baseline - current) / (baseline - goal)) * 100;
  return Math.max(0, Math.min(100, progress));
}

export function useKeyResultsV2(objectiveId?: string) {
  return useQuery({
    queryKey: ['key-results-v2', objectiveId],
    queryFn: async () => {
      if (!objectiveId) return [];
      const { data: krs, error } = await supabase
        .from('key_results_v2')
        .select('*, profiles:owner_id (id, full_name)')
        .eq('objective_id', objectiveId)
        .order('created_at', { ascending: true });
      if (error) throw error;

      return (krs || []).map(kr => {
        const baseline = kr.baseline_value || 0;
        const current = kr.current_value || baseline;
        const goal = kr.goal_value || kr.target_value || 0;
        const direction = (kr.direction || 'increase') as Direction;
        const progress = calculateKRProgress(baseline, current, goal, direction);
        return {
          ...kr,
          baseline_value: baseline,
          current_value: current,
          goal_value: goal,
          target_value: goal,
          direction,
          progress,
          owner_name: (kr.profiles as any)?.full_name,
        } as KeyResultV2;
      });
    },
    enabled: !!objectiveId,
  });
}

export function useCreateKeyResultV2() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateKeyResultInput) => {
      const { data, error } = await supabase
        .from('key_results_v2')
        .insert({
          objective_id: input.objective_id,
          summary: input.summary,
          metric_type: input.metric_type,
          baseline_value: input.baseline_value || 0,
          goal_value: input.goal_value,
          current_value: input.baseline_value || 0,
          direction: input.direction || 'increase',
          status: 'pending',
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['key-results-v2', variables.objective_id] });
      queryClient.invalidateQueries({ queryKey: ['objectives-v2'] });
      toast.success('Key Result created');
    },
    onError: () => toast.error('Failed to create Key Result'),
  });
}

export function useUpdateKeyResultV2() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, objectiveId, current_value }: { id: string; objectiveId: string; current_value: number }) => {
      const { data, error } = await supabase
        .from('key_results_v2')
        .update({ current_value, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['key-results-v2', variables.objectiveId] });
      queryClient.invalidateQueries({ queryKey: ['objectives-v2'] });
    },
    onError: () => toast.error('Failed to update Key Result'),
  });
}

export function useDeleteKeyResultV2() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, objectiveId }: { id: string; objectiveId: string }) => {
      const { error } = await supabase.from('key_results_v2').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['key-results-v2', variables.objectiveId] });
      queryClient.invalidateQueries({ queryKey: ['objectives-v2'] });
      toast.success('Key Result deleted');
    },
    onError: () => toast.error('Failed to delete Key Result'),
  });
}
