import { supabase } from '@/integrations/supabase/client';
import { 
  BacklogQueryParams, 
  BacklogResponse, 
  BacklogItem, 
  BacklogMeta,
  MassMovePayload,
  RankUpdatePayload,
  BacklogPISection
} from '../types';

/**
 * Fetch backlog items based on query parameters
 * CRITICAL: For program-scoped backlogs, programId MUST be provided to prevent cross-program data leakage
 */
export async function fetchBacklogItems(params: BacklogQueryParams): Promise<BacklogResponse> {
  const { scope, type, timeboxType, timeboxId, sort, filters, search, programId } = params;

  // HARD GUARD: For program-scoped epic backlog, programId is REQUIRED
  if (scope === 'program' && type === 'epic' && !programId) {
    console.error('[BacklogAPI] Program-scoped epic backlog requires programId');
    return {
      items: [],
      meta: await fetchBacklogMeta(params),
      sections: [],
    };
  }

  // Build query based on type
  const tableName = getTableName(type);
  let query: any;
  
  // For epics, include theme and business_request relations
  if (type === 'epic') {
    query = (supabase as any).from(tableName).select(`
      *,
      strategic_themes:theme_id(id, name),
      business_requests:business_request_id(id, request_key, title)
    `);
  } else {
    query = (supabase as any).from(tableName).select('*');
  }

  // CRITICAL: Filter by programId for program-scoped queries
  if (programId && type === 'epic') {
    query = query.eq('primary_program_id', programId);
  } else if (programId && type === 'feature') {
    query = query.eq('program_id', programId);
  }

  // Apply search
  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  // Apply sorting (default to rank)
  if (sort) {
    query = query.order(sort.field, { ascending: sort.direction === 'asc' });
  } else {
    query = query.order('global_rank', { ascending: true });
  }

  // Exclude soft-deleted and parked items
  query = query.is('deleted_at', null).is('parked_at', null);

  const { data, error } = await query;
  if (error) throw error;
  
  // Transform epic data to include theme and BR info
  const transformedData = (data || []).map((item: any) => ({
    ...item,
    themeName: item.strategic_themes?.name || null,
    themeId: item.theme_id,
    brKey: item.business_requests?.request_key || null,
    brTitle: item.business_requests?.title || null,
    brId: item.business_request_id,
  }));

  // Fetch metadata
  const meta = await fetchBacklogMeta(params);

  // Group items into PI sections
  const sections = await groupItemsIntoPISections(transformedData || [], type, timeboxType);

  return {
    items: transformedData as BacklogItem[],
    meta,
    sections,
  };
}

/**
 * Fetch unassigned items for the unassigned backlog panel
 * CRITICAL: programId scoping applies here as well
 */
export async function fetchUnassignedItems(params: BacklogQueryParams): Promise<{ items: BacklogItem[]; meta: BacklogMeta }> {
  const { type, programId, scope } = params;

  // HARD GUARD: For program-scoped epic backlog, programId is REQUIRED
  if (scope === 'program' && type === 'epic' && !programId) {
    console.error('[BacklogAPI] Program-scoped unassigned items require programId');
    return {
      items: [],
      meta: await fetchBacklogMeta(params),
    };
  }

  const tableName = getTableName(type);
  let query: any = (supabase as any).from(tableName).select('*');

  // CRITICAL: Filter by programId for program-scoped queries
  if (programId && type === 'epic') {
    query = query.eq('primary_program_id', programId);
  } else if (programId && type === 'feature') {
    query = query.eq('program_id', programId);
  }

  // Filter for unassigned items
  if (type === 'epic' || type === 'feature' || type === 'capability') {
    // Check for items not in epic_program_increments or feature_program_increments
    const { data: allItems } = await query
      .is('deleted_at', null)
      .is('parked_at', null);

    const assignmentTable: string = type === 'epic' ? 'epic_program_increments' : 
                           type === 'feature' ? 'feature_program_increments' : 
                           'epic_program_increments';

    const { data: assignments }: any = await supabase
      .from(assignmentTable as any)
      .select('*');

    const idField = type === 'epic' ? 'epic_id' : 'feature_id';
    const assignedIds = new Set(assignments?.map((a: any) => a[idField]) || []);
    const unassignedItems = (allItems || []).filter((item: any) => !assignedIds.has(item.id));

    const meta = await fetchBacklogMeta(params);
    return {
      items: unassignedItems as BacklogItem[],
      meta,
    };
  }

  // For stories, filter where sprint_id is null
  if (type === 'story') {
    query = query.is('sprint_id', null);
  }

  query = query.is('deleted_at', null).is('parked_at', null).order('global_rank');

  const { data, error } = await query;
  if (error) throw error;

  const meta = await fetchBacklogMeta(params);
  return {
    items: (data || []) as BacklogItem[],
    meta,
  };
}

