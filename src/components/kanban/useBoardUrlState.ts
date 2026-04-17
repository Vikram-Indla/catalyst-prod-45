/**
 * useBoardUrlState — Kanban board filter/group-by state synced with the URL.
 *
 * Hydrates from useSearchParams on mount (via Zod parse, so a stale or
 * malformed shared link degrades gracefully to defaults). Writes back to
 * the URL on change with `replace: true` so browser history stays clean.
 *
 * Only wired in KanbanBoardPage when ENABLE_KANBAN_V2 is true. When the
 * flag is off, the board's existing component state is the source of
 * truth and the URL is not touched.
 */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { parseSearchParams, type FilterStateParsed } from './kanban-schemas';
import type { GroupByMode } from './kanban-types';

export interface BoardUrlState {
  search: string;
  group: GroupByMode;
  assignees: string[];
  epics: string[];
  types: string[];
  priorities: string[];
}

/**
 * Reads the URL state once on mount and returns both the hydrated state
 * and a setter that writes a full state back to the URL.
 *
 * The hydrated value is returned synchronously on the first render so
 * callers can initialise their own React state with it.
 */
export function useBoardUrlState(enabled: boolean) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Hydrate once — downstream state is authoritative after hydrate.
  const initial: FilterStateParsed = useMemo(
    () => (enabled ? parseSearchParams(searchParams) : parseSearchParams(new URLSearchParams())),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enabled],
  );

  const hydratedRef = useRef(false);
  useEffect(() => {
    hydratedRef.current = true;
  }, []);

  const writeToUrl = useCallback(
    (next: BoardUrlState) => {
      if (!enabled) return;
      // Avoid writing on the mount render — we read from the URL, not write to it.
      if (!hydratedRef.current) return;
      const params = new URLSearchParams();
      if (next.search.trim()) params.set('search', next.search.trim());
      if (next.group !== 'none') params.set('group', next.group);
      if (next.assignees.length) params.set('assignees', next.assignees.join(','));
      if (next.epics.length) params.set('epics', next.epics.join(','));
      if (next.types.length) params.set('types', next.types.join(','));
      if (next.priorities.length) params.set('priorities', next.priorities.join(','));
      setSearchParams(params, { replace: true });
    },
    [enabled, setSearchParams],
  );

  return { initial, writeToUrl };
}
