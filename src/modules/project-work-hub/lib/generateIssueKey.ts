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
 * Generate the next sequential issue key for `projectKey` (e.g. "BAU").
 * Queries both source tables in parallel and returns `${projectKey}-${maxN+1}`.
 *
 * NB: This is a soft-uniqueness guard — under concurrent creates two callers
 * may both compute the same key. The DB unique-index on issue_key is the hard
 * guarantee. Callers should retry once on a 23505 conflict.
 */
export async function generateIssueKey(projectKey: string): Promise<string> {
  if (!projectKey) throw new Error('generateIssueKey: projectKey is required');
  const re = keyRegex(projectKey);

  // F-iter9 unification: ph_issues holds BOTH Jira-synced and Catalyst-native
  // rows now. Single query replaces the previous two-table parallel fetch.
  const phRes = await supabase
    .from('ph_issues')
    .select('issue_key')
    .like('issue_key', `${projectKey}-%`)
    .order('issue_key', { ascending: false })
    .limit(500);

  const phMax = maxFrom((phRes.data ?? []) as any[], re);
  const next = phMax + 1;
  return `${projectKey}-${next}`;
}
