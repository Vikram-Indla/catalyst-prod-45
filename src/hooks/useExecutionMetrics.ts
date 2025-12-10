import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ExecutionMetrics {
  level: string;
  levelLabel: string;
  alignedAccepted: number;
  alignedTotal: number;
  percentage: number;
  color: 'red' | 'yellow' | 'green' | 'na';
}

export interface AlignedItem {
  id: string;
  type: 'epic' | 'feature' | 'story';
  name: string;
  programName?: string;
  projectName?: string;
  quarterName?: string;
  status: string;
  objectiveIds: string[];
  themeIds: string[];
  isAccepted: boolean;
  isMisaligned: boolean;
}

export interface ExecutionAgainstOutcomesData {
  metrics: ExecutionMetrics[];
  alignedItems: AlignedItem[];
  misalignedItems: AlignedItem[];
}

// Theme progress interface
export interface ThemeProgress {
  themeId: string;
  themeName: string;
  krProgress: number | null; // 0..1, null if no linked objectives with progress
  objectiveCount: number;
  objectives: { id: string; name: string; key_result_progress: number | null }[];
}

// Determine color based on percentage thresholds
export function getThresholdColor(percentage: number): 'red' | 'yellow' | 'green' {
  if (percentage <= 39) return 'red';
  if (percentage <= 69) return 'yellow';
  return 'green';
}

// Helper: Compute theme KR progress as average of linked Portfolio objectives' KR progress
function computeThemeKrProgress(objectivesForTheme: { key_result_progress: number | null }[]): number | null {
  const values = objectivesForTheme
    .map(o => o.key_result_progress)
    .filter((v): v is number => v != null && !Number.isNaN(v));
  
  if (values.length === 0) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  return sum / values.length;
}

