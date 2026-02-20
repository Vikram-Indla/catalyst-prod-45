/**
 * useAlignmentMapData — Fetches vw_alignment_map and builds structured layers + connection maps
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AlignmentNode {
  id: string;
  key: string;
  title: string;
  status: string;
  progress?: number;
  color?: string;
  health?: number;
}

export interface AlignmentData {
  themes: AlignmentNode[];
  goals: AlignmentNode[];
  krs: AlignmentNode[];
  initiatives: AlignmentNode[];
  epics: AlignmentNode[];
  themeToGoals: Map<string, Set<string>>;
  goalToKrs: Map<string, Set<string>>;
  krToInitiatives: Map<string, Set<string>>;
  initiativeToEpics: Map<string, Set<string>>;
  stats: {
    linkedKrs: number;
    totalKrs: number;
    linkedInitiatives: number;
    totalInitiatives: number;
    linkedEpics: number;
    totalEpics: number;
    fullChains: number;
  };
}

export function useAlignmentMapData() {
  return useQuery<AlignmentData>({
    queryKey: ['alignment-map'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_alignment_map' as any)
        .select('*');
      if (error) throw error;

      const rows = (data || []) as any[];

      const themesMap = new Map<string, AlignmentNode>();
      const goalsMap = new Map<string, AlignmentNode>();
      const krsMap = new Map<string, AlignmentNode>();
      const initiativesMap = new Map<string, AlignmentNode>();
      const epicsMap = new Map<string, AlignmentNode>();

      const themeToGoals = new Map<string, Set<string>>();
      const goalToKrs = new Map<string, Set<string>>();
      const krToInitiatives = new Map<string, Set<string>>();
      const initiativeToEpics = new Map<string, Set<string>>();

      const krsWithInitiative = new Set<string>();
      const fullChainSet = new Set<string>();

      for (const row of rows) {
        if (row.theme_id && !themesMap.has(row.theme_id)) {
          themesMap.set(row.theme_id, {
            id: row.theme_id,
            key: row.theme_key || '',
            title: row.theme_name || '',
            status: row.theme_status || 'draft',
            progress: Number(row.theme_progress) || 0,
            color: row.theme_color || '#2563EB',
          });
        }

        if (row.goal_id && !goalsMap.has(row.goal_id)) {
          goalsMap.set(row.goal_id, {
            id: row.goal_id,
            key: row.goal_key || '',
            title: row.goal_title || '',
            status: row.goal_status || 'draft',
            progress: Number(row.goal_progress) || 0,
            health: row.goal_health,
          });
        }

        if (row.kr_id && !krsMap.has(row.kr_id)) {
          krsMap.set(row.kr_id, {
            id: row.kr_id,
            key: row.kr_key || '',
            title: row.kr_title || '',
            status: row.kr_status || 'not_started',
            progress: Number(row.kr_progress) || 0,
          });
        }

        if (row.initiative_id && !initiativesMap.has(row.initiative_id)) {
          initiativesMap.set(row.initiative_id, {
            id: row.initiative_id,
            key: row.initiative_key || row.initiative_id.slice(0, 8),
            title: row.initiative_title || '',
            status: row.initiative_status || 'draft',
            progress: Number(row.initiative_progress) || 0,
          });
        }

        if (row.epic_id && !epicsMap.has(row.epic_id)) {
          epicsMap.set(row.epic_id, {
            id: row.epic_id,
            key: row.epic_key || row.epic_id.slice(0, 8),
            title: row.epic_title || '',
            status: row.epic_status || 'proposed',
          });
        }

        // Build connection maps
        if (row.theme_id && row.goal_id) {
          if (!themeToGoals.has(row.theme_id)) themeToGoals.set(row.theme_id, new Set());
          themeToGoals.get(row.theme_id)!.add(row.goal_id);
        }
        if (row.goal_id && row.kr_id) {
          if (!goalToKrs.has(row.goal_id)) goalToKrs.set(row.goal_id, new Set());
          goalToKrs.get(row.goal_id)!.add(row.kr_id);
        }
        if (row.kr_id && row.initiative_id) {
          if (!krToInitiatives.has(row.kr_id)) krToInitiatives.set(row.kr_id, new Set());
          krToInitiatives.get(row.kr_id)!.add(row.initiative_id);
          krsWithInitiative.add(row.kr_id);
        }
        if (row.initiative_id && row.epic_id) {
          if (!initiativeToEpics.has(row.initiative_id)) initiativeToEpics.set(row.initiative_id, new Set());
          initiativeToEpics.get(row.initiative_id)!.add(row.epic_id);
        }

        // Full chain
        if (row.theme_id && row.goal_id && row.kr_id && row.initiative_id && row.epic_id) {
          fullChainSet.add(`${row.theme_id}-${row.goal_id}-${row.kr_id}-${row.initiative_id}-${row.epic_id}`);
        }
      }

      // Stats: count initiatives that have at least one KR link
      const linkedInitiatives = initiativesMap.size; // all initiatives in view are linked (they come from KR join)
      // Count initiatives that also have epics
      const initsWithEpic = new Set<string>();
      for (const [iniId] of initiativeToEpics) initsWithEpic.add(iniId);

      return {
        themes: Array.from(themesMap.values()),
        goals: Array.from(goalsMap.values()),
        krs: Array.from(krsMap.values()),
        initiatives: Array.from(initiativesMap.values()),
        epics: Array.from(epicsMap.values()),
        themeToGoals,
        goalToKrs,
        krToInitiatives,
        initiativeToEpics,
        stats: {
          linkedKrs: krsWithInitiative.size,
          totalKrs: krsMap.size,
          linkedInitiatives,
          totalInitiatives: initiativesMap.size,
          linkedEpics: epicsMap.size,
          totalEpics: epicsMap.size,
          fullChains: fullChainSet.size,
        },
      };
    },
    staleTime: 60_000,
  });
}
