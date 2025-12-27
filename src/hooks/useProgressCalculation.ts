/**
 * useProgressCalculation - Unified progress calculation hook for Catalyst
 * 
 * Progress Hierarchy:
 * - Snapshot Progress = AVG(Theme Progress)
 * - Theme Progress = 70% × AVG(Objectives) + 30% × Epic Completion %
 * - Objective Progress = AVG(Key Result Progress)
 * - Epic Progress = % of Stories completed (via Features)
 * - Key Result Progress = current_value / target_value
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type ProgressEntityType = 'snapshot' | 'theme' | 'objective' | 'epic' | 'key-result';

export interface ProgressData {
  progress: number;
  breakdown: {
    label: string;
    value: number;
    count?: number;
  }[];
  calculationMethod: string;
  entityCount?: number;
}

// Calculate Key Result progress: current_value / target_value × 100
async function calculateKeyResultProgress(keyResultId: string): Promise<ProgressData> {
  const { data: kr, error } = await supabase
    .from('key_results')
    .select('current_value, target_value, name')
    .eq('id', keyResultId)
    .single();

  if (error || !kr) {
    return { progress: 0, breakdown: [], calculationMethod: 'No data available' };
  }

  const current = Number(kr.current_value) || 0;
  const target = Number(kr.target_value) || 1;
  const progress = Math.min(100, Math.max(0, Math.round((current / target) * 100)));

  return {
    progress,
    breakdown: [
      { label: 'Current Value', value: current },
      { label: 'Target Value', value: target },
    ],
    calculationMethod: 'Progress = (Current Value ÷ Target Value) × 100',
  };
}

// Calculate Objective progress: AVG of all Key Results progress
async function calculateObjectiveProgress(objectiveId: string): Promise<ProgressData> {
  const { data: keyResults, error } = await supabase
    .from('key_results')
    .select('id, current_value, target_value')
    .eq('objective_id', objectiveId);

  if (error || !keyResults || keyResults.length === 0) {
    return { 
      progress: 0, 
      breakdown: [], 
      calculationMethod: 'No Key Results linked',
      entityCount: 0 
    };
  }

  const krProgresses = keyResults.map(kr => {
    const current = Number(kr.current_value) || 0;
    const target = Number(kr.target_value) || 1;
    return Math.min(100, Math.max(0, (current / target) * 100));
  });

  const avgProgress = Math.round(krProgresses.reduce((a, b) => a + b, 0) / krProgresses.length);

  return {
    progress: avgProgress,
    breakdown: [
      { label: 'Key Results', value: avgProgress, count: keyResults.length },
    ],
    calculationMethod: `Average progress across ${keyResults.length} Key Result${keyResults.length > 1 ? 's' : ''}`,
    entityCount: keyResults.length,
  };
}

// Calculate Epic progress: % of Stories completed (via Features)
async function calculateEpicProgress(epicId: string): Promise<ProgressData> {
  // Get all features for this epic
  const { data: features, error: featuresError } = await supabase
    .from('features')
    .select('id')
    .eq('epic_id', epicId);

  if (featuresError || !features || features.length === 0) {
    return { 
      progress: 0, 
      breakdown: [], 
      calculationMethod: 'No Features linked',
      entityCount: 0 
    };
  }

  const featureIds = features.map(f => f.id);

  // Get all stories for these features
  const { data: stories, error: storiesError } = await supabase
    .from('stories')
    .select('id, status')
    .in('feature_id', featureIds);

  if (storiesError || !stories || stories.length === 0) {
    return { 
      progress: 0, 
      breakdown: [{ label: 'Features', value: features.length }], 
      calculationMethod: 'No Stories linked to Features',
      entityCount: 0 
    };
  }

  // Count completed stories (status = 'done')
  const completedStories = stories.filter(s => s.status === 'done').length;

  const progress = Math.round((completedStories / stories.length) * 100);

  return {
    progress,
    breakdown: [
      { label: 'Stories Completed', value: completedStories, count: stories.length },
      { label: 'Features', value: features.length },
    ],
    calculationMethod: `${completedStories} of ${stories.length} stories completed`,
    entityCount: stories.length,
  };
}

// Calculate Theme progress: 70% Objectives + 30% Epics
async function calculateThemeProgress(themeId: string): Promise<ProgressData> {
  // Get objectives for this theme
  const { data: objectives } = await supabase
    .from('objectives')
    .select('id, key_result_progress, progress_pct, overall_progress')
    .eq('theme_id', themeId);

  // Get epics for this theme
  const { data: epics } = await supabase
    .from('epics')
    .select('id')
    .eq('theme_id', themeId);

  const objectiveCount = objectives?.length || 0;
  const epicCount = epics?.length || 0;

  // Calculate average objective progress
  let avgObjectiveProgress = 0;
  if (objectives && objectives.length > 0) {
    const objProgresses = objectives.map(o => {
      // Use key_result_progress if available, otherwise fall back to other fields
      const progress = o.key_result_progress ?? o.overall_progress ?? o.progress_pct ?? 0;
      // Normalize: if ≤ 1, treat as fraction
      return progress <= 1 ? progress * 100 : progress;
    });
    avgObjectiveProgress = objProgresses.reduce((a, b) => a + b, 0) / objProgresses.length;
  }

  // Calculate epic completion percentage
  let epicCompletion = 0;
  if (epics && epics.length > 0) {
    const epicProgresses = await Promise.all(
      epics.map(e => calculateEpicProgress(e.id))
    );
    epicCompletion = epicProgresses.reduce((sum, ep) => sum + ep.progress, 0) / epics.length;
  }

  // Weighted average: 70% objectives, 30% epics
  const objectiveWeight = objectiveCount > 0 ? 0.7 : 0;
  const epicWeight = epicCount > 0 ? 0.3 : 0;
  const totalWeight = objectiveWeight + epicWeight;

  const progress = totalWeight > 0
    ? Math.round(((avgObjectiveProgress * objectiveWeight) + (epicCompletion * epicWeight)) / totalWeight)
    : 0;

  return {
    progress,
    breakdown: [
      { label: 'Objectives', value: Math.round(avgObjectiveProgress), count: objectiveCount },
      { label: 'Epics', value: Math.round(epicCompletion), count: epicCount },
    ],
    calculationMethod: objectiveCount > 0 && epicCount > 0
      ? 'Weighted average of Objective and Epic progress'
      : objectiveCount > 0
        ? 'Based on Objective progress (no Epics linked)'
        : epicCount > 0
          ? 'Based on Epic completion (no Objectives linked)'
          : 'No Objectives or Epics linked',
  };
}

// Calculate Snapshot progress: AVG of all Theme progress
async function calculateSnapshotProgress(snapshotId: string): Promise<ProgressData> {
  // Get all themes for this snapshot
  const { data: themes } = await supabase
    .from('strategic_themes')
    .select('id, name')
    .eq('snapshot_id', snapshotId);

  if (!themes || themes.length === 0) {
    return { 
      progress: 0, 
      breakdown: [], 
      calculationMethod: 'No Themes linked',
      entityCount: 0 
    };
  }

  // Calculate progress for each theme
  const themeProgresses = await Promise.all(
    themes.map(t => calculateThemeProgress(t.id))
  );

  const avgProgress = Math.round(
    themeProgresses.reduce((sum, tp) => sum + tp.progress, 0) / themes.length
  );

  return {
    progress: avgProgress,
    breakdown: [
      { label: 'Themes', value: avgProgress, count: themes.length },
    ],
    calculationMethod: `Average progress across ${themes.length} Strategic Theme${themes.length > 1 ? 's' : ''}`,
    entityCount: themes.length,
  };
}

// Main hook
export function useProgressCalculation(
  entityType: ProgressEntityType,
  entityId: string | null
) {
  return useQuery({
    queryKey: ['progress-calculation', entityType, entityId],
    queryFn: async (): Promise<ProgressData> => {
      if (!entityId) {
        return { progress: 0, breakdown: [], calculationMethod: 'No entity selected' };
      }

      switch (entityType) {
        case 'snapshot':
          return calculateSnapshotProgress(entityId);
        case 'theme':
          return calculateThemeProgress(entityId);
        case 'objective':
          return calculateObjectiveProgress(entityId);
        case 'epic':
          return calculateEpicProgress(entityId);
        case 'key-result':
          return calculateKeyResultProgress(entityId);
        default:
          return { progress: 0, breakdown: [], calculationMethod: 'Unknown entity type' };
      }
    },
    enabled: !!entityId,
    staleTime: 30000, // Cache for 30 seconds
  });
}