export function useExecutionAgainstOutcomes(snapshotId?: string) {
  return useQuery({
    queryKey: ['execution-against-outcomes-v2', snapshotId],
    queryFn: async (): Promise<ExecutionAgainstOutcomesData> => {
      if (!snapshotId) {
        return { metrics: [], alignedItems: [], misalignedItems: [] };
      }

      // 1. Fetch snapshot quarters configuration
      const { data: snapshotConfig } = await supabase
        .from('snapshot_configurations')
        .select('quarters')
        .eq('snapshot_id', snapshotId)
        .maybeSingle();
      
      const snapshotQuarterIds = snapshotConfig?.quarters || [];

      // 2. Fetch objectives by tier within snapshot scope
      const { data: objectives = [] } = await supabase
        .from('objectives')
        .select('id, tier, summary, program_increment_ids')
        .or(`tier.eq.portfolio,tier.eq.program,tier.eq.team`);

      // 3. Fetch objective-epic direct links
      const { data: objectiveEpicLinks = [] } = await supabase
        .from('objective_epic_links')
        .select('objective_id, epic_id');

      // 4. Fetch objective-theme links
      const { data: objectiveThemeLinks = [] } = await supabase
        .from('objective_theme_links')
        .select('objective_id, theme_id');

      // 5. Fetch theme-epic links (for indirect alignment)
      const { data: themeEpicLinks = [] } = await supabase
        .from('theme_epic_links')
        .select('theme_id, epic_id');

      // 6. Fetch all epics with program info
      const { data: epics = [] } = await supabase
        .from('epics')
        .select(`
          id,
          name,
          state,
          primary_program_id,
          programs:primary_program_id (id, name)
        `);

      // 7. Fetch strategic goals for "Strategic Goals" tier
      const { data: strategicGoals = [] } = await supabase
        .from('strategic_goals')
        .select('id, title')
        .eq('snapshot_id', snapshotId);

      // Build mapping of epic_id -> aligned objective IDs
      const epicToObjectives = new Map<string, Set<string>>();
      const epicToThemes = new Map<string, Set<string>>();

      // Direct alignment via objective_epic_links
      objectiveEpicLinks.forEach(link => {
        if (!epicToObjectives.has(link.epic_id)) {
          epicToObjectives.set(link.epic_id, new Set());
        }
        epicToObjectives.get(link.epic_id)!.add(link.objective_id);
      });

      // Build theme -> objectives mapping
      const themeToObjectives = new Map<string, Set<string>>();
      objectiveThemeLinks.forEach(link => {
        if (!themeToObjectives.has(link.theme_id)) {
          themeToObjectives.set(link.theme_id, new Set());
        }
        themeToObjectives.get(link.theme_id)!.add(link.objective_id);
      });

      // Indirect alignment via theme_epic_links
      themeEpicLinks.forEach(link => {
        if (!epicToThemes.has(link.epic_id)) {
          epicToThemes.set(link.epic_id, new Set());
        }
        epicToThemes.get(link.epic_id)!.add(link.theme_id);

        // Inherit objectives from theme
        const themeObjectives = themeToObjectives.get(link.theme_id);
        if (themeObjectives) {
          if (!epicToObjectives.has(link.epic_id)) {
            epicToObjectives.set(link.epic_id, new Set());
          }
          themeObjectives.forEach(objId => epicToObjectives.get(link.epic_id)!.add(objId));
        }
      });

      // Build objective ID -> tier mapping
      const objectiveIdToTier = new Map<string, string>();
      objectives.forEach(obj => objectiveIdToTier.set(obj.id, obj.tier));

      // Categorize aligned items by tier
      const alignedItems: AlignedItem[] = [];
      const misalignedItems: AlignedItem[] = [];

      // Accepted states for epics
      const acceptedStates = ['done', 'completed', 'accepted', 'closed'];

      epics.forEach((epic: any) => {
        const alignedObjectiveIds = epicToObjectives.get(epic.id);
        const alignedThemeIds = epicToThemes.get(epic.id);

        if (!alignedObjectiveIds || alignedObjectiveIds.size === 0) {
          // Unaligned - skip for execution metrics
          return;
        }

        const isAccepted = acceptedStates.includes(epic.state?.toLowerCase() || '');
        
        // Check if epic is in snapshot scope
        // For now, consider all epics as in scope if they have alignment
        const isMisaligned = false; // Would need quarter check here
        
        const item: AlignedItem = {
          id: epic.id,
          type: 'epic',
          name: epic.name,
          programName: epic.programs?.name,
          status: epic.state || 'unknown',
          objectiveIds: Array.from(alignedObjectiveIds),
          themeIds: alignedThemeIds ? Array.from(alignedThemeIds) : [],
          isAccepted,
          isMisaligned,
        };

        if (isMisaligned) {
          misalignedItems.push(item);
        } else {
          alignedItems.push(item);
        }
      });

      // Calculate metrics by tier - only Strategic Goals
      const tiers = [
        { tier: 'strategic', label: 'Strategic Goals' },
      ];

      const metrics: ExecutionMetrics[] = tiers.map(({ tier, label }) => {
        // Filter objectives for this tier
        const tierObjectiveIds = new Set(
          tier === 'strategic'
            ? strategicGoals.map(g => g.id)
            : objectives.filter(o => o.tier === tier).map(o => o.id)
        );

        // Find aligned items for this tier
        const tierAlignedItems = alignedItems.filter(item =>
          item.objectiveIds.some(objId => tierObjectiveIds.has(objId))
        );

        const alignedAccepted = tierAlignedItems.filter(item => item.isAccepted).length;
        const alignedTotal = tierAlignedItems.length;

        const percentage = alignedTotal > 0 
          ? Math.round((alignedAccepted / alignedTotal) * 100) 
          : 0;

        return {
          level: tier,
          levelLabel: label,
          alignedAccepted,
          alignedTotal,
          percentage,
          color: alignedTotal === 0 ? 'na' : getThresholdColor(percentage),
        };
      });

      return { metrics, alignedItems, misalignedItems };
    },
    enabled: !!snapshotId,
  });
}

export interface PyramidCounts {
  strategicGoals: number;
  themes: number;
  epics: number;
  features: number;
  alignedEpics: number;
  misalignedEpics: number;
  alignedFeatures: number;
  misalignedFeatures: number;
}

