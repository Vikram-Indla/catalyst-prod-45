/**
 * Improve module — barrel export for the AI "Improve {issueType}"
 * dropdown menu and its four backing dialogs.
 *
 * Apr 28, 2026 (jira-compare cycle 3 — Phase B B2).
 */

export { ImproveIssueDropdown } from './ImproveIssueDropdown';
export { ImproveDescriptionDialog } from './ImproveDescriptionDialog';
export { SummarizeCommentsDialog } from './SummarizeCommentsDialog';
export { SuggestChildIssuesDialog } from './SuggestChildIssuesDialog';
export { LinkSimilarItemsDialog } from './LinkSimilarItemsDialog';
export { useImproveApplyHandlers } from './useImproveApplyHandlers';
export {
  improveTriggerLabel,
  childWorkItemLabel,
  canSuggestChildren,
  plainTextToAdfDoc,
  IMPROVE_SUB_TYPES,
} from './improve-config';
export type { ImproveIssueType, ImproveSubType } from './improve-config';
