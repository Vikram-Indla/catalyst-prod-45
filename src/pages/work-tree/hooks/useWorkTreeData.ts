import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type WorkTreeView = 'top-down' | 'bottom-up' | 'team' | 'strategy' | 'theme-group';

interface WorkTreeOptions {
  teamId?: string;
  programId?: string;
}

export function useWorkTreeData(view: WorkTreeView, options?: WorkTreeOptions) {
  const { teamId, programId } = options || {};
  
  return useQuery({
    queryKey: ['work-tree', view, teamId, programId],
    queryFn: async () => {
      const tree = await fetchWorkTreeData(view, { teamId, programId });
      const metrics = await calculateMetrics({ teamId, programId });
      return { tree, ...metrics };
    },
  });
}

async function fetchWorkTreeData(view: WorkTreeView, options: WorkTreeOptions) {
  const { teamId, programId } = options;
  
  switch (view) {
    case 'strategy':
      return fetchStrategyView();
    case 'theme-group':
      return fetchThemeGroupView();
    case 'top-down':
      return fetchTopDownView(programId);
    case 'team':
      return fetchTeamView(teamId);
    case 'bottom-up':
      return fetchBottomUpView(teamId, programId);
    default:
      return [];
  }
}

// Team View: Stories → Features → Epics (filtered by team)
async function fetchTeamView(teamId?: string) {
  if (!teamId) return [];

  // Fetch stories for this team
  const { data: stories } = await supabase
    .from('stories')
    .select('id, name, status, estimate_points, feature_id, features(id, name, health, status, epic_id)')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false });

  if (!stories || stories.length === 0) return [];

  // Group stories by feature
  const featureMap = new Map<string, { feature: any; stories: any[] }>();
  const orphanStories: any[] = [];

  stories.forEach(story => {
    if (story.feature_id && story.features) {
      if (!featureMap.has(story.feature_id)) {
        featureMap.set(story.feature_id, {
          feature: story.features,
          stories: []
        });
      }
      featureMap.get(story.feature_id)!.stories.push(story);
    } else {
      orphanStories.push(story);
    }
  });

  // Get unique epic IDs from features
  const epicIds = new Set<string>();
  featureMap.forEach(({ feature }) => {
    if (feature.epic_id) epicIds.add(feature.epic_id);
  });

  // Fetch epics
  const { data: epics } = await supabase
    .from('epics')
    .select('id, name, health, estimate, state, epic_key')
    .in('id', Array.from(epicIds))
    .is('deleted_at', null);

  // Group features by epic
  const epicMap = new Map<string, { epic: any; features: any[] }>();
  
  featureMap.forEach(({ feature, stories: featureStories }) => {
    const epicId = feature.epic_id;
    if (!epicId) return;
    
    if (!epicMap.has(epicId)) {
      const epic = epics?.find(e => e.id === epicId);
      if (epic) {
        epicMap.set(epicId, { epic, features: [] });
      }
    }
    
    const completedStories = featureStories.filter(s => s.status === 'done' || s.status === 'accepted').length;
    const totalPoints = featureStories.reduce((sum, s) => sum + (s.estimate_points || 0), 0);
    const progress = featureStories.length > 0 ? Math.round((completedStories / featureStories.length) * 100) : 0;
    
    epicMap.get(epicId)?.features.push({
      id: feature.id,
      type: 'feature',
      title: feature.name,
      health: feature.health || undefined,
      points: totalPoints,
      itemCount: featureStories.length,
      progress,
      children: featureStories.map(s => ({
        id: s.id,
        type: 'story',
        title: s.name,
        points: s.estimate_points || 0,
        health: s.status === 'done' || s.status === 'accepted' ? 'green' : s.status === 'blocked' ? 'red' : undefined,
      }))
    });
  });

  // Build final tree
  const nodes: any[] = [];
  
  epicMap.forEach(({ epic, features }) => {
    const totalItems = features.reduce((sum, f) => sum + (f.itemCount || 0), 0);
    const totalPoints = features.reduce((sum, f) => sum + (f.points || 0), 0);
    const avgProgress = features.length > 0 
      ? Math.round(features.reduce((sum, f) => sum + f.progress, 0) / features.length)
      : 0;

    nodes.push({
      id: epic.id,
      type: 'epic',
      title: `${epic.epic_key || 'EPIC'} - ${epic.name}`,
      health: epic.health || undefined,
      points: totalPoints,
      itemCount: totalItems,
      progress: avgProgress,
      children: features
    });
  });

  // Add orphan stories section if any
  if (orphanStories.length > 0) {
    nodes.push({
      id: 'orphan-stories',
      type: 'section',
      title: 'ORPHAN STORIES',
      itemCount: orphanStories.length,
      points: orphanStories.reduce((sum, s) => sum + (s.estimate_points || 0), 0),
      children: orphanStories.map(s => ({
        id: s.id,
        type: 'story',
        title: s.name,
        points: s.estimate_points || 0,
        health: s.status === 'done' || s.status === 'accepted' ? 'green' : s.status === 'blocked' ? 'red' : undefined,
      }))
    });
  }

  return nodes;
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

