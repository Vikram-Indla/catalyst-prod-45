/**
 * fetchAllPages — drain a PostgREST query past the server max_rows cap.
 * Feature: CAT-REPORTS-HUB-20260703-001 (points-burndown undercount postmortem).
 *
 * Supabase caps every response at max_rows (1000 here); a whole-table select
 * silently truncates and reports read it as truth (the burndown showed 104 of
 * 209 sprint items). Callers pass a page builder that applies .range(from, to)
 * to a FRESH query each call, with a stable .order so pages don't overlap.
 */
import type { PostgrestError } from '@supabase/supabase-js';

const PAGE = 1000;

export async function fetchAllPages<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: PostgrestError | null }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}
