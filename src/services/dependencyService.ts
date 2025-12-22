// =====================================================
// DEPENDENCY SERVICE
// Complete CRUD operations for dependencies
// =====================================================

import { supabase } from '@/integrations/supabase/client';
import { 
  Dependency, 
  DependencyWithDetails, 
  CreateDependencyInput, 
  UpdateDependencyInput,
  DependencyCounts,
  DependencyGraph,
  DependencyNode
} from '@/types/dependencies';
import { WorkItemType } from '@/types/views';

// -----------------------------------------------------
// Create Dependency
// -----------------------------------------------------
export async function createDependency(input: CreateDependencyInput): Promise<Dependency> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('Not authenticated');

  // Check for circular dependency
  const { data: isCircular } = await supabase.rpc('check_circular_dependency', {
    p_dependent_type: input.dependent_type,
    p_dependent_id: input.dependent_id,
    p_blocker_type: input.blocker_type,
    p_blocker_id: input.blocker_id
  });

  if (isCircular) {
    throw new Error('Cannot create circular dependency');
  }

  const { data, error } = await supabase
    .from('work_item_dependencies')
    .insert({
      dependent_type: input.dependent_type,
      dependent_id: input.dependent_id,
      blocker_type: input.blocker_type,
      blocker_id: input.blocker_id,
      dependency_type: input.dependency_type || 'finish_to_start',
      notes: input.notes || null,
      created_by: user.user.id
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('Dependency already exists');
    }
    throw error;
  }

  return data as Dependency;
}

// -----------------------------------------------------
// Get Dependencies for Item
// -----------------------------------------------------
export async function getDependenciesForItem(
  itemType: WorkItemType,
  itemId: string
): Promise<{
  blocking: DependencyWithDetails[];
  blockedBy: DependencyWithDetails[];
}> {
  // Get items this one blocks (this item is the blocker)
  const { data: blocking, error: blockingError } = await supabase
    .from('work_item_dependencies')
    .select('*')
    .eq('blocker_type', itemType)
    .eq('blocker_id', itemId)
    .eq('is_resolved', false);

  if (blockingError) throw blockingError;

  // Get items blocking this one (this item is dependent)
  const { data: blockedBy, error: blockedByError } = await supabase
    .from('work_item_dependencies')
    .select('*')
    .eq('dependent_type', itemType)
    .eq('dependent_id', itemId)
    .eq('is_resolved', false);

  if (blockedByError) throw blockedByError;

  // Enrich with item details
  const enrichedBlocking = await enrichDependencies(blocking as Dependency[] || [], 'dependent');
  const enrichedBlockedBy = await enrichDependencies(blockedBy as Dependency[] || [], 'blocker');

  return {
    blocking: enrichedBlocking,
    blockedBy: enrichedBlockedBy
  };
}

// Helper to enrich dependencies with item details
async function enrichDependencies(
  dependencies: Dependency[],
  enrichField: 'dependent' | 'blocker'
): Promise<DependencyWithDetails[]> {
  const enriched: DependencyWithDetails[] = [];

  for (const dep of dependencies) {
    const itemType = enrichField === 'dependent' ? dep.dependent_type : dep.blocker_type;
    const itemId = enrichField === 'dependent' ? dep.dependent_id : dep.blocker_id;

    let item = null;
    if (itemType === 'feature') {
      const { data } = await supabase
        .from('features')
        .select('id, display_id, name, workflow_status')
        .eq('id', itemId)
        .single();
      if (data) {
        item = {
          id: data.id,
          identifier: data.display_id || data.id.slice(0, 8),
          title: data.name,
          status: data.workflow_status || 'backlog'
        };
      }
    } else if (itemType === 'story') {
      const { data } = await supabase
        .from('stories')
        .select('id, story_key, title, name, status')
        .eq('id', itemId)
        .single();
      if (data) {
        item = {
          id: data.id,
          identifier: data.story_key || data.id.slice(0, 8),
          title: data.title || data.name || 'Untitled',
          status: data.status
        };
      }
    }

    enriched.push({
      ...dep,
      [enrichField === 'dependent' ? 'dependent_item' : 'blocker_item']: item
    });
  }

  return enriched;
}

// -----------------------------------------------------
// Get Dependency Counts
// -----------------------------------------------------
export async function getDependencyCounts(
  itemType: WorkItemType,
  itemId: string
): Promise<DependencyCounts> {
  const { data, error } = await supabase.rpc('get_dependency_counts', {
    p_item_type: itemType,
    p_item_id: itemId
  });

  if (error) throw error;

  const result = data?.[0] || { blocks_count: 0, blocked_by_count: 0 };
  return {
    blocks: result.blocks_count,
    blocked_by: result.blocked_by_count,
    total: result.blocks_count + result.blocked_by_count
  };
}

