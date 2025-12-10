import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// UI-friendly metric type labels
export type MetricType = 'number' | 'percentage' | 'currency' | 'boolean' | 'nps' | 'score';
export type Direction = 'increase' | 'decrease' | 'maintain';
export type UpdateFrequency = 'weekly' | 'monthly' | 'quarterly';

// DB CHECK constraint only allows: 'percentage', 'count', 'cost_currency', 'nps', 'score'
// Map UI types to DB values
const UI_TO_DB_METRIC_TYPE: Record<MetricType, string> = {
  number: 'count',
  percentage: 'percentage',
  currency: 'cost_currency',
  boolean: 'score', // Use score for boolean (0 or 100)
  nps: 'nps',
  score: 'score',
};

// Map DB values back to UI types for display
const DB_TO_UI_METRIC_TYPE: Record<string, MetricType> = {
  count: 'number',
  percentage: 'percentage',
  cost_currency: 'currency',
  nps: 'nps',
  score: 'score',
};

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

// Helper to write audit log entry
async function writeAuditLog(
  entityType: 'objective' | 'key_result',
  entityId: string,
  action: string,
  beforeJson?: any,
  afterJson?: any
) {
  try {
    const { data: user } = await supabase.auth.getUser();
    await supabase.from('activity_logs').insert({
      entity_type: entityType,
      entity_id: entityId,
      action,
      actor_id: user?.user?.id || null,
      before_json: beforeJson || null,
      after_json: afterJson || null,
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

export function useKeyResultsV2(objectiveId?: string) {
  return useQuery({
    queryKey: ['key-results-v2', objectiveId],
    queryFn: async () => {
      if (!objectiveId) return [];
      
      // Single query - no joins, just fetch KRs
      const { data: krs, error } = await supabase
        .from('key_results_v2')
        .select('*')
        .eq('objective_id', objectiveId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;

      // Process KRs without additional queries - owner lookup is optional/secondary
      return (krs || []).map(kr => {
        const baseline = kr.baseline_value || 0;
        const current = kr.current_value || baseline;
        const goal = kr.goal_value || kr.target_value || 0;
        const direction = (kr.direction || 'increase') as Direction;
        const progress = calculateKRProgress(baseline, current, goal, direction);
        // Map DB metric_type back to UI type for display
        const uiMetricType = DB_TO_UI_METRIC_TYPE[kr.metric_type] || (kr.metric_type as MetricType);
        return {
          ...kr,
          metric_type: uiMetricType,
          baseline_value: baseline,
          current_value: current,
          goal_value: goal,
          target_value: goal,
          direction,
          progress,
        } as KeyResultV2;
      });
    },
    enabled: !!objectiveId,
    staleTime: 30000, // Cache for 30 seconds to avoid refetching on tab switch
  });
}

// Helper to update objective progress in DB after KR changes
async function updateObjectiveProgressInDB(objectiveId: string) {
  // Fetch all KRs for this objective with their values
  const { data: krs, error: krError } = await supabase
    .from('key_results_v2')
    .select('baseline_value, current_value, goal_value, target_value, direction')
    .eq('objective_id', objectiveId);

  if (krError) {
    console.error('Failed to fetch KRs for progress update:', krError);
    return;
  }

  // Calculate average progress from all KRs
  const hasKRs = krs && krs.length > 0;
  let avgProgress = 0;
  
  if (hasKRs) {
    const progressValues = krs.map(kr => {
      const baseline = kr.baseline_value || 0;
      const current = kr.current_value || baseline;
      const goal = kr.goal_value || kr.target_value || 0;
      const direction = (kr.direction || 'increase') as Direction;
      return calculateKRProgress(baseline, current, goal, direction);
    });
    avgProgress = progressValues.reduce((sum, p) => sum + p, 0) / progressValues.length;
  }

  // Determine health based on progress
  let health: 'good' | 'fair' | 'at_risk' | 'poor' = 'at_risk';
  if (hasKRs) {
    if (avgProgress >= 75) health = 'good';
    else if (avgProgress >= 40) health = 'fair';
    else if (avgProgress >= 20) health = 'at_risk';
    else health = 'poor';
  }

  // Update objective in DB
  const { error: updateError } = await supabase
    .from('objectives')
    .update({
      overall_progress: Math.round(avgProgress),
      health,
      updated_at: new Date().toISOString(),
    })
    .eq('id', objectiveId);

  if (updateError) {
    console.error('Failed to update objective progress:', updateError);
  }
}

export function useCreateKeyResultV2() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateKeyResultInput) => {
      // Map UI metric type to DB-valid value
      const dbMetricType = UI_TO_DB_METRIC_TYPE[input.metric_type] || 'count';
      
      // Calculate initial progress
      const baseline = input.baseline_value || 0;
      const direction = input.direction || 'increase';
      const progress = calculateKRProgress(baseline, baseline, input.goal_value, direction as Direction);
      
      const { data, error } = await supabase
        .from('key_results_v2')
        .insert({
          objective_id: input.objective_id,
          summary: input.summary,
          metric_type: dbMetricType,
          baseline_value: baseline,
          goal_value: input.goal_value,
          current_value: baseline,
          direction: direction,
          status: 'pending',
          progress: Math.round(progress), // Store progress in DB
        })
        .select()
        .single();
      
      if (error) {
        console.error('KR create error:', error);
        throw error;
      }
      
      // Update objective's overall_progress in DB
      await updateObjectiveProgressInDB(input.objective_id);
      
      // Write audit log for KR creation
      await writeAuditLog('key_result', data.id, 'created', null, data);
      
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['key-results-v2', variables.objective_id] });
      queryClient.invalidateQueries({ queryKey: ['objectives-v2'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      toast.success('Key Result created');
    },
    onError: (error: any) => {
      const msg = error?.message || error?.code || 'Unknown error';
      toast.error(`Failed to create Key Result: ${msg}`);
    },
  });
}

export function useUpdateKeyResultV2() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, objectiveId, current_value }: { id: string; objectiveId: string; current_value: number }) => {
      // Fetch current state for audit log and progress calculation
      const { data: beforeData } = await supabase
        .from('key_results_v2')
        .select('*')
        .eq('id', id)
        .single();

      if (!beforeData) throw new Error('KR not found');

      // Calculate new progress
      const baseline = beforeData.baseline_value || 0;
      const goal = beforeData.goal_value || beforeData.target_value || 0;
      const direction = (beforeData.direction || 'increase') as Direction;
      const progress = calculateKRProgress(baseline, current_value, goal, direction);

      const { data, error } = await supabase
        .from('key_results_v2')
        .update({ 
          current_value, 
          progress: Math.round(progress), // Store progress in DB
          updated_at: new Date().toISOString() 
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      
      // Update objective's overall_progress in DB
      await updateObjectiveProgressInDB(objectiveId);
      
      // Write audit log for KR update
      await writeAuditLog('key_result', id, 'updated', beforeData, data);
      
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['key-results-v2', variables.objectiveId] });
      queryClient.invalidateQueries({ queryKey: ['objectives-v2'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
    onError: () => toast.error('Failed to update Key Result'),
  });
}

export function useDeleteKeyResultV2() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, objectiveId }: { id: string; objectiveId: string }) => {
      // Fetch current state for audit log
      const { data: beforeData } = await supabase
        .from('key_results_v2')
        .select('*')
        .eq('id', id)
        .single();

      const { error } = await supabase.from('key_results_v2').delete().eq('id', id);
      if (error) throw error;
      
      // Update objective's overall_progress in DB after deletion
      await updateObjectiveProgressInDB(objectiveId);
      
      // Write audit log for KR deletion
      await writeAuditLog('key_result', id, 'deleted', beforeData, null);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['key-results-v2', variables.objectiveId] });
      queryClient.invalidateQueries({ queryKey: ['objectives-v2'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      toast.success('Key Result deleted');
    },
    onError: () => toast.error('Failed to delete Key Result'),
  });
}
