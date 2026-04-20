/**
 * useItemSelection — canonical list-to-detail selection chokepoint.
 *
 * Encodes the pattern hardened in ProjectAllWorkView on 2026-04-20:
 *
 *   1. Dual-shape lookup — matches by either `id` (issue_key) OR `dbId`
 *      (UUID). Subtask/link callers route through `onOpenItem` with the
 *      UUID shape; list/nav callers use issue_key. Single lookup
 *      absorbs both, so downstream never hits CLAUDE.md §L39's silent
 *      UUID 400 ("BAU-5389" vs ph_issues.id).
 *
 *   2. Normaliser — `selectItem(id)` accepts either shape, stores the
 *      match's `id` (issue_key) as canonical state. Keeps URL-sync
 *      honest — the `?issue=` param is always an issue_key, never a UUID.
 *
 *   3. URL param hydration — on mount (and whenever items arrive late
 *      via refetch while nothing is selected), reads `?issue=BAU-5047`
 *      and opens that row. Guarded on `activeItemId` so user clicks
 *      don't get clobbered by stale URL state.
 *
 *   4. URL param sync — writes the active row's `jiraKey` to `?issue=`.
 *      Replace, not push, so browser history stays sane. Clears the
 *      param on deselect so the URL doesn't lie about modal state.
 *
 *   5. Optional auto-select-first — split-view surfaces (e.g.
 *      ProjectAllWorkView) auto-open items[0] when nothing is selected;
 *      modal-on-click surfaces (e.g. BacklogPage) do not. Opt-in.
 *
 * Items must expose `id` (string). Optional `dbId` (UUID PK) and
 * `jiraKey` (URL-sync key) unlock the full pattern. If only `id` is
 * available, the hook degrades gracefully to single-shape lookup.
 *
 * ---------------------------------------------------------------
 * Usage:
 *
 *   const { activeItem, activeItemId, selectItem, clearSelection } =
 *     useItemSelection(items, { urlParam: 'issue', autoSelectFirst: true });
 *
 *   // Caller-agnostic: both shapes accepted.
 *   <Row onClick={() => selectItem(row.id)} />      // issue_key
 *   <SubtaskLink onClick={() => selectItem(row.uuid)} />  // UUID
 *
 *   // Close handler:
 *   <DetailRouter onClose={() => selectItem(null)} />
 *
 * ---------------------------------------------------------------
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface SelectableItem {
  /** Canonical display key — issue_key for ph_issues, UUID for items without a Jira shadow. */
  id: string;
  /** Optional UUID PK (ph_issues.id). Present when the item has a DB row. */
  dbId?: string | null;
  /** Optional URL-sync key. Falls back to `id` if absent. */
  jiraKey?: string | null;
}

export interface UseItemSelectionOptions {
  /**
   * URL search param name. Pass `null` to disable URL sync entirely.
   * Default: `'issue'`.
   */
  urlParam?: string | null;
  /**
   * If true, `activeItem` falls back to `items[0]` when nothing is
   * explicitly selected. Suits split-view surfaces; modal surfaces
   * should leave this off.
   * Default: `false`.
   */
  autoSelectFirst?: boolean;
}

export interface UseItemSelectionResult<T extends SelectableItem> {
  /** The resolved item, or `null`. Respects `autoSelectFirst`. */
  activeItem: T | null;
  /** Canonical id (issue_key form) of the active item, or `null`. */
  activeItemId: string | null;
  /** Select by id OR dbId — shape-agnostic. Pass `null` to clear. */
  selectItem: (id: string | null) => void;
  /** Convenience alias for `selectItem(null)`. */
  clearSelection: () => void;
}

export function useItemSelection<T extends SelectableItem>(
  items: T[],
  options: UseItemSelectionOptions = {},
): UseItemSelectionResult<T> {
  const { urlParam = 'issue', autoSelectFirst = false } = options;

  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  /* Match on either id (issue_key) OR dbId (UUID) — subtask/link
     callers route through `onOpenItem` with the UUID shape, while
     list/nav callers use issue_key. Single lookup absorbs both. */
  const activeItem = useMemo<T | null>(() => {
    if (!activeItemId) return autoSelectFirst ? (items[0] ?? null) : null;
    return items.find(i => i.id === activeItemId || i.dbId === activeItemId) ?? null;
  }, [activeItemId, items, autoSelectFirst]);

  /* Normalise whatever-shape id callers hand us down to the list's
     issue_key form. Keeps `activeItemId` canonical so the URL-sync
     effect below never writes a UUID into `?issue=`. */
  const selectItem = useCallback((id: string | null) => {
    if (!id) { setActiveItemId(null); return; }
    const match = items.find(i => i.id === id || i.dbId === id);
    setActiveItemId(match ? match.id : id);
  }, [items]);

  const clearSelection = useCallback(() => setActiveItemId(null), []);

  /* ── Deep-link hydration — `?issue=BAU-5047` opens that row on mount.
     Root cause from 2026-04-20 critique (P1-5): the URL param existed
     but nothing read it, so a hard-reload into the row never restored
     the modal. Match by jiraKey (primary) or id fallback. Only runs
     when nothing is selected — avoids fighting user clicks. */
  useEffect(() => {
    if (!urlParam) return;
    const wanted = searchParams.get(urlParam);
    if (!wanted || !items.length) return;
    if (activeItemId) return;
    const match = items.find(i => i.jiraKey === wanted || i.id === wanted);
    if (match) setActiveItemId(match.id);
  }, [items, searchParams, activeItemId, urlParam]);

  /* ── Deep-link sync — writes active row's key back to the URL.
     Replace, don't push, so browser back stays sane. Clearing the
     item drops the param so the URL doesn't lie about modal state. */
  useEffect(() => {
    if (!urlParam) return;
    const current = searchParams.get(urlParam);
    if (!activeItemId) {
      if (current) {
        setSearchParams(prev => {
          const next = new URLSearchParams(prev);
          next.delete(urlParam);
          return next;
        }, { replace: true });
      }
      return;
    }
    const active = items.find(i => i.id === activeItemId);
    const wanted = active?.jiraKey ?? active?.id;
    if (wanted && wanted !== current) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.set(urlParam, wanted);
        return next;
      }, { replace: true });
    }
  }, [activeItemId, items, searchParams, setSearchParams, urlParam]);

  return { activeItem, activeItemId, selectItem, clearSelection };
}
