import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useObjectiveDetail(objectiveId?: string) {
  return useQuery({
    queryKey: ['objective-detail', objectiveId],
    queryFn: async () => {
      if (!objectiveId) return null;

      const { data: objective, error } = await supabase
        .from('objectives')
        .select(`
          id,
          name,
          level,
          status,
          confidence_score,
          progress_pct,
          start_date,
          end_date,
          blocked,
          anchor_sprint_id,
          program_increment_ids,
          owner_id,
          profiles:owner_id (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('id', objectiveId)
        .single();

      if (error) throw error;

      // Fetch key results
      const { data: keyResults } = await supabase
        .from('key_results_v2')
        .select(`
          id,
          summary,
          metric_type,
          baseline_value,
          goal_value,
          current_value,
          owner_user_id,
          profiles:owner_user_id (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('objective_id', objectiveId);

      // Fetch linked epics
      const { data: epicLinks } = await supabase
        .from('objective_epic_links')
        .select(`
          epics (
            id,
            epic_key,
            name,
            estimate,
            status
          )
        `)
        .eq('objective_id', objectiveId);

      // Fetch risks
      const { data: risks } = await supabase
        .from('objective_risks')
        .select('id, label, roam_state')
        .eq('objective_id', objectiveId);

      // Fetch dependencies
      const { data: dependencies } = await supabase
        .from('objective_dependencies')
        .select('id, label, state')
        .eq('objective_id', objectiveId);

      // Fetch impediments
      const { data: impediments } = await supabase
        .from('objective_impediments')
        .select('id, label, status')
        .eq('objective_id', objectiveId);

      // Fetch child objectives
      const { data: childObjectives } = await supabase
        .from('objectives')
        .select('id, name, confidence_score, progress_pct')
        .eq('parent_objective_id', objectiveId);

      return {
        ...objective,
        keyResults: keyResults || [],
        epics: epicLinks?.map(link => link.epics).filter(Boolean) || [],
        risks: risks || [],
        dependencies: dependencies || [],
        impediments: impediments || [],
        childObjectives: childObjectives || [],
      };
    },
    enabled: !!objectiveId,
  });
}

export function useUpdateObjective() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await supabase
        .from('objectives')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['objective-detail', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['okr-tree'] });
      queryClient.invalidateQueries({ queryKey: ['okr-heatmap'] });
      toast.success('Objective updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update objective');
      console.error('Update error:', error);
    },
  });
}

export function useUpdateKeyResult() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, current_value }: { id: string; current_value: number }) => {
      const { data, error } = await supabase
        .from('key_results_v2')
        .update({ current_value })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['objective-detail'] });
      toast.success('Key result updated');
    },
    onError: () => {
      toast.error('Failed to update key result');
    },
  });
}
