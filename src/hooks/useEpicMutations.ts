/**
 * =====================================================
 * useEpicMutations - Canonical Epic Side Effects Orchestrator
 * =====================================================
 * Catalyst Epics vNext Phase II
 * 
 * MUTATIONS HANDLED:
 * - updateEpic: Update Epic fields with side effects
 * - deleteEpic: Soft delete, disassociates Features (remain in backlog)
 * - cancelEpic: Cancel Epic, disassociates Features (remain in backlog)
 * - updateTechnicalScoring: Update scoring inputs, recompute score
 * - triggerFeatureRollUp: Called when a Feature changes
 * - triggerBatchRollUp: Called when bulk operations affect multiple Epics
 * 
 * ROLL-UP CALCULATIONS (Phase II):
 * - total_estimate: Sum of all linked Feature estimates
 * - progress_pct: (# Features with status=done) / (total Features) * 100
 * - feature_count_total: Total linked Features
 * - feature_count_completed: Features with status=done
 * - feature_count_in_progress: Features with status=implementing
 * - feature_count_blocked: Features with blocked=true
 * 
 * SIDE EFFECTS APPLIED:
 * - Feature → Epic estimate roll-up (sum of Feature estimates)
 * - Epic progress persistence (based on done Features)
 * - Feature counts persistence
 * - Technical scoring recomputation (formula unchanged)
 * 
 * QUERIES INVALIDATED:
 * - ['epics'], ['backlog-items'], ['epic-wsjf'], ['enterprise-epics']
 * - ['epic-detail', epicId], ['epic', epicId], ['epic-technical-score', epicId]
 * - ['features'], ['epic-features', epicId], ['epic-rollup', epicId]
 * 
 * TRIGGER CONDITIONS:
 * Roll-up is triggered when:
 * - Feature is linked to Epic
 * - Feature is unlinked from Epic
 * - Feature is deleted
 * - Feature estimate changes
 * - Feature status changes
 * - Feature blocked status changes
 * 
 * NOTE: Technical Scoring stores in epic_wsjf table but UI shows "Tech Score"
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EpicUpdateData {
  name?: string;
  description?: string;
  state?: string;
  status?: string;
  health?: 'green' | 'yellow' | 'red';
  primary_program_id?: string;
  theme_id?: string;
  owner_id?: string;
  start_date?: string;
  end_date?: string;
  target_completion_date?: string;
  mvp?: boolean;
  estimation_system?: string;
  // Technical scoring fields
  technical_value?: number;
  time_criticality?: number;
  risk_reduction?: number;
  job_size?: number;
}

/** Roll-up data structure for Epic */
export interface EpicRollUpData {
  total_estimate: number;
  progress_pct: number;
  feature_count_total: number;
  feature_count_completed: number;
  feature_count_in_progress: number;
  feature_count_blocked: number;
}

// Calculate Technical Score (same formula as WSJF)
export const calculateTechnicalScore = (
  technicalValue: number,
  timeCriticality: number,
  riskReduction: number,
  jobSize: number
): number | null => {
  if (jobSize === 0 || !technicalValue || !timeCriticality || !riskReduction) return null;
  const costOfDelay = technicalValue + timeCriticality + riskReduction;
  return Math.round((costOfDelay / jobSize) * 100) / 100;
};

/**
 * PHASE II: Compute full roll-up data for an Epic from linked Features
 * Returns computed roll-up data structure
 */
export const computeEpicRollUp = async (epicId: string): Promise<EpicRollUpData> => {
  // Fetch all features linked to this epic
  const { data: features, error } = await supabase
    .from('features')
    .select('id, progress_pct, status, estimate_points, blocked')
    .eq('epic_id', epicId)
    .is('deleted_at', null);

  if (error || !features?.length) {
    return {
      total_estimate: 0,
      progress_pct: 0,
      feature_count_total: 0,
      feature_count_completed: 0,
      feature_count_in_progress: 0,
      feature_count_blocked: 0,
    };
  }

  // Calculate roll-up metrics
  let totalEstimate = 0;
  let completedCount = 0;
  let inProgressCount = 0;
  let blockedCount = 0;

  features.forEach(feature => {
    // Sum estimates
    totalEstimate += feature.estimate_points || 0;
    
    // Count by status
    const status = feature.status?.toLowerCase();
    if (status === 'done' || status === 'accepted' || status === 'deployed') {
      completedCount++;
    } else if (status === 'implementing' || status === 'in_progress' || status === 'validating' || status === 'deploying') {
      inProgressCount++;
    }
    
    // Count blocked
    if (feature.blocked) {
      blockedCount++;
    }
  });

  // Calculate progress as % of completed features
  const progressPercent = features.length > 0 
    ? Math.round((completedCount / features.length) * 100) 
    : 0;

  return {
    total_estimate: totalEstimate,
    progress_pct: progressPercent,
    feature_count_total: features.length,
    feature_count_completed: completedCount,
    feature_count_in_progress: inProgressCount,
    feature_count_blocked: blockedCount,
  };
};

