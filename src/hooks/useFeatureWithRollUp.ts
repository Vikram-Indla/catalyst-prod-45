/**
 * =====================================================
 * useFeatureWithRollUp - Feature mutations with Epic roll-up triggers
 * =====================================================
 * Catalyst Epics vNext Phase II
 * 
 * This hook wraps feature mutations to automatically trigger Epic roll-ups
 * whenever a Feature is modified, linked, unlinked, or deleted.
 * 
 * TRIGGERS ROLL-UP WHEN:
 * - Feature is linked to an Epic
 * - Feature is unlinked from an Epic
 * - Feature estimate changes
 * - Feature status changes
 * - Feature blocked status changes
 * - Feature is deleted
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEpicMutations } from './useEpicMutations';
import { toast } from 'sonner';

export function useFeatureWithRollUp() {
  const queryClient = useQueryClient();
  const { triggerFeatureRollUp, triggerBatchRollUp } = useEpicMutations();

  /**
   * Link a Feature to an Epic - triggers roll-up on the Epic
   */
  const linkFeatureToEpic = useMutation({
    mutationFn: async ({ featureId, epicId }: { featureId: string; epicId: string }) => {
      const { error } = await supabase
        .from('features')
        .update({ epic_id: epicId, updated_at: new Date().toISOString() })
        .eq('id', featureId);

      if (error) throw error;
      return { featureId, epicId };
    },
    onSuccess: async ({ epicId }) => {
      // Trigger roll-up on the Epic
      triggerFeatureRollUp.mutate({ epicId });
      queryClient.invalidateQueries({ queryKey: ['features'] });
      toast.success('Feature linked to Epic');
    },
    onError: (error: Error) => {
      toast.error(`Failed to link feature: ${error.message}`);
    }
  });

  /**
   * Unlink a Feature from an Epic - triggers roll-up on the old Epic
   */
  const unlinkFeatureFromEpic = useMutation({
    mutationFn: async ({ featureId, oldEpicId }: { featureId: string; oldEpicId: string }) => {
      const { error } = await supabase
        .from('features')
        .update({ epic_id: null, updated_at: new Date().toISOString() })
        .eq('id', featureId);

      if (error) throw error;
      return { featureId, oldEpicId };
    },
    onSuccess: async ({ oldEpicId }) => {
      // Trigger roll-up on the old Epic
      triggerFeatureRollUp.mutate({ epicId: oldEpicId });
      queryClient.invalidateQueries({ queryKey: ['features'] });
      toast.success('Feature unlinked from Epic');
    },
    onError: (error: Error) => {
      toast.error(`Failed to unlink feature: ${error.message}`);
    }
  });

  /**
   * Update Feature estimate - triggers roll-up on the linked Epic
   */
  const updateFeatureEstimate = useMutation({
    mutationFn: async ({ featureId, estimate, epicId }: { 
      featureId: string; 
      estimate: number; 
      epicId?: string | null;
    }) => {
      const { error } = await supabase
        .from('features')
        .update({ 
          estimate_points: estimate, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', featureId);

      if (error) throw error;
      return { featureId, epicId };
    },
    onSuccess: async ({ epicId }) => {
      if (epicId) {
        triggerFeatureRollUp.mutate({ epicId });
      }
      queryClient.invalidateQueries({ queryKey: ['features'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update feature estimate: ${error.message}`);
    }
  });

  /**
   * Update Feature status - triggers roll-up on the linked Epic
   */
  const updateFeatureStatus = useMutation({
    mutationFn: async ({ featureId, status, epicId }: { 
      featureId: string; 
      status: 'funnel' | 'analyzing' | 'backlog' | 'implementing' | 'done'; 
      epicId?: string | null;
    }) => {
      const { error } = await supabase
        .from('features')
        .update({ 
          status, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', featureId);

      if (error) throw error;
      return { featureId, epicId };
    },
    onSuccess: async ({ epicId }) => {
      if (epicId) {
        triggerFeatureRollUp.mutate({ epicId });
      }
      queryClient.invalidateQueries({ queryKey: ['features'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update feature status: ${error.message}`);
    }
  });

  /**
   * Update Feature blocked status - triggers roll-up on the linked Epic
   */
  const updateFeatureBlocked = useMutation({
    mutationFn: async ({ featureId, blocked, epicId }: { 
      featureId: string; 
      blocked: boolean; 
      epicId?: string | null;
    }) => {
      const { error } = await supabase
        .from('features')
        .update({ 
          blocked, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', featureId);

      if (error) throw error;
      return { featureId, epicId };
    },
    onSuccess: async ({ epicId }) => {
      if (epicId) {
        triggerFeatureRollUp.mutate({ epicId });
      }
      queryClient.invalidateQueries({ queryKey: ['features'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update feature blocked status: ${error.message}`);
    }
  });

  /**
   * Delete Feature (soft) - triggers roll-up on the linked Epic
   */
  const deleteFeature = useMutation({
    mutationFn: async ({ featureId, epicId }: { 
      featureId: string; 
      epicId?: string | null;
    }) => {
      const { error } = await supabase
        .from('features')
        .update({ 
          deleted_at: new Date().toISOString() 
        })
        .eq('id', featureId);

      if (error) throw error;
      return { featureId, epicId };
    },
    onSuccess: async ({ epicId }) => {
      if (epicId) {
        triggerFeatureRollUp.mutate({ epicId });
      }
      queryClient.invalidateQueries({ queryKey: ['features'] });
      toast.success('Feature deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete feature: ${error.message}`);
    }
  });

  /**
   * Bulk move Features to new Epic - triggers roll-up on both old and new Epics
   */
  const bulkMoveFeatures = useMutation({
    mutationFn: async ({ featureIds, newEpicId, oldEpicIds }: { 
      featureIds: string[]; 
      newEpicId: string;
      oldEpicIds: string[];
    }) => {
      const { error } = await supabase
        .from('features')
        .update({ 
          epic_id: newEpicId, 
          updated_at: new Date().toISOString() 
        })
        .in('id', featureIds);

      if (error) throw error;
      return { featureIds, newEpicId, oldEpicIds };
    },
    onSuccess: async ({ newEpicId, oldEpicIds }) => {
      // Trigger roll-up on all affected Epics
      const allEpicIds = [...new Set([newEpicId, ...oldEpicIds.filter(Boolean)])];
      triggerBatchRollUp.mutate({ epicIds: allEpicIds });
      queryClient.invalidateQueries({ queryKey: ['features'] });
      toast.success('Features moved to Epic');
    },
    onError: (error: Error) => {
      toast.error(`Failed to move features: ${error.message}`);
    }
  });

  return {
    linkFeatureToEpic,
    unlinkFeatureFromEpic,
    updateFeatureEstimate,
    updateFeatureStatus,
    updateFeatureBlocked,
    deleteFeature,
    bulkMoveFeatures,
  };
}
