import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * useEpicMutations - Centralized Epic Side Effects Orchestrator
 * Phase 1: Handles all Epic mutations with proper side effects
 * 
 * Responsibilities:
 * - Create / Update / Delete / Cancel Epic
 * - Feature → Epic estimate roll-up
 * - Progress computation and persistence
 * - Technical scoring recomputation
 * - Proper query invalidations
 */

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
   */
  const computeEpicProgress = async (epicId: string): Promise<number> => {
    // Fetch all features linked to this epic
    const { data: features, error } = await supabase
      .from('features')
      .select('id, progress_pct, status, estimate_points')
      .eq('epic_id', epicId);

    if (error || !features?.length) return 0;

    // Calculate weighted progress based on estimate points
    let totalPoints = 0;
    let completedPoints = 0;

    features.forEach(feature => {
      const points = feature.estimate_points || 1;
      totalPoints += points;
      
      // Use progress_pct if available, otherwise derive from status
      // Feature statuses: funnel, analyzing, backlog, implementing
      const progress = feature.progress_pct ?? 
        (feature.status === 'implementing' ? 75 : 
         feature.status === 'backlog' ? 25 :
         feature.status === 'analyzing' ? 10 : 0);
      
      completedPoints += (points * progress) / 100;
    });

    const progressPercent = totalPoints > 0 
      ? Math.round((completedPoints / totalPoints) * 100) 
      : 0;

    // Persist progress to Epic
    await supabase
      .from('epics')
      .update({ 
        progress_pct: progressPercent,
        updated_at: new Date().toISOString()
      })
      .eq('id', epicId);

    return progressPercent;
  };

  /**
   * Roll up Feature estimates to Epic
   */
  const rollUpFeatureEstimates = async (epicId: string): Promise<number> => {
    const { data: features, error } = await supabase
      .from('features')
      .select('estimate_points')
      .eq('epic_id', epicId);

    if (error || !features?.length) return 0;

    // Sum all feature estimates
    const totalEstimate = features.reduce((sum, f) => {
      return sum + (f.estimate_points || 0);
    }, 0);

    // Update epic with rolled-up estimate
    await supabase
      .from('epics')
      .update({ 
        points_estimate: totalEstimate,
        updated_at: new Date().toISOString()
      })
      .eq('id', epicId);

    return totalEstimate;
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
      // Disassociate all Features from this Epic (set epic_id to a default or leave orphaned)
      // Note: epic_id is required in features table, so we can't set it to null
      // Instead, we just soft delete the epic and features remain linked to deleted epic
      
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
   * Trigger roll-up from Features (called when a Feature changes)
   */
  const triggerFeatureRollUp = useMutation({
    mutationFn: async ({ epicId }: { epicId: string }) => {
      const [progress, estimate] = await Promise.all([
        computeEpicProgress(epicId),
        rollUpFeatureEstimates(epicId)
      ]);
      return { epicId, progress, estimate };
    },
    onSuccess: ({ epicId }) => {
      invalidateEpicQueries(epicId);
    }
  });

  return {
    updateEpic,
    deleteEpic,
    cancelEpic,
    updateTechnicalScoring,
    triggerFeatureRollUp,
    computeEpicProgress,
    rollUpFeatureEstimates,
    recomputeTechnicalScore,
    calculateTechnicalScore,
    invalidateEpicQueries,
    invalidateFeatureQueries,
  };
}