async function fetchTopDownView(programId?: string) {
  let query = supabase
    .from('epics')
    .select('id, name, health, estimate, state, theme_id, epic_key')
    .is('deleted_at', null)
    .order('global_rank');

  if (programId) {
    query = query.eq('primary_program_id', programId);
  }

  const { data: epics } = await query;

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
        title: `${epic.epic_key || 'EPIC'} - ${epic.name}`,
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

async function fetchBottomUpView(teamId?: string, programId?: string) {
  let query = supabase
    .from('features')
    .select('id, name, health, estimate_points, status, epic_id')
    .is('deleted_at', null)
    .order('global_rank');

  if (programId) {
    query = query.eq('program_id', programId);
  }

  const { data: features } = await query;

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
    .select('id, name, health, estimate, state, epic_key')
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
      title: `${epic.epic_key || 'EPIC'} - ${epic.name}`,
      health: epic.health || undefined,
      points: epic.estimate || 0,
      itemCount: children.length,
      progress,
      state: epic.state,
      children,
    };
  });
}

async function calculateMetrics(options: WorkTreeOptions) {
  const { teamId, programId } = options;

  // Epic metrics
  let epicQuery = supabase.from('epics').select('id, status').is('deleted_at', null);
  if (programId) epicQuery = epicQuery.eq('primary_program_id', programId);
  const { data: epics } = await epicQuery;

  // Feature metrics
  let featureQuery = supabase.from('features').select('id, status').is('deleted_at', null);
  if (programId) featureQuery = featureQuery.eq('program_id', programId);
  const { data: features } = await featureQuery;

  // Story metrics (filtered by team if provided)
  let storyQuery = supabase.from('stories').select('id, status, estimate_points');
  if (teamId) storyQuery = storyQuery.eq('team_id', teamId);
  const { data: stories } = await storyQuery;

  // Task metrics
  let taskQuery = supabase.from('subtasks').select('id, status');
  const { data: tasks } = await taskQuery;

  const epicTotal = epics?.length || 0;
  const epicCompleted = epics?.filter(e => e.status === 'done').length || 0;

  const featureTotal = features?.length || 0;
  const featureCompleted = features?.filter(f => f.status === 'done').length || 0;

  const storyTotal = stories?.length || 0;
  const storyCompleted = stories?.filter(s => s.status === 'done').length || 0;
  const storyPointsTotal = stories?.reduce((sum, s) => sum + (s.estimate_points || 0), 0) || 0;
  const storyPointsAccepted = stories?.filter(s => s.status === 'done').reduce((sum, s) => sum + (s.estimate_points || 0), 0) || 0;

  const taskTotal = tasks?.length || 0;
  const taskCompleted = tasks?.filter(t => t.status === 'done').length || 0;

  return {
    epicTotal,
    epicCompleted,
    featureTotal,
    featureCompleted,
    storyTotal,
    storyCompleted,
    storyPointsTotal,
    storyPointsAccepted,
    taskTotal,
    taskCompleted,
  };
}
