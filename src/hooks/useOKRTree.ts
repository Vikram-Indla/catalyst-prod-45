import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OKRTreeItem {
  id: string;
  numericId: number;
  title: string;
  tier: 'strategic_goal' | 'portfolio' | 'program' | 'team';
  score: number | null;
  keyResultsProgress: number;
  owner: {
    id: string;
    name: string;
    avatar?: string;
    initials: string;
  };
  children: OKRTreeItem[];
  isExpanded?: boolean;
}

export function useOKRTree(snapshotId?: string) {
  return useQuery({
    queryKey: ['okr-tree', snapshotId],
    queryFn: async () => {
      if (!snapshotId) return [];

      // Fetch all objectives for this snapshot
      const { data: objectives, error } = await supabase
        .from('objectives')
        .select(`
          id,
          name,
          level,
          confidence_score,
          progress_pct,
          owner_id,
          parent_objective_id,
          profiles:owner_id (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('snapshot_id', snapshotId)
        .order('level', { ascending: true });

      if (error) throw error;

      // Build tree structure
      const itemsMap = new Map<string, OKRTreeItem>();
      const rootItems: OKRTreeItem[] = [];

      objectives?.forEach((obj: any) => {
        const item: OKRTreeItem = {
          id: obj.id,
          numericId: parseInt(obj.id.split('-')[1]) || 0,
          title: obj.name,
          tier: obj.level === 'strategic_goal' ? 'strategic_goal' 
               : obj.level === 'portfolio' ? 'portfolio'
               : obj.level === 'program' ? 'program' 
               : 'team',
          score: obj.confidence_score,
          keyResultsProgress: obj.progress_pct || 0,
          owner: {
            id: obj.owner_id || 'system',
            name: obj.profiles?.full_name || 'Unassigned',
            avatar: obj.profiles?.avatar_url,
            initials: getInitials(obj.profiles?.full_name || 'Unassigned'),
          },
          children: [],
          isExpanded: false,
        };

        itemsMap.set(obj.id, item);
      });

      // Build parent-child relationships
      objectives?.forEach((obj: any) => {
        const item = itemsMap.get(obj.id);
        if (!item) return;

        if (obj.parent_objective_id) {
          const parent = itemsMap.get(obj.parent_objective_id);
          if (parent) {
            parent.children.push(item);
          }
        } else {
          rootItems.push(item);
        }
      });

      return rootItems;
    },
    enabled: !!snapshotId,
  });
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
