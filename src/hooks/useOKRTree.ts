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
      // Fetch all snapshots first to get the latest one if no snapshotId provided
      const { data: snapshots } = await supabase
        .from('strategy_snapshots')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1);

      const targetSnapshotId = snapshotId || snapshots?.[0]?.id;
      
      if (!targetSnapshotId) return [];

      // Fetch all objectives for this snapshot with profiles
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
            full_name,
            email
          )
        `)
        .eq('snapshot_id', targetSnapshotId)
        .order('level', { ascending: true });

      if (error) throw error;

      // Build tree structure
      const itemsMap = new Map<string, OKRTreeItem>();
      const rootItems: OKRTreeItem[] = [];

      objectives?.forEach((obj: any) => {
        const ownerName = obj.profiles?.full_name || obj.profiles?.email || 'Unassigned';
        const item: OKRTreeItem = {
          id: obj.id,
          numericId: parseInt(obj.id.replace(/\D/g, '').slice(0, 6)) || Math.floor(Math.random() * 100000),
          title: obj.name,
          tier: obj.level === 'strategic_goal' ? 'strategic_goal' 
               : obj.level === 'portfolio' ? 'portfolio'
               : obj.level === 'program' ? 'program' 
               : 'team',
          score: obj.confidence_score,
          keyResultsProgress: (obj.progress_pct || 0) * 100,
          owner: {
            id: obj.owner_id || 'system',
            name: ownerName,
            avatar: undefined,
            initials: getInitials(ownerName),
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
    enabled: true, // Always enabled, will fetch latest snapshot if none provided
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
