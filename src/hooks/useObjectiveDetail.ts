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
          summary,
          description,
          tier,
          status,
          health,
          confidence_score,
          score,
          work_progress,
          key_result_progress,
          start_date,
          due_date,
          blocked,
          anchor_sprint_id,
          target_anchor_sprint_id,
          program_increment_ids,
          portfolio_id,
          program_id,
          team_id,
          owner_id,
          contributors,
          category,
          objective_type,
          theme_id,
          tags,
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

      // Fetch key result check-ins for each key result
      const keyResultsWithCheckins = await Promise.all(
        (keyResults || []).map(async (kr) => {
          const { data: checkins } = await supabase
            .from('key_result_checkins')
            .select('id, checked_in_at, value, note_richtext, created_by_user_id')
            .eq('key_result_id', kr.id)
            .order('checked_in_at', { ascending: false });
          
          return { ...kr, checkins: checkins || [] };
        })
      );

      // Fetch linked epics
      const { data: epicLinks } = await supabase
        .from('objective_epic_links')
        .select(`
          epics (
            id,
            epic_key,
            name,
            estimate,
            status,
            progress_pct
          )
        `)
        .eq('objective_id', objectiveId);

      // Fetch linked themes
      const { data: themeLinks } = await supabase
        .from('objective_theme_links')
        .select(`
          strategic_themes (
            id,
            name,
            description
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
        .select('id, summary, confidence_score, work_progress, tier, status')
        .eq('parent_objective_id', objectiveId);

      return {
        ...objective,
        keyResults: keyResultsWithCheckins,
        themes: themeLinks?.map(link => link.strategic_themes).filter(Boolean) || [],
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

export function useCreateCheckIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ keyResultId, value, note, date }: { keyResultId: string; value: number; note: string; date: Date }) => {
      const { data, error } = await supabase
        .from('key_result_checkins')
        .insert({
          key_result_id: keyResultId,
          value,
          note_richtext: note,
          checked_in_at: date.toISOString(),
          created_by_user_id: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      
      // Update current value on key result
      await supabase
        .from('key_results_v2')
        .update({ current_value: value })
        .eq('id', keyResultId);
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['objective-detail'] });
      toast.success('Check-in created');
    },
  });
}

export function useDeleteCheckIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (checkinId: string) => {
      const { error } = await supabase
        .from('key_result_checkins')
        .delete()
        .eq('id', checkinId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['objective-detail'] });
      toast.success('Check-in deleted');
    },
  });
}
