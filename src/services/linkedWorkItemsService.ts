/**
 * Linked Work Items Service
 * Unified service for linking work items across ph_issues and ph_work_items.
 * Uses wh_link_types for dynamic link type registry, ph_issue_links for storage.
 */
import { supabase } from '@/integrations/supabase/client';

// ─── Types ────────────────────────────────────────────────

export interface LinkType {
  id: string;
  name: string;
  inward_desc: string;
  outward_desc: string;
}

/** A direction-aware option derived from a LinkType */
export interface LinkTypeOption {
  linkTypeId: string;
  linkTypeName: string;
  label: string;        // The display label (e.g., "is blocked by" or "blocks")
  direction: 'inward' | 'outward';
}

export interface LinkedItemDisplay {
  linkId: string;
  linkType: string;          // stored link_type string
  direction: 'outward' | 'inward';
  targetId: string;
  targetKey: string;
  targetSummary: string;
  targetType: string;        // issue_type or work type name
  targetTypeColor: string;
  targetStatus: string;
  targetStatusCategory: string;
  targetAssignee: string | null;
  createdAt: string | null;
}

export interface SearchResultItem {
  id: string;
  item_key: string;
  summary: string;
  type_name: string;
  type_color: string;
  status_name: string;
  status_category: string;
  source_table: 'ph_issues' | 'ph_work_items';
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value.trim());
}

async function resolveItemIdToUuid(itemIdOrKey: string): Promise<string | null> {
  if (!itemIdOrKey) return null;

  const normalized = itemIdOrKey.trim();
  if (!normalized) return null;
  if (isUuid(normalized)) return normalized;

  const [issueRes, workItemRes] = await Promise.all([
    supabase
      .from('ph_issues')
      .select('id')
      .eq('issue_key', normalized)
      .is('jira_removed_at', null)
      .maybeSingle(),
    supabase
      .from('ph_work_items')
      .select('id')
      .eq('item_key', normalized)
      .maybeSingle(),
  ]);

  return issueRes.data?.id ?? workItemRes.data?.id ?? null;
}

async function resolveItemIdsToUuids(itemIdsOrKeys: string[]): Promise<string[]> {
  const normalized = [...new Set(itemIdsOrKeys.map(value => value?.trim()).filter(Boolean) as string[])];
  const directUuids = normalized.filter(isUuid);
  const lookupKeys = normalized.filter(value => !isUuid(value));

  if (lookupKeys.length === 0) return directUuids;

  const [issueRes, workItemRes] = await Promise.all([
    supabase
      .from('ph_issues')
      .select('id, issue_key')
      .in('issue_key', lookupKeys)
      .is('jira_removed_at', null),
    supabase
      .from('ph_work_items')
      .select('id, item_key')
      .in('item_key', lookupKeys),
  ]);

  const resolved = new Set(directUuids);

  for (const row of issueRes.data ?? []) resolved.add(row.id);
  for (const row of workItemRes.data ?? []) resolved.add(row.id);

  return [...resolved];
}

// ─── Fetch Link Types ─────────────────────────────────────

export async function fetchLinkTypes(): Promise<LinkType[]> {
  const { data, error } = await supabase
    .from('wh_link_types')
    .select('id, name, inward_desc, outward_desc')
    .order('name');
  if (error) throw new Error(error.message);
  return (data ?? []) as LinkType[];
}

/**
 * Convert raw link types into direction-aware options for the dropdown.
 * Each link type produces TWO options (inward + outward) unless they're identical.
 */
export function buildLinkTypeOptions(linkTypes: LinkType[]): LinkTypeOption[] {
  const options: LinkTypeOption[] = [];
  for (const lt of linkTypes) {
    options.push({
      linkTypeId: lt.id,
      linkTypeName: lt.name,
      label: lt.inward_desc,
      direction: 'inward',
    });
    // Only add outward if different from inward (e.g., "relates to" is same both ways)
    if (lt.outward_desc !== lt.inward_desc) {
      options.push({
        linkTypeId: lt.id,
        linkTypeName: lt.name,
        label: lt.outward_desc,
        direction: 'outward',
      });
    }
  }
  return options;
}

// ─── Fetch Links (Bidirectional) ──────────────────────────