/**
 * Update work item rank
 */
export async function updateRank(payload: RankUpdatePayload, type: string): Promise<void> {
  const { itemId, targetRank } = payload;
  
  const tableName = getTableName(type as any);
  const { error }: any = await supabase
    .from(tableName as any)
    .update({ global_rank: targetRank } as any)
    .eq('id', itemId);

  if (error) throw error;
}

/**
 * Update work item fields (for drag-drop assignment, state changes, etc.)
 */
export async function updateWorkItemFields(
  id: string,
  type: string,
  patch: Record<string, any>
): Promise<void> {
  const table = getTableName(type as any);
  const { error }: any = await supabase
    .from(table as any)
    .update(patch)
    .eq('id', id);

  if (error) throw error;
}

/**
 * Mass move items to PI/Sprint/Program/Team
 */
export async function massMoveItems(payload: MassMovePayload, type: string): Promise<void> {
  const { itemIds, target } = payload;

  if (target.piId) {
    // Move to PI - use epic_program_increments or feature_program_increments junction table
    const junctionTable: string = type === 'epic' ? 'epic_program_increments' : 'feature_program_increments';
    const idField = type === 'epic' ? 'epic_id' : 'feature_id';

    // Remove existing PI assignments
    await (supabase.from(junctionTable as any) as any).delete().in(idField, itemIds);

    // Add new PI assignments
    const inserts = itemIds.map(id => ({
      [idField]: id,
      pi_id: target.piId,
    }));

    const { error }: any = await (supabase.from(junctionTable as any) as any).insert(inserts);
    if (error) throw error;
  }

  if (target.sprintId && type === 'story') {
    const { error }: any = await (supabase
      .from('stories') as any)
      .update({ sprint_id: target.sprintId })
      .in('id', itemIds);
    if (error) throw error;
  }

  if (target.teamId && (type === 'feature' || type === 'story')) {
    const { error }: any = await (supabase
      .from(getTableName(type as any) as any) as any)
      .update({ team_id: target.teamId })
      .in('id', itemIds);
    if (error) throw error;
  }
}

/**
 * Mass delete items (soft delete)
 */
export async function massDeleteItems(itemIds: string[], type: string): Promise<void> {
  const table = getTableName(type as any);
  const { error }: any = await (supabase
    .from(table as any) as any)
    .update({ deleted_at: new Date().toISOString() })
    .in('id', itemIds);

  if (error) throw error;
}

/**
 * Fetch recycle bin items
 */
export async function fetchRecycleBinItems(type: string): Promise<BacklogItem[]> {
  const { data, error }: any = await (supabase
    .from(getTableName(type as any) as any) as any)
    .select('*')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });

  if (error) throw error;
  return (data || []) as BacklogItem[];
}

/**
 * Restore item from recycle bin
 */
export async function restoreFromRecycleBin(id: string, type: string): Promise<void> {
  const { error }: any = await (supabase
    .from(getTableName(type as any) as any) as any)
    .update({ deleted_at: null })
    .eq('id', id);

  if (error) throw error;
}

/**
 * Permanently delete item from recycle bin
 */
