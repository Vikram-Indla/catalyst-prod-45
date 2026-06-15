/**
 * generateIssueKey — single source of truth for sequential issue keys.
 *
 * Phase 5 (Apr 2026): queries MAX(issue_key) across BOTH ph_issues AND
 * catalyst_issues for a given project prefix and returns the next sequential
 * value. Prevents collisions with Jira-synced keys when creating Catalyst-
 * native children (subtasks, defects, incidents) for projects that also
 * contain Jira-synced items.
 *
 * Usage:
 *   const key = await generateIssueKey('BAU'); // → 'BAU-5420'
 */
import { supabase } from '@/integrations/supabase/client';

const KEY_RE_CACHE = new Map<string, RegExp>();
function keyRegex(prefix: string): RegExp {
  let re = KEY_RE_CACHE.get(prefix);
  if (!re) {
    re = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-(\\d+)$`);
    KEY_RE_CACHE.set(prefix, re);
  }
  return re;
}

function maxFrom(rows: Array<{ issue_key: string | null }>, re: RegExp): number {
  let max = 0;
  for (const r of rows) {
    if (!r.issue_key) continue;
    const m = r.issue_key.match(re);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > max) max = n;
    }
  }
  return max;
}

/**
 * Pure max-across-sources resolver. Returns `${projectKey}-${maxN+1}` where
 * maxN is the highest numeric suffix matching `${projectKey}-N` across ALL
 * supplied row sets. Each row set is `{ issue_key }[]` — callers map other
 * key columns (e.g. business_requests.request_key) into this shape.
 *
 * Extracted for testability (2026-06-15) — generateIssueKey composes the DB
 * queries; nextKey owns the arithmetic.
 */
export function nextKey(
  projectKey: string,
  ...rowSets: Array<Array<{ issue_key: string | null }>>
): string {
  const re = keyRegex(projectKey);
  let max = 0;
  for (const rows of rowSets) {
    const m = maxFrom(rows, re);
    if (m > max) max = m;
  }
  return `${projectKey}-${max + 1}`;
}

/**
 * Generate the next sequential issue key for `projectKey` (e.g. "BAU", "MDT").
 * Scans THREE sources in parallel and returns `${projectKey}-${maxN+1}`:
 *   - ph_issues.issue_key          (Jira-synced + legacy native)
 *   - catalyst_issues.issue_key    (Catalyst-native items incl. BR subtasks)
 *   - business_requests.request_key (MDT/MIM Business Requests)
 *
 * The business_requests scan is essential for the MDT shared sequence
 * (2026-06-15, Q3): MDT BRs live there, so a new MDT subtask must clear
 * their numbers to avoid collision.
 *
 * NB: Soft-uniqueness guard — under concurrent creates two callers may both
 * compute the same key. The DB unique-index on issue_key is the hard
 * guarantee. Callers should retry once on a 23505 conflict.
 */
export async function generateIssueKey(projectKey: string): Promise<string> {
  if (!projectKey) throw new Error('generateIssueKey: projectKey is required');

  const [phRes, catRes, brRes] = await Promise.all([
    supabase
      .from('ph_issues')
      .select('issue_key')
      .like('issue_key', `${projectKey}-%`)
      .order('issue_key', { ascending: false })
      .limit(500),
    supabase
      .from('catalyst_issues')
      .select('issue_key')
      .like('issue_key', `${projectKey}-%`)
      .order('issue_key', { ascending: false })
      .limit(500),
    supabase
      .from('business_requests')
      .select('request_key')
      .like('request_key', `${projectKey}-%`)
      .order('request_key', { ascending: false })
      .limit(500),
  ]);

  const phRows = (phRes.data ?? []) as Array<{ issue_key: string | null }>;
  const catRows = (catRes.data ?? []) as Array<{ issue_key: string | null }>;
  const brRows = ((brRes.data ?? []) as Array<{ request_key: string | null }>)
    .map((r) => ({ issue_key: r.request_key }));

  return nextKey(projectKey, phRows, catRows, brRows);
}
