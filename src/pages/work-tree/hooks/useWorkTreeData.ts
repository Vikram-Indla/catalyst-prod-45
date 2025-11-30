import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type WorkTreeView = 'top-down' | 'bottom-up' | 'team' | 'strategy' | 'theme-group';

export function useWorkTreeData(view: WorkTreeView) {
  return useQuery({
    queryKey: ['work-tree', view],
    queryFn: async () => {
      const tree = await fetchWorkTreeData(view);
      const metrics = await calculateMetrics();
      return { tree, ...metrics };
    },
  });
}

async function fetchWorkTreeData(view: WorkTreeView) {
  switch (view) {
    case 'strategy':
      return fetchStrategyView();
    case 'theme-group':
      return fetchThemeGroupView();
    case 'top-down':
      return fetchTopDownView();
    case 'bottom-up':
    case 'team':
      return fetchBottomUpView();
    default:
      return [];
  }
}

async function fetchStrategyView() {
  const { data: themes } = await supabase
    .from('strategic_themes')
    .select('id, name')
    .order('name');

  if (!themes) return [];

  const nodes = await Promise.all(
    themes.map(async (theme) => {
      const { data: epics } = await supabase
        .from('epics')
        .select('id, name, health, estimate, state')
        .eq('theme_id', theme.id)
        .is('deleted_at', null)
        .order('global_rank');

      const epicNodes = await Promise.all(
        (epics || []).map(async (epic) => {
          const { data: features } = await supabase
            .from('features')
            .select('id, name, health, estimate_points, status')
            .eq('epic_id', epic.id)
            .is('deleted_at', null)
            .order('global_rank');

          const featureCount = features?.length || 0;
          const completedFeatures = features?.filter(f => f.status === 'done').length || 0;
          const progress = featureCount > 0 ? Math.round((completedFeatures / featureCount) * 100) : 0;

          return {
            id: epic.id,
            type: 'epic',
            title: epic.name,
            health: epic.health || undefined,
            points: epic.estimate || 0,
            itemCount: featureCount,
            progress,
            state: epic.state,
            children: (features || []).map(f => ({
              id: f.id,
              type: 'feature',
              title: f.name,
              health: f.health || undefined,
              points: f.estimate_points || 0,
              state: f.status,
            })),
          };
        })
      );

      const totalItems = epicNodes.reduce((sum, e) => sum + (e.itemCount || 0), 0);
      const avgProgress = epicNodes.length > 0 
        ? Math.round(epicNodes.reduce((sum, e) => sum + e.progress, 0) / epicNodes.length)
        : 0;

      return {
        id: theme.id,
        type: 'theme',
        title: theme.name,
        itemCount: totalItems,
        progress: avgProgress,
        children: epicNodes,
      };
    })
  );

  return nodes;
}

async function fetchThemeGroupView() {
  return fetchStrategyView();
}

async function fetchTopDownView() {
  const { data: epics } = await supabase
    .from('epics')
    .select('id, name, health, estimate, state, theme_id')
    .is('deleted_at', null)
    .order('global_rank');

  if (!epics) return [];

  const nodes = await Promise.all(
    epics.map(async (epic) => {
      const { data: features } = await supabase
        .from('features')
        .select('id, name, health, estimate_points, status')
        .eq('epic_id', epic.id)
        .is('deleted_at', null)
        .order('global_rank');

      const featureCount = features?.length || 0;
      const completedFeatures = features?.filter(f => f.status === 'done').length || 0;
      const progress = featureCount > 0 ? Math.round((completedFeatures / featureCount) * 100) : 0;

      return {
        id: epic.id,
        type: 'epic',
        title: epic.name,
        health: epic.health || undefined,
        points: epic.estimate || 0,
        itemCount: featureCount,
        progress,
        state: epic.state,
        children: (features || []).map(f => ({
          id: f.id,
          type: 'feature',
          title: f.name,
          health: f.health || undefined,
          points: f.estimate_points || 0,
          state: f.status,
        })),
      };
    })
  );

  return nodes;
}

async function fetchBottomUpView() {
  const { data: features } = await supabase
    .from('features')
    .select('id, name, health, estimate_points, status, epic_id')
    .is('deleted_at', null)
    .order('global_rank');

  if (!features) return [];

  const epicMap = new Map();
  
  features.forEach(feature => {
    if (!epicMap.has(feature.epic_id)) {
      epicMap.set(feature.epic_id, []);
    }
    epicMap.get(feature.epic_id).push({
      id: feature.id,
      type: 'feature',
      title: feature.name,
      health: feature.health || undefined,
      points: feature.estimate_points || 0,
      state: feature.status,
    });
  });

  const epicIds = Array.from(epicMap.keys()).filter(id => id);
  if (epicIds.length === 0) return [];

  const { data: epics } = await supabase
    .from('epics')
    .select('id, name, health, estimate, state')
    .in('id', epicIds)
    .is('deleted_at', null)
    .order('global_rank');

  return (epics || []).map(epic => {
    const children = epicMap.get(epic.id) || [];
    const completedChildren = children.filter(c => c.state === 'done').length;
    const progress = children.length > 0 ? Math.round((completedChildren / children.length) * 100) : 0;

    return {
      id: epic.id,
      type: 'epic',
      title: epic.name,
      health: epic.health || undefined,
      points: epic.estimate || 0,
      itemCount: children.length,
      progress,
      state: epic.state,
      children,
    };
  });
}

async function calculateMetrics() {
  const { data: epics } = await supabase
    .from('epics')
    .select('id, status')
    .is('deleted_at', null);

  const { data: features } = await supabase
    .from('features')
    .select('id, status')
    .is('deleted_at', null);

  const epicTotal = epics?.length || 0;
  const epicCompleted = epics?.filter(e => e.status === 'done').length || 0;

  const featureTotal = features?.length || 0;
  const featureCompleted = features?.filter(f => f.status === 'done').length || 0;

  return {
    epicTotal,
    epicCompleted,
    featureTotal,
    featureCompleted,
    storyTotal: 0,
    storyCompleted: 0,
    taskTotal: 0,
    taskCompleted: 0,
  };
}
