// =====================================================
// LINK SERVICE
// CRUD operations for work item links
// =====================================================

import { supabase } from '@/integrations/supabase/client';
import { WorkItemLink, WorkItemType, LinkType } from '@/types/views';

export interface CreateLinkInput {
  source_type: WorkItemType;
  source_id: string;
  target_type: WorkItemType;
  target_id: string;
  link_type: LinkType;
}

export interface LinkWithDetails extends WorkItemLink {
  target_item?: {
    id: string;
    identifier: string;
    title: string;
    status: string;
    type: WorkItemType;
  };
}

// -----------------------------------------------------
// Create Link
// -----------------------------------------------------
export async function createLink(input: CreateLinkInput): Promise<WorkItemLink> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('Not authenticated');

  // Create the link using actual column names from schema
  const { data, error } = await supabase
    .from('work_item_links')
    .insert({
      from_work_item_type: input.source_type,
      from_work_item_id: input.source_id,
      to_work_item_type: input.target_type,
      to_work_item_id: input.target_id,
      link_type: input.link_type,
      created_by: user.user.id
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('Link already exists');
    }
    throw error;
  }

  // If it's a blocking link, also create a dependency
  if (input.link_type === 'blocks') {
    await supabase
      .from('work_item_dependencies')
      .insert({
        dependent_type: input.target_type,
        dependent_id: input.target_id,
        blocker_type: input.source_type,
        blocker_id: input.source_id,
        created_by: user.user.id
      })
      .select();
  } else if (input.link_type === 'blocked_by') {
    await supabase
      .from('work_item_dependencies')
      .insert({
        dependent_type: input.source_type,
        dependent_id: input.source_id,
        blocker_type: input.target_type,
        blocker_id: input.target_id,
        created_by: user.user.id
      })
      .select();
  }

  // Map to our interface
  return {
    id: data.id,
    from_work_item_type: data.from_work_item_type as WorkItemType,
    from_work_item_id: data.from_work_item_id,
    to_work_item_type: data.to_work_item_type as WorkItemType,
    to_work_item_id: data.to_work_item_id,
    link_type: data.link_type as LinkType,
    program_id: data.program_id,
    pi_id: data.pi_id,
    description: data.description,
    created_by: data.created_by,
    created_at: data.created_at,
    updated_at: data.updated_at
  };
}

// -----------------------------------------------------
// Create Multiple Links (batch)
// -----------------------------------------------------
export async function createLinks(inputs: CreateLinkInput[]): Promise<WorkItemLink[]> {
  const results: WorkItemLink[] = [];
  
  for (const input of inputs) {
    try {
      const link = await createLink(input);
      results.push(link);
    } catch (error) {
      console.error(`Failed to create link: ${error}`);
    }
  }

  return results;
}

// -----------------------------------------------------
// Get Links for Item
// -----------------------------------------------------
export async function getLinksForItem(
  itemType: WorkItemType,
  itemId: string
): Promise<LinkWithDetails[]> {
  // Get links where this item is the source (from_work_item)
  const { data: sourceLinks, error: sourceError } = await supabase
    .from('work_item_links')
    .select('*')
    .eq('from_work_item_type', itemType)
    .eq('from_work_item_id', itemId);

  if (sourceError) throw sourceError;

  // Enrich with target item details
  const enrichedLinks: LinkWithDetails[] = [];

  for (const link of sourceLinks || []) {
    const targetItem = await getItemDetails(
      link.to_work_item_type as WorkItemType, 
      link.to_work_item_id
    );
    enrichedLinks.push({
      id: link.id,
      from_work_item_type: link.from_work_item_type as WorkItemType,
      from_work_item_id: link.from_work_item_id,
      to_work_item_type: link.to_work_item_type as WorkItemType,
      to_work_item_id: link.to_work_item_id,
      link_type: link.link_type as LinkType,
      program_id: link.program_id,
      pi_id: link.pi_id,
      description: link.description,
      created_by: link.created_by,
      created_at: link.created_at,
      updated_at: link.updated_at,
      target_item: targetItem
    });
  }

  return enrichedLinks;
}