// -----------------------------------------------------
// Get All Blockers (recursive chain)
// -----------------------------------------------------
export async function getAllBlockers(
  itemType: WorkItemType,
  itemId: string
): Promise<DependencyNode[]> {
  const { data, error } = await supabase.rpc('get_all_blockers', {
    p_item_type: itemType,
    p_item_id: itemId
  });

  if (error) throw error;

  // Enrich with item details
  const nodes: DependencyNode[] = [];
  for (const row of data || []) {
    let item = null;
    if (row.blocker_type === 'feature') {
      const { data: feature } = await supabase
        .from('features')
        .select('id, display_id, name, workflow_status')
        .eq('id', row.blocker_id)
        .single();
      if (feature) {
        item = {
          type: 'feature' as WorkItemType,
          id: feature.id,
          identifier: feature.display_id || feature.id.slice(0, 8),
          title: feature.name,
          status: feature.workflow_status || 'backlog',
          depth: row.depth
        };
      }
    } else if (row.blocker_type === 'story') {
      const { data: story } = await supabase
        .from('stories')
        .select('id, story_key, title, name, status')
        .eq('id', row.blocker_id)
        .single();
      if (story) {
        item = {
          type: 'story' as WorkItemType,
          id: story.id,
          identifier: story.story_key || story.id.slice(0, 8),
          title: story.title || story.name || 'Untitled',
          status: story.status,
          depth: row.depth
        };
      }
    }
    if (item) nodes.push(item);
  }

  return nodes;
}

// -----------------------------------------------------
// Update Dependency
// -----------------------------------------------------
export async function updateDependency(
  dependencyId: string,
  input: UpdateDependencyInput
): Promise<Dependency> {
  const { data: user } = await supabase.auth.getUser();
  
  const updateData: Record<string, unknown> = { ...input };
  
  if (input.is_resolved === true) {
    updateData.resolved_at = new Date().toISOString();
    updateData.resolved_by = user.user?.id;
  } else if (input.is_resolved === false) {
    updateData.resolved_at = null;
    updateData.resolved_by = null;
  }

  const { data, error } = await supabase
    .from('work_item_dependencies')
    .update(updateData)
    .eq('id', dependencyId)
    .select()
    .single();

  if (error) throw error;
  return data as Dependency;
}

// -----------------------------------------------------
// Delete Dependency
// -----------------------------------------------------
export async function deleteDependency(dependencyId: string): Promise<void> {
  const { error } = await supabase
    .from('work_item_dependencies')
    .delete()
    .eq('id', dependencyId);

  if (error) throw error;
}

// -----------------------------------------------------
// Get Dependencies for Multiple Items (batch)
// -----------------------------------------------------
export async function getBatchDependencyCounts(
  items: Array<{ type: WorkItemType; id: string }>
): Promise<Map<string, DependencyCounts>> {
  const result = new Map<string, DependencyCounts>();

  if (items.length === 0) return result;

  // Get all item IDs
  const allIds = items.map(i => i.id);

  // Get blocking counts
  const { data: blockingData } = await supabase
    .from('work_item_dependencies')
    .select('blocker_type, blocker_id')
    .eq('is_resolved', false)
    .in('blocker_id', allIds);

  // Get blocked by counts
  const { data: blockedByData } = await supabase
    .from('work_item_dependencies')
    .select('dependent_type, dependent_id')
    .eq('is_resolved', false)
    .in('dependent_id', allIds);

  // Count for each item
  for (const item of items) {
    const key = `${item.type}:${item.id}`;
    const blocks = (blockingData || []).filter(
      d => d.blocker_type === item.type && d.blocker_id === item.id
    ).length;
    const blockedBy = (blockedByData || []).filter(
      d => d.dependent_type === item.type && d.dependent_id === item.id
    ).length;

    result.set(key, { blocks, blocked_by: blockedBy, total: blocks + blockedBy });
  }

  return result;
}

// -----------------------------------------------------
// Get Dependency Graph for Visualization
// -----------------------------------------------------
export async function getDependencyGraph(
  projectId: string
): Promise<DependencyGraph> {
  // Get all features for project
  const { data: features } = await supabase
    .from('features')
    .select('id, display_id, name, workflow_status, project_id')
    .eq('project_id', projectId);

  // Get all stories for those features
  const featureIds = (features || []).map(f => f.id);
  
  if (featureIds.length === 0) {
    return { nodes: [], edges: [] };
  }

  const { data: stories } = await supabase
    .from('stories')
    .select('id, story_key, title, name, status, feature_id')
    .in('feature_id', featureIds);

  // Get all dependencies involving these items
  const allIds = [...featureIds, ...(stories || []).map(s => s.id)];
  const { data: dependencies } = await supabase
    .from('work_item_dependencies')
    .select('*')
    .or(`dependent_id.in.(${allIds.join(',')}),blocker_id.in.(${allIds.join(',')})`);

  // Build nodes
  const nodes: DependencyNode[] = [
    ...(features || []).map(f => ({
      type: 'feature' as WorkItemType,
      id: f.id,
      identifier: f.display_id || f.id.slice(0, 8),
      title: f.name,
      status: f.workflow_status || 'backlog',
      depth: 0
    })),
    ...(stories || []).map(s => ({
      type: 'story' as WorkItemType,
      id: s.id,
      identifier: s.story_key || s.id.slice(0, 8),
      title: s.title || s.name || 'Untitled',
      status: s.status,
      depth: 1
    }))
  ];

  // Build edges
  const edges = (dependencies || []).map(d => ({
    from: { type: d.blocker_type as WorkItemType, id: d.blocker_id },
    to: { type: d.dependent_type as WorkItemType, id: d.dependent_id },
    is_resolved: d.is_resolved || false
  }));

  return { nodes, edges };
}
