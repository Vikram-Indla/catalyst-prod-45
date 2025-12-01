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

export function useOKRHeatmap(snapshotId?: string, piIds: string[] = []) {
  return useQuery({
    queryKey: ['okr-heatmap', snapshotId, piIds],
    queryFn: async () => {
      if (!snapshotId) return { programIncrements: [], rows: [] };

      // Fetch objectives for this snapshot and program increments with names
      const [objectivesResult, piNamesResult] = await Promise.all([
        supabase
          .from('objectives')
          .select('id, level, confidence_score, program_increment_ids')
          .eq('snapshot_id', snapshotId),
        supabase
          .from('program_increments')
          .select('id, name')
          .in('id', piIds)
      ]);

      const { data: objectives, error } = objectivesResult;
      const { data: piNames } = piNamesResult;
      
      // Create a map of PI IDs to names
      const piNameMap = new Map(piNames?.map(pi => [pi.id, pi.name]) || []);

      if (error) throw error;

      // Calculate stats per level per PI
      const levelMap: Record<string, { total: number; scores: number[] }[]> = {
        strategic_goal: piIds.map(() => ({ total: 0, scores: [] })),
        portfolio: piIds.map(() => ({ total: 0, scores: [] })),
        program: piIds.map(() => ({ total: 0, scores: [] })),
        team: piIds.map(() => ({ total: 0, scores: [] })),
      };

      objectives?.forEach((obj: any) => {
        const levelStats = levelMap[obj.level];
        if (!levelStats) return;

        const objPiIds = obj.program_increment_ids || [];
        
        piIds.forEach((piId, index) => {
          if (objPiIds.includes(piId) || obj.level === 'strategic_goal') {
            levelStats[index].total++;
            if (obj.confidence_score !== null) {
              levelStats[index].scores.push(obj.confidence_score);
            }
          }
        });
      });

      // Build rows
      const rows: HeatmapRow[] = [
        {
          level: 'Strategic Goals',
          itemCount: objectives?.filter((o: any) => o.level === 'strategic_goal').length || 0,
          spanAllColumns: true,
          cells: [{
            percentage: calculatePercentage(levelMap.strategic_goal),
            avgScore: calculateAvgScore(levelMap.strategic_goal),
          }],
        },
        {
          level: 'Portfolio Objectives',
          itemCount: objectives?.filter((o: any) => o.level === 'portfolio').length || 0,
          cells: levelMap.portfolio.map(stats => ({
            percentage: stats.total > 0 ? calculateCellPercentage(stats) : null,
            avgScore: stats.scores.length > 0 ? calculateCellAvgScore(stats) : null,
          })),
        },
        {
          level: 'Program Objectives',
          itemCount: objectives?.filter((o: any) => o.level === 'program').length || 0,
          cells: levelMap.program.map(stats => ({
            percentage: stats.total > 0 ? calculateCellPercentage(stats) : null,
            avgScore: stats.scores.length > 0 ? calculateCellAvgScore(stats) : null,
          })),
        },
        {
          level: 'Team Objectives',
          itemCount: objectives?.filter((o: any) => o.level === 'team').length || 0,
          cells: levelMap.team.map(stats => ({
            percentage: stats.total > 0 ? calculateCellPercentage(stats) : null,
            avgScore: stats.scores.length > 0 ? calculateCellAvgScore(stats) : null,
          })),
        },
      ];

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

function calculatePercentage(stats: { total: number; scores: number[] }[]): number {
  const allScores = stats.flatMap(s => s.scores);
  if (allScores.length === 0) return 0;
  const avg = allScores.reduce((sum, s) => sum + s, 0) / allScores.length;
  return Math.round(avg * 100);
}

function calculateAvgScore(stats: { total: number; scores: number[] }[]): number | null {
  const allScores = stats.flatMap(s => s.scores);
  if (allScores.length === 0) return null;
  return allScores.reduce((sum, s) => sum + s, 0) / allScores.length;
}

function calculateCellPercentage(stats: { total: number; scores: number[] }): number {
  if (stats.scores.length === 0) return 0;
  const avg = stats.scores.reduce((sum, s) => sum + s, 0) / stats.scores.length;
  return Math.round(avg * 100);
}

function calculateCellAvgScore(stats: { total: number; scores: number[] }): number {
  return stats.scores.reduce((sum, s) => sum + s, 0) / stats.scores.length;
}