export async function fetchLinksForItem(itemId: string): Promise<LinkedItemDisplay[]> {
  const resolvedItemId = await resolveItemIdToUuid(itemId);
  if (!resolvedItemId) return [];

  // Fetch outgoing links (source = current item)
  const { data: outgoing, error: outErr } = await supabase
    .from('ph_issue_links')
    .select('id, link_type, created_at, source_id, target_id')
    .eq('source_id', resolvedItemId)
    .order('created_at', { ascending: false });
  if (outErr) throw new Error(outErr.message);

  // Fetch incoming links (target = current item)
  const { data: incoming, error: inErr } = await supabase
    .from('ph_issue_links')
    .select('id, link_type, created_at, source_id, target_id')
    .eq('target_id', resolvedItemId)
    .order('created_at', { ascending: false });
  if (inErr) throw new Error(inErr.message);

  // Collect all target IDs to enrich
  const outTargetIds = (outgoing ?? []).map(l => l.target_id);
  const inSourceIds = (incoming ?? []).map(l => l.source_id);
  const allTargetIds = [...new Set([...outTargetIds, ...inSourceIds])];

  if (allTargetIds.length === 0) return [];

  // Enrich from both tables in parallel
  const [issuesRes, workItemsRes] = await Promise.all([
    supabase
      .from('ph_issues')
      .select('id, issue_key, summary, status, status_category, issue_type, assignee_display_name')
      .in('id', allTargetIds)
      .is('jira_removed_at', null),
    supabase
      .from('ph_work_items')
      .select(`id, item_key, title, summary,
        ph_work_types!ph_work_items_type_id_fkey (name, color),
        ph_workflow_statuses!ph_work_items_status_id_fkey (name, category)`)
      .in('id', allTargetIds),
  ]);

  // Build lookup map
  const itemMap = new Map<string, {
    key: string; summary: string; typeName: string; typeColor: string;
    status: string; statusCategory: string; assignee: string | null;
  }>();

  for (const issue of issuesRes.data ?? []) {
    itemMap.set(issue.id, {
      key: issue.issue_key,
      summary: issue.summary,
      typeName: issue.issue_type || 'Issue',
      typeColor: '#94A3B8',
      status: issue.status || 'Backlog',
      statusCategory: issue.status_category || 'todo',
      assignee: issue.assignee_display_name,
    });
  }

  for (const wi of workItemsRes.data ?? []) {
    const wt = wi.ph_work_types as any;
    const ws = wi.ph_workflow_statuses as any;
    itemMap.set(wi.id, {
      key: wi.item_key,
      summary: wi.title || wi.summary,
      typeName: wt?.name ?? 'Task',
      typeColor: wt?.color ?? '#94A3B8',
      status: ws?.name ?? 'Backlog',
      statusCategory: ws?.category ?? 'todo',
      assignee: null,
    });
  }

  const results: LinkedItemDisplay[] = [];

  // Outgoing links: current item → target
  for (const link of outgoing ?? []) {
    const target = itemMap.get(link.target_id);
    if (!target) continue;
    results.push({
      linkId: link.id,
      linkType: link.link_type,
      direction: 'outward',
      targetId: link.target_id,
      targetKey: target.key,
      targetSummary: target.summary,
      targetType: target.typeName,
      targetTypeColor: target.typeColor,
      targetStatus: target.status,
      targetStatusCategory: target.statusCategory,
      targetAssignee: target.assignee,
      createdAt: link.created_at,
    });
  }

  // Incoming links: source → current item (show inverse direction label)
  for (const link of incoming ?? []) {
    const source = itemMap.get(link.source_id);
    if (!source) continue;
    results.push({
      linkId: link.id,
      linkType: link.link_type,
      direction: 'inward',
      targetId: link.source_id,
      targetKey: source.key,
      targetSummary: source.summary,
      targetType: source.typeName,
      targetTypeColor: source.typeColor,
      targetStatus: source.status,
      targetStatusCategory: source.statusCategory,
      targetAssignee: source.assignee,
      createdAt: link.created_at,
    });
  }

  return results;
}

// ─── Create Link ──────────────────────────────────────────

