// SOURCE OF TRUTH: src/lib/jira-changelog-mapper/mapper.ts
// This is a deploy-safe copy. Supabase edge fns bundle only files inside
// supabase/functions/<name>/, so cross-dir relative imports fail at deploy.
// Keep this file byte-identical to the src/ version below the banner. The
// tests in src/lib/jira-changelog-mapper/mapper.test.ts pin the contract.
/**
 * mapChangelogItem — converts a single Jira changelog item into rows for
 * BOTH analytic tables that back the Time-in-Status hover card:
 *
 *   - catalyst_status_history  — only when field === 'status' AND a
 *     toString is present. Powers status-window queries (entered_at,
 *     left_at, dwell, revisits).
 *
 *   - work_item_changelogs     — every changelog item (status, assignee,
 *     priority, sprint, custom fields, ...). Powers the in-window timeline
 *     in the TIS hover card, including assignee transitions with actor.
 *
 * Pure function — no Deno, no Supabase client, no fetch. The edge fn
 * `wh-jira-changelog-backfill` imports it via relative path so the same
 * mapping logic can be unit-tested under vitest (this file ships GREEN
 * once mapper.test.ts passes).
 */

export interface JiraHistoryItem {
  field: string;
  fromString?: string | null;
  toString?: string | null;
  from?: string | null;
  to?: string | null;
}

export interface ChangelogContext {
  issue_key: string;
  project_key: string;
  work_item_id: string;
  jira_history_id: string;
  changed_at: string;
  actor_name: string | null;
  actor_account_id: string | null;
  actor_avatar_url: string | null;
}

export interface StatusHistoryRow {
  source: 'jira';
  issue_key: string;
  project_key: string;
  from_status: string | null;
  to_status: string;
  changed_at: string;
  actor_name: string | null;
  actor_account_id: string | null;
  metadata: {
    backfilled: true;
    jira_history_id: string;
    jira_actor: string | null;
    jira_actor_account_id: string | null;
  };
}

export interface ChangelogRow {
  work_item_id: string;
  field_name: string;
  field_type: 'jira';
  from_value: string | null;
  from_display: string | null;
  to_value: string | null;
  to_display: string | null;
  changed_by: string | null;
  changed_by_avatar: string | null;
  changed_at: string;
  jira_changelog_id: string;
}

export interface MapResult {
  status_history: StatusHistoryRow | null;
  changelog: ChangelogRow | null;
}

/**
 * Row for work_item_transitions — the canonical data source for the Catalyst
 * Replay module. Built from consecutive status-change pairs (see index.ts).
 */
export interface TransitionRow {
  work_item_id: string;
  from_status: string | null;
  to_status: string;
  from_status_category: string | null;
  to_status_category: string;
  transitioned_by: string;
  transitioned_by_avatar: string | null;
  transitioned_at: string;
  time_in_from_status_ms: number | null;
  jira_changelog_id: string;
}

/**
 * Map a raw Jira status name to a 3-bucket category label:
 * "To Do" | "In Progress" | "Done".
 *
 * Mirrors resolveStatusBucketStatic / useStatusMappingLookup (src) without
 * importing the React/typedQuery-bound code into the Deno edge runtime.
 * Callers may pass an admin-managed `status_mapping` lookup (lowercase status
 * name → 'todo' | 'progress' | 'done') loaded from wh_config; we fall back to
 * conservative name heuristics when a status is absent from the mapping.
 */
const CATEGORY_LABEL: Record<string, string> = {
  todo: 'To Do',
  progress: 'In Progress',
  done: 'Done',
};

export function resolveStatusCategoryLabel(
  statusName: string | null | undefined,
  mappingLookup?: Record<string, 'todo' | 'progress' | 'done'>,
): string | null {
  if (!statusName) return null;
  const key = statusName.toLowerCase().trim();

  // 1. Admin-managed mapping (most specific, matches the UI exactly).
  if (mappingLookup && mappingLookup[key]) return CATEGORY_LABEL[mappingLookup[key]];

  // 2. Conservative name heuristics.
  if (
    key === 'done' || key.includes('complete') || key.includes('closed') ||
    key.includes('resolved') || key.includes('ready for production') ||
    key.includes('released') || key === 'cancelled' || key === 'canceled'
  ) {
    return 'Done';
  }
  if (
    key === 'to do' || key === 'todo' || key === 'new' || key === 'open' ||
    key === 'backlog' || key.includes('intake') || key.includes('requirement') ||
    key === 'blocked' || key.includes('pending')
  ) {
    return 'To Do';
  }
  // Everything else (in progress / in review / analysis / implementation / qa ...).
  return 'In Progress';
}

/**
 * Map a single Jira changelog `item` to the database rows it should
 * produce. Callers feed every item from every `histories[i].items[j]`
 * tuple through this function and accumulate the non-null results.
 */
export function mapChangelogItem(
  item: JiraHistoryItem,
  ctx: ChangelogContext,
): MapResult {
  const fromDisplay = item.fromString ?? null;
  const toDisplay = item.toString ?? null;
  const fromValue = item.from ?? null;
  const toValue = item.to ?? null;

  // 1. status_history row — only for `status` field with a valid toString.
  //    Skipping the row when toString is null matches the defensive guard
  //    in the legacy edge fn (line 186) and avoids inserting half-resolved
  //    transitions.
  let status_history: StatusHistoryRow | null = null;
  if (item.field === 'status' && toDisplay) {
    status_history = {
      source: 'jira',
      issue_key: ctx.issue_key,
      project_key: ctx.project_key,
      from_status: fromDisplay,
      to_status: toDisplay,
      changed_at: ctx.changed_at,
      actor_name: ctx.actor_name,
      actor_account_id: ctx.actor_account_id,
      metadata: {
        backfilled: true,
        jira_history_id: ctx.jira_history_id,
        jira_actor: ctx.actor_name,
        jira_actor_account_id: ctx.actor_account_id,
      },
    };
  }

  // 2. changelog row — emitted for every item. work_item_changelogs is the
  //    audit-grade backing store; the assignee-history hover card filters
  //    it by (field_name IN ['status','assignee'], changed_at BETWEEN
  //    entered_at, left_at).
  const changelog: ChangelogRow = {
    work_item_id: ctx.work_item_id,
    field_name: item.field,
    field_type: 'jira',
    from_value: fromValue,
    from_display: fromDisplay,
    to_value: toValue,
    to_display: toDisplay,
    changed_by: ctx.actor_name,
    changed_by_avatar: ctx.actor_avatar_url,
    changed_at: ctx.changed_at,
    jira_changelog_id: ctx.jira_history_id,
  };

  return { status_history, changelog };
}
