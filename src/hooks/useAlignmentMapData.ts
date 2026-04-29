/**
 * useAlignmentMapData — Fetches vw_alignment_map and builds structured layers + connection maps
 */
import { useQuery } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';

export interface AlignmentNode {
  id: string;
  key: string;
  title: string;
  status: string;
  progress?: number;
  color?: string;
  health?: number;
  goalCount?: number;
  krCount?: number;
}

export interface AlignmentRow {
  theme_id: string;
  theme_key: string;
  theme_name: string;
  theme_color: string;
  theme_status: string;
  theme_progress: number;
  goal_id: string | null;
  goal_key: string | null;
  goal_title: string | null;
  goal_status: string | null;
  goal_progress: number | null;
  goal_health: number | null;
  kr_id: string | null;
  kr_key: string | null;
  kr_title: string | null;
  kr_status: string | null;
  kr_progress: number | null;
  request_id: string | null;
  initiative_key: string | null;
  initiative_title: string | null;
  initiative_status: string | null;
  initiative_progress: number | null;
  epic_id: string | null;
  epic_key: string | null;
  epic_title: string | null;
  epic_status: string | null;
}

export interface AlignmentData {
  rows: AlignmentRow[];
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
      const { data, error } = await typedQuery('vw_alignment_map')
        .select('*');
      if (error) throw error;

      const rows = (data || []) as unknown as AlignmentRow[];

      const themesMap = new Map<string, AlignmentNode>();
      const goalsMap = new Map<string, AlignmentNode>();
      const krsMap = new Map<string, AlignmentNode>();
      const initiativesMap = new Map<string, AlignmentNode>();
      const epicsMap = new Map<string, AlignmentNode>();

      const themeToGoals = new Map<string, Set<string>>();
      const goalToKrs = new Map<string, Set<string>>();
      const krToInitiatives = new Map<string, Set<string>>();
      const initiativeToEpics = new Map<string, Set<string>>();

      // For theme stats
      const themeGoalCount = new Map<string, Set<string>>();
      const themeKrCount = new Map<string, Set<string>>();

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

        // Track goals/KRs per theme
        if (row.theme_id && row.goal_id) {
          if (!themeGoalCount.has(row.theme_id)) themeGoalCount.set(row.theme_id, new Set());
          themeGoalCount.get(row.theme_id)!.add(row.goal_id);
        }
        if (row.theme_id && row.kr_id) {
          if (!themeKrCount.has(row.theme_id)) themeKrCount.set(row.theme_id, new Set());
          themeKrCount.get(row.theme_id)!.add(row.kr_id);
        }

        if (row.goal_id && !goalsMap.has(row.goal_id)) {
          goalsMap.set(row.goal_id, {
            id: row.goal_id,
            key: row.goal_key || '',
            title: row.goal_title || '',
            status: row.goal_status || 'draft',
            progress: Number(row.goal_progress) || 0,
            health: row.goal_health != null ? Number(row.goal_health) : undefined,
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

        if (row.request_id && !initiativesMap.has(row.request_id)) {
          initiativesMap.set(row.request_id, {
            id: row.request_id,
            key: row.initiative_key || '',
            title: row.initiative_title || '',
            status: row.initiative_status || 'draft',
            progress: Number(row.initiative_progress) || 0,
          });
        }

        if (row.epic_id && !epicsMap.has(row.epic_id)) {
          epicsMap.set(row.epic_id, {
            id: row.epic_id,
            key: row.epic_key || '',
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
        if (row.kr_id && row.request_id) {
          if (!krToInitiatives.has(row.kr_id)) krToInitiatives.set(row.kr_id, new Set());
          krToInitiatives.get(row.kr_id)!.add(row.request_id);
          krsWithInitiative.add(row.kr_id);
        }
        if (row.request_id && row.epic_id) {
          if (!initiativeToEpics.has(row.request_id)) initiativeToEpics.set(row.request_id, new Set());
          initiativeToEpics.get(row.request_id)!.add(row.epic_id);
        }

        // Full chain
        if (row.theme_id && row.goal_id && row.kr_id && row.request_id && row.epic_id) {
          fullChainSet.add(`${row.theme_id}-${row.goal_id}-${row.kr_id}-${row.request_id}-${row.epic_id}`);
        }
      }

      // Attach goal/kr counts to themes
      for (const [tid, theme] of themesMap) {
        theme.goalCount = themeGoalCount.get(tid)?.size || 0;
        theme.krCount = themeKrCount.get(tid)?.size || 0;
      }

      // Get total initiatives/epics from ph_requests for accurate denominator
      const { count: totalInitCount } = await supabase
        .from('ph_requests')
        .select('id', { count: 'exact', head: true });

      return {
        rows,
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
          linkedInitiatives: initiativesMap.size,
          totalInitiatives: totalInitCount || initiativesMap.size,
          linkedEpics: epicsMap.size,
          totalEpics: epicsMap.size,
          fullChains: fullChainSet.size,
        },
      };
    },
    staleTime: 60_000,
  });
}
