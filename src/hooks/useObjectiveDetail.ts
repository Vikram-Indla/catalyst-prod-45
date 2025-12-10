import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logAuditEntry } from '@/lib/auditLogger';

export function useObjectiveDetail(objectiveId?: string) {
  return useQuery({
    queryKey: ['objective-detail', objectiveId],
    queryFn: async () => {
      if (!objectiveId) return null;

      console.log('🔍 useObjectiveDetail: Fetching objective', { objectiveId });

      const { data: objective, error } = await supabase
        .from('objectives')
        .select('*')
        .eq('id', objectiveId)
        .single();

      if (error) {
        console.error('❌ useObjectiveDetail: Error fetching objective', error);
        throw error;
      }

      console.log('✅ useObjectiveDetail: Objective fetched', { objective });

      // Fetch owner profile separately
      let ownerProfile = null;
      if (objective?.owner_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .eq('id', objective.owner_id)
          .single();
        ownerProfile = profile;
      }

      // Fetch key results from key_results_v2 table
      const { data: keyResults } = await supabase
        .from('key_results_v2')
        .select('*')
        .eq('objective_id', objectiveId);

      // Fetch key results with profiles
      const keyResultsWithProfiles = await Promise.all(
        (keyResults || []).map(async (kr: any) => {
          let krProfile = null;
          if (kr.owner_id || kr.owner_user_id) {
            const ownerId = kr.owner_id || kr.owner_user_id;
            const { data: profile } = await supabase
              .from('profiles')
              .select('id, full_name, avatar_url')
              .eq('id', ownerId)
              .single();
            krProfile = profile;
          }

          const { data: checkins } = await supabase
            .from('key_result_checkins')
            .select('id, checked_in_at, value, note_richtext, created_by_user_id')
            .eq('key_result_id', kr.id)
            .order('checked_in_at', { ascending: false });

          return { ...kr, profiles: krProfile, checkins: checkins || [] };
        })
      );

      // Fetch linked epics
      const { data: epicLinks } = await supabase
        .from('objective_epic_links')
        .select('epics(id, epic_key, name, estimate, status, progress_pct)')
        .eq('objective_id', objectiveId);

      // Fetch linked themes
      const { data: themeLinks } = await supabase
        .from('objective_theme_links')
        .select('strategic_themes(id, name, description)')
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
        .select('id, name, confidence_score, work_progress, tier, status')
        .eq('parent_objective_id', objectiveId);

      return {
        ...objective,
        summary: objective.name, // Map name to summary for UI compatibility
        profiles: ownerProfile,
        keyResults: keyResultsWithProfiles,
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

// LEGACY: This hook is a DUPLICATE. Use useUpdateObjective from useObjectives.ts instead.
// Kept for backward compatibility but should be migrated.
// The canonical hook is in src/hooks/useObjectives.ts
export function useUpdateObjective() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      // Fetch before state for audit
      const { data: beforeData } = await supabase
        .from('objectives')
        .select('*')
        .eq('id', id)
        .single();

      const { data, error } = await supabase
        .from('objectives')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data, beforeData };
    },
    onSuccess: async ({ data, beforeData }, variables) => {
      queryClient.invalidateQueries({ queryKey: ['objective-detail', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['objectives'] });
      queryClient.invalidateQueries({ queryKey: ['okr-tree'] });
      queryClient.invalidateQueries({ queryKey: ['okr-heatmap'] });
      
      // Determine action type
      const action = beforeData?.status !== data.status ? 'status_changed' : 'updated';
      
      // Log audit entry
      await logAuditEntry({
        entityType: 'objective',
        entityId: data.id,
        action,
        beforeData,
        afterData: data,
      });
      
      toast.success('Objective updated successfully');
    },
    onError: (error: any) => {
      const message = error?.message || 'Failed to update objective';
      toast.error(message);
      console.error('Update error:', error);
    },
  });
}

// Update key result current value (for quick updates)
export function useUpdateKeyResult() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, current_value }: { id: string; current_value: number }) => {
      // Fetch before state for audit
      const { data: beforeData } = await supabase
        .from('key_results_v2')
        .select('*')
        .eq('id', id)
        .single();

      const { data, error } = await supabase
        .from('key_results_v2')
        .update({ current_value })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data, beforeData };
    },
    onSuccess: async ({ data, beforeData }) => {
      queryClient.invalidateQueries({ queryKey: ['objective-detail'] });
      queryClient.invalidateQueries({ queryKey: ['key-results'] });
      queryClient.invalidateQueries({ queryKey: ['objectives'] });
      
      // Log audit entry
      await logAuditEntry({
        entityType: 'key_result',
        entityId: data.id,
        action: 'updated',
        beforeData,
        afterData: data,
      });
      
      toast.success('Key result updated');
    },
    onError: (error: any) => {
      const message = error?.message || 'Failed to update key result';
      toast.error(message);
    },
  });
}

// Create check-in with audit logging
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
      queryClient.invalidateQueries({ queryKey: ['key-results'] });
      queryClient.invalidateQueries({ queryKey: ['objectives'] });
      toast.success('Check-in created');
    },
    onError: (error: any) => {
      const message = error?.message || 'Failed to create check-in';
      toast.error(message);
    },
  });
}

// Delete check-in
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
      queryClient.invalidateQueries({ queryKey: ['key-results'] });
      toast.success('Check-in deleted');
    },
    onError: (error: any) => {
      const message = error?.message || 'Failed to delete check-in';
      toast.error(message);
    },
  });
}