export function useStrategyPyramidCounts(snapshotId?: string) {
  return useQuery({
    queryKey: ['strategy-pyramid-counts', snapshotId],
    queryFn: async (): Promise<PyramidCounts> => {
      if (!snapshotId) {
        return {
          strategicGoals: 0,
          themes: 0,
          epics: 0,
          features: 0,
          alignedEpics: 0,
          misalignedEpics: 0,
          alignedFeatures: 0,
          misalignedFeatures: 0,
        };
      }

      // Fetch snapshot strategy links to get linked theme IDs (for epic links)
      const { data: snapshotLinks } = await supabase
        .from('snapshot_strategy_links')
        .select('theme_ids')
        .eq('snapshot_id', snapshotId)
        .maybeSingle();

      const linkedThemeIds = snapshotLinks?.theme_ids || [];

      // Count strategic goals linked to snapshot
      const { count: strategicGoalsCount } = await supabase
        .from('strategic_goals')
        .select('id', { count: 'exact', head: true })
        .eq('snapshot_id', snapshotId);

      // Count themes linked to snapshot from strategic_themes table
      const { count: themesCount } = await supabase
        .from('strategic_themes')
        .select('id', { count: 'exact', head: true })
        .eq('snapshot_id', snapshotId);
      
      // Use either the count from strategic_themes or snapshot_strategy_links (whichever is higher)
      const finalThemesCount = Math.max(themesCount || 0, linkedThemeIds.length);

      // Fetch theme-epic links for aligned epics
      const { data: themeEpicLinks = [] } = await supabase
        .from('theme_epic_links')
        .select('theme_id, epic_id')
        .in('theme_id', linkedThemeIds.length > 0 ? linkedThemeIds : ['__none__']);

      // Fetch objective-epic links
      const { data: objectiveEpicLinks = [] } = await supabase
        .from('objective_epic_links')
        .select('epic_id');

      // Combined aligned epic IDs
      const alignedEpicIds = new Set([
        ...themeEpicLinks.map(l => l.epic_id),
        ...objectiveEpicLinks.map(l => l.epic_id),
      ]);

      // Total epics count
      const { count: totalEpicsCount } = await supabase
        .from('epics')
        .select('id', { count: 'exact', head: true });

      // Total features count
      const { count: totalFeaturesCount } = await supabase
        .from('features')
        .select('id', { count: 'exact', head: true });

      // Features linked to aligned epics
      const { data: alignedFeatures = [] } = await supabase
        .from('features')
        .select('id, epic_id')
        .in('epic_id', Array.from(alignedEpicIds).length > 0 ? Array.from(alignedEpicIds) : ['__none__']);

      const alignedEpicsCount = alignedEpicIds.size;
      const misalignedEpicsCount = (totalEpicsCount || 0) - alignedEpicsCount;
      const alignedFeaturesCount = alignedFeatures.length;
      const misalignedFeaturesCount = (totalFeaturesCount || 0) - alignedFeaturesCount;

      return {
        strategicGoals: strategicGoalsCount || 0,
        themes: finalThemesCount,
        epics: totalEpicsCount || 0,
        features: totalFeaturesCount || 0,
        alignedEpics: alignedEpicsCount,
        misalignedEpics: Math.max(0, misalignedEpicsCount),
        alignedFeatures: alignedFeaturesCount,
        misalignedFeatures: Math.max(0, misalignedFeaturesCount),
      };
    },
    enabled: !!snapshotId,
  });
}

/**
 * Helper: Compute KR progress for a single objective from its key results
 * Same formula as useObjectives.ts: progress = (current - baseline) / (goal - baseline), clamped 0..1
 */
function computeOwnKrProgressFromKeyResults(keyResults: any[]): number | null {
  if (!keyResults || keyResults.length === 0) return null;
  
  let totalProgress = 0;
  keyResults.forEach(kr => {
    const baseline = kr.baseline_value || 0;
    const current = kr.current_value || baseline;
    const goal = kr.goal_value;
    
    if (goal !== baseline) {
      const progress = (current - baseline) / (goal - baseline);
      totalProgress += Math.max(0, Math.min(1, progress));
    }
  });
  
  return totalProgress / keyResults.length;
}

/**
 * Helper: Compute rolled-up KR progress for a Portfolio objective
 * Includes own KR progress + average of child Program objectives' KR progress
 */
function computeRolledUpKrProgressForObjective(
  objectiveId: string,
  ownKrProgress: number | null,
  childObjectiveIds: string[],
  objectiveKrProgressMap: Map<string, number | null>
): number | null {
  const progressValues: number[] = [];
  
  // Include own KR progress if valid
  if (ownKrProgress !== null && !Number.isNaN(ownKrProgress)) {
    progressValues.push(ownKrProgress);
  }
  
  // Include child objectives' KR progress
  childObjectiveIds.forEach(childId => {
    const childProgress = objectiveKrProgressMap.get(childId);
    if (childProgress !== null && childProgress !== undefined && !Number.isNaN(childProgress)) {
      progressValues.push(childProgress);
    }
  });
  
  if (progressValues.length === 0) return null;
  return progressValues.reduce((sum, val) => sum + val, 0) / progressValues.length;
}

/**
 * Hook to compute theme-level KR progress based on linked Portfolio objectives.
 * Theme KR Progress = average of linked Portfolio objectives' ROLLED-UP key_result_progress.
 * 
 * PHASE 8: Now recomputes KR progress in-memory using the same logic as useObjectives,
 * rather than reading stale key_result_progress from DB.
 */
