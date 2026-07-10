/**
 * Ideation · Inbox queue — CAT-IDEATION-REBUILD-20260709-001 Phase 2 S1.
 *
 * Reads idn_ideas directly (greenfield idn_* schema, S1 migration). Zero
 * legacy carryover: never import/query ph_ideas or ph_idea_* here — see
 * src/services/ideationService.ts for the retired module this must not reuse.
 */
import { useQuery } from '@tanstack/react-query';
import { typedQuery } from '@/integrations/supabase/client';
import type { IdeaRow, IdeaStatusKey } from '@/modules/ideation/types';

/** Inbox = intake/triage/evaluation queue. Excludes decided/terminal states —
 *  those belong to Explore/Portfolio, not the triage Inbox. */
const INBOX_STATUSES: IdeaStatusKey[] = ['submitted', 'screening', 'evaluation'];

export const IDEATION_INBOX_KEY = ['ideation', 'inbox'] as const;

export function useIdeationInbox() {
  return useQuery({
    queryKey: IDEATION_INBOX_KEY,
    queryFn: async (): Promise<IdeaRow[]> => {
      const { data, error } = await typedQuery('idn_ideas')
        .select('id, idea_key, slug, title, problem_statement, idea_class, workflow_status_key, created_at')
        .in('workflow_status_key', INBOX_STATUSES)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as IdeaRow[];
    },
    staleTime: 15_000,
  });
}

/** Per-status counts for the queue-list-with-counts header (05 §C row 1,
 *  Intercom inbox evidence). Derived client-side from the same fetch — one
 *  query, no extra round trip. */
export function useIdeationInboxCounts(rows: IdeaRow[] | undefined): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const status of INBOX_STATUSES) counts[status] = 0;
  for (const row of rows ?? []) {
    counts[row.workflow_status_key] = (counts[row.workflow_status_key] ?? 0) + 1;
  }
  return counts;
}

/** Extract the first plain-text paragraph from an ADF doc. Returns null for
 *  missing/unparseable content — zero-assumption rendering, no fabricated
 *  placeholder text. */
export function adfToPlainText(adf: unknown): string | null {
  if (!adf || typeof adf !== 'object') return null;
  const doc = adf as { content?: Array<{ content?: Array<{ text?: string }> }> };
  const firstParagraph = doc.content?.[0]?.content;
  if (!firstParagraph) return null;
  const text = firstParagraph.map((n) => n.text ?? '').join('').trim();
  return text.length > 0 ? text : null;
}
