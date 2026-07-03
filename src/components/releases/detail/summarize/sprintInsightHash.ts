/**
 * sprintInsightHash — structural-hash cache helpers for sprint AI summaries.
 *
 * Mirrors `hashBoardState` / `board_insight_cache`
 * (src/components/for-you/atlaskit/CatyBoardInsight.tsx) but is
 * team-shared, not per-user: a sprint's AI summary is deterministic for a
 * given data_hash regardless of who requests it. The hash covers every
 * field `summarize-release`'s buildPrompt actually consumes (sprint row +
 * sprint_id-FK-linked items), so any change that would alter the generated
 * summary busts the cache.
 */
import { supabase } from '@/integrations/supabase/client';

interface SprintRow {
  name: string | null;
  title: string | null;
  description: string | null;
  status: string | null;
  start_date: string | null;
  target_date: string | null;
  release_date: string | null;
}

interface SprintItemRow {
  issue_key: string | null;
  issue_type: string | null;
  status: string | null;
  status_category: string | null;
  priority: string | null;
  assignee_display_name: string | null;
  parent_key: string | null;
  summary: string | null;
  jira_created_at: string | null;
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function fieldRow(values: Array<string | null>): string {
  return values.map((v) => v ?? '').join('|');
}

/**
 * Fetches the current sprint row + its FK-linked items and computes the
 * structural hash. Returns null if either fetch errors — callers should
 * fail open to the live streaming path rather than block on a cache-layer
 * failure.
 */
export async function computeSprintInsightHash(sprintId: string): Promise<string | null> {
  const [sprintResult, itemsResult] = await Promise.all([
    supabase
      .from('ph_jira_sprints')
      .select('name, title, description, status, start_date, target_date, release_date')
      .eq('id', sprintId)
      .maybeSingle(),
    supabase
      .from('ph_issues')
      .select(
        'issue_key, issue_type, status, status_category, priority, assignee_display_name, parent_key, summary, jira_created_at',
      )
      .eq('sprint_id', sprintId),
  ]);

  if (sprintResult.error || itemsResult.error) return null;

  const sprint = (sprintResult.data as SprintRow | null) ?? null;
  const items = (itemsResult.data as SprintItemRow[] | null) ?? [];

  const sprintLine = sprint
    ? fieldRow([
        sprint.name,
        sprint.title,
        sprint.description,
        sprint.status,
        sprint.start_date,
        sprint.target_date,
        sprint.release_date,
      ])
    : '';

  const itemLines = [...items]
    .sort((a, b) => (a.issue_key ?? '').localeCompare(b.issue_key ?? ''))
    .map((it) =>
      fieldRow([
        it.issue_key,
        it.issue_type,
        it.status,
        it.status_category,
        it.priority,
        it.assignee_display_name,
        it.parent_key,
        it.summary,
        it.jira_created_at,
      ]),
    );

  return sha256Hex([sprintLine, ...itemLines].join('\n'));
}

export async function readSprintInsightCache(sprintId: string, hash: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('sprint_insight_cache')
    .select('summary_text')
    .eq('sprint_id', sprintId)
    .eq('data_hash', hash)
    .maybeSingle();
  if (error || !data) return null;
  return data.summary_text;
}

/** Best-effort write — a failure here must never poison or block the UI. */
export async function writeSprintInsightCache(
  sprintId: string,
  hash: string,
  summaryText: string,
): Promise<void> {
  try {
    await supabase.from('sprint_insight_cache').upsert(
      {
        sprint_id: sprintId,
        data_hash: hash,
        summary_text: summaryText,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'sprint_id,data_hash' },
    );
  } catch {
    /* swallow — cache write never blocks the already-displayed summary */
  }
}