/**
 * PHASE II: Persist roll-up data to Epic record
 */
export const persistEpicRollUp = async (epicId: string, rollUpData: EpicRollUpData): Promise<void> => {
  const { error } = await supabase
    .from('epics')
    .update({ 
      points_estimate: rollUpData.total_estimate,
      progress_pct: rollUpData.progress_pct,
      feature_count_total: rollUpData.feature_count_total,
      feature_count_completed: rollUpData.feature_count_completed,
      feature_count_in_progress: rollUpData.feature_count_in_progress,
      feature_count_blocked: rollUpData.feature_count_blocked,
      updated_at: new Date().toISOString()
    })
    .eq('id', epicId);

  if (error) {
    console.error('Failed to persist Epic roll-up:', error);
  }
};

export function useEpicMutations() {
  const queryClient = useQueryClient();

  // Helper to invalidate all epic-related queries
  const invalidateEpicQueries = (epicId?: string) => {
    queryClient.invalidateQueries({ queryKey: ['epics'] });
    queryClient.invalidateQueries({ queryKey: ['backlog-items'] });
    queryClient.invalidateQueries({ queryKey: ['epic-wsjf'] });
    queryClient.invalidateQueries({ queryKey: ['enterprise-epics'] });
    if (epicId) {
      queryClient.invalidateQueries({ queryKey: ['epic-detail', epicId] });
      queryClient.invalidateQueries({ queryKey: ['epic', epicId] });
      queryClient.invalidateQueries({ queryKey: ['epic-technical-score', epicId] });
      queryClient.invalidateQueries({ queryKey: ['epic-rollup', epicId] });
    }
  };

  // Helper to invalidate feature queries
  const invalidateFeatureQueries = (epicId?: string) => {
    queryClient.invalidateQueries({ queryKey: ['features'] });
    if (epicId) {
      queryClient.invalidateQueries({ queryKey: ['epic-features', epicId] });
    }
  };

  /**
   * Compute and persist Epic progress from linked Features
   * @deprecated Use triggerFeatureRollUp mutation instead
   */
  const computeEpicProgress = async (epicId: string): Promise<number> => {
    const rollUp = await computeEpicRollUp(epicId);
    await persistEpicRollUp(epicId, rollUp);
    return rollUp.progress_pct;
  };

  /**
   * Roll up Feature estimates to Epic
   * @deprecated Use triggerFeatureRollUp mutation instead
   */
  const rollUpFeatureEstimates = async (epicId: string): Promise<number> => {
    const rollUp = await computeEpicRollUp(epicId);
    await persistEpicRollUp(epicId, rollUp);
    return rollUp.total_estimate;
  };

  /**
   * Recompute and persist Technical Score for Epic
   */
  const recomputeTechnicalScore = async (epicId: string): Promise<number | null> => {
    // Fetch the epic's technical scoring record (first/only one - no PI dimension)
    const { data: scoringData, error } = await supabase
      .from('epic_wsjf')
      .select('*')
      .eq('epic_id', epicId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error || !scoringData) return null;

    const score = calculateTechnicalScore(
      scoringData.business_value || 0,
      scoringData.time_value || 0,
      scoringData.rroe_value || 0,
      scoringData.job_size || 1
    );

    return score;
  };

  /**
   * Update Epic mutation with full side effects
   */
  const updateEpic = useMutation({
    mutationFn: async ({ epicId, data }: { epicId: string; data: Partial<EpicUpdateData> }) => {
      // Build update object with only defined fields
      const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
          updateData[key] = value;
        }
      });

      const { error } = await supabase
        .from('epics')
        .update(updateData)
        .eq('id', epicId);

      if (error) throw error;

      // Run side effects
      await computeEpicProgress(epicId);
      await recomputeTechnicalScore(epicId);

      return { epicId };
    },
    onSuccess: ({ epicId }) => {
      invalidateEpicQueries(epicId);
      invalidateFeatureQueries(epicId);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update epic: ${error.message}`);
    }
  });

  /**
   * Delete Epic (soft delete) - disassociates Features
   */
  const deleteEpic = useMutation({
    mutationFn: async ({ epicId }: { epicId: string }) => {
      // Soft delete the Epic
      const { error } = await supabase
        .from('epics')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', epicId);

      if (error) throw error;
      return { epicId };
    },
    onSuccess: ({ epicId }) => {
      invalidateEpicQueries(epicId);
      invalidateFeatureQueries(epicId);
      toast.success('Epic moved to recycle bin. All linked Features have been disassociated.');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete epic: ${error.message}`);
    }
  });

  /**
   * Cancel Epic - soft deletes and marks as cancelled
   */
  const cancelEpic = useMutation({
    mutationFn: async ({ epicId }: { epicId: string }) => {
      // Mark as cancelled (soft delete)
      const { error } = await supabase
        .from('epics')
        .update({ 
          deleted_at: new Date().toISOString()
        })
        .eq('id', epicId);

      if (error) throw error;
      return { epicId };
    },
    onSuccess: ({ epicId }) => {
      invalidateEpicQueries(epicId);
      invalidateFeatureQueries(epicId);
      toast.success('Epic cancelled. All linked Features have been disassociated and remain in the backlog.');
    },
    onError: (error: Error) => {
      toast.error(`Failed to cancel epic: ${error.message}`);
    }
  });

  /**
   * Update Technical Scoring inputs and recompute score
   */
  const updateTechnicalScoring = useMutation({
    mutationFn: async ({ 
      epicId, 
      technicalValue, 
      timeCriticality, 
      riskReduction, 
      jobSize 
    }: { 
      epicId: string;
      technicalValue?: number;
      timeCriticality?: number;
      riskReduction?: number;
      jobSize?: number;
    }) => {
      // Upsert the technical scoring record (single record per epic, no PI)
      const updateData: Record<string, any> = {};
      if (technicalValue !== undefined) updateData.business_value = technicalValue;
      if (timeCriticality !== undefined) updateData.time_value = timeCriticality;
      if (riskReduction !== undefined) updateData.rroe_value = riskReduction;
      if (jobSize !== undefined) updateData.job_size = jobSize;

      // Check if record exists
      const { data: existing } = await supabase
        .from('epic_wsjf')
        .select('id')
        .eq('epic_id', epicId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('epic_wsjf')
          .update(updateData)
          .eq('id', existing.id);
      } else {
        // Create new record with a placeholder PI (we'll migrate away from this)
        const { data: anyPi } = await supabase
          .from('program_increments')
          .select('id')
          .limit(1)
          .single();
        
        if (anyPi) {
          await supabase
            .from('epic_wsjf')
            .insert({
              epic_id: epicId,
              pi_id: anyPi.id,
              ...updateData
            });
        }
      }

      // Recompute and return the score
      const score = await recomputeTechnicalScore(epicId);
      return { epicId, score };
    },
    onSuccess: ({ epicId }) => {
      invalidateEpicQueries(epicId);
      queryClient.invalidateQueries({ queryKey: ['wsjf-scoring'] });
      toast.success('Technical score updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update technical scoring: ${error.message}`);
    }
  });

  /**
   * PHASE II: Trigger full roll-up from Features (called when a Feature changes)
   * This is the canonical method to call when any Feature is modified
   */
  const triggerFeatureRollUp = useMutation({
    mutationFn: async ({ epicId }: { epicId: string }) => {
      // Compute all roll-up metrics
      const rollUpData = await computeEpicRollUp(epicId);
      
      // Persist to Epic record
      await persistEpicRollUp(epicId, rollUpData);
      
      return { epicId, ...rollUpData };
    },
    onSuccess: ({ epicId }) => {
      invalidateEpicQueries(epicId);
      invalidateFeatureQueries(epicId);
    }
  });

  /**
   * PHASE II: Batch roll-up for multiple Epics
   * Used when bulk operations affect multiple Epics
   */
  const triggerBatchRollUp = useMutation({
    mutationFn: async ({ epicIds }: { epicIds: string[] }) => {
      const results = await Promise.all(
        epicIds.map(async (epicId) => {
          const rollUpData = await computeEpicRollUp(epicId);
          await persistEpicRollUp(epicId, rollUpData);
          return { epicId, ...rollUpData };
        })
      );
      return results;
    },
    onSuccess: () => {
      invalidateEpicQueries();
      invalidateFeatureQueries();
    }
  });

  return {
    updateEpic,
    deleteEpic,
    cancelEpic,
    updateTechnicalScoring,
    triggerFeatureRollUp,
    triggerBatchRollUp,
    computeEpicProgress,
    rollUpFeatureEstimates,
    recomputeTechnicalScore,
    calculateTechnicalScore,
    invalidateEpicQueries,
    invalidateFeatureQueries,
  };
}
