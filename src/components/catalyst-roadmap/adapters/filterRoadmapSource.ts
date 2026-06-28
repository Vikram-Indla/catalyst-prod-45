/**
 * filterRoadmapSource — pure mapper: JqlResultRow[] → RoadmapGroup[]
 *
 * V1 — milestone-first (ph_issues has dueDate but no start_date/end_date).
 * Items with a resolved date become a zero-width milestone bar (start = end = date).
 * Items with no date are collected into a dedicated 'Unscheduled' group.
 *
 * Zero-assumption rule (CLAUDE.md P0): fields absent from the JQL projection are
 * represented as empty strings / 0 — never as plausible domain defaults.
 */
import { useMemo } from 'react';
import type { RoadmapGroup, RoadmapObjective, ObjectiveStatus } from '@/types/roadmap';
import { useJqlResults, type JqlResultRow } from '@/hooks/workhub/useJqlResults';

// ── Config ────────────────────────────────────────────────────────────────────

export type DateField = 'due_date' | 'created' | 'updated';
export type LaneBy   = 'status' | 'assignee' | 'issueType' | 'projectKey';

export interface RoadmapMapperOpts {
  dateField: DateField;
  laneBy: LaneBy;
}

/** Sentinel placed on unscheduled objectives so they sort after all 2026 dates. */
export const UNSCHEDULED_SENTINEL = '9999-12-31';

// ── Status / progress derivation ──────────────────────────────────────────────

function toObjectiveStatus(statusCategory: string): ObjectiveStatus {
  if (statusCategory === 'done' || statusCategory === 'inprogress') return 'on-track';
  return 'pending';
}

function toProg(statusCategory: string): number {
  if (statusCategory === 'done')        return 100;
  if (statusCategory === 'inprogress')  return 50;
  return 0;
}

// ── Lane key resolution ───────────────────────────────────────────────────────

function laneKey(row: JqlResultRow, laneBy: LaneBy): string {
  switch (laneBy) {
    case 'status':     return row.status;
    case 'assignee':   return row.assigneeName ?? 'Unassigned';
    case 'issueType':  return row.issueType ?? 'Unknown';
    case 'projectKey': return row.projectKey;
  }
}

// ── Date resolution ───────────────────────────────────────────────────────────

function resolvedDate(row: JqlResultRow, dateField: DateField): string | null {
  switch (dateField) {
    case 'due_date': return row.dueDate;
    case 'created':  return row.created;
    case 'updated':  return row.updated;
  }
}

// ── ADS-token lane colours (one per lane slot, cycling) ───────────────────────

const LANE_COLORS = [
  'var(--ds-background-information)',
  'var(--ds-background-success)',
  'var(--ds-background-warning)',
  'var(--ds-background-danger)',
  'var(--ds-background-discovery)',
  'var(--ds-background-neutral)',
];

// ── Core pure mapper ──────────────────────────────────────────────────────────

/**
 * Pure function — no side effects, no I/O, safe to call in useMemo.
 *
 * Returns an empty array for an empty input; otherwise returns one group per
 * distinct lane-key value, plus (if needed) a trailing 'Unscheduled' group.
 */
export function jqlRowsToRoadmapGroups(
  rows: JqlResultRow[],
  opts: RoadmapMapperOpts,
): RoadmapGroup[] {
  if (rows.length === 0) return [];

  const { dateField, laneBy } = opts;

  // Ordered map of lane-key → partial group (preserves insertion order)
  const laneMap = new Map<string, { objs: RoadmapObjective[]; order: number }>();
  const unscheduledObjs: RoadmapObjective[] = [];

  rows.forEach(row => {
    const date = resolvedDate(row, dateField);
    const start = date ?? UNSCHEDULED_SENTINEL;
    const end   = start;
    const obj: RoadmapObjective = {
      id:     row.id,
      name:   row.summary,
      status: toObjectiveStatus(row.statusCategory),
      owner:  row.assigneeName ?? '',
      start,
      end,
      prog:   toProg(row.statusCategory),
    };

    if (!date) {
      unscheduledObjs.push(obj);
      return;
    }

    const key = laneKey(row, laneBy);
    if (!laneMap.has(key)) {
      laneMap.set(key, { objs: [], order: laneMap.size });
    }
    laneMap.get(key)!.objs.push(obj);
  });

  const groups: RoadmapGroup[] = [];

  laneMap.forEach(({ objs, order }, name) => {
    groups.push({
      id:    `lane-${name}`,
      name,
      color: LANE_COLORS[order % LANE_COLORS.length],
      order,
      objs,
      ms:    [],
    });
  });

  if (unscheduledObjs.length > 0) {
    groups.push({
      id:    'lane-unscheduled',
      name:  'Unscheduled',
      color: 'var(--ds-background-neutral)',
      order: groups.length,
      objs:  unscheduledObjs,
      ms:    [],
    });
  }

  return groups;
}

// ── Thin hook wrapper ─────────────────────────────────────────────────────────

/**
 * Hook: resolve a filter-backed roadmap's groups from its JQL.
 * Thin wrapper over the canonical useJqlResults — same pattern as
 * useFilterBoardIssues in filterBoardSource.ts.
 */
export function useFilterRoadmapGroups(
  jql: string | undefined,
  opts: RoadmapMapperOpts,
) {
  const enabled = !!jql && jql.trim().length > 0;
  const query = useJqlResults(jql ?? '', enabled);

  const groups = useMemo<RoadmapGroup[]>(
    () => jqlRowsToRoadmapGroups(query.data?.items ?? [], opts),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [query.data, opts.dateField, opts.laneBy],
  );

  const totalCount  = query.data?.totalCount ?? (query.data?.items ?? []).length;
  const isTruncated = totalCount > (query.data?.items ?? []).length;

  return {
    groups,
    totalCount,
    isTruncated,
    isLoading: query.isLoading,
    isError:   query.isError,
    error:     query.error,
  };
}
