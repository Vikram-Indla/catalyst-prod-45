import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface HeatmapCell {
  percentage: number | null;
  avgScore: number | null;
}

export interface HeatmapRow {
  level: 'Strategic Goals' | 'Portfolio Objectives' | 'Program Objectives' | 'Team Objectives';
  itemCount: number;
  cells: HeatmapCell[];
  spanAllColumns?: boolean;
}

export interface ProgramIncrementInfo {
  id: string;
  name: string;
}

interface KeyResultWithObjective {
  id: string;
  objective_id: string;
  current_value: number;
  target_value: number;
  objective_level: string;
  objective_pi_ids: string[];
}

export function useOKRHeatmap(snapshotId?: string, piIds: string[] = []) {
  return useQuery({
    queryKey: ['okr-heatmap', snapshotId, piIds],
    queryFn: async () => {
      console.log('🔥 useOKRHeatmap called with:', { snapshotId, piIds });
      
      if (!snapshotId) {
        console.log('❌ No snapshotId provided');
        return { programIncrements: [], rows: [] };
      }
      
      if (piIds.length === 0) {
        console.log('❌ No piIds provided');
        return { programIncrements: [], rows: [] };
      }

      // Fetch PI names
      const { data: piNames } = await supabase
        .from('program_increments')
        .select('id, name')
        .in('id', piIds);
      
      const piNameMap = new Map(piNames?.map(pi => [pi.id, pi.name]) || []);

      // Fetch objectives with their key results for this snapshot
      const { data: objectives } = await supabase
        .from('objectives')
        .select('id, level, program_increment_ids')
        .eq('snapshot_id', snapshotId);

      console.log('📊 Fetched objectives:', objectives?.length);
      
      if (!objectives || objectives.length === 0) {
        console.log('❌ No objectives found');
        return { programIncrements: [], rows: [] };
      }

      // Fetch ALL key results for these objectives
      const objectiveIds = objectives.map(o => o.id);
      const { data: keyResults } = await supabase
        .from('key_results')
        .select('id, objective_id, current_value, target_value')
        .in('objective_id', objectiveIds);
      
      console.log('🎯 Fetched key results:', keyResults?.length, 'for', objectiveIds.length, 'objectives');

      // Create a map of objective_id to key results
      const keyResultsByObjective = new Map<string, Array<{ current_value: number; target_value: number }>>();
      keyResults?.forEach(kr => {
        if (!keyResultsByObjective.has(kr.objective_id)) {
          keyResultsByObjective.set(kr.objective_id, []);
        }
        keyResultsByObjective.get(kr.objective_id)!.push({
          current_value: kr.current_value || 0,
          target_value: kr.target_value || 1
        });
      });

      // Build statistics per level per PI
      const levelMap: Record<string, { totalObjectives: number; keyResultScores: number[] }[]> = {
        strategic_goal: piIds.map(() => ({ totalObjectives: 0, keyResultScores: [] })),
        portfolio: piIds.map(() => ({ totalObjectives: 0, keyResultScores: [] })),
        program: piIds.map(() => ({ totalObjectives: 0, keyResultScores: [] })),
        team: piIds.map(() => ({ totalObjectives: 0, keyResultScores: [] })),
      };

      objectives.forEach(obj => {
        const levelStats = levelMap[obj.level];
        if (!levelStats) return;

        const objKeyResults = keyResultsByObjective.get(obj.id) || [];
        const objPiIds = Array.isArray(obj.program_increment_ids) ? obj.program_increment_ids : [];

        // Calculate key result scores for this objective
        const krScores = objKeyResults.map(kr => {
          if (kr.target_value === 0) return 0;
          return Math.min(1, kr.current_value / kr.target_value);
        });

        // Strategic goals span all PIs
        if (obj.level === 'strategic_goal') {
          piIds.forEach((_, index) => {
            levelStats[index].totalObjectives++;
            levelStats[index].keyResultScores.push(...krScores);
          });
        } else {
          // For other levels, only count if PI is in the objective's program_increment_ids
          piIds.forEach((piId, index) => {
            if (objPiIds.includes(piId)) {
              levelStats[index].totalObjectives++;
              levelStats[index].keyResultScores.push(...krScores);
            }
          });
        }
      });

      // Calculate cells for each level
      const calculateCell = (stats: { totalObjectives: number; keyResultScores: number[] }): HeatmapCell => {
        if (stats.keyResultScores.length === 0) {
          return { percentage: null, avgScore: null };
        }
        
        const avgScore = stats.keyResultScores.reduce((sum, score) => sum + score, 0) / stats.keyResultScores.length;
        const percentage = Math.round(avgScore * 100);
        
        return { percentage, avgScore };
      };

      // Build rows
      const rows: HeatmapRow[] = [
        {
          level: 'Strategic Goals',
          itemCount: objectives.filter(o => o.level === 'strategic_goal').length,
          spanAllColumns: true,
          cells: [{
            ...calculateCell({
              totalObjectives: levelMap.strategic_goal[0].totalObjectives,
              keyResultScores: levelMap.strategic_goal.flatMap(s => s.keyResultScores)
            })
          }],
        },
        {
          level: 'Portfolio Objectives',
          itemCount: objectives.filter(o => o.level === 'portfolio').length,
          cells: levelMap.portfolio.map(stats => calculateCell(stats)),
        },
        {
          level: 'Program Objectives',
          itemCount: objectives.filter(o => o.level === 'program').length,
          cells: levelMap.program.map(stats => calculateCell(stats)),
        },
        {
          level: 'Team Objectives',
          itemCount: objectives.filter(o => o.level === 'team').length,
          cells: levelMap.team.map(stats => calculateCell(stats)),
        },
      ];

      console.log('✅ Final heatmap data:', { 
        programIncrements: piIds.length,
        rows: rows.map(r => ({ level: r.level, itemCount: r.itemCount, cellCount: r.cells.length }))
      });

      return {
        programIncrements: piIds.map(id => ({
          id,
          name: piNameMap.get(id) || id
        })),
        rows,
      };
    },
    enabled: !!snapshotId && piIds.length > 0,
  });
}