export function useThemeProgress(snapshotId?: string) {
  return useQuery({
    queryKey: ['theme-progress', snapshotId],
    queryFn: async (): Promise<ThemeProgress[]> => {
      if (!snapshotId) return [];

      // 1. Fetch all strategic themes (optionally linked to snapshot)
      const { data: themes = [] } = await supabase
        .from('strategic_themes')
        .select('id, name, snapshot_id')
        .order('name');

      // Also get themes linked to snapshot via snapshot_strategy_links
      const { data: snapshotLinks } = await supabase
        .from('snapshot_strategy_links')
        .select('theme_ids')
        .eq('snapshot_id', snapshotId)
        .maybeSingle();
      
      const linkedThemeIds = new Set(snapshotLinks?.theme_ids || []);

      // Combine: themes directly with snapshot_id OR in linked theme_ids
      const relevantThemes = themes.filter(t => 
        t.snapshot_id === snapshotId || linkedThemeIds.has(t.id)
      );

      if (relevantThemes.length === 0) return [];

      // 2. Fetch ALL objectives (Portfolio AND Program) for roll-up calculation
      const { data: allObjectives = [] } = await supabase
        .from('objectives')
        .select('id, name, summary, tier, parent_objective_id')
        .in('tier', ['portfolio', 'program']);

      // 3. Fetch ALL key results from key_results_v2 for KR progress computation
      const { data: allKeyResults = [] } = await supabase
        .from('key_results_v2')
        .select('id, objective_id, baseline_value, current_value, goal_value');

      // Build key results by objective map
      const keyResultsByObjective = new Map<string, any[]>();
      allKeyResults.forEach(kr => {
        if (!keyResultsByObjective.has(kr.objective_id)) {
          keyResultsByObjective.set(kr.objective_id, []);
        }
        keyResultsByObjective.get(kr.objective_id)!.push(kr);
      });

      // 4. Compute own KR progress for each objective
      const objectiveOwnKrProgress = new Map<string, number | null>();
      allObjectives.forEach(obj => {
        const krs = keyResultsByObjective.get(obj.id) || [];
        objectiveOwnKrProgress.set(obj.id, computeOwnKrProgressFromKeyResults(krs));
      });

      // 5. Build parent-child relationships for roll-up
      const childrenByParent = new Map<string, string[]>();
      allObjectives.forEach(obj => {
        if (obj.parent_objective_id) {
          if (!childrenByParent.has(obj.parent_objective_id)) {
            childrenByParent.set(obj.parent_objective_id, []);
          }
          childrenByParent.get(obj.parent_objective_id)!.push(obj.id);
        }
      });

      // 6. Compute rolled-up KR progress for Portfolio objectives
      const objectiveRolledUpKrProgress = new Map<string, number | null>();
      
      allObjectives.forEach(obj => {
        if (obj.tier === 'portfolio') {
          const childIds = childrenByParent.get(obj.id) || [];
          const ownProgress = objectiveOwnKrProgress.get(obj.id) ?? null;
          const rolledUp = computeRolledUpKrProgressForObjective(
            obj.id,
            ownProgress,
            childIds,
            objectiveOwnKrProgress // Children use their own KR progress
          );
          objectiveRolledUpKrProgress.set(obj.id, rolledUp);
        } else {
          // Program objectives use their own progress (no further roll-up)
          objectiveRolledUpKrProgress.set(obj.id, objectiveOwnKrProgress.get(obj.id) ?? null);
        }
      });

      // 7. Fetch objective-theme links
      const { data: objectiveThemeLinks = [] } = await supabase
        .from('objective_theme_links')
        .select('objective_id, theme_id');

      // Build theme -> Portfolio objectives mapping (themes link to Portfolio objectives)
      const portfolioObjectives = allObjectives.filter(o => o.tier === 'portfolio');
      const portfolioObjectiveMap = new Map(portfolioObjectives.map(o => [o.id, o]));
      
      const themeToObjectives = new Map<string, any[]>();
      relevantThemes.forEach(theme => {
        themeToObjectives.set(theme.id, []);
      });

      objectiveThemeLinks.forEach(link => {
        if (themeToObjectives.has(link.theme_id)) {
          const objective = portfolioObjectiveMap.get(link.objective_id);
          if (objective) {
            themeToObjectives.get(link.theme_id)!.push(objective);
          }
        }
      });

      // 8. Compute theme progress using ROLLED-UP objective KR progress
      const themeProgressList: ThemeProgress[] = relevantThemes.map(theme => {
        const linkedObjectives = themeToObjectives.get(theme.id) || [];
        
        const objectivesWithProgress = linkedObjectives.map(obj => {
          const rolledUpProgress = objectiveRolledUpKrProgress.get(obj.id) ?? null;
          return {
            id: obj.id,
            name: obj.name || obj.summary || 'Untitled Objective',
            key_result_progress: rolledUpProgress, // Use computed rolled-up value, NOT DB column
          };
        });

        const krProgress = computeThemeKrProgress(objectivesWithProgress);

        return {
          themeId: theme.id,
          themeName: theme.name,
          krProgress,
          objectiveCount: linkedObjectives.length,
          objectives: objectivesWithProgress,
        };
      });

      return themeProgressList;
    },
    enabled: !!snapshotId,
  });
}
