import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// OKR v2 Tree Structure: Theme → Objective → Key Results
export interface OKRTreeV2Item {
  id: string;
  type: 'theme' | 'objective' | 'key_result';
  title: string;
  description?: string;
  health?: string | null;
  progress: number;
  owner?: {
    id: string;
    name: string;
    avatar?: string;
    initials: string;
  };
  children: OKRTreeV2Item[];
  isExpanded?: boolean;
  themeId?: string;
  objectiveId?: string;
}

export function useOKRTreeV2(snapshotId?: string) {
  return useQuery({
    queryKey: ['okr-tree-v2', snapshotId],
    queryFn: async (): Promise<OKRTreeV2Item[]> => {
      if (!snapshotId) return [];

      console.log('🌲 OKR Tree V2 - Fetching for snapshot:', snapshotId);

      // Step 1: Fetch themes for this snapshot
      const { data: themes, error: themesError } = await supabase
        .from('strategic_themes')
        .select('id, name, description, status')
        .eq('snapshot_id', snapshotId)
        .order('name');

      if (themesError) {
        console.error('❌ Error fetching themes:', themesError);
        throw themesError;
      }

      const themeIds = themes?.map(t => t.id) || [];

      if (themeIds.length === 0) {
        console.log('⚠️ No themes found for snapshot');
        return [];
      }

      // Step 2: Fetch OKR v2 objectives linked to these themes
      const { data: objectives, error: objError } = await supabase
        .from('objectives')
        .select('id, name, description, health, overall_progress, theme_id, owner_id, status')
        .eq('is_v2', true)
        .in('theme_id', themeIds);

      if (objError) {
        console.error('❌ Error fetching objectives:', objError);
        throw objError;
      }

      const objectiveIds = objectives?.map(o => o.id) || [];

      // Step 3: Fetch key results for these objectives
      let keyResults: any[] = [];
      if (objectiveIds.length > 0) {
        const { data: krs, error: krError } = await supabase
          .from('key_results_v2')
          .select('id, summary, objective_id, baseline_value, current_value, goal_value, metric_type')
          .in('objective_id', objectiveIds);

        if (krError) {
          console.error('❌ Error fetching key results:', krError);
        } else {
          keyResults = krs || [];
        }
      }

      // Step 4: Fetch owner profiles
      const ownerIds = [...new Set(objectives?.map(o => o.owner_id).filter(Boolean) || [])];
      const ownerMap = new Map<string, { name: string; avatar?: string }>();

      if (ownerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .in('id', ownerIds as string[]);

        profiles?.forEach(p => {
          ownerMap.set(p.id, {
            name: p.full_name || p.email || 'Unknown',
            avatar: p.avatar_url || undefined,
          });
        });
      }

      // Step 5: Build tree structure
      // Group KRs by objective
      const krsByObjective = new Map<string, any[]>();
      keyResults.forEach(kr => {
        if (!krsByObjective.has(kr.objective_id)) {
          krsByObjective.set(kr.objective_id, []);
        }
        krsByObjective.get(kr.objective_id)!.push(kr);
      });

      // Group objectives by theme
      const objectivesByTheme = new Map<string, any[]>();
      objectives?.forEach(obj => {
        if (!obj.theme_id) return;
        if (!objectivesByTheme.has(obj.theme_id)) {
          objectivesByTheme.set(obj.theme_id, []);
        }
        objectivesByTheme.get(obj.theme_id)!.push(obj);
      });

      // Build tree nodes
      const treeNodes: OKRTreeV2Item[] = themes?.map(theme => {
        const themeObjectives = objectivesByTheme.get(theme.id) || [];
        
        // Calculate theme progress as average of its objectives
        const themeProgress = themeObjectives.length > 0
          ? Math.round(themeObjectives.reduce((sum, o) => sum + (o.overall_progress || 0), 0) / themeObjectives.length)
          : 0;

        const objectiveNodes: OKRTreeV2Item[] = themeObjectives.map(obj => {
          const objKRs = krsByObjective.get(obj.id) || [];
          const owner = obj.owner_id ? ownerMap.get(obj.owner_id) : null;

          // Build KR nodes
          const krNodes: OKRTreeV2Item[] = objKRs.map(kr => {
            const baseline = kr.baseline_value || 0;
            const current = kr.current_value || baseline;
            const goal = kr.goal_value || 100;
            const progress = goal !== baseline 
              ? Math.round(Math.max(0, Math.min(100, ((current - baseline) / (goal - baseline)) * 100)))
              : 0;

            return {
              id: kr.id,
              type: 'key_result' as const,
              title: kr.summary || 'Untitled Key Result',
              progress,
              objectiveId: obj.id,
              children: [],
            };
          });

          return {
            id: obj.id,
            type: 'objective' as const,
            title: obj.name || 'Untitled Objective',
            description: obj.description,
            health: obj.health,
            progress: obj.overall_progress || 0,
            themeId: theme.id,
            owner: owner ? {
              id: obj.owner_id!,
              name: owner.name,
              avatar: owner.avatar,
              initials: owner.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2),
            } : {
              id: 'system',
              name: 'Unassigned',
              initials: 'UN',
            },
            children: krNodes,
          };
        });

        return {
          id: theme.id,
          type: 'theme' as const,
          title: theme.name,
          description: theme.description,
          progress: themeProgress,
          children: objectiveNodes,
        };
      }) || [];

      console.log('✅ OKR Tree V2 - Built tree:', {
        themes: treeNodes.length,
        totalObjectives: objectives?.length || 0,
        totalKRs: keyResults.length,
      });

      return treeNodes;
    },
    enabled: !!snapshotId,
  });
}

// Helper to get initials
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
