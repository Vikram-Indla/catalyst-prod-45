import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface HeatmapCell {
  percentage: number | null;
  avgScore: number | null;
  objectiveCount: number;
}

export interface HeatmapRow {
  themeId: string;
  themeName: string;
  itemCount: number;
  cells: HeatmapCell[];
  avgProgress: number;
  byHealth: {
    good: number;
    fair: number;
    poor: number;
    at_risk: number;
  };
}

export interface ProgramIncrementInfo {
  id: string;
  name: string;
}

// OKR v2 Heatmap: Shows objectives grouped by Theme across quarters
export function useOKRHeatmap(snapshotId?: string, piIds: string[] = []) {
  return useQuery({
    queryKey: ['okr-heatmap-v2', snapshotId, piIds],
    queryFn: async () => {
      console.log('🔥 useOKRHeatmap V2 queryFn executing:', { snapshotId, piIds });
      
      if (!snapshotId) {
        console.log('❌ No snapshotId provided');
        return { programIncrements: [], rows: [] };
      }

      // Step 1: Fetch themes for this snapshot
      const { data: themes, error: themesError } = await supabase
        .from('strategic_themes')
        .select('id, name')
        .eq('snapshot_id', snapshotId)
        .order('name');

      if (themesError) throw themesError;

      const themeIds = themes?.map(t => t.id) || [];
      
      if (themeIds.length === 0) {
        console.log('❌ No themes found for snapshot');
        return { programIncrements: [], rows: [] };
      }

      // Step 2: Fetch OKR v2 objectives linked to these themes
      const { data: objectives, error: objError } = await supabase
        .from('objectives')
        .select('id, name, theme_id, overall_progress, health')
        .eq('is_v2', true)
        .in('theme_id', themeIds);

      if (objError) throw objError;

      console.log('📊 Fetched OKR v2 objectives:', {
        count: objectives?.length,
        themes: themes?.length,
      });

      // Step 3: Build rows by theme
      const rows: HeatmapRow[] = themes?.map(theme => {
        const themeObjectives = objectives?.filter(o => o.theme_id === theme.id) || [];
        
        // Calculate health breakdown
        const byHealth = {
          good: themeObjectives.filter(o => o.health === 'good').length,
          fair: themeObjectives.filter(o => o.health === 'fair').length,
          poor: themeObjectives.filter(o => o.health === 'poor').length,
          at_risk: themeObjectives.filter(o => o.health === 'at_risk').length,
        };

        // Calculate average progress
        const avgProgress = themeObjectives.length > 0
          ? Math.round(themeObjectives.reduce((sum, o) => sum + (o.overall_progress || 0), 0) / themeObjectives.length)
          : 0;

        // For now, create a single cell per theme (can be extended for quarterly breakdown)
        const cells: HeatmapCell[] = [{
          percentage: avgProgress,
          avgScore: avgProgress / 100,
          objectiveCount: themeObjectives.length,
        }];

        return {
          themeId: theme.id,
          themeName: theme.name,
          itemCount: themeObjectives.length,
          cells,
          avgProgress,
          byHealth,
        };
      }) || [];

      console.log('✅ Final heatmap data:', { 
        rows: rows.length,
        totalObjectives: objectives?.length || 0,
      });

      return {
        programIncrements: [] as ProgramIncrementInfo[],
        rows,
      };
    },
    enabled: !!snapshotId,
  });
}
