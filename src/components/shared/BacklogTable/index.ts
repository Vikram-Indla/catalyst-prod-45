/**
 * BacklogTable — backlog-tuned fork of the canonical JiraTable.
 *
 * Created 2026-06-30 as a verbatim copy of JiraTable so the grouped backlog
 * surfaces can be iterated toward exact Jira-list parity WITHOUT touching the
 * 29 other JiraTable consumers. Shared helpers (types, cells, editors, flags,
 * column-header menu, resize dialog, toolbar/bulk bars) are reused from the
 * JiraTable directory — only the main component file is forked.
 *
 * Props/types are identical to JiraTable for now (re-exported from there);
 * backlog-specific divergence lands here as we tune.
 */
export { BacklogTable } from './BacklogTable';
export type {
  Column,
  CellProps,
  RowGroup,
  Density,
  SortOrder,
  JiraTableProps,
} from '../JiraTable/types';