export async function createWorkItemLink(
  sourceId: string,
  targetId: string,
  linkTypeLabel: string,
): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');

  const [resolvedSourceId, resolvedTargetId] = await Promise.all([
    resolveItemIdToUuid(sourceId),
    resolveItemIdToUuid(targetId),
  ]);

  if (!resolvedSourceId) throw new Error('Unable to resolve the source work item');
  if (!resolvedTargetId) throw new Error('Unable to resolve the target work item');

  const { error } = await supabase.from('ph_issue_links').insert({
    source_id: resolvedSourceId,
    target_id: resolvedTargetId,
    link_type: linkTypeLabel,
    created_by: userData.user.id,
  });

  if (error) {
    if (error.code === '23505') throw new Error('This link already exists');
    throw new Error(error.message);
  }
}

// ─── Delete Link ──────────────────────────────────────────

export async function deleteWorkItemLink(linkId: string): Promise<void> {
  const { error } = await supabase
    .from('ph_issue_links')
    .delete()
    .eq('id', linkId);
  if (error) throw new Error(error.message);
}

// ─── Search Work Items (unified across ph_issues + ph_work_items) ────

export async function searchWorkItemsForLinking(
  query: string,
  excludeIds: string[],
  limit = 20,
  offset = 0,
): Promise<{ items: SearchResultItem[]; total: number }> {
  if (!query || query.trim().length < 2) return { items: [], total: 0 };

  const q = query.trim();
  const resolvedExcludeIds = await resolveItemIdsToUuids(excludeIds);
  const results: SearchResultItem[] = [];

  let issueQuery: any = supabase
    .from('ph_issues')
    .select('id, issue_key, summary, status, status_category, issue_type', { count: 'exact' })
    .is('jira_removed_at', null)
    .or(`issue_key.ilike.%${q}%,summary.ilike.%${q}%`);

  if (resolvedExcludeIds.length > 0) {
    issueQuery = issueQuery.not('id', 'in', `(${resolvedExcludeIds.join(',')})`);
  }

  issueQuery = issueQuery
    .order('issue_key')
    .range(offset, offset + limit - 1);

  let workItemQuery: any = supabase
    .from('ph_work_items')
    .select(`id, item_key, title, summary,
      ph_work_types!ph_work_items_type_id_fkey (name, color),
      ph_workflow_statuses!ph_work_items_status_id_fkey (name, category)`,
      { count: 'exact' })
    .or(`item_key.ilike.%${q}%,title.ilike.%${q}%,summary.ilike.%${q}%`);

  if (resolvedExcludeIds.length > 0) {
    workItemQuery = workItemQuery.not('id', 'in', `(${resolvedExcludeIds.join(',')})`);
  }

  workItemQuery = workItemQuery
    .order('item_key')
    .range(offset, offset + limit - 1);

  const [issuesRes, workItemsRes] = await Promise.all([issueQuery, workItemQuery]);

  if (issuesRes.error) throw new Error(issuesRes.error.message);
  if (workItemsRes.error) throw new Error(workItemsRes.error.message);

  // Map issues
  for (const issue of issuesRes.data ?? []) {
    results.push({
      id: issue.id,
      item_key: issue.issue_key,
      summary: issue.summary,
      type_name: issue.issue_type || 'Issue',
      type_color: '#94A3B8',
      status_name: issue.status || 'Backlog',
      status_category: issue.status_category || 'todo',
      source_table: 'ph_issues',
    });
  }

  // Map work items
  for (const wi of workItemsRes.data ?? []) {
    const wt = wi.ph_work_types as any;
    const ws = wi.ph_workflow_statuses as any;
    results.push({
      id: wi.id,
      item_key: wi.item_key,
      summary: wi.title || wi.summary,
      type_name: wt?.name ?? 'Task',
      type_color: wt?.color ?? '#94A3B8',
      status_name: ws?.name ?? 'Backlog',
      status_category: ws?.category ?? 'todo',
      source_table: 'ph_work_items',
    });
  }

  const totalEstimate = (issuesRes.count ?? 0) + (workItemsRes.count ?? 0);

  // De-duplicate by ID (an item might exist in both tables)
  const seen = new Set<string>();
  const deduped = results.filter(r => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });

  return { items: deduped, total: totalEstimate };
}
