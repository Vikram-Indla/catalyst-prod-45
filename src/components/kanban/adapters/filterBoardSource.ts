/**
 * filterBoardSource — issue source for a filter-backed Kanban board.
 *
 * A board whose `boards.filter_id` is set is scoped to a saved filter's
 * result set instead of the whole project. Rather than build a second board
 * engine, we reuse the canonical pieces:
 *
 *   useJqlResults(filter.jql_query)  →  JqlResultRow[]   (existing evaluator,
 *                                       same one the Filters results panel uses)
 *   jqlRowToBoardIssue(row)          →  BoardIssue       (renderer's expected shape)
 *   → fed to the EXISTING PragmaticBoard via KanbanBoardPage (Step 4b)
 *
 * No new query language, no new board grid. The only new code is the field map.
 *
 * Zero-assumption rule (CLAUDE.md P0): fields the JQL projection does not carry
 * are rendered neutral ('' / [] / null / false), never a plausible-but-wrong
 * domain default. A missing priority is '' (the card shows no priority chip),
 * NOT a fabricated 'Medium' that would misinform the user about their data.
 */
import { useMemo } from 'react';
import type { BoardIssue } from '@/components/kanban/kanban-types';
import { useJqlResults, type JqlResultRow } from '@/hooks/workhub/useJqlResults';

/** Pure map: one saved-filter result row → the board renderer's BoardIssue. */
export function jqlRowToBoardIssue(row: JqlResultRow): BoardIssue {
  return {
    id: row.id,
    issueKey: row.key,
    summary: row.summary,
    issueType: row.issueType,
    priority: row.priority ?? '',                 // zero-assumption: no 'Medium' lie
    status: row.status,
    statusCategory: row.statusCategory,
    assigneeName: row.assigneeName,
    labels: row.labels ?? [],
    sprintName: null,                             // not in the JQL projection
    storyPoints: null,                            // not in the JQL projection
    parentKey: row.parentKey,
    parentSummary: row.parentSummary,
    fixVersion: row.sprintRelease?.[0] ?? null,
    isFlagged: false,                             // absence of a flag = not flagged
    updatedAt: row.updated,
    createdAt: row.created,
  };
}

/**
 * Hook: resolve a filter-backed board's issues from its JQL.
 * Thin wrapper over the canonical useJqlResults — returns BoardIssue[] plus the
 * underlying query state so KanbanBoardPage can drive loading/empty/error UI.
 */
export function useFilterBoardIssues(jql: string | undefined) {
  const enabled = !!jql && jql.trim().length > 0;
  const query = useJqlResults(jql ?? '', enabled);
  const issues = useMemo<BoardIssue[]>(
    () => (query.data?.items ?? []).map(jqlRowToBoardIssue),
    [query.data],
  );
  // useJqlResults caps at JQL_RESULTS_LIMIT (100). Expose the true match count so
  // the board can tell the user when it's only showing the first page.
  const totalCount = query.data?.totalCount ?? issues.length;
  const isTruncated = totalCount > issues.length;
  return {
    issues,
    totalCount,
    isTruncated,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
