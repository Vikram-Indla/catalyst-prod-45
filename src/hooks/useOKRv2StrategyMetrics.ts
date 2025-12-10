import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// OKR v2 Strategy Metrics Hook
// Fetches objectives (is_v2=true) linked to themes under a snapshot
export interface ObjectiveV2Metrics {
  count: number;
  byHealth: {
    good: number;
    fair: number;
    poor: number;
    at_risk: number;
    unknown: number;
  };
  avgProgress: number;
  objectives: ObjectiveV2Summary[];
}

export interface ObjectiveV2Summary {
  id: string;
  name: string;
  health: string | null;
  overall_progress: number;
  theme_id: string | null;
  theme_name?: string;
  owner_id: string | null;
  status: string;
}

export function useOKRv2StrategyMetrics(snapshotId?: string) {
  return useQuery({
    queryKey: ['okr-v2-strategy-metrics', snapshotId],
    queryFn: async (): Promise<ObjectiveV2Metrics> => {
      if (!snapshotId) {
        return {
          count: 0,
          byHealth: { good: 0, fair: 0, poor: 0, at_risk: 0, unknown: 0 },
          avgProgress: 0,
          objectives: [],
        };
      }

      // Step 1: Get themes for this snapshot
      const { data: themes, error: themesError } = await supabase
        .from('strategic_themes')
        .select('id, name')
        .eq('snapshot_id', snapshotId);

      if (themesError) throw themesError;
      
      const themeIds = themes?.map(t => t.id) || [];
      const themeMap = new Map(themes?.map(t => [t.id, t.name]) || []);

      if (themeIds.length === 0) {
        return {
          count: 0,
          byHealth: { good: 0, fair: 0, poor: 0, at_risk: 0, unknown: 0 },
          avgProgress: 0,
          objectives: [],
        };
      }

      // Step 2: Get OKR v2 objectives linked to these themes
      const { data: objectives, error: objError } = await supabase
        .from('objectives')
        .select('id, name, health, overall_progress, theme_id, owner_id, status')
        .eq('is_v2', true)
        .in('theme_id', themeIds);

      if (objError) throw objError;

      const objectivesList = objectives || [];
      
      // Calculate metrics
      const byHealth = {
        good: 0,
        fair: 0,
        poor: 0,
        at_risk: 0,
        unknown: 0,
      };

      let totalProgress = 0;

      objectivesList.forEach(obj => {
        const health = obj.health?.toLowerCase() || 'unknown';
        if (health === 'good') byHealth.good++;
        else if (health === 'fair') byHealth.fair++;
        else if (health === 'poor') byHealth.poor++;
        else if (health === 'at_risk') byHealth.at_risk++;
        else byHealth.unknown++;

        totalProgress += obj.overall_progress || 0;
      });

      const avgProgress = objectivesList.length > 0 
        ? Math.round(totalProgress / objectivesList.length) 
        : 0;

      const summaries: ObjectiveV2Summary[] = objectivesList.map(obj => ({
        id: obj.id,
        name: obj.name || 'Untitled',
        health: obj.health,
        overall_progress: obj.overall_progress || 0,
        theme_id: obj.theme_id,
        theme_name: obj.theme_id ? themeMap.get(obj.theme_id) : undefined,
        owner_id: obj.owner_id,
        status: obj.status || 'pending',
      }));

      return {
        count: objectivesList.length,
        byHealth,
        avgProgress,
        objectives: summaries,
      };
    },
    enabled: !!snapshotId,
  });
}

// Hook to get objectives by theme for tree view
export function useOKRv2ObjectivesByTheme(snapshotId?: string) {
  return useQuery({
    queryKey: ['okr-v2-objectives-by-theme', snapshotId],
    queryFn: async () => {
      if (!snapshotId) return { themes: [], objectivesByTheme: new Map() };

      // Get themes for this snapshot
      const { data: themes, error: themesError } = await supabase
        .from('strategic_themes')
        .select('id, name, description, status')
        .eq('snapshot_id', snapshotId)
        .order('name');

      if (themesError) throw themesError;
      
      const themeIds = themes?.map(t => t.id) || [];

      if (themeIds.length === 0) {
        return { themes: [], objectivesByTheme: new Map() };
      }

      // Get OKR v2 objectives for these themes
      const { data: objectives, error: objError } = await supabase
        .from('objectives')
        .select('id, name, health, overall_progress, theme_id, owner_id, status')
        .eq('is_v2', true)
        .in('theme_id', themeIds);

      if (objError) throw objError;

      // Get key results count per objective
      const objectiveIds = objectives?.map(o => o.id) || [];
      
      let krCounts = new Map<string, number>();
      if (objectiveIds.length > 0) {
        const { data: keyResults } = await supabase
          .from('key_results_v2')
          .select('id, objective_id')
          .in('objective_id', objectiveIds);

        keyResults?.forEach(kr => {
          krCounts.set(kr.objective_id, (krCounts.get(kr.objective_id) || 0) + 1);
        });
      }

      // Get owner profiles
      const ownerIds = [...new Set(objectives?.map(o => o.owner_id).filter(Boolean) || [])];
      let ownerMap = new Map<string, { name: string; avatar?: string }>();
      
      if (ownerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .in('id', ownerIds);

        profiles?.forEach(p => {
          ownerMap.set(p.id, {
            name: p.full_name || p.email || 'Unknown',
            avatar: p.avatar_url || undefined,
          });
        });
      }

      // Group objectives by theme
      const objectivesByTheme = new Map<string, any[]>();
      
      objectives?.forEach(obj => {
        if (!obj.theme_id) return;
        
        if (!objectivesByTheme.has(obj.theme_id)) {
          objectivesByTheme.set(obj.theme_id, []);
        }
        
        const owner = obj.owner_id ? ownerMap.get(obj.owner_id) : null;
        
        objectivesByTheme.get(obj.theme_id)!.push({
          ...obj,
          keyResultsCount: krCounts.get(obj.id) || 0,
          owner: owner ? {
            id: obj.owner_id,
            name: owner.name,
            avatar: owner.avatar,
            initials: owner.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
          } : {
            id: 'system',
            name: 'Unassigned',
            initials: 'UN',
          },
        });
      });

      return {
        themes: themes || [],
        objectivesByTheme,
      };
    },
    enabled: !!snapshotId,
  });
}
