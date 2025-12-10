import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OKRTreeItem {
  id: string;
  numericId: number;
  title: string;
  tier: 'north_star' | 'long_term_goal' | 'long_term_strategy' | 'yearly_goal' | 'portfolio' | 'program' | 'team';
  entityType: 'strategic_goal' | 'objective'; // Which table this item comes from
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

      console.log('🌲 OKR Tree - Fetching for snapshot:', targetSnapshotId);

      // STEP 1: Fetch ONLY Yearly Goals as ROOT nodes for OKR Tree
      const { data: yearlyGoals, error: goalsError } = await supabase
        .from('strategic_goals')
        .select('id, title, description, tier, parent_goal_id, snapshot_id, score, complete_percent, owner_id, status')
        .eq('snapshot_id', targetSnapshotId)
        .eq('tier', 'yearly_goal'); // Only fetch yearly goals as root

      if (goalsError) {
        console.error('❌ Error fetching yearly goals:', goalsError);
        throw goalsError;
      }

      // STEP 2: Fetch ALL objectives (they will be linked to yearly goals)
      const { data: objectives, error: objError } = await supabase
        .from('objectives')
        .select('id, summary, tier, confidence_score, score, work_progress, key_result_progress, owner_id, parent_objective_id, parent_goal_id')
        .eq('snapshot_id', targetSnapshotId);

      if (objError) {
        console.error('❌ Error fetching objectives:', objError);
        throw objError;
      }

      // Fetch profiles separately
      const allOwnerIds = [
        ...(yearlyGoals?.map(g => g.owner_id).filter(Boolean) || []),
        ...(objectives?.map(o => o.owner_id).filter(Boolean) || [])
      ];
      const ownerIds = [...new Set(allOwnerIds)];
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', ownerIds);

      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Build tree structure
      const itemsMap = new Map<string, OKRTreeItem>();
      const rootItems: OKRTreeItem[] = [];

      // STEP 3: Process Yearly Goals (these are ROOT nodes)
      yearlyGoals?.forEach((goal: any) => {
        const profile = profilesMap.get(goal.owner_id);
        const ownerName = profile?.full_name || profile?.email || 'Unassigned';
        const numericId = parseInt(goal.id.split('-')[0], 16) % 100;
        
        const item: OKRTreeItem = {
          id: goal.id,
          numericId,
          title: goal.title,
          tier: 'yearly_goal',
          entityType: 'strategic_goal',
          score: goal.score,
          keyResultsProgress: goal.complete_percent || 0,
          owner: {
            id: goal.owner_id || 'system',
            name: ownerName,
            avatar: profile?.avatar_url || undefined,
            initials: getInitials(ownerName),
          },
          children: [],
          isExpanded: false,
        };

        itemsMap.set(goal.id, item);
        rootItems.push(item); // Add all yearly goals to root
      });

      // STEP 4: Process Objectives and add to itemsMap
      objectives?.forEach((obj: any) => {
        const profile = profilesMap.get(obj.owner_id);
        const ownerName = profile?.full_name || profile?.email || 'Unassigned';
        const numericId = parseInt(obj.id.split('-')[0], 16) % 100;
        
        const item: OKRTreeItem = {
          id: obj.id,
          numericId,
          title: obj.name || obj.summary, // Prefer 'name' as canonical field
          tier: obj.tier as any,
          entityType: 'objective',
          score: obj.score || obj.confidence_score,
          keyResultsProgress: ((obj.key_result_progress || obj.work_progress || 0) * 100),
          owner: {
            id: obj.owner_id || 'system',
            name: ownerName,
            avatar: profile?.avatar_url || undefined,
            initials: getInitials(ownerName),
          },
          children: [],
          isExpanded: false,
        };

        itemsMap.set(obj.id, item);
      });

      // STEP 5: Build hierarchy relationships
      objectives?.forEach((obj: any) => {
        const item = itemsMap.get(obj.id);
        if (!item) return;

        // CRITICAL: Portfolio objectives link to Yearly Goals via parent_goal_id
        if (obj.tier === 'portfolio') {
          if (obj.parent_goal_id) {
            const parentGoal = itemsMap.get(obj.parent_goal_id);
            if (parentGoal) {
              parentGoal.children.push(item);
              console.log(`✅ Linked Portfolio "${obj.summary}" to Yearly Goal "${parentGoal.title}"`);
            } else {
              console.warn(`⚠️ Portfolio objective "${obj.summary}" has parent_goal_id ${obj.parent_goal_id} but parent not found`);
            }
          } else {
            console.warn(`⚠️ Portfolio objective "${obj.summary}" has no parent_goal_id`);
          }
        }
        // Program and Team objectives link via parent_objective_id
        else if (obj.parent_objective_id) {
          const parent = itemsMap.get(obj.parent_objective_id);
          if (parent) {
            parent.children.push(item);
            console.log(`✅ Linked ${obj.tier} "${obj.summary}" to parent "${parent.title}"`);
          } else {
            console.warn(`⚠️ ${obj.tier} objective "${obj.summary}" has parent_objective_id ${obj.parent_objective_id} but parent not found`);
          }
        } else if (obj.tier !== 'portfolio') {
          console.warn(`⚠️ ${obj.tier} objective "${obj.summary}" has no parent`);
        }
      });

      console.log('✅ OKR Tree - Yearly Goals (root):', yearlyGoals?.length);
      console.log('✅ OKR Tree - Total Objectives:', objectives?.length);
      console.log('✅ OKR Tree - Root items with children:', rootItems.filter(r => r.children.length > 0).length);

      return rootItems;
    },
    enabled: true,
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
