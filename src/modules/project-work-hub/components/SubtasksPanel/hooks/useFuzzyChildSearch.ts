/**
 * useFuzzyChildSearch — "Choose existing" typeahead against ph_issues.
 *
 * Reuses the ILIKE pattern from src/hooks/useGlobalSearch.ts (preflight P4).
 * Scoped to the current project and excludes issues that are already children
 * of the current parent so users can't add duplicates.
 *
 * No new index required — ph_issues has no tsvector / GIN on summary; at
 * ~8k rows with LIMIT 20 the sequential ILIKE is acceptable.
 */
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface FuzzyChildResult {
  id: string;
  issue_key: string;
  summary: string;
  issue_type: string;
  status: string;
  status_category: string;
}

export interface UseFuzzyChildSearchParams {
  query: string;
  projectKey: string;
  /** Ids already linked under this parent — filtered out of results. */
  excludedIds: string[];
  disabled?: boolean;
}

export interface UseFuzzyChildSearchResult {
  results: FuzzyChildResult[];
  isLoading: boolean;
}

const DEBOUNCE_MS = 200;
const MIN_QUERY_LENGTH = 2;
const RESULT_LIMIT = 20;

export function useFuzzyChildSearch({
  query,
  projectKey,
  excludedIds,
  disabled,
}: UseFuzzyChildSearchParams): UseFuzzyChildSearchResult {
  const [results, setResults] = useState<FuzzyChildResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (disabled || !projectKey || query.trim().length < MIN_QUERY_LENGTH) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const rid = ++requestIdRef.current;
      setIsLoading(true);
      try {
        const needle = query.trim().replace(/%/g, '\\%');
        const excludeList = excludedIds.length > 0
          ? `(${excludedIds.map((id) => `"${id}"`).join(',')})`
          : null;

        let q = supabase
          .from('ph_issues')
          .select('id,issue_key,summary,issue_type,status,status_category')
          .eq('project_key', projectKey)
          .is('deleted_at', null)
          .or(`issue_key.ilike.%${needle}%,summary.ilike.%${needle}%`)
          .order('jira_updated_at', { ascending: false })
          .limit(RESULT_LIMIT);

        if (excludeList) {
          q = q.not('id', 'in', excludeList);
        }

        const { data, error } = await q;
        if (rid !== requestIdRef.current) return; // stale
        if (error) {
          setResults([]);
          return;
        }
        setResults((data ?? []) as FuzzyChildResult[]);
      } finally {
        if (rid === requestIdRef.current) setIsLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // excludedIds identity changes on every row mutation — depend on length
    // only so we don't thrash, and capture its latest value at fire time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, projectKey, excludedIds.length, disabled]);

  return { results, isLoading };
}
