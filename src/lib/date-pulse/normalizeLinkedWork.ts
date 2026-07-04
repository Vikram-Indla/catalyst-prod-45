/**
 * normalizeLinkedWork — canonical linked-work source for BR delivery health.
 *
 * BRs link work through the polymorphic `business_request_links` table
 * (kind='implementation'), pointing at Catalyst-native `features`/`stories`
 * (and `epics`, which are grouping containers and are EXCLUDED from health —
 * see CAT-BR-HEALTH-LINKAGE-20260704-001 Plan Lock). `ph_issues` has no
 * `business_request_id` FK; the old mappers queried a column that does not
 * exist. This module is the single fetch+normalize boundary both health hooks
 * share.
 *
 * Per-table status vocab is normalized to the engine's canonical buckets
 * (done / blocked / backlog / todo / <in-progress>). Zero-assumption
 * (CLAUDE.md): unknown status → null (unscorable), never a fabricated default.
 */
import { supabase } from '@/integrations/supabase/client';
import type { WorkItem } from '@/types/date-pulse';

type LinkRow = {
  business_request_id: string;
  linked_item_id: string | null;
  linked_item_type: string | null;
};

/**
 * feature_status: funnel | analyzing | backlog | implementing | done.
 * `blocked` bool is handled by the caller and takes precedence.
 * Anything not backlog/todo/done is treated as in-progress by the engine.
 */
function normalizeFeatureStatus(status: string | null): string | null {
  if (!status) return null;
  switch (status) {
    case 'done':
      return 'done';
    case 'funnel':
    case 'analyzing':
    case 'backlog':
      return 'backlog';
    default:
      return status; // implementing → in-progress bucket
  }
}

/**
 * story_status: todo | in_progress | done.
 * `blocked` bool is handled by the caller and takes precedence.
 */
function normalizeStoryStatus(status: string | null): string | null {
  if (!status) return null;
  switch (status) {
    case 'done':
      return 'done';
    case 'todo':
      return 'todo';
    default:
      return status; // in_progress → in-progress bucket
  }
}

/**
 * Fetch and normalize all BR-linked work items for the given BR ids.
 * Returns a Map keyed by business_request_id. Epics are excluded (grouping
 * containers). Throws on any query error so callers surface the failure
 * rather than silently degrading to empty linked work.
 */
export async function fetchLinkedWorkForBRs(
  brIds: string[],
): Promise<Map<string, WorkItem[]>> {
  const result = new Map<string, WorkItem[]>();
  if (!brIds.length) return result;

  const { data: links, error: linksError } = await (supabase as any)
    .from('business_request_links')
    .select('business_request_id, linked_item_id, linked_item_type')
    .in('business_request_id', brIds)
    .eq('kind', 'implementation')
    .limit(5000);
  if (linksError) throw linksError;

  // Group linked ids by type. Epics excluded (grouping containers).
  const featureIds: string[] = [];
  const storyIds: string[] = [];
  const validLinks: LinkRow[] = [];
  for (const l of (links ?? []) as LinkRow[]) {
    if (!l.linked_item_id || !l.linked_item_type) continue;
    if (l.linked_item_type === 'feature') featureIds.push(l.linked_item_id);
    else if (l.linked_item_type === 'story') storyIds.push(l.linked_item_id);
    else continue; // epic (excluded) or unknown
    validLinks.push(l);
  }

  if (!featureIds.length && !storyIds.length) return result;

  const featureById = new Map<string, WorkItem>();
  const storyById = new Map<string, WorkItem>();

  if (featureIds.length) {
    const { data: rows, error } = await (supabase as any)
      .from('features')
      .select('id, display_id, status, blocked, planned_end_date, created_at, updated_at')
      .in('id', Array.from(new Set(featureIds)))
      .is('deleted_at', null);
    if (error) throw error;
    for (const f of (rows ?? [])) {
      featureById.set(f.id, {
        id: f.id,
        issue_key: f.display_id ?? '',
        issue_type: 'feature',
        project_key: '',
        status: f.blocked === true ? 'blocked' : normalizeFeatureStatus(f.status ?? null),
        due_date: f.planned_end_date ?? null,
        severity: undefined,
        parent_key: null,
        sprint_id: null,
        created_at: f.created_at,
        updated_at: f.updated_at,
      });
    }
  }

  if (storyIds.length) {
    const { data: rows, error } = await (supabase as any)
      .from('stories')
      .select('id, story_key, status, blocked, created_at, updated_at')
      .in('id', Array.from(new Set(storyIds)))
      .is('deleted_at', null);
    if (error) throw error;
    for (const s of (rows ?? [])) {
      storyById.set(s.id, {
        id: s.id,
        issue_key: s.story_key ?? '',
        issue_type: 'story',
        project_key: '',
        status: s.blocked === true ? 'blocked' : normalizeStoryStatus(s.status ?? null),
        // Stories carry no due/end date column — null (honest Uncommitted)
        // rather than a fabricated date (CLAUDE.md zero-assumption rule).
        due_date: null,
        severity: undefined,
        parent_key: null,
        sprint_id: null,
        created_at: s.created_at,
        updated_at: s.updated_at,
      });
    }
  }

  // Stitch normalized items back onto each BR, preserving link order.
  for (const l of validLinks) {
    const item =
      l.linked_item_type === 'feature'
        ? featureById.get(l.linked_item_id!)
        : storyById.get(l.linked_item_id!);
    if (!item) continue; // soft-deleted or missing target
    const arr = result.get(l.business_request_id) ?? [];
    arr.push({ ...item, business_request_id: l.business_request_id });
    result.set(l.business_request_id, arr);
  }

  return result;
}