// -----------------------------------------------------
// Get Item Details
// -----------------------------------------------------
async function getItemDetails(
  itemType: WorkItemType,
  itemId: string
): Promise<{
  id: string;
  identifier: string;
  title: string;
  status: string;
  type: WorkItemType;
} | undefined> {
  if (itemType === 'epic') {
    const { data } = await supabase
      .from('epics')
      .select('id, name, status, epic_key')
      .eq('id', itemId)
      .single();
    
    if (data) {
      return {
        id: data.id,
        identifier: data.epic_key || data.id.slice(0, 8),
        title: data.name,
        status: data.status || 'active',
        type: 'epic'
      };
    }
  } else if (itemType === 'feature') {
    const { data } = await supabase
      .from('features')
      .select('id, display_id, name, workflow_status')
      .eq('id', itemId)
      .single();
    
    if (data) {
      return {
        id: data.id,
        identifier: data.display_id || data.id.slice(0, 8),
        title: data.name,
        status: data.workflow_status || 'backlog',
        type: 'feature'
      };
    }
  } else if (itemType === 'story') {
    const { data } = await supabase
      .from('stories')
      .select('id, story_key, title, name, status')
      .eq('id', itemId)
      .single();
    
    if (data) {
      return {
        id: data.id,
        identifier: data.story_key || data.id.slice(0, 8),
        title: data.title || data.name || 'Untitled',
        status: data.status || 'backlog',
        type: 'story'
      };
    }
  }

  return undefined;
}

// -----------------------------------------------------
// Search Work Items
// -----------------------------------------------------
export async function searchWorkItems(
  query: string,
  projectId: string,
  typeFilter?: WorkItemType | 'all'
): Promise<Array<{
  id: string;
  identifier: string;
  title: string;
  status: string;
  type: WorkItemType;
}>> {
  const results: Array<{
    id: string;
    identifier: string;
    title: string;
    status: string;
    type: WorkItemType;
  }> = [];

  const searchLower = query.toLowerCase();

  // Search Epics - epics don't have project_id, they have program_id
  if (!typeFilter || typeFilter === 'all' || typeFilter === 'epic') {
    const { data: epics } = await supabase
      .from('epics')
      .select('id, name, status, epic_key')
      .ilike('name', `%${searchLower}%`)
      .limit(10);

    for (const epic of epics || []) {
      results.push({
        id: epic.id,
        identifier: epic.epic_key || epic.id.slice(0, 8),
        title: epic.name,
        status: epic.status || 'active',
        type: 'epic'
      });
    }
  }

  // Search Features
  if (!typeFilter || typeFilter === 'all' || typeFilter === 'feature') {
    const { data: features } = await supabase
      .from('features')
      .select('id, display_id, name, workflow_status, project_id')
      .eq('project_id', projectId)
      .ilike('name', `%${searchLower}%`)
      .limit(10);

    for (const feature of features || []) {
      results.push({
        id: feature.id,
        identifier: feature.display_id || feature.id.slice(0, 8),
        title: feature.name,
        status: feature.workflow_status || 'backlog',
        type: 'feature'
      });
    }
  }

  // Search Stories
  if (!typeFilter || typeFilter === 'all' || typeFilter === 'story') {
    // Get features for this project first
    const { data: projectFeatures } = await supabase
      .from('features')
      .select('id')
      .eq('project_id', projectId);

    const featureIds = (projectFeatures || []).map(f => f.id);

    if (featureIds.length > 0) {
      const { data: stories } = await supabase
        .from('stories')
        .select('id, story_key, title, name, status, feature_id')
        .in('feature_id', featureIds)
        .or(`title.ilike.%${searchLower}%,name.ilike.%${searchLower}%`)
        .limit(10);

      for (const story of stories || []) {
        results.push({
          id: story.id,
          identifier: story.story_key || story.id.slice(0, 8),
          title: story.title || story.name || 'Untitled',
          status: story.status || 'backlog',
          type: 'story'
        });
      }
    }
  }

  return results;
}

// -----------------------------------------------------
// Delete Link
// -----------------------------------------------------
export async function deleteLink(linkId: string): Promise<void> {
  // Get link details first
  const { data: link } = await supabase
    .from('work_item_links')
    .select('*')
    .eq('id', linkId)
    .single();

  if (link) {
    // If it was a blocking link, also remove the dependency
    if (link.link_type === 'blocks') {
      await supabase
        .from('work_item_dependencies')
        .delete()
        .eq('blocker_type', link.from_work_item_type)
        .eq('blocker_id', link.from_work_item_id)
        .eq('dependent_type', link.to_work_item_type)
        .eq('dependent_id', link.to_work_item_id);
    } else if (link.link_type === 'blocked_by') {
      await supabase
        .from('work_item_dependencies')
        .delete()
        .eq('blocker_type', link.to_work_item_type)
        .eq('blocker_id', link.to_work_item_id)
        .eq('dependent_type', link.from_work_item_type)
        .eq('dependent_id', link.from_work_item_id);
    }
  }

  const { error } = await supabase
    .from('work_item_links')
    .delete()
    .eq('id', linkId);

  if (error) throw error;
}
