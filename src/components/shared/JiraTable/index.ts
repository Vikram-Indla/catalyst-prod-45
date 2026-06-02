/**
 * JiraTable canonical surface — exports.
 *
 * Pages mount <JiraTable /> with a column schema. Cell renderers come from
 * cells.tsx; editors come from editors.tsx (Round 2).
 *
 * ── ROUND H RETRY (2026-04) ──
 * Retrying the TanStack/plain-table renderer after the last attempt's
 * "table is not defined" runtime error (which we could not root-cause in
 * static analysis). This time we have browser debug tools wired up.
 */
export { JiraTable } from './JiraTable';
export type {
  Column,
  CellProps,
  RowGroup,
  Density,
  SortOrder,
  JiraTableProps,
} from './types';
export {
  makeCheckboxCell,
  makeKeyCell,
  makeSummaryCell,
  makeStatusCell,
  makeStatusEditCell,
  StatusPill,
  makeAssigneeCell,
  makeParentCell,
  makeCommentsCell,
  makePriorityCell,
  makeDateCell,
  makeTypeIconCell,
  makeCaretCell,
  makeLabelsCell,
  makeSprintReleaseCell,
  makeDragHandleCell,
  makeRowMenuCell,
} from './cells';
export type {
  AssigneeCellInput,
  ParentCellInput,
  LozengeAppearance,
} from './cells';

// Inline editors (Atlaskit DropdownMenu + InlineEdit + Textfield)
export {
  makeStatusEditCellAkPopup,
  makeSummaryInlineEditCell,
  makeAssigneeEditCell,
  makePriorityEditCell,
  makeParentEditCell,
  makeRowActionsCell,
  makeDateEditCell,
  makeLabelsEditCell,
} from './editors';
export type {
  StatusOption,
  AssigneeChoice,
  ParentChoice,
  RowAction,
} from './editors';

// Atlaskit-Flag based toast helpers — replaces sonner on JiraTable surfaces.
export { FlagsHost, showFlag, flag } from './flags';
export type { FlagAppearance, ShowFlagInput, FlagAction } from './flags';

// Bulk selection UI
export { BulkFooterBar } from './BulkFooterBar';
export type { BulkFooterBarProps } from './BulkFooterBar';