export async function deleteFromRecycleBin(id: string, type: string): Promise<void> {
  const { error }: any = await (supabase
    .from(getTableName(type as any) as any) as any)
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Move items to parking lot
 */
export async function moveToParkingLot(itemIds: string[], type: string): Promise<void> {
  const { error }: any = await (supabase
    .from(getTableName(type as any) as any) as any)
    .update({ parked_at: new Date().toISOString() })
    .in('id', itemIds);

  if (error) throw error;
}

/**
 * Restore items from parking lot
 */
export async function restoreFromParkingLot(itemIds: string[], type: string): Promise<void> {
  const { error }: any = await (supabase
    .from(getTableName(type as any) as any) as any)
    .update({ parked_at: null })
    .in('id', itemIds);

  if (error) throw error;
}

// Helper functions

function getTableName(type: any): string {
  const tableMap: Record<string, string> = {
    theme: 'strategic_themes',
    epic: 'epics',
    capability: 'capabilities',
    feature: 'features',
    story: 'stories',
    defect: 'defects',
    objective: 'objectives',
  };
  return tableMap[type] || 'epics';
}

async function fetchBacklogMeta(params: BacklogQueryParams): Promise<BacklogMeta> {
  // Fetch process steps
  const { data: processStepsData } = await supabase
    .from('process_steps')
    .select('*')
    .order('sort_order');

  const processSteps = (processStepsData || []).map((step: any) => ({
    id: step.id,
    name: step.name,
    order: step.sort_order,
    exitCriteria: step.exit_criteria,
  }));

  // Fetch program increments
  const { data: programIncrementsData } = await supabase
    .from('program_increments')
    .select('*')
    .order('start_date');

  const programIncrements = (programIncrementsData || []).map((pi: any) => ({
    id: pi.id,
    code: pi.name || `PI-${pi.id.slice(0, 4)}`,
    name: pi.name,
    startDate: pi.start_date,
    endDate: pi.end_date,
    status: pi.state as any,
  }));

  // Fetch teams if needed
  const { data: teamsData } = await supabase
    .from('teams')
    .select('*')
    .order('name');

  const teams = (teamsData || []).map((team: any) => ({
    id: team.id,
    name: team.name,
    programId: team.program_id,
  }));

  // Build metadata based on type
  const meta: BacklogMeta = {
    states: getStatesForType(params.type),
    processSteps,
    programIncrements,
    teams,
    fields: getFieldsForType(params.type),
    permissions: {
      canRank: true,
      canAssign: true,
      canMassMove: true,
      canMassDelete: true,
      canRestore: true,
      canPermanentDelete: false,
      canEdit: true,
      canCreate: true,
    },
    hideAcceptedConfig: {},
    rankingAllowed: true,
    availableViews: getAvailableViewsForType(params.type),
  };

  return meta;
}

async function groupItemsIntoPISections(
  items: any[],
  type: string,
  timeboxType: string
): Promise<BacklogPISection[]> {
  if (timeboxType !== 'pi') {
    return [];
  }

  // Fetch PI assignments
  const junctionTable: string = type === 'epic' ? 'epic_program_increments' : 
                       type === 'feature' ? 'feature_program_increments' : '';

  if (!junctionTable) {
    return [];
  }

  const { data: assignments }: any = await (supabase
    .from(junctionTable as any) as any)
    .select('*, program_increments(*)');

  const { data: pis } = await supabase
    .from('program_increments')
    .select('*')
    .order('start_date');

  const itemIdField = type === 'epic' ? 'epic_id' : 'feature_id';
  const piMap = new Map<string, any[]>();

  // Group items by PI
  (assignments || []).forEach((assignment: any) => {
    const piId = assignment.pi_id;
    if (!piMap.has(piId)) {
      piMap.set(piId, []);
    }
    const item = items.find((i: any) => i.id === assignment[itemIdField]);
    if (item) {
      piMap.get(piId)!.push(item);
    }
  });

  // Create sections for each PI
  const sections: BacklogPISection[] = (pis || []).map((pi: any) => ({
    id: pi.id,
    type: 'pi' as const,
    piId: pi.id,
    piCode: pi.name || `PI-${pi.id.slice(0, 4)}`,
    piName: pi.name,
    title: `${type.charAt(0).toUpperCase() + type.slice(1)}s for ${pi.name || 'PI'}`,
    itemCount: piMap.get(pi.id)?.length || 0,
    isExpanded: true,
    items: piMap.get(pi.id) || [],
  }));

  // Add unassigned section
  const assignedIds = new Set(
    (assignments || []).map((a: any) => a[itemIdField])
  );
  const unassignedItems = items.filter((item: any) => !assignedIds.has(item.id));

  sections.push({
    id: 'unassigned',
    type: 'unassigned',
    title: 'Unassigned Backlog',
    itemCount: unassignedItems.length,
    isExpanded: false,
    items: unassignedItems,
  });

  return sections;
}

function getStatesForType(type: any): string[] {
  const stateMap: Record<string, string[]> = {
    theme: ['Proposed', 'In Progress', 'Completed'],
    epic: ['Proposed', 'Analyzing', 'Portfolio Backlog', 'Implementing', 'Done'],
    capability: ['Funnel', 'Analyzing', 'Portfolio Backlog', 'Implementing', 'Done'],
    feature: ['Funnel', 'Analyzing', 'Backlog', 'Implementing', 'Validating', 'Deploying', 'Done'],
    story: ['Defined', 'In Progress', 'Completed', 'Accepted'],
    defect: ['Open', 'In Progress', 'Fixed', 'Closed'],
    objective: ['Not Started', 'On Track', 'At Risk', 'Achieved'],
  };
  return stateMap[type] || [];
}

function getFieldsForType(type: any): any[] {
  // Return field definitions for the current type
  // This would be expanded based on custom field configuration
  const commonFields = [
    { id: 'id', name: 'ID', type: 'number', required: false, visible: true },
    { id: 'name', name: 'Name', type: 'text', required: true, visible: true },
    { id: 'state', name: 'State', type: 'select', required: false, visible: true },
    { id: 'owner', name: 'Owner', type: 'user', required: false, visible: true },
    { id: 'points', name: 'Points', type: 'number', required: false, visible: true },
  ];

  return commonFields;
}

function getAvailableViewsForType(type: any): any[] {
  if (type === 'story') {
    return ['list', 'state', 'sprint'];
  }
  if (type === 'feature') {
    return ['list', 'state', 'processFlow', 'column', 'teamFeatures'];
  }
  return ['list', 'state', 'processFlow', 'column'];
}
